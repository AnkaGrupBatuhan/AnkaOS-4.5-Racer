import React, { useState } from 'react';
import { Activity, Cpu, HardDrive, MemoryStick, Trash2, Zap } from 'lucide-react';
import { useDesktop } from '../os/DesktopContext';

function SparklineChart({
  data,
  color,
  max = 100,
}: {
  data: number[];
  color: string;
  max?: number;
}) {
  const width = 320;
  const height = 72;
  const step = width / Math.max(1, data.length - 1);
  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = height - (Math.max(0, Math.min(max, v)) / max) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-18 overflow-visible">
      <polygon points={areaPoints} fill={color} fillOpacity="0.14" />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export const TaskManagerApp: React.FC = () => {
  const { telemetry, processes, killProcess, turboMode, setTurboMode } = useDesktop();
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'app' | 'python' | 'kernel'>('all');

  const filteredProcesses = processes.filter((p) =>
    filterType === 'all' ? true : p.type === filterType
  );

  const ramPct = ((telemetry.ramUsedMb / telemetry.ramTotalMb) * 100).toFixed(1);

  return (
    <div className="h-full flex flex-col bg-[#0C0E13] text-zinc-100">
      {/* Top Action Strip */}
      <div className="px-4 py-3 bg-[#13161E] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-red-500" />
          <span className="font-display text-sm font-bold tracking-wide">
            Sistem Telemetrisi ve Süreç Denetimi
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-0.5 bg-[#0A0B0F] border border-zinc-800 rounded">
            {(['all', 'app', 'python', 'kernel'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterType(tab)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  filterType === tab
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab === 'all' ? 'Tümü' : tab === 'app' ? 'Uygulamalar' : tab === 'python' ? 'Python' : 'Çekirdek'}
              </button>
            ))}
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
            <span>{turboMode ? 'Turbo Aktif' : 'Turbo Başlat'}</span>
          </button>
        </div>
      </div>

      {/* Live Telemetry Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border-b border-zinc-800 bg-[#0F1118]">
        <div className="bg-[#131620] border border-zinc-800 rounded-md p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <Cpu className="w-4 h-4 text-red-500" />
              <span>CPU Performansı</span>
            </div>
            <span className="font-mono-tabular text-sm font-bold text-red-400">
              %{telemetry.cpuPercent.toFixed(1)}
            </span>
          </div>
          <SparklineChart data={telemetry.historyCpu} color="#EF4444" />
          <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400 font-mono-tabular">
            <span>FPS: {telemetry.fps} Hz</span>
            <span>GPU Yükü: %{telemetry.gpuPercent}</span>
          </div>
        </div>

        <div className="bg-[#131620] border border-zinc-800 rounded-md p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <MemoryStick className="w-4 h-4 text-orange-400" />
              <span>Sanal Bellek (RAM)</span>
            </div>
            <span className="font-mono-tabular text-sm font-bold text-orange-400">
              {telemetry.ramUsedMb} / {telemetry.ramTotalMb} MB (%{ramPct})
            </span>
          </div>
          <SparklineChart data={telemetry.historyRam} color="#F97316" />
          <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400 font-mono-tabular">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" /> Disk I/O: {telemetry.diskIoMb} MB/s
            </span>
            <span>Aktif Süreç: {processes.length}</span>
          </div>
        </div>
      </div>

      {/* Process Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 bg-[#141722] border-b border-zinc-800 text-zinc-400">
            <tr>
              <th className="py-2.5 px-4 font-semibold">Süreç Adı</th>
              <th className="py-2.5 px-3 font-semibold">PID</th>
              <th className="py-2.5 px-3 font-semibold">Katman</th>
              <th className="py-2.5 px-3 font-semibold text-right">CPU</th>
              <th className="py-2.5 px-3 font-semibold text-right">Bellek</th>
              <th className="py-2.5 px-4 font-semibold text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/70">
            {filteredProcesses.map((proc) => {
              const isSelected = selectedPid === proc.pid;
              const canKill = proc.type === 'app';
              return (
                <tr
                  key={proc.pid}
                  onClick={() => setSelectedPid(proc.pid)}
                  className={`transition-colors ${
                    isSelected ? 'bg-red-500/10' : 'hover:bg-zinc-800/40'
                  }`}
                >
                  <td className="py-2 px-4">
                    <div className="font-medium text-zinc-100">{proc.title}</div>
                    <div className="text-[11px] text-zinc-500 font-mono">{proc.name}</div>
                  </td>
                  <td className="py-2 px-3 font-mono-tabular text-zinc-400">{proc.pid}</td>
                  <td className="py-2 px-3 text-zinc-300">
                    {proc.type === 'kernel'
                      ? 'C# Çekirdek'
                      : proc.type === 'python'
                      ? 'Python Servisi'
                      : 'Uygulama'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono-tabular text-zinc-200">
                    %{proc.cpu.toFixed(1)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono-tabular text-zinc-200">
                    {proc.memoryMb} MB
                  </td>
                  <td className="py-2 px-4 text-right">
                    {canKill ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          killProcess(proc.pid);
                        }}
                        className="px-2.5 py-1 rounded bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Görevi Sonlandır</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-zinc-500">Korunan Servis</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
