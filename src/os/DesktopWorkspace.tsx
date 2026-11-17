import React, { useState } from 'react';
import {
  Activity,
  Calculator,
  Code2,
  FilePlus,
  FileText,
  FolderOpen,
  FolderPlus,
  Gamepad2,
  Globe,
  Image as ImageIcon,
  Monitor,
  Music2,
  Paintbrush,
  RefreshCw,
  Settings,
  Terminal,
} from 'lucide-react';
import { useDesktop } from './DesktopContext';
import { AppId, WALLPAPERS, WindowInstance } from './types';
import { WindowFrame } from './WindowFrame';
import { DesktopWidgets } from './DesktopWidgets';
import { StartMenu } from './StartMenu';
import { Taskbar } from './Taskbar';
import { AnkaBrowserApp } from '../apps/AnkaBrowserApp';
import { AnkaCodeApp } from '../apps/AnkaCodeApp';
import { AnkaRacer3DApp } from '../apps/AnkaRacer3DApp';
import { AnkaTermApp } from '../apps/AnkaTermApp';
import { TaskManagerApp } from '../apps/TaskManagerApp';
import { FileExplorerApp } from '../apps/FileExplorerApp';
import { NotepadApp } from '../apps/NotepadApp';
import { CalculatorApp } from '../apps/CalculatorApp';
import { MediaViewerApp } from '../apps/MediaViewerApp';
import { AudioSynthApp } from '../apps/AudioSynthApp';
import { PaintStudioApp } from '../apps/PaintStudioApp';
import { SettingsApp } from '../apps/SettingsApp';

interface DesktopShortcut {
  id: AppId;
  label: string;
  icon: React.ReactNode;
}

const DESKTOP_SHORTCUTS: DesktopShortcut[] = [
  { id: 'racer3d', label: 'AnkaRacer 3D', icon: <Gamepad2 className="w-7 h-7 text-red-500" /> },
  { id: 'browser', label: 'AnkaBrowser', icon: <Globe className="w-7 h-7 text-orange-400" /> },
  { id: 'code', label: 'AnkaCode Studio', icon: <Code2 className="w-7 h-7 text-cyan-400" /> },
  { id: 'terminal', label: 'AnkaTerm CLI', icon: <Terminal className="w-7 h-7 text-red-400" /> },
  { id: 'taskmanager', label: 'Görev Yöneticisi', icon: <Activity className="w-7 h-7 text-emerald-400" /> },
  { id: 'explorer', label: 'Dosya Gezgini', icon: <FolderOpen className="w-7 h-7 text-amber-400" /> },
  { id: 'notepad', label: 'RacerPad', icon: <FileText className="w-7 h-7 text-zinc-200" /> },
  { id: 'calculator', label: 'TurboCalc', icon: <Calculator className="w-7 h-7 text-orange-300" /> },
  { id: 'media', label: 'Medya Galerisi', icon: <ImageIcon className="w-7 h-7 text-sky-400" /> },
  { id: 'audio', label: 'AnkaAudio Synth', icon: <Music2 className="w-7 h-7 text-rose-400" /> },
  { id: 'paint', label: 'RacerSketch', icon: <Paintbrush className="w-7 h-7 text-amber-300" /> },
  { id: 'settings', label: 'Ayarlar', icon: <Settings className="w-7 h-7 text-zinc-300" /> },
];

function getSmallIcon(appId: AppId): React.ReactNode {
  switch (appId) {
    case 'racer3d':
      return <Gamepad2 className="w-4 h-4 text-red-500" />;
    case 'browser':
      return <Globe className="w-4 h-4 text-orange-400" />;
    case 'code':
      return <Code2 className="w-4 h-4 text-cyan-400" />;
    case 'terminal':
      return <Terminal className="w-4 h-4 text-red-400" />;
    case 'taskmanager':
      return <Activity className="w-4 h-4 text-emerald-400" />;
    case 'explorer':
      return <FolderOpen className="w-4 h-4 text-amber-400" />;
    case 'notepad':
      return <FileText className="w-4 h-4 text-zinc-300" />;
    case 'calculator':
      return <Calculator className="w-4 h-4 text-orange-300" />;
    case 'media':
      return <ImageIcon className="w-4 h-4 text-sky-400" />;
    case 'audio':
      return <Music2 className="w-4 h-4 text-rose-400" />;
    case 'paint':
      return <Paintbrush className="w-4 h-4 text-amber-300" />;
    case 'settings':
      return <Settings className="w-4 h-4 text-zinc-300" />;
  }
}

function renderAppContent(win: WindowInstance) {
  switch (win.appId) {
    case 'browser':
      return <AnkaBrowserApp initialUrl={win.launchParams?.initialUrl} />;
    case 'code':
      return <AnkaCodeApp initialFilePath={win.launchParams?.filePath} />;
    case 'racer3d':
      return <AnkaRacer3DApp />;
    case 'terminal':
      return <AnkaTermApp />;
    case 'taskmanager':
      return <TaskManagerApp />;
    case 'explorer':
      return <FileExplorerApp initialPath={win.launchParams?.filePath} />;
    case 'notepad':
      return <NotepadApp initialFilePath={win.launchParams?.filePath} />;
    case 'calculator':
      return <CalculatorApp />;
    case 'media':
      return <MediaViewerApp initialFilePath={win.launchParams?.filePath} />;
    case 'audio':
      return <AudioSynthApp />;
    case 'paint':
      return <PaintStudioApp />;
    case 'settings':
      return <SettingsApp />;
  }
}

