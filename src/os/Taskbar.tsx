import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Flame,
  Volume2,
  VolumeX,
  Wifi,
  Zap,
} from 'lucide-react';
import { useDesktop } from './DesktopContext';
import { APP_CATALOG } from './StartMenu';

export const Taskbar: React.FC = () => {
  const {
    windows,
    activeWindowId,
    startMenuOpen,
    setStartMenuOpen,
    focusWindow,
    minimizeWindow,
    turboMode,
    setTurboMode,
    volume,
    setVolume,
    muted,
    setMuted,
    accent,
  } = useDesktop();

  const [now, setNow] = useState(() => new Date());
  const [showVolume, setShowVolume] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const accentBar =
    accent === 'amber'
      ? 'bg-orange-500'
      : accent === 'cyan'
      ? 'bg-cyan-500'
      : 'bg-red-500';

  const getAppIcon = (appId: string) => {
    return APP_CATALOG.find((a) => a.id === appId)?.icon ?? null;
  };

  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <footer
      aria-label="Görev Çubuğu"
      className="fixed bottom-0 left-0 right-0 h-[52px] z-40 bg-[#0D0F14] border-t border-zinc-800 px-3 flex items-center justify-between gap-4"
    >
      {/* Left: AnkaOS Racer Start Button */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            setStartMenuOpen((o) => !o);
            setShowVolume(false);
            setShowCalendar(false);
          }}
          aria-expanded={startMenuOpen}
          aria-label="AnkaOS Racer Başlat Menüsü"
          className={`h-9 px-3.5 rounded flex items-center gap-2 font-display text-sm font-bold tracking-wide transition-colors whitespace-nowrap shrink-0 ${
            startMenuOpen
              ? 'bg-red-600 text-white'
              : 'bg-[#171A24] hover:bg-[#1F2432] text-zinc-100 border border-zinc-800'
          }`}
        >
          <Flame className="w-4 h-4 text-red-500 fill-red-500/20" />
          <span>AnkaOS</span>
        </button>
      </div>

      {/* Center: Open Window Tabs */}
      <nav aria-label="Açık Pencereler" className="flex-1 flex items-center gap-1.5 overflow-x-auto min-w-0">
        {windows.map((w) => {
          const isActive = activeWindowId === w.id && !w.minimized;
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => (isActive ? minimizeWindow(w.id) : focusWindow(w.id))}
              className={`relative h-9 px-3 rounded flex items-center gap-2 text-xs font-medium max-w-[190px] transition-colors shrink-0 ${
                isActive
                  ? 'bg-[#1D212E] text-zinc-100 border border-zinc-700'
                  : 'bg-[#13161E] text-zinc-400 hover:text-zinc-200 hover:bg-[#1A1D28] border border-transparent'
              }`}
            >
              <span className="shrink-0 flex items-center">{getAppIcon(w.appId)}</span>
              <span className="truncate">{w.title}</span>
              {isActive && (
                <span className={`absolute bottom-0 left-2 right-2 h-0.5 ${accentBar}`} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Right: System Tray */}
      <div className="flex items-center gap-2 shrink-0 relative">
        <button
          type="button"
          onClick={() => setTurboMode(!turboMode)}
          aria-label="Turbo Modunu Değiştir"
          className={`h-8 px-2.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
            turboMode
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{turboMode ? 'TURBO' : 'EKO'}</span>
        </button>

        <div
          title="Ağ Bağlantısı: AnkaNet Fiber 10 Gbps"
          className="h-8 px-2 flex items-center text-zinc-300"
        >
          <Wifi className="w-4 h-4" />
        </div>

        <button
          type="button"
          aria-label="Ses Seviyesi"
          onClick={() => {
            setShowVolume((s) => !s);
            setShowCalendar(false);
          }}
          className="h-8 px-2 rounded flex items-center gap-1 text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          {muted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          <span className="font-mono-tabular text-xs">{muted ? '0%' : `${volume}%`}</span>
        </button>

        <button
          type="button"
          aria-label="Saat ve Takvim"
          onClick={() => {
            setShowCalendar((s) => !s);
            setShowVolume(false);
          }}
          className="h-9 px-2.5 rounded flex flex-col items-end justify-center leading-tight text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <span className="font-mono-tabular text-xs font-semibold">{timeStr}</span>
          <span className="font-mono-tabular text-[10px] text-zinc-400">{dateStr}</span>
        </button>

        {/* Volume Popover */}
        {showVolume && (
          <div className="absolute bottom-12 right-20 w-56 bg-[#13161E] border border-zinc-800 rounded-lg p-3 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-200">Sistem Sesi</span>
              <button
                type="button"
                onClick={() => setMuted(!muted)}
                className="text-xs text-red-400 hover:text-red-300"
              >
                {muted ? 'Sesi Aç' : 'Sessiz'}
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={(e) => {
                setMuted(false);
                setVolume(Number(e.target.value));
              }}
              aria-label="Ana Ses Düzeyi"
              className="w-full accent-red-500 cursor-pointer"
            />
          </div>
        )}

        {/* Calendar Popover */}
        {showCalendar && (
          <div className="absolute bottom-12 right-0 w-64 bg-[#13161E] border border-zinc-800 rounded-lg p-3.5 shadow-2xl">
            <div className="flex items-center gap-2 pb-2 mb-2 border-b border-zinc-800">
              <Calendar className="w-4 h-4 text-red-500" />
              <span className="font-display text-sm font-semibold text-zinc-100">
                {now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="text-xs text-zinc-300 font-mono-tabular">
              {now.toLocaleDateString('tr-TR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
            <div className="mt-2 text-[11px] text-zinc-400">
              AnkaOS 4.5 Racer Edition · Yerel Sistem Saati
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};
