import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Flame, Pause, Play, RotateCcw, Trophy } from 'lucide-react';
import { useDesktop } from '../os/DesktopContext';
import { readVfsFile } from '../core/vfs';
import {
  ROAD_HALF_WIDTH,
  checkCarCollision,
  computeGearAndRpm,
  createInitialCarState,
  speedToKmh,
  stepPlayerCar,
} from '../core/racerPhysics';

type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

interface HighScoreEntry {
  driver: string;
  score: number;
  topSpeed: number;
  date: string;
}

interface TrafficActor {
  mesh: THREE.Group;
  x: number;
  z: number;
  speed: number;
  lane: number;
  halfW: number;
  halfL: number;
}

interface NosPickup {
  mesh: THREE.Group;
  x: number;
  z: number;
  active: boolean;
}

// Module-scope reusable scratch objects (Zero GC inside render loop)
const _scratchColor = new THREE.Color();

function createAsphaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#15171e';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle asphalt grain
  for (let i = 0; i < 2400; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    const v = 24 + (i % 18);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Side white shoulder lines
  ctx.fillStyle = '#d4d4d8';
  ctx.fillRect(6, 0, 5, 256);
  ctx.fillRect(245, 0, 5, 256);

  // Dashed lane lines (3 lanes)
  ctx.fillStyle = '#f97316';
  for (let y = 12; y < 256; y += 64) {
    ctx.fillRect(84, y, 4, 34);
    ctx.fillRect(168, y, 4, 34);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 24);
  return tex;
}

function buildCompositeHypercar(
  bodyColor: number,
  accentColor: number,
  isPlayer: boolean
): { group: THREE.Group; wheels: THREE.Mesh[]; flameMesh?: THREE.Mesh } {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: bodyColor,
    metalness: 0.72,
    roughness: 0.24,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });
  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x161820,
    metalness: 0.25,
    roughness: 0.78,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0b1220,
    metalness: 0.85,
    roughness: 0.1,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x111216,
    metalness: 0.15,
    roughness: 0.82,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    metalness: 0.85,
    roughness: 0.2,
  });

  // 1. Lower aerodynamic chassis
  const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.42, 4.15), bodyMat);
  lowerHull.position.y = 0.44;
  lowerHull.castShadow = isPlayer;
  group.add(lowerHull);

  // 2. Front aerodynamic splitter
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.1, 0.65), carbonMat);
  splitter.position.set(0, 0.24, -1.92);
  group.add(splitter);

  // 3. Sculpted hood slope
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.2, 1.55), bodyMat);
  hood.position.set(0, 0.66, -1.05);
  hood.rotation.x = 0.08;
  group.add(hood);

  // 4. Cockpit canopy / glasshouse
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.42, 1.75), glassMat);
  cabin.position.set(0, 0.84, 0.15);
  group.add(cabin);

  // 5. Roof aero scoop
  const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.75), carbonMat);
  scoop.position.set(0, 1.07, 0.35);
  group.add(scoop);

  // 6. Rear spoiler wing & struts
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.08, 0.42), carbonMat);
  wing.position.set(0, 0.98, 1.88);
  group.add(wing);

  const strutGeo = new THREE.BoxGeometry(0.08, 0.34, 0.2);
  const strutL = new THREE.Mesh(strutGeo, rimMat);
  strutL.position.set(-0.55, 0.8, 1.85);
  const strutR = new THREE.Mesh(strutGeo, rimMat);
  strutR.position.set(0.55, 0.8, 1.85);
  group.add(strutL, strutR);

  // 7. 4 Wheels + Alloy Rims
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 18);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.3, 12);
  rimGeo.rotateZ(Math.PI / 2);

  const wheelPositions: Array<[number, number, number]> = [
    [-0.92, 0.36, -1.28],
    [0.92, 0.36, -1.28],
    [-0.92, 0.36, 1.28],
    [0.92, 0.36, 1.28],
  ];
  const wheels: THREE.Mesh[] = [];
  for (const [wx, wy, wz] of wheelPositions) {
    const tire = new THREE.Mesh(wheelGeo, wheelMat);
    tire.position.set(wx, wy, wz);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    tire.add(rim);
    group.add(tire);
    wheels.push(tire);
  }

  // 8. Headlights & Taillights
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff3d1 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1e2d });
  const lightGeo = new THREE.BoxGeometry(0.42, 0.1, 0.08);
  const hl = new THREE.Mesh(lightGeo, headMat);
  hl.position.set(-0.62, 0.52, -2.08);
  const hr = new THREE.Mesh(lightGeo, headMat);
  hr.position.set(0.62, 0.52, -2.08);
  const tl = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.1, 0.08), tailMat);
  tl.position.set(0, 0.54, 2.08);
  group.add(hl, hr, tl);

  // 9. Contact shadow disc grounded at y=0.015
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.75, 24),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.scale.set(0.85, 1.45, 1);
  shadowDisc.position.y = 0.015;
  group.add(shadowDisc);

  let flameMesh: THREE.Mesh | undefined;
  if (isPlayer) {
    const flameGeo = new THREE.ConeGeometry(0.24, 1.1, 12);
    flameGeo.rotateX(Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
    });
    flameMesh = new THREE.Mesh(flameGeo, flameMat);
    flameMesh.position.set(0, 0.34, 2.55);
    flameMesh.visible = false;
    group.add(flameMesh);
  }

  return { group, wheels, flameMesh };
}