export const DesktopWorkspace: React.FC = () => {
  const {
    windows,
    wallpaperSrc,
    wallpaperId,
    setWallpaperId,
    openApp,
    setStartMenuOpen,
    vfsWriteFile,
    vfsCreateFolder,
  } = useDesktop();

  const [selectedShortcut, setSelectedShortcut] = useState<AppId | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleDesktopContextMenu = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('section, aside, footer, [role="dialog"]')) return;
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - 230);
    const y = Math.min(e.clientY, window.innerHeight - 280);
    setContextMenu({ x, y });
    setStartMenuOpen(false);
  };

  const cycleWallpaper = () => {
    const idx = WALLPAPERS.findIndex((w) => w.id === wallpaperId);
    const next = WALLPAPERS[(idx + 1) % WALLPAPERS.length];
    setWallpaperId(next.id);
    setContextMenu(null);
  };

  return (
    <main
      onContextMenu={handleDesktopContextMenu}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('[data-context-menu]')) {
          setContextMenu(null);
        }
        if (!(e.target as HTMLElement).closest('[role="dialog"], footer')) {
          setStartMenuOpen(false);
        }
      }}
      className="relative w-screen h-screen overflow-hidden bg-[#090A0E]"
    >
      {/* Wallpaper Backdrop + Legibility Scrim */}
      <img
        src={wallpaperSrc}
        alt="AnkaOS Duvar Kağıdı"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-black/55 via-black/30 to-black/65 pointer-events-none" />

      {/* Desktop Shortcuts Grid */}
      <div
        aria-label="Masaüstü Kısayolları"
        className="relative z-10 p-5 grid grid-flow-col grid-rows-6 auto-cols-[96px] gap-2.5 w-fit max-h-[calc(100vh-64px)]"
      >
        {DESKTOP_SHORTCUTS.map((sc) => {
          const selected = selectedShortcut === sc.id;
          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => setSelectedShortcut(sc.id)}
              onDoubleClick={() => openApp(sc.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') openApp(sc.id);
              }}
              aria-label={`Uygulamayı aç: ${sc.label}`}
              className={`group p-2 rounded-md flex flex-col items-center justify-center gap-1.5 text-center transition-colors ${
                selected
                  ? 'bg-red-600/25 border border-red-500/60'
                  : 'border border-transparent hover:bg-white/10'
              }`}
            >
              <span className="w-11 h-11 rounded-lg bg-[#101218]/90 border border-zinc-800 flex items-center justify-center shadow-md group-hover:border-zinc-600">
                {sc.icon}
              </span>
              <span className="text-[11px] font-medium text-zinc-100 leading-tight drop-shadow">
                {sc.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Live Racer Telemetry Widget */}
      <DesktopWidgets />

      {/* Active Windows Layer */}
      {windows.map((win) => (
        <WindowFrame key={win.id} win={win} icon={getSmallIcon(win.appId)}>
          {renderAppContent(win)}
        </WindowFrame>
      ))}

      {/* Right-Click Desktop Context Menu */}
      {contextMenu && (
        <div
          data-context-menu="true"
          role="menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          className="fixed z-50 w-56 bg-[#12141C] border border-zinc-800 rounded-md shadow-2xl py-1.5 text-xs text-zinc-200"
        >
          <button
            type="button"
            onClick={() => {
              openApp('terminal');
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left hover:bg-zinc-800 flex items-center gap-2.5"
          >
            <Terminal className="w-3.5 h-3.5 text-red-400" />
            <span>AnkaTerm CLI Aç</span>
          </button>
          <button
            type="button"
            onClick={() => {
              openApp('code');
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left hover:bg-zinc-800 flex items-center gap-2.5"
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>AnkaCode Studio Aç</span>
          </button>
          <button
            type="button"
            onClick={() => {
              openApp('taskmanager');
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left hover:bg-zinc-800 flex items-center gap-2.5"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Görev Yöneticisi</span>
          </button>

          <div className="my-1 border-t border-zinc-800" />

          <button
            type="button"
            onClick={() => {
              const name = `not_${Date.now().toString().slice(-4)}.txt`;
              vfsWriteFile(`C:/Users/Racer/Desktop/${name}`, 'AnkaOS 4.5 Masaüstü Notu\n', 'text/plain');
              openApp('notepad', { filePath: `C:/Users/Racer/Desktop/${name}` });
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left hover:bg-zinc-800 flex items-center gap-2.5"
          >
            <FilePlus className="w-3.5 h-3.5 text-zinc-400" />
            <span>Yeni Metin Dosyası</span>
          </button>
          <button
            type="button"
            onClick={() => {
              vfsCreateFolder(`C:/Users/Racer/Desktop/Klasor_${Date.now().toString().slice(-3)}`);
              openApp('explorer', { filePath: 'C:/Users/Racer/Desktop' });
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left hover:bg-zinc-800 flex items-center gap-2.5"
          >
            <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
            <span>Yeni Masaüstü Klasörü</span>
          </button>

          <div className="my-1 border-t border-zinc-800" />

          <button
            type="button"
            onClick={cycleWallpaper}
            className="w-full px-3 py-2 text-left hover:bg-zinc-800 flex items-center gap-2.5"
          >
            <Monitor className="w-3.5 h-3.5 text-orange-400" />
            <span>Duvar Kağıdını Değiştir</span>
          </button>
          <button
            type="button"
            onClick={() => setContextMenu(null)}
            className="w-full px-3 py-2 text-left hover:bg-zinc-800 flex items-center gap-2.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Masaüstünü Yenile</span>
          </button>
        </div>
      )}

      <StartMenu />
      <Taskbar />
    </main>
  );
};
