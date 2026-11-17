import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  VfsState,
  createInitialVfs,
  createVfsFolder,
  deleteVfsNode,
  renameVfsNode,
  writeVfsFile,
} from '../core/vfs';
import { TerminalProcessEntry } from '../core/terminalEngine';
import {
  AccentTheme,
  AppId,
  BackgroundDaemon,
  TelemetrySnapshot,
  WALLPAPERS,
  WindowInstance,
} from './types';

const VFS_STORAGE_KEY = 'anka_os_4_5_vfs_v1';
const SETTINGS_STORAGE_KEY = 'anka_os_4_5_settings_v1';

interface AppDefaultMeta {
  title: string;
  processName: string;
  width: number;
  height: number;
  memoryMb: number;
}

export const APP_METADATA: Record<AppId, AppDefaultMeta> = {
  browser: { title: 'AnkaBrowser', processName: 'anka_browser.exe', width: 980, height: 640, memoryMb: 284 },
  code: { title: 'AnkaCode Studio', processName: 'ankacode_ide.exe', width: 1020, height: 660, memoryMb: 312 },
  racer3d: { title: 'AnkaRacer 3D', processName: 'ankaracer_3d.exe', width: 960, height: 620, memoryMb: 540 },
  terminal: { title: 'AnkaTerm CLI', processName: 'ankaterm_py.exe', width: 760, height: 480, memoryMb: 68 },
  taskmanager: { title: 'Görev Yöneticisi & Telemetri', processName: 'anka_taskmgr.exe', width: 820, height: 560, memoryMb: 94 },
  explorer: { title: 'Dosya Gezgini', processName: 'anka_explorer.exe', width: 840, height: 540, memoryMb: 110 },
  notepad: { title: 'RacerPad', processName: 'racerpad.exe', width: 640, height: 460, memoryMb: 46 },
  calculator: { title: 'TurboCalc', processName: 'turbocalc.exe', width: 360, height: 510, memoryMb: 34 },
  media: { title: 'Medya Görüntüleyici', processName: 'anka_media.exe', width: 780, height: 540, memoryMb: 128 },
  audio: { title: 'AnkaAudio Synth', processName: 'anka_audio.exe', width: 680, height: 480, memoryMb: 86 },
  paint: { title: 'RacerSketch Studio', processName: 'racersketch.exe', width: 820, height: 560, memoryMb: 142 },
  settings: { title: 'Racer Kontrol Merkezi', processName: 'anka_settings.exe', width: 760, height: 540, memoryMb: 62 },
};

const CORE_DAEMONS: BackgroundDaemon[] = [
  { pid: 100, name: 'AnkaShell.exe', title: 'C# WPF Masaüstü Kabuğu', type: 'kernel', baseCpu: 2.1, memoryMb: 164 },
  { pid: 104, name: 'anka_vfs_daemon.py', title: 'Python Sanal Dosya Sistemi Servisi', type: 'python', baseCpu: 1.4, memoryMb: 58 },
  { pid: 108, name: 'anka_telemetry.py', title: 'Python Telemetri ve Performans Köprüsü', type: 'python', baseCpu: 1.8, memoryMb: 44 },
  { pid: 112, name: 'AnkaProxy.Service', title: 'AnkaBrowser Iframe-Bypass Ağ Köprüsü', type: 'kernel', baseCpu: 0.9, memoryMb: 52 },
];

interface SavedSettings {
  wallpaperId: string;
  accent: AccentTheme;
  turboMode: boolean;
  volume: number;
  muted: boolean;
}

function loadSavedSettings(): SavedSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as SavedSettings;
    }
  } catch {
    // ignore
  }
  return {
    wallpaperId: 'carbon',
    accent: 'red',
    turboMode: false,
    volume: 75,
    muted: false,
  };
}

