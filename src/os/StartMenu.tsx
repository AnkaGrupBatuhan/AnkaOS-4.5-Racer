import React, { useMemo, useState } from 'react';
import {
  Activity,
  Calculator,
  Code2,
  FolderOpen,
  Gamepad2,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Music2,
  Paintbrush,
  Power,
  RotateCcw,
  Search,
  Settings,
  Terminal,
  FileText,
  Zap,
} from 'lucide-react';
import { useDesktop } from './DesktopContext';
import { AppId } from './types';

export interface AppCatalogEntry {
  id: AppId;
  name: string;
  subtitle: string;
  pinned?: boolean;
  icon: React.ReactNode;
}

export const APP_CATALOG: AppCatalogEntry[] = [
  {
    id: 'racer3d',
    name: 'AnkaRacer 3D',
    subtitle: 'Three.js 3D Gece Otoyolu Yarışı',
    pinned: true,
    icon: <Gamepad2 className="w-5 h-5 text-red-500" />,
  },
  {
    id: 'browser',
    name: 'AnkaBrowser',
    subtitle: 'Engelsiz Google Arama & Proxy Tarayıcı',
    pinned: true,
    icon: <Globe className="w-5 h-5 text-orange-400" />,
  },
  {
    id: 'code',
    name: 'AnkaCode Studio',
    subtitle: 'Çok Sekmeli Kod Editörü & Çalıştırıcı',
    pinned: true,
    icon: <Code2 className="w-5 h-5 text-cyan-400" />,
  },
  {
    id: 'terminal',
    name: 'AnkaTerm CLI',
    subtitle: 'Python Destekli Komut Satırı',
    pinned: true,
    icon: <Terminal className="w-5 h-5 text-red-400" />,
  },
  {
    id: 'taskmanager',
    name: 'Görev Yöneticisi',
    subtitle: 'Canlı Telemetri & Süreç Denetimi',
    pinned: true,
    icon: <Activity className="w-5 h-5 text-emerald-400" />,
  },
  {
    id: 'explorer',
    name: 'Dosya Gezgini',
    subtitle: 'C: ve D: Sanal Depolama',
    pinned: true,
    icon: <FolderOpen className="w-5 h-5 text-amber-400" />,
  },
  {
    id: 'notepad',
    name: 'RacerPad',
    subtitle: 'Metin ve Not Düzenleyici',
    icon: <FileText className="w-5 h-5 text-zinc-300" />,
  },
  {
    id: 'calculator',
    name: 'TurboCalc',
    subtitle: 'Bilimsel Hesap Makinesi',
    icon: <Calculator className="w-5 h-5 text-orange-300" />,
  },
  {
    id: 'media',
    name: 'Medya Görüntüleyici',
    subtitle: 'Görseller & Duvar Kağıtları',
    icon: <ImageIcon className="w-5 h-5 text-sky-400" />,
  },
  {
    id: 'audio',
    name: 'AnkaAudio Synth',
    subtitle: 'Synthwave Ritim & Ekolayzır',
    icon: <Music2 className="w-5 h-5 text-rose-400" />,
  },
  {
    id: 'paint',
    name: 'RacerSketch',
    subtitle: 'Çizim ve Tasarım Stüdyosu',
    icon: <Paintbrush className="w-5 h-5 text-amber-300" />,
  },
  {
    id: 'settings',
    name: 'Kontrol Merkezi',
    subtitle: 'Tema, Duvar Kağıdı & Mimari',
    icon: <Settings className="w-5 h-5 text-zinc-300" />,
  },
];

export const StartMenu: React.FC = () => {
  const { startMenuOpen, setStartMenuOpen, openApp, turboMode, setTurboMode, vfsReset } =
    useDesktop();
  const [query, setQuery] = useState('');

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return APP_CATALOG;
    return APP_CATALOG.filter(
      (a) => a.name.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q)
    );
  }, [query]);

  if (!startMenuOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="AnkaOS Başlat Menüsü"
      className="fixed bottom-14 left-3 z-50 w-[560px] max-w-[calc(100vw-24px)] bg-[#101218] border border-zinc-800 rounded-lg shadow-2xl overflow-hidden"
    >
      {/* Top Search & Brand Header */}
      <div className="p-4 bg-[#151821] border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-base font-bold text-zinc-100 tracking-wide">
              AnkaOS 4.5 Racer Edition
            </h2>
            <p className="text-xs text-zinc-400">
              C# WPF Shell · Python 3.12 Köprüsü · Sanal Disk
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTurboMode(!turboMode)}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              turboMode
                ? 'bg-orange-500 text-zinc-950'
                : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{turboMode ? 'Turbo Aktif' : 'Turbo Modu'}</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Uygulama veya araç ara..."
            aria-label="Başlat menüsünde ara"
            autoFocus
            className="w-full bg-[#0B0C10] border border-zinc-800 focus:border-red-500 rounded px-9 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
          />
        </div>
      </div>

      {/* App Grid */}
      <div className="p-4 max-h-80 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2">
        {filteredApps.map((app) => (
          <button
            key={app.id}
            type="button"
            onClick={() => {
              openApp(app.id);
              setQuery('');
            }}
            className="flex items-start gap-2.5 p-2.5 rounded bg-[#151822] hover:bg-[#1E2230] border border-transparent hover:border-zinc-700 text-left transition-colors"
          >
            <span className="mt-0.5 shrink-0">{app.icon}</span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-zinc-100 truncate">
                {app.name}
              </span>
              <span className="block text-[11px] text-zinc-400 truncate">
                {app.subtitle}
              </span>
            </span>
          </button>
        ))}
        {filteredApps.length === 0 && (
          <div className="col-span-3 py-8 text-center text-xs text-zinc-500">
            Aramanızla eşleşen uygulama bulunamadı.
          </div>
        )}
      </div>

      {/* Quick Drives & Power Strip */}
      <div className="px-4 py-2.5 bg-[#0D0F14] border-t border-zinc-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openApp('explorer', { filePath: 'C:' })}
            className="px-2.5 py-1.5 rounded text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-1.5"
          >
            <HardDrive className="w-3.5 h-3.5 text-red-500" />
            <span>Sürücü C:</span>
          </button>
          <button
            type="button"
            onClick={() => openApp('explorer', { filePath: 'D:' })}
            className="px-2.5 py-1.5 rounded text-xs text-zinc-300 hover:bg-zinc-800 flex items-center gap-1.5"
          >
            <HardDrive className="w-3.5 h-3.5 text-orange-400" />
            <span>Sürücü D:</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              vfsReset();
              setStartMenuOpen(false);
            }}
            title="Sanal Diski Sıfırla"
            className="px-2.5 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Diski Sıfırla</span>
          </button>
          <button
            type="button"
            onClick={() => setStartMenuOpen(false)}
            className="px-2.5 py-1.5 rounded text-xs text-red-400 hover:text-white hover:bg-red-600/90 flex items-center gap-1 transition-colors"
          >
            <Power className="w-3.5 h-3.5" />
            <span>Kapat</span>
          </button>
        </div>
      </div>
    </div>
  );
};
