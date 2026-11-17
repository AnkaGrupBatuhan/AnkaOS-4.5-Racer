import React, { useState } from 'react';
import { Delete } from 'lucide-react';

export const CalculatorApp: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [history, setHistory] = useState<string[]>([]);
  const [scientific, setScientific] = useState(false);

  const appendChar = (ch: string) => {
    setDisplay((prev) => (prev === '0' && !'.+-*/%'.includes(ch) ? ch : prev + ch));
  };

  const evaluateExpr = () => {
    try {
      const sanitized = display
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, String(Math.PI));
      if (!/^[0-9+\-*/().%\s]+$/.test(sanitized)) {
        setDisplay('Hata');
        return;
      }
      const res = Function(`"use strict"; return (${sanitized})`)();
      const formatted = Number.isFinite(res) ? String(Number(res.toFixed(8))) : 'Hata';
      setHistory((prev) => [`${display} = ${formatted}`, ...prev].slice(0, 6));
      setDisplay(formatted);
    } catch {
      setDisplay('Hata');
    }
  };

  const applyScientific = (fn: 'sqrt' | 'sq' | 'sin' | 'cos') => {
    const val = Number(display);
    if (Number.isNaN(val)) return;
    let out = val;
    if (fn === 'sqrt') out = Math.sqrt(val);
    if (fn === 'sq') out = val * val;
    if (fn === 'sin') out = Math.sin((val * Math.PI) / 180);
    if (fn === 'cos') out = Math.cos((val * Math.PI) / 180);
    const formatted = String(Number(out.toFixed(8)));
    setHistory((prev) => [`${fn}(${val}) = ${formatted}`, ...prev].slice(0, 6));
    setDisplay(formatted);
  };

  const keys = [
    ['C', '(', ')', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '⌫', '='],
  ];

  return (
    <div className="h-full flex flex-col bg-[#0C0E13] text-zinc-100 p-3 gap-3">
      <div className="flex items-center justify-between">
        <span className="font-display text-xs font-semibold text-zinc-400">
          {scientific ? 'Bilimsel Mod' : 'Standart Mod'}
        </span>
        <button
          type="button"
          onClick={() => setScientific((s) => !s)}
          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200"
        >
          {scientific ? 'Standart' : 'Bilimsel'}
        </button>
      </div>

      {/* Display & History */}
      <div className="bg-[#12151E] border border-zinc-800 rounded-md p-3 text-right">
        <div className="h-10 overflow-y-auto text-[11px] font-mono-tabular text-zinc-500 space-y-0.5">
          {history.map((h, i) => (
            <div key={i}>{h}</div>
          ))}
        </div>
        <div
          data-testid="calc-display"
          className="font-mono-tabular text-3xl font-bold text-white truncate mt-1"
        >
          {display}
        </div>
      </div>

      {scientific && (
        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => applyScientific('sqrt')}
            className="h-9 rounded bg-[#181C28] hover:bg-zinc-700 text-xs font-mono"
          >
            √x
          </button>
          <button
            type="button"
            onClick={() => applyScientific('sq')}
            className="h-9 rounded bg-[#181C28] hover:bg-zinc-700 text-xs font-mono"
          >
            x²
          </button>
          <button
            type="button"
            onClick={() => applyScientific('sin')}
            className="h-9 rounded bg-[#181C28] hover:bg-zinc-700 text-xs font-mono"
          >
            sin°
          </button>
          <button
            type="button"
            onClick={() => applyScientific('cos')}
            className="h-9 rounded bg-[#181C28] hover:bg-zinc-700 text-xs font-mono"
          >
            cos°
          </button>
        </div>
      )}

      {/* Keypad */}
      <div className="flex-1 grid grid-cols-4 gap-2">
        {keys.flat().map((k) => {
          const isEquals = k === '=';
          const isOp = ['÷', '×', '-', '+'].includes(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                if (k === 'C') setDisplay('0');
                else if (k === '⌫') setDisplay((d) => (d.length > 1 ? d.slice(0, -1) : '0'));
                else if (k === '=') evaluateExpr();
                else appendChar(k);
              }}
              className={`rounded font-mono-tabular text-base font-semibold flex items-center justify-center transition-colors ${
                isEquals
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : isOp
                  ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/30'
                  : k === 'C'
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-red-400'
                  : 'bg-[#151822] hover:bg-[#1E2332] text-zinc-100 border border-zinc-800/80'
              }`}
            >
              {k === '⌫' ? <Delete className="w-4 h-4" /> : k}
            </button>
          );
        })}
      </div>
    </div>
  );
};