function loadSavedVfs(): VfsState {
  try {
    const raw = localStorage.getItem(VFS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as VfsState;
      if (parsed && parsed.nodes && parsed.nodes['C:'] && parsed.nodes['D:']) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return createInitialVfs();
}

interface DesktopContextValue {
  windows: WindowInstance[];
  activeWindowId: string | null;
  startMenuOpen: boolean;
  setStartMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openApp: (appId: AppId, params?: WindowInstance['launchParams']) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  updateWindowGeometry: (id: string, patch: Partial<Pick<WindowInstance, 'x' | 'y' | 'width' | 'height'>>) => void;
  killProcess: (pidOrId: string | number) => void;
  processes: TerminalProcessEntry[];
  telemetry: TelemetrySnapshot;
  turboMode: boolean;
  setTurboMode: (enabled: boolean) => void;
  wallpaperId: string;
  setWallpaperId: (id: string) => void;
  wallpaperSrc: string;
  accent: AccentTheme;
  setAccent: (accent: AccentTheme) => void;
  volume: number;
  setVolume: (vol: number) => void;
  muted: boolean;
  setMuted: (muted: boolean) => void;
  vfs: VfsState;
  setVfs: React.Dispatch<React.SetStateAction<VfsState>>;
  vfsWriteFile: (path: string, content: string, mimeType?: string) => void;
  vfsCreateFolder: (path: string) => void;
  vfsDeleteNode: (path: string) => void;
  vfsRenameNode: (path: string, newName: string) => void;
  vfsReset: () => void;
}

const DesktopContext = createContext<DesktopContextValue | null>(null);

export const DesktopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialSettings = useMemo(() => loadSavedSettings(), []);
  const [vfs, setVfs] = useState<VfsState>(() => loadSavedVfs());
  const [windows, setWindows] = useState<WindowInstance[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [startMenuOpen, setStartMenuOpen] = useState(false);

  const [wallpaperId, setWallpaperId] = useState(initialSettings.wallpaperId);
  const [accent, setAccent] = useState<AccentTheme>(initialSettings.accent);
  const [turboMode, setTurboMode] = useState(initialSettings.turboMode);
  const [volume, setVolume] = useState(initialSettings.volume);
  const [muted, setMuted] = useState(initialSettings.muted);

  const zCounterRef = useRef(20);
  const pidCounterRef = useRef(300);

  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>({
    cpuPercent: 16.4,
    ramUsedMb: 2680,
    ramTotalMb: 16384,
    fps: 60,
    gpuPercent: 14,
    diskIoMb: 12.4,
    historyCpu: Array(24).fill(16),
    historyRam: Array(24).fill(18),
  });

  // Persist VFS
  useEffect(() => {
    try {
      localStorage.setItem(VFS_STORAGE_KEY, JSON.stringify(vfs));
    } catch {
      // ignore quota
    }
  }, [vfs]);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ wallpaperId, accent, turboMode, volume, muted })
      );
    } catch {
      // ignore
    }
  }, [wallpaperId, accent, turboMode, volume, muted]);

  const vfsWriteFile = useCallback((path: string, content: string, mimeType = 'text/plain') => {
    setVfs((prev) => writeVfsFile(prev, path, content, mimeType));
  }, []);

  const vfsCreateFolder = useCallback((path: string) => {
    setVfs((prev) => createVfsFolder(prev, path));
  }, []);

  const vfsDeleteNode = useCallback((path: string) => {
    setVfs((prev) => deleteVfsNode(prev, path));
  }, []);

  const vfsRenameNode = useCallback((path: string, newName: string) => {
    setVfs((prev) => renameVfsNode(prev, path, newName));
  }, []);

  const vfsReset = useCallback(() => {
    const fresh = createInitialVfs();
    setVfs(fresh);
  }, []);

  const openApp = useCallback((appId: AppId, params?: WindowInstance['launchParams']) => {
    setStartMenuOpen(false);
    setWindows((prev) => {
      // If opening settings or taskmanager without new file, focus existing
      const singletonApps: AppId[] = ['taskmanager', 'settings', 'racer3d'];
      if (singletonApps.includes(appId)) {
        const existing = prev.find((w) => w.appId === appId);
        if (existing) {
          const nextZ = ++zCounterRef.current;
          setActiveWindowId(existing.id);
          return prev.map((w) =>
            w.id === existing.id ? { ...w, minimized: false, zIndex: nextZ, launchParams: params ?? w.launchParams } : w
          );
        }
      }

      const meta = APP_METADATA[appId];
      const nextZ = ++zCounterRef.current;
      const pid = ++pidCounterRef.current;
      const offset = (prev.length % 6) * 28;
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
      const vh = typeof window !== 'undefined' ? window.innerHeight - 48 : 852;
      const wWidth = Math.min(meta.width, vw - 40);
      const wHeight = Math.min(meta.height, vh - 30);
      const x = Math.max(24, Math.round((vw - wWidth) / 2) - 40 + offset);
      const y = Math.max(16, Math.round((vh - wHeight) / 2) - 20 + offset);

      const newWin: WindowInstance = {
        id: `${appId}_${pid}`,
        appId,
        title: params?.filePath ? `${meta.title} — ${params.filePath.split('/').pop()}` : meta.title,
        pid,
        x,
        y,
        width: wWidth,
        height: wHeight,
        minimized: false,
        maximized: false,
        zIndex: nextZ,
        launchParams: params,
      };
      setActiveWindowId(newWin.id);
      return [...prev, newWin];
    });
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const remaining = prev.filter((w) => w.id !== id);
      if (activeWindowId === id) {
        const top = remaining.reduce<WindowInstance | null>(
          (best, cur) => (!cur.minimized && (!best || cur.zIndex > best.zIndex) ? cur : best),
          null
        );
        setActiveWindowId(top ? top.id : null);
      }
      return remaining;
    });
  }, [activeWindowId]);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimized: true } : w))
    );
    setActiveWindowId((cur) => (cur === id ? null : cur));
  }, []);

  const toggleMaximizeWindow = useCallback((id: string) => {
    const nextZ = ++zCounterRef.current;
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, maximized: !w.maximized, minimized: false, zIndex: nextZ } : w
      )
    );
    setActiveWindowId(id);
  }, []);

  const focusWindow = useCallback((id: string) => {
    const nextZ = ++zCounterRef.current;
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimized: false, zIndex: nextZ } : w))
    );
    setActiveWindowId(id);
    setStartMenuOpen(false);
  }, []);

  const updateWindowGeometry = useCallback(
    (id: string, patch: Partial<Pick<WindowInstance, 'x' | 'y' | 'width' | 'height'>>) => {
      setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
    },
    []
  );

  const killProcess = useCallback((pidOrId: string | number) => {
    const str = String(pidOrId);
    setWindows((prev) => prev.filter((w) => w.id !== str && String(w.pid) !== str));
  }, []);

  // Global keyboard shortcuts (Ctrl+Shift+Esc -> Task Manager) & ?autostart=1 support
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'Escape' || e.key === 'Esc')) {
        e.preventDefault();
        openApp('taskmanager');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openApp]);

  // Support ?autostart=1 or ?app=... for fast direct inspection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const appParam = params.get('app') as AppId | null;
    if (appParam && APP_METADATA[appParam]) {
      openApp(appParam);
    } else if (params.get('autostart') === '1') {
      openApp('racer3d');
    }
  }, [openApp]);

  const processes: TerminalProcessEntry[] = useMemo(() => {
    const daemonEntries: TerminalProcessEntry[] = CORE_DAEMONS.map((d, idx) => ({
      pid: d.pid,
      name: d.name,
      title: d.title,
      cpu: Number((d.baseCpu + (turboMode ? 1.1 : 0.2) + ((telemetry.cpuPercent + idx) % 1.4)).toFixed(1)),
      memoryMb: d.memoryMb,
      type: d.type,
    }));

    const appEntries: TerminalProcessEntry[] = windows.map((w, idx) => {
      const meta = APP_METADATA[w.appId];
      const activeBoost = w.id === activeWindowId ? 3.2 : 0.8;
      const racerLoad = w.appId === 'racer3d' && !w.minimized ? 14.5 : 0;
      return {
        pid: w.pid,
        name: meta.processName,
        title: w.title,
        cpu: Number((activeBoost + racerLoad + ((telemetry.cpuPercent + idx * 3) % 2.5)).toFixed(1)),
        memoryMb: meta.memoryMb,
        type: 'app',
      };
    });

    return [...daemonEntries, ...appEntries];
  }, [windows, activeWindowId, turboMode, telemetry.cpuPercent]);

  // Live telemetry ticker (1 Hz)
  useEffect(() => {
    const timer = window.setInterval(() => {
      setTelemetry((prev) => {
        const windowCount = windows.filter((w) => !w.minimized).length;
        const hasRacer = windows.some((w) => w.appId === 'racer3d' && !w.minimized);
        const baseCpu = (turboMode ? 24 : 11) + windowCount * 4.2 + (hasRacer ? 18 : 0);
        const jitter = (Math.sin(Date.now() / 900) + 1) * 3.1;
        const cpuPercent = Number(Math.min(96, baseCpu + jitter).toFixed(1));

        const appMem = windows.reduce((sum, w) => sum + APP_METADATA[w.appId].memoryMb, 0);
        const ramUsedMb = Math.min(prev.ramTotalMb - 512, 1980 + appMem + (turboMode ? 320 : 0));
        const ramPct = Number(((ramUsedMb / prev.ramTotalMb) * 100).toFixed(1));

        const fps = turboMode ? (hasRacer ? 144 : 120) : hasRacer ? 60 : 60;
        const gpuPercent = Math.min(98, Math.round((hasRacer ? 58 : 12) + (turboMode ? 14 : 0) + jitter * 2));
        const diskIoMb = Number(((turboMode ? 28 : 8) + windowCount * 2.1 + (Date.now() % 5)).toFixed(1));

        return {
          ...prev,
          cpuPercent,
          ramUsedMb,
          fps,
          gpuPercent,
          diskIoMb,
          historyCpu: [...prev.historyCpu.slice(1), cpuPercent],
          historyRam: [...prev.historyRam.slice(1), ramPct],
        };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [windows, turboMode]);

  const wallpaperSrc = useMemo(() => {
    return WALLPAPERS.find((w) => w.id === wallpaperId)?.src || WALLPAPERS[0].src;
  }, [wallpaperId]);

  const value: DesktopContextValue = {
    windows,
    activeWindowId,
    startMenuOpen,
    setStartMenuOpen,
    openApp,
    closeWindow,
    minimizeWindow,
    toggleMaximizeWindow,
    focusWindow,
    updateWindowGeometry,
    killProcess,
    processes,
    telemetry,
    turboMode,
    setTurboMode,
    wallpaperId,
    setWallpaperId,
    wallpaperSrc,
    accent,
    setAccent,
    volume,
    setVolume,
    muted,
    setMuted,
    vfs,
    setVfs,
    vfsWriteFile,
    vfsCreateFolder,
    vfsDeleteNode,
    vfsRenameNode,
    vfsReset,
  };

  return <DesktopContext.Provider value={value}>{children}</DesktopContext.Provider>;
};

export function useDesktop() {
  const ctx = useContext(DesktopContext);
  if (!ctx) throw new Error('useDesktop must be used inside DesktopProvider');
  return ctx;
}
