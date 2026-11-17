import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialVfs,
  createVfsFolder,
  deleteVfsNode,
  listDirectory,
  normalizeVfsPath,
  readVfsFile,
  renameVfsNode,
  writeVfsFile,
} from './vfs';
import { executeTerminalCommand } from './terminalEngine';
import { resolveBrowserInput } from './browserUtils';
import {
  checkCarCollision,
  computeGearAndRpm,
  createInitialCarState,
  speedToKmh,
  stepPlayerCar,
} from './racerPhysics';

test('VFS normalizes Windows and relative paths correctly', () => {
  assert.equal(normalizeVfsPath('C:\\Users\\Racer\\Documents\\..\\Pictures'), 'C:/Users/Racer/Pictures');
  assert.equal(normalizeVfsPath('Documents/test.txt', 'C:/Users/Racer'), 'C:/Users/Racer/Documents/test.txt');
  assert.equal(normalizeVfsPath('d:\\'), 'D:');
});

test('VFS supports create folder, write, read, rename, and delete', () => {
  let vfs = createInitialVfs();
  vfs = createVfsFolder(vfs, 'C:/Users/Racer/TestFolder');
  vfs = writeVfsFile(vfs, 'C:/Users/Racer/TestFolder/hello.txt', 'AnkaOS 4.5');

  const file = readVfsFile(vfs, 'C:/Users/Racer/TestFolder/hello.txt');
  assert.equal(file?.content, 'AnkaOS 4.5');

  vfs = renameVfsNode(vfs, 'C:/Users/Racer/TestFolder/hello.txt', 'racer.txt');
  assert.equal(readVfsFile(vfs, 'C:/Users/Racer/TestFolder/hello.txt'), null);
  assert.equal(readVfsFile(vfs, 'C:/Users/Racer/TestFolder/racer.txt')?.content, 'AnkaOS 4.5');

  const items = listDirectory(vfs, 'C:/Users/Racer/TestFolder');
  assert.equal(items.length, 1);

  vfs = deleteVfsNode(vfs, 'C:/Users/Racer/TestFolder');
  assert.equal(readVfsFile(vfs, 'C:/Users/Racer/TestFolder/racer.txt'), null);
});

test('Terminal executes dir, mkdir, echo >, cat, turbo-mode, taskkill, and race-start', () => {
  const vfs = createInitialVfs();
  const baseCtx = {
    vfs,
    cwd: 'C:/Users/Racer',
    turboMode: false,
    cpuPercent: 18.5,
    ramUsedMb: 2800,
    ramTotalMb: 16384,
    fps: 60,
    processes: [
      { pid: 100, name: 'anka_shell.exe', title: 'AnkaShell', cpu: 2.1, memoryMb: 120, type: 'kernel' as const },
      { pid: 204, name: 'notepad.exe', title: 'RacerPad', cpu: 0.4, memoryMb: 42, type: 'app' as const },
    ],
  };

  const resEcho = executeTerminalCommand('echo SpeedTest > Documents/speed.txt', baseCtx);
  const written = readVfsFile(resEcho.nextVfs, 'C:/Users/Racer/Documents/speed.txt');
  assert.equal(written?.content, 'SpeedTest');

  const resTurbo = executeTerminalCommand('turbo-mode on', { ...baseCtx, vfs: resEcho.nextVfs });
  assert.deepEqual(resTurbo.actions, [{ type: 'SET_TURBO', enabled: true }]);

  const resRace = executeTerminalCommand('race-start', baseCtx);
  assert.deepEqual(resRace.actions, [{ type: 'LAUNCH_APP', appId: 'racer3d' }]);

  const resKill = executeTerminalCommand('taskkill 204', baseCtx);
  assert.deepEqual(resKill.actions, [{ type: 'KILL_PROCESS', target: '204' }]);
});

test('AnkaBrowser classifies normal text queries as Google Search and domains as URLs', () => {
  const q1 = resolveBrowserInput('fenerbahçe maç sonucu');
  assert.equal(q1.mode, 'search');
  assert.equal(q1.query, 'fenerbahçe maç sonucu');

  const q2 = resolveBrowserInput('yapay zeka');
  assert.equal(q2.mode, 'search');

  const q3 = resolveBrowserInput('google');
  assert.equal(q3.mode, 'search');

  const u1 = resolveBrowserInput('example.com');
  assert.equal(u1.mode, 'url');
  assert.equal(u1.url, 'https://example.com');

  const u2 = resolveBrowserInput('https://en.wikipedia.org/wiki/Formula_One');
  assert.equal(u2.mode, 'url');
});

test('AnkaRacer 3D physics clamps bounds, boosts with NOS, computes gears, and detects collisions', () => {
  let car = createInitialCarState();
  const startSpeed = car.speed;
  car = stepPlayerCar(car, { left: false, right: true, up: true, down: false, nos: true }, 0.05);
  assert.ok(car.speed > startSpeed);
  assert.ok(car.nos < 100);
  assert.ok(car.x > 0);
  assert.ok(speedToKmh(car.speed) >= 120);

  const telemetry = computeGearAndRpm(65, true);
  assert.ok(telemetry.gear >= 4);
  assert.ok(telemetry.rpm > 2400);

  assert.equal(checkCarCollision(0, 0, { x: 0.5, z: 1.0, halfW: 0.9, halfL: 2.0 }), true);
  assert.equal(checkCarCollision(-3.5, 0, { x: 3.0, z: 0, halfW: 0.9, halfL: 2.0 }), false);
});