export const AnkaRacer3DApp: React.FC = () => {
  const { vfs, vfsWriteFile, turboMode, telemetry } = useDesktop();
  const mountRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<GamePhase>(() => {
    const p = new URLSearchParams(window.location.search);
    return p.get('autostart') === '1' ? 'playing' : 'title';
  });
  const [hud, setHud] = useState({
    kmh: 122,
    rpm: 3200,
    gear: 2,
    nos: 100,
    score: 0,
    health: 100,
    topSpeed: 122,
    nosActive: false,
  });

  const [highScores, setHighScores] = useState<HighScoreEntry[]>(() => {
    const file = readVfsFile(vfs, 'D:/Games/AnkaRacer3D/highscores.json');
    if (file?.content) {
      try {
        return JSON.parse(file.content) as HighScoreEntry[];
      } catch {
        // fallback
      }
    }
    return [{ driver: 'ANKA_PRO', score: 4850, topSpeed: 312, date: '2026-11-16' }];
  });

  const phaseRef = useRef<GamePhase>(phase);
  const turboRef = useRef(turboMode);
  const vfsWriteRef = useRef(vfsWriteFile);
  const resetSignalRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    phaseRef.current = phase;
    document.body.dataset.state = phase;
  }, [phase]);

  useEffect(() => {
    turboRef.current = turboMode;
  }, [turboMode]);

  useEffect(() => {
    vfsWriteRef.current = vfsWriteFile;
  }, [vfsWriteFile]);

  const startGame = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    resetSignalRef.current?.();
    phaseRef.current = 'playing';
    document.body.dataset.state = 'playing';
    setPhase('playing');
  };

  const togglePause = () => {
    setPhase((cur) => {
      if (cur === 'playing') return 'paused';
      if (cur === 'paused') return 'playing';
      return cur;
    });
  };

  // Mount Three.js scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(240, container.clientHeight);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07080d);
    scene.fog = new THREE.FogExp2(0x07080d, 0.011);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(62, width / height, 0.1, 240);
    camera.position.set(0, 3.6, 8.2);

    // Warm/cool 3-point lighting rig
    const hemiLight = new THREE.HemisphereLight(0x4f6d9a, 0x1a1216, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffdfc4, 2.2);
    keyLight.position.set(12, 24, 14);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xef4444, 1.4);
    rimLight.position.set(-10, 6, 18);
    scene.add(rimLight);

    // Ground shoulder plane & asphalt highway
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0b0c12,
      roughness: 0.95,
      metalness: 0.05,
    });
    const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(180, 300), groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(0, -0.02, -80);
    scene.add(groundMesh);

    const roadTex = createAsphaltTexture();
    roadTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      color: 0xffffff,
      roughness: 0.65,
      metalness: 0.1,
    });
    const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF_WIDTH * 2, 260), roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0, -90);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    // Guardrails
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x3f3f46,
      metalness: 0.7,
      roughness: 0.35,
    });
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.65, 260), railMat);
    railL.position.set(-ROAD_HALF_WIDTH - 0.3, 0.33, -90);
    const railR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.65, 260), railMat);
    railR.position.set(ROAD_HALF_WIDTH + 0.3, 0.33, -90);
    scene.add(railL, railR);

    // Neon Gantry Arches + Distant City Skyline Silhouettes
    const gantries: THREE.Group[] = [];
    const gantryPostMat = new THREE.MeshStandardMaterial({
      color: 0x181a24,
      metalness: 0.8,
      roughness: 0.3,
    });
    const gantryStripMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const postGeo = new THREE.BoxGeometry(0.3, 5.2, 0.3);
      const pL = new THREE.Mesh(postGeo, gantryPostMat);
      pL.position.set(-ROAD_HALF_WIDTH - 0.6, 2.6, 0);
      const pR = new THREE.Mesh(postGeo, gantryPostMat);
      pR.position.set(ROAD_HALF_WIDTH + 0.6, 2.6, 0);
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry((ROAD_HALF_WIDTH + 0.8) * 2, 0.35, 0.4),
        gantryPostMat
      );
      beam.position.set(0, 5.1, 0);
      const neon = new THREE.Mesh(
        new THREE.BoxGeometry((ROAD_HALF_WIDTH + 0.6) * 2, 0.12, 0.44),
        gantryStripMat
      );
      neon.position.set(0, 4.92, 0);
      g.add(pL, pR, beam, neon);
      g.position.z = -i * 38;
      scene.add(g);
      gantries.push(g);
    }

    // Skyline building silhouettes
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x11131d,
      roughness: 0.85,
      metalness: 0.2,
    });
    const skyline = new THREE.InstancedMesh(buildingGeo, buildingMat, 36);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 36; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const bx = side * (16 + ((i * 7) % 24));
      const bz = -((i * 11) % 180) + 10;
      const bh = 8 + ((i * 5) % 26);
      const bw = 4 + (i % 5);
      dummy.position.set(bx, bh / 2, bz);
      dummy.scale.set(bw, bh, bw);
      dummy.updateMatrix();
      skyline.setMatrixAt(i, dummy.matrix);
      _scratchColor.setHSL(0.62, 0.15, 0.08 + (i % 4) * 0.02);
      skyline.setColorAt(i, _scratchColor);
    }
    skyline.computeBoundingSphere();
    scene.add(skyline);

    // Player Car
    const playerCar = buildCompositeHypercar(0xdc2626, 0xf97316, true);
    scene.add(playerCar.group);

    // Traffic Cars Pool (3 distinct colorways & speeds)
    const lanes = [-3.6, 0, 3.6];
    const trafficPalette = [
      { body: 0x3b82f6, accent: 0x93c5fd, speed: 22 },
      { body: 0xeab308, accent: 0xfef08a, speed: 27 },
      { body: 0x71717a, accent: 0xe4e4e7, speed: 19 },
    ];
    const trafficPool: TrafficActor[] = [];
    for (let i = 0; i < 5; i++) {
      const spec = trafficPalette[i % trafficPalette.length];
      const built = buildCompositeHypercar(spec.body, spec.accent, false);
      const lane = i % 3;
      const z = -48 - i * 38;
      built.group.position.set(lanes[lane], 0, z);
      scene.add(built.group);
      trafficPool.push({
        mesh: built.group,
        x: lanes[lane],
        z,
        speed: spec.speed,
        lane,
        halfW: 0.88,
        halfL: 1.95,
      });
    }

    // Collectible NOS Canisters
    const nosPool: NosPickup[] = [];
    const nosGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.0, 14);
    const nosMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.85,
      metalness: 0.6,
      roughness: 0.2,
    });
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Group();
      const cyl = new THREE.Mesh(nosGeo, nosMat);
      cyl.position.y = 0.7;
      g.add(cyl);
      const lane = (i + 1) % 3;
      const z = -65 - i * 85;
      g.position.set(lanes[lane], 0, z);
      scene.add(g);
      nosPool.push({ mesh: g, x: lanes[lane], z, active: true });
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Simulation state
    let carState = createInitialCarState();
    let topSpeedRecorded = 122;
    let trauma = 0;
    let hitstopTimer = 0;
    let hudAccumulator = 0;

    const resetRun = () => {
      carState = createInitialCarState();
      topSpeedRecorded = 122;
      trauma = 0;
      hitstopTimer = 0;
      playerCar.group.position.set(0, 0, 0);
      playerCar.group.rotation.set(0, 0, 0);
      trafficPool.forEach((t, idx) => {
        const lane = idx % 3;
        t.lane = lane;
        t.x = lanes[lane];
        t.z = -50 - idx * 38;
        t.mesh.position.set(t.x, 0, t.z);
      });
      nosPool.forEach((n, idx) => {
        const lane = (idx + 1) % 3;
        n.x = lanes[lane];
        n.z = -65 - idx * 85;
        n.active = true;
        n.mesh.visible = true;
        n.mesh.position.set(n.x, 0, n.z);
      });
    };
    resetSignalRef.current = resetRun;

    // Input listeners
    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (phaseRef.current === 'playing' || phaseRef.current === 'paused') {
          setPhase((c) => (c === 'playing' ? 'paused' : 'playing'));
        }
        return;
      }
      if ((e.key === 'Enter' || e.key === ' ') && phaseRef.current === 'title') {
        e.preventDefault();
        resetRun();
        setPhase('playing');
        return;
      }
      keys.add(e.key.toLowerCase());
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
    };
    const onBlur = () => keys.clear();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // ResizeObserver for clean container resizing inside window manager
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(320, Math.floor(entry.contentRect.width));
        const h = Math.max(240, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    ro.observe(container);

    let frameId = 0;
    let lastTime = performance.now();
    let titleAngle = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const st = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (st === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = (now?: number) => {
      const ts = typeof now === 'number' ? now : performance.now();
      const rawDt = Math.max(0.001, (ts - lastTime) / 1000);
      lastTime = ts;
      const dt = Math.min(rawDt, 0.05);

      const curPhase = phaseRef.current;

      if (curPhase === 'title') {
        // Live Hero Showcase camera orbit around hypercar on neon highway
        titleAngle += dt * 0.42;
        camera.position.set(Math.sin(titleAngle) * 5.8, 2.3, Math.cos(titleAngle) * 5.8);
        camera.lookAt(0, 0.65, 0);
        roadTex.offset.y -= dt * 0.45;
      } else if (curPhase === 'playing') {
        if (hitstopTimer > 0) {
          hitstopTimer = Math.max(0, hitstopTimer - dt);
        } else {
          const input = {
            left: keys.has('arrowleft') || keys.has('a'),
            right: keys.has('arrowright') || keys.has('d'),
            up: keys.has('arrowup') || keys.has('w'),
            down: keys.has('arrowdown') || keys.has('s'),
            nos: keys.has(' ') || keys.has('shift'),
          };
          carState = stepPlayerCar(carState, input, dt, turboRef.current);

          const kmh = speedToKmh(carState.speed);
          if (kmh > topSpeedRecorded) topSpeedRecorded = kmh;

          // Update player car transform & body lean
          playerCar.group.position.x = carState.x;
          playerCar.group.rotation.z = -carState.steerVelocity * 0.015;
          playerCar.group.rotation.y = -carState.steerVelocity * 0.018;
          for (const w of playerCar.wheels) {
            w.rotation.x -= carState.speed * dt * 1.1;
          }
          if (playerCar.flameMesh) {
            playerCar.flameMesh.visible = carState.nosActive;
            if (carState.nosActive) {
              playerCar.flameMesh.scale.set(1, 1, 0.8 + Math.sin(ts * 0.04) * 0.35);
            }
          }

          // Scroll highway & gantries
          roadTex.offset.y -= (carState.speed * dt) / 10.8;
          for (const g of gantries) {
            g.position.z += carState.speed * dt;
            if (g.position.z > 14) {
              g.position.z -= 6 * 38;
            }
          }

          // Advance traffic & check collisions
          for (const t of trafficPool) {
            const relSpeed = carState.speed - t.speed;
            t.z += relSpeed * dt;
            if (t.z > 18) {
              t.lane = (t.lane + Math.floor(Math.random() * 2 + 1)) % 3;
              t.x = lanes[t.lane];
              t.z = -175 - Math.random() * 45;
            }
            t.mesh.position.set(t.x, 0, t.z);

            if (checkCarCollision(carState.x, 0, t)) {
              // Impact response: hitstop + trauma shake + push traffic clear
              hitstopTimer = 0.055;
              trauma = 0.85;
              carState.health = Math.max(0, carState.health - 34);
              carState.speed = Math.max(20, carState.speed * 0.52);
              t.z = -190;
              t.mesh.position.z = t.z;

              if (carState.health <= 0) {
                const finalScore = Math.round(carState.score);
                const entry: HighScoreEntry = {
                  driver: 'RACER_1',
                  score: finalScore,
                  topSpeed: topSpeedRecorded,
                  date: new Date().toISOString().slice(0, 10),
                };
                setHighScores((prev) => {
                  const updated = [...prev, entry]
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 6);
                  vfsWriteRef.current(
                    'D:/Games/AnkaRacer3D/highscores.json',
                    JSON.stringify(updated, null, 2),
                    'application/json'
                  );
                  return updated;
                });
                phaseRef.current = 'gameover';
                setPhase('gameover');
              }
            }
          }

          // Advance NOS canisters
          for (const n of nosPool) {
            n.z += carState.speed * dt;
            n.mesh.rotation.y += dt * 2.5;
            if (n.z > 16) {
              const lane = Math.floor(Math.random() * 3);
              n.x = lanes[lane];
              n.z = -140 - Math.random() * 60;
              n.active = true;
              n.mesh.visible = true;
            }
            n.mesh.position.set(n.x, 0, n.z);

            if (n.active && Math.abs(carState.x - n.x) < 1.35 && Math.abs(n.z) < 2.2) {
              n.active = false;
              n.mesh.visible = false;
              carState.nos = Math.min(100, carState.nos + 40);
              carState.score += 250;
            }
          }
        }

        // Exponentially damped chase camera + trauma shake + NOS FOV widening
        const targetCamX = carState.x * 0.68;
        const targetFov = carState.nosActive ? 74 : 62 + Math.max(0, (carState.speed - 35) * 0.14);
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 7, dt);
        camera.updateProjectionMatrix();

        camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 8, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, 3.4, 8, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, 7.6, 8, dt);

        if (trauma > 0) {
          trauma = Math.max(0, trauma - dt * 2.2);
          const shake = trauma * trauma * 0.35;
          camera.position.x += (Math.random() * 2 - 1) * shake;
          camera.position.y += (Math.random() * 2 - 1) * shake;
        }
        camera.lookAt(carState.x * 0.45, 0.85, -14);

        // Throttle HUD React updates to ~10Hz
        hudAccumulator += dt;
        if (hudAccumulator >= 0.09) {
          hudAccumulator = 0;
          const kmh = speedToKmh(carState.speed);
          const { gear, rpm } = computeGearAndRpm(carState.speed, carState.nosActive);
          setHud({
            kmh,
            rpm,
            gear,
            nos: Math.round(carState.nos),
            score: Math.round(carState.score),
            health: Math.round(carState.health),
            topSpeed: topSpeedRecorded,
            nosActive: carState.nosActive,
          });
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(() => tick());
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      afterDraw(() => tick());
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="w-full h-full relative bg-[#07080d] overflow-hidden select-none">
      {/* Isolated WebGL Mount */}
      <div ref={mountRef} data-testid="racer-canvas-mount" className="w-full h-full" />

      {/* Title Screen Overlay */}
      {phase === 'title' && (
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6 bg-gradient-to-r from-black/80 via-black/35 to-transparent">
          <div className="max-w-md pointer-events-auto">
            <div className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
              AnkaRacer <span className="text-red-500">3D</span>
            </div>
            <p className="mt-1.5 text-xs text-zinc-300 leading-relaxed">
              Gece otoyolunda trafik araçlarından sıyrıl, Nitro kapsüllerini topla ve en yüksek skoru Sanal Diske kaydet.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                data-start="true"
                onClick={startGame}
                className="px-6 py-2.5 rounded bg-red-600 hover:bg-red-500 text-white font-display text-sm font-bold tracking-wide flex items-center gap-2 transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Yarışı Başlat</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="text-xs text-zinc-300 font-mono">
              A / D veya Ok Tuşları: Yön · W / S: Gaz / Fren · Space / Shift: NOS · P: Duraklat
            </div>

            <div className="bg-[#0D0F16]/90 border border-zinc-800 rounded p-3 w-60 pointer-events-auto">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-400 mb-2">
                <Trophy className="w-3.5 h-3.5" />
                <span>Pist Rekorları (D:\Games)</span>
              </div>
              <div className="space-y-1 text-[11px] font-mono-tabular">
                {highScores.slice(0, 3).map((s, idx) => (
                  <div key={idx} className="flex justify-between text-zinc-300">
                    <span>
                      {idx + 1}. {s.driver}
                    </span>
                    <span className="text-zinc-100 font-semibold">{s.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Playing HUD (Zero backdrop-filter over WebGL!) */}
      {phase === 'playing' && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="bg-[#0B0C10]/85 border border-zinc-800 rounded px-3.5 py-2">
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider">Skor</div>
              <div
                data-testid="racer-score"
                className="font-mono-tabular text-2xl font-bold text-white leading-tight"
              >
                {hud.score}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400 font-mono-tabular">
                <span>Şasi: %{hud.health}</span>
                <span>·</span>
                <span>{telemetry.fps} FPS</span>
              </div>
            </div>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Oyunu Duraklat"
              onClick={(e) => {
                e.currentTarget.blur();
                togglePause();
              }}
              className="pointer-events-auto w-9 h-9 rounded bg-[#0B0C10]/85 border border-zinc-800 hover:border-zinc-600 flex items-center justify-center text-zinc-200"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-end justify-between gap-4">
            {/* NOS Bar */}
            <div className="bg-[#0B0C10]/85 border border-zinc-800 rounded px-3.5 py-2 w-52">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="flex items-center gap-1 font-semibold text-cyan-400">
                  <Flame className="w-3.5 h-3.5" /> NOS (Space)
                </span>
                <span className="font-mono-tabular text-zinc-200">%{hud.nos}</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    hud.nosActive ? 'bg-cyan-400' : 'bg-orange-500'
                  }`}
                  style={{ width: `${hud.nos}%` }}
                />
              </div>
            </div>

            {/* Speedometer & Gear */}
            <div className="bg-[#0B0C10]/85 border border-zinc-800 rounded px-4 py-2 text-right">
              <div className="flex items-baseline justify-end gap-2">
                <span className="font-mono-tabular text-3xl font-bold text-white">
                  {hud.kmh}
                </span>
                <span className="text-xs text-zinc-400 font-semibold">KM/H</span>
              </div>
              <div className="flex items-center justify-end gap-3 text-[11px] font-mono-tabular text-zinc-400">
                <span>Vites {hud.gear}</span>
                <span>·</span>
                <span className="text-red-400">{hud.rpm} RPM</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paused Modal */}
      {phase === 'paused' && (
        <div className="absolute inset-0 z-20 bg-black/75 flex items-center justify-center p-4">
          <div className="w-80 bg-[#12141C] border border-zinc-800 rounded-lg p-5 text-center shadow-2xl">
            <h3 className="font-display text-xl font-bold text-white mb-1">Yarış Duraklatıldı</h3>
            <p className="text-xs text-zinc-400 mb-5">Mevcut Skor: {hud.score}</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={togglePause}
                className="w-full py-2 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
              >
                Devam Et
              </button>
              <button
                type="button"
                onClick={startGame}
                className="w-full py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
              >
                Yeniden Başlat
              </button>
              <button
                type="button"
                onClick={() => setPhase('title')}
                className="w-full py-2 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs"
              >
                Ana Menü
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {phase === 'gameover' && (
        <div className="absolute inset-0 z-20 bg-black/80 flex items-center justify-center p-4">
          <div className="w-88 bg-[#12141C] border border-red-500/40 rounded-lg p-6 text-center shadow-2xl">
            <h3 className="font-display text-2xl font-bold text-red-500 mb-1">Yarış Sona Erdi</h3>
            <p className="text-xs text-zinc-400 mb-4">
              Skorunuz D:\Games\AnkaRacer3D\highscores.json dosyasına kaydedildi.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-5 bg-[#0B0C10] border border-zinc-800 rounded p-3">
              <div>
                <div className="text-[11px] text-zinc-500">Final Skoru</div>
                <div className="font-mono-tabular text-lg font-bold text-white">{hud.score}</div>
              </div>
              <div>
                <div className="text-[11px] text-zinc-500">Maksimum Hız</div>
                <div className="font-mono-tabular text-lg font-bold text-orange-400">
                  {hud.topSpeed} km/h
                </div>
              </div>
            </div>
            <button
              type="button"
              data-start="true"
              onClick={startGame}
              className="w-full py-2.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Tekrar Yarış</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
