export type AppId =
  | 'browser'
  | 'code'
  | 'racer3d'
  | 'terminal'
  | 'taskmanager'
  | 'explorer'
  | 'notepad'
  | 'calculator'
  | 'media'
  | 'audio'
  | 'paint'
  | 'settings';

export type AccentTheme = 'red' | 'amber' | 'cyan';

export interface WallpaperOption {
  id: string;
  name: string;
  src: string;
}

export const WALLPAPERS: WallpaperOption[] = [
  {
    id: 'carbon',
    name: 'Racer Forged Carbon',
    src: '/src/assets/images/wallpaper_racer_carbon_1794908972332.jpg',
  },
  {
    id: 'highway',
    name: 'Midnight Expressway',
    src: '/src/assets/images/wallpaper_night_highway_1794908972947.jpg',
  },
  {
    id: 'garage',
    name: 'Pit Garage Telemetry',
    src: '/src/assets/images/wallpaper_pit_garage_1794908973610.jpg',
  },
  {
    id: 'hypercar',
    name: 'Anka Hypercar Studio',
    src: '/src/assets/images/app_racer_cover_1794908974403.jpg',
  },
];

export interface WindowInstance {
  id: string;
  appId: AppId;
  title: string;
  pid: number;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  launchParams?: {
    filePath?: string;
    initialUrl?: string;
  };
}

export interface TelemetrySnapshot {
  cpuPercent: number;
  ramUsedMb: number;
  ramTotalMb: number;
  fps: number;
  gpuPercent: number;
  diskIoMb: number;
  historyCpu: number[];
  historyRam: number[];
}

export interface BackgroundDaemon {
  pid: number;
  name: string;
  title: string;
  type: 'kernel' | 'python';
  baseCpu: number;
  memoryMb: number;
}
