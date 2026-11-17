import React from 'react';
import { Code2, Cpu, Monitor, Palette, RotateCcw, Zap } from 'lucide-react';
import { useDesktop } from '../os/DesktopContext';
import { AccentTheme, WALLPAPERS } from '../os/types';

export const SettingsApp: React.FC = () => {
  const {
    wallpaperId,
    setWallpaperId,
    accent,
    setAccent,
    turboMode,
    setTurboMode,
    vfsReset,
    openApp,
  } = useDesktop();

  const accents: Array<{ id: AccentTheme; label: string; swatch: string }> = [
    { id: 'red', label: 'Yarış Kırmızısı', swatch: 'bg-red-500' },
    { id: 'amber', label: 'Apex Turuncusu', swatch: 'bg-orange-500' },
    { id: 'cyan', label: 'Nitro Camgöbeği', swatch: 'bg-cyan-500' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#0C0E13] text-zinc-100 p-5 space-y-6">
      <div>
        <h2 className="font-display text-lg font-bold text-white">Racer Kontrol Merkezi</h2>
        <p className="text-xs text-zinc-400">
          AnkaOS 4.5 görünüm, performans modu ve hibrit C#/Python altyapı ayarları
        </p>
      </div>

      {/* Wallpaper Picker */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
          <Monitor className="w-4 h-4 text-red-500" />
          <span>Masaüstü Duvar Kağıdı</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {WALLPAPERS.map((wp) => {
            const active = wp.id === wallpaperId;
            return (
              <button
                key={wp.id}
                type="button"
                onClick={() => setWallpaperId(wp.id)}
                className={`rounded-md overflow-hidden border-2 text-left transition-all ${
                  active ? 'border-red-500' : 'border-zinc-800 hover:border-zinc-600'
                }`}
              >
                <img
                  src={wp.src}
                  alt={wp.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-20 object-cover"
                />
                <div className="px-2 py-1.5 bg-[#141720] text-[11px] font-medium truncate">
                  {wp.name}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Accent Color */}
      <section className="space-y-3 pt-4 border-t border-zinc-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
          <Palette className="w-4 h-4 text-orange-400" />
          <span>Vurgu Rengi</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {accents.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAccent(a.id)}
              className={`px-3 py-2 rounded border text-xs font-medium flex items-center gap-2 ${
                accent === a.id
                  ? 'bg-[#191D29] border-zinc-500 text-white'
                  : 'bg-[#12141C] border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${a.swatch}`} />
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Performance Mode */}
      <section className="pt-4 border-t border-zinc-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-orange-400 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-zinc-100">Turbo Performans Modu</div>
            <div className="text-[11px] text-zinc-400">
              144 Hz örnekleme ve AnkaRacer 3D motorunda +12% azami hız sağlar
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setTurboMode(!turboMode)}
          className={`px-4 py-1.5 rounded text-xs font-semibold ${
            turboMode ? 'bg-orange-500 text-zinc-950' : 'bg-zinc-800 text-zinc-200'
          }`}
        >
          {turboMode ? 'Aktif' : 'Kapalı'}
        </button>
      </section>

      {/* Hybrid C# + Python Native Source Link */}
      <section className="p-4 rounded-md bg-[#12151E] border border-zinc-800 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-100">
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>C# (.NET 8 WPF) & Python Interop Kaynak Paketi</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Masaüstü kabuğu ve Python sanal disk köprüsünün kaynak kodları{' '}
          <span className="font-mono text-zinc-200">D:\Projects\AnkaOS_Native</span> dizininde yer alır.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => openApp('code', { filePath: 'D:/Projects/AnkaOS_Native/WindowManager.cs' })}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-medium flex items-center gap-1.5"
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>WindowManager.cs Aç</span>
          </button>
          <button
            type="button"
            onClick={() => openApp('code', { filePath: 'D:/Projects/AnkaOS_Native/anka_bridge.py' })}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-medium flex items-center gap-1.5"
          >
            <Code2 className="w-3.5 h-3.5 text-amber-400" />
            <span>anka_bridge.py Aç</span>
          </button>
          <button
            type="button"
            onClick={vfsReset}
            className="px-3 py-1.5 rounded bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Sanal Diski Sıfırla</span>
          </button>
        </div>
      </section>
    </div>
  );
};
