import React, { useEffect, useRef, useState } from 'react';
import { Eraser, Paintbrush, Save, Trash2 } from 'lucide-react';
import { useDesktop } from '../os/DesktopContext';

const PALETTE = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#06B6D4', '#3B82F6', '#FFFFFF', '#090A0E'];

export const PaintStudioApp: React.FC = () => {
  const { vfsWriteFile } = useDesktop();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const [color, setColor] = useState('#EF4444');
  const [brushSize, setBrushSize] = useState(5);
  const [eraser, setEraser] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0D0F14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = eraser ? '#0D0F14' : color;
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0D0F14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveToVfs = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const fileName = `cizim_${Date.now().toString().slice(-4)}.png`;
    vfsWriteFile(`C:/Users/Racer/Pictures/${fileName}`, dataUrl, 'image/png');
    setSavedNotice(`C:\\Users\\Racer\\Pictures\\${fileName} olarak kaydedildi!`);
    setTimeout(() => setSavedNotice(''), 3000);
  };

  return (
    <div className="h-full flex flex-col bg-[#0C0E13] text-zinc-100">
      <div className="h-11 px-3 bg-[#141720] border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEraser(false)}
            className={`h-7 px-2.5 rounded text-xs flex items-center gap-1 ${
              !eraser ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>Fırça</span>
          </button>
          <button
            type="button"
            onClick={() => setEraser(true)}
            className={`h-7 px-2.5 rounded text-xs flex items-center gap-1 ${
              eraser ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Silgi</span>
          </button>

          <div className="flex items-center gap-1 ml-2">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Renk ${c}`}
                onClick={() => {
                  setColor(c);
                  setEraser(false);
                }}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded border ${
                  color === c && !eraser ? 'border-white scale-110' : 'border-zinc-700'
                }`}
              />
            ))}
          </div>

          <input
            type="range"
            min={2}
            max={28}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            aria-label="Fırça Kalınlığı"
            className="w-20 ml-2 accent-red-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleClear}
            className="h-7 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Temizle</span>
          </button>
          <button
            type="button"
            onClick={handleSaveToVfs}
            className="h-7 px-3 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Resimlere Kaydet</span>
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="px-3 py-1.5 bg-emerald-600/20 border-b border-emerald-500/30 text-xs text-emerald-300">
          {savedNotice}
        </div>
      )}

      <div className="flex-1 min-h-0 p-3 flex items-center justify-center bg-[#08090C] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={920}
          height={540}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="w-full h-full object-contain rounded border border-zinc-800 cursor-crosshair touch-none"
        />
      </div>
    </div>
  );
};
