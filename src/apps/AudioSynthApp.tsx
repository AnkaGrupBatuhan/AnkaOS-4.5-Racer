import React, { useEffect, useRef, useState } from 'react';
import { Music2, Play, Square, Volume2 } from 'lucide-react';
import { useDesktop } from '../os/DesktopContext';

const TRACKS = [
  { name: 'Kick', freq: 65, type: 'sine' as OscillatorType, color: 'bg-red-500' },
  { name: 'Bass', freq: 110, type: 'sawtooth' as OscillatorType, color: 'bg-orange-500' },
  { name: 'Synth', freq: 330, type: 'triangle' as OscillatorType, color: 'bg-amber-400' },
  { name: 'Lead', freq: 523.25, type: 'square' as OscillatorType, color: 'bg-cyan-400' },
];

const INITIAL_GRID: boolean[][] = [
  [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
  [true, false, true, false, false, false, true, false, true, false, true, false, false, true, false, false],
  [false, false, false, true, false, false, false, true, false, false, false, true, false, false, true, false],
  [true, false, false, false, false, true, false, false, true, false, false, false, false, true, false, true],
];

export const AudioSynthApp: React.FC = () => {
  const { volume, muted } = useDesktop();
  const [grid, setGrid] = useState<boolean[][]>(INITIAL_GRID);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [bpm, setBpm] = useState(128);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gridRef = useRef(grid);
  const volumeRef = useRef(muted ? 0 : volume / 100);

  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  useEffect(() => {
    volumeRef.current = muted ? 0 : volume / 100;
  }, [volume, muted]);

  const triggerSound = (freq: number, type: OscillatorType, duration: number) => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtor();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (freq < 90) {
        osc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + duration);
      }

      const masterGain = Math.max(0.01, volumeRef.current * 0.25);
      gain.gain.setValueAtTime(masterGain, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // ignore audio context block
    }
  };

  useEffect(() => {
    if (!playing) return;
    const intervalMs = Math.round((60 / bpm / 4) * 1000);
    const id = window.setInterval(() => {
      setStep((prev) => {
        const next = (prev + 1) % 16;
        TRACKS.forEach((tr, rowIdx) => {
          if (gridRef.current[rowIdx][next]) {
            triggerSound(tr.freq, tr.type, rowIdx === 0 ? 0.16 : 0.12);
          }
        });
        return next;
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [playing, bpm]);

  useEffect(() => {
    return () => {
      audioCtxRef.current?.close();
    };
  }, []);

  const toggleCell = (row: number, col: number) => {
    setGrid((prev) =>
      prev.map((r, rIdx) => (rIdx === row ? r.map((v, cIdx) => (cIdx === col ? !v : v)) : r))
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#0C0E13] text-zinc-100 p-4 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Music2 className="w-5 h-5 text-red-500" />
          <div>
            <h3 className="font-display text-sm font-bold">AnkaAudio Synthwave Sequencer</h3>
            <p className="text-[11px] text-zinc-400">Web Audio API Prosedürel Yarış Müziği Stüdyosu</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <span>BPM</span>
            <input
              type="range"
              min={80}
              max={170}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              aria-label="Tempo BPM"
              className="w-24 accent-red-500"
            />
            <span className="font-mono-tabular w-8">{bpm}</span>
          </div>

          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className={`px-4 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 ${
              playing ? 'bg-zinc-800 text-zinc-200' : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            {playing ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{playing ? 'Durdur' : 'Oynat'}</span>
          </button>
        </div>
      </div>

      {/* 16-Step Matrix */}
      <div className="flex-1 flex flex-col justify-center gap-2.5 overflow-x-auto">
        {TRACKS.map((track, rowIdx) => (
          <div key={track.name} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => triggerSound(track.freq, track.type, 0.18)}
              className="w-16 shrink-0 h-9 rounded bg-[#151822] hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-1"
            >
              <Volume2 className="w-3 h-3 text-zinc-400" />
              <span>{track.name}</span>
            </button>
            <div className="flex-1 grid grid-cols-16 gap-1 min-w-[440px]">
              {grid[rowIdx].map((active, colIdx) => {
                const isCurrentStep = playing && step === colIdx;
                return (
                  <button
                    key={colIdx}
                    type="button"
                    aria-label={`${track.name} Adım ${colIdx + 1}`}
                    onClick={() => toggleCell(rowIdx, colIdx)}
                    className={`h-9 rounded border transition-colors ${
                      active
                        ? `${track.color} border-white/25`
                        : colIdx % 4 === 0
                        ? 'bg-[#171B26] border-zinc-800 hover:border-zinc-600'
                        : 'bg-[#12141C] border-zinc-800/70 hover:border-zinc-700'
                    } ${isCurrentStep ? 'ring-2 ring-white' : ''}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="text-[11px] text-zinc-500 flex items-center justify-between pt-2 border-t border-zinc-800">
        <span>Adım: {step + 1} / 16</span>
        <span>Sistem Sesi: {muted ? 'Sessiz' : `%${volume}`}</span>
      </div>
    </div>
  );
};
