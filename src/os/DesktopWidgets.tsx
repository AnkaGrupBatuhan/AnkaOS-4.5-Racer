import React from 'react';
import { Activity, Cpu, Gauge, Zap } from 'lucide-react';
import { useDesktop } from './DesktopContext';

interface ArcGaugeProps {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
}

const ArcGauge: React.FC<ArcGaugeProps> = ({ label, value, max, unit, color }) => {
  const pct = Math.max(0, Math.min(1, value / max));
  const radius = 34;
  const circumference = Math.PI * radius; // semicircle
  const dashOffset = circumference * (1 - pct);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-14 flex items-end justify-center">
        <svg viewBox="0 0 88 50" className="w-full h-full overflow-visible">
          <path
            d="M 10 44 A 34 34 0 0 1 78 44"
            fill="none"
            stroke="#272A36"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M 10 44 A 34 34 0 0 1 78 44"
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 320ms cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </svg>
        <div className="absolute bottom-0 text-center">
          <span className="font-mono-tabular text-sm font-bold text-zinc-100">
            {Math.round(value)}
            {unit}
          </span>
        </div>
      </div>
      <span className="mt-1 text-[11px] font-medium text-zinc-400 tracking-wide">{label}</span>
    </div>
  );
};

export const DesktopWidgets: React.FC = () => {
  const { telemetry, turboMode, setTurboMode, accent, openApp, processes } = useDesktop();

  const accentHex =
    accent === 'amber' ? '#F97316' : accent === 'cyan' ? '#06B6D4' : '#EF4444';

  const ramPct = (telemetry.ramUsedMb / telemetry.ramTotalMb) * 100;

  return (
    <aside
      aria-label="Racer Telemetri Paneli"
      className="fixed top-5 right-5 z-10 w-72 bg-[#101218]/92 border border-zinc-800 rounded-lg p-4 shadow-xl"
    >
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-red-500" />
          <h2 className="font-display text-sm font-bold tracking-wide text-zinc-100">
            Racer Telemetri
          </h2>
        </div>
        <button
          type="button"
          onClick={() => openApp('taskmanager')}
          className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          Detaylar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 py-3">
        <ArcGauge label="CPU Yükü" value={telemetry.cpuPercent} max={100} unit="%" color={accentHex} />
        <ArcGauge label="RAM Kullanımı" value={ramPct} max={100} unit="%" color="#F97316" />
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80 text-center">
        <div>
          <div className="text-[11px] text-zinc-500">Hız / FPS</div>
          <div className="font-mono-tabular text-xs font-semibold text-zinc-100">
            {telemetry.fps} Hz
          </div>
        </div>
        <div>
          <div className="text-[11px] text-zinc-500">Bellek</div>
          <div className="font-mono-tabular text-xs font-semibold text-zinc-100">
            {(telemetry.ramUsedMb / 1024).toFixed(1)} GB
          </div>
        </div>
        <div>
          <div className="text-[11px] text-zinc-500">Süreç</div>
          <div className="font-mono-tabular text-xs font-semibold text-zinc-100">
            {processes.length}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Cpu className="w-3.5 h-3.5 text-zinc-500" />
          <span>{turboMode ? 'Turbo Aktif' : 'Standart Mod'}</span>
        </div>
        <button
          type="button"
          onClick={() => setTurboMode(!turboMode)}
          aria-pressed={turboMode}
          className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
            turboMode
              ? 'bg-orange-500 text-zinc-950 hover:bg-orange-400'
              : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{turboMode ? 'Turbo Kapat' : 'Turbo Aç'}</span>
        </button>
      </div>
    </aside>
  );
};
