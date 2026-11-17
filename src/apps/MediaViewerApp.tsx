import React, { useMemo, useState } from 'react';
import { Image as ImageIcon, Monitor, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { useDesktop } from '../os/DesktopContext';
import { getAllVfsFiles } from '../core/vfs';
import { WALLPAPERS } from '../os/types';

export const MediaViewerApp: React.FC<{ initialFilePath?: string }> = ({ initialFilePath }) => {
  const { vfs, setWallpaperId } = useDesktop();
  const images = useMemo(() => {
    return getAllVfsFiles(vfs).filter(
      (f) => f.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(f.name)
    );
  }, [vfs]);

  const [selectedPath, setSelectedPath] = useState<string>(
    initialFilePath || images[0]?.path || ''
  );
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [toast, setToast] = useState('');

  const activeImage = images.find((img) => img.path === selectedPath) || images[0];

  const handleSetWallpaper = () => {
    if (!activeImage?.content) return;
    const matched = WALLPAPERS.find((w) => w.src === activeImage.content);
    if (matched) {
      setWallpaperId(matched.id);
      setToast('Masaüstü duvar kağıdı güncellendi.');
      setTimeout(() => setToast(''), 2500);
    } else {
      setToast('Önizleme görseli aktif.');
      setTimeout(() => setToast(''), 2000);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0A0B0F] text-zinc-100">
      <div className="h-10 px-3 bg-[#141720] border-b border-zinc-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium truncate">
          <ImageIcon className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="truncate">{activeImage?.name || 'Görsel Yok'}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            aria-label="Uzaklaştır"
            onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(1))))}
            className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono-tabular text-xs w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label="Yakınlaştır"
            onClick={() => setZoom((z) => Math.min(2.4, Number((z + 0.2).toFixed(1))))}
            className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label="Döndür"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleSetWallpaper}
            className="h-7 px-2.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Duvar Kağıdı Yap</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="px-3 py-1.5 bg-emerald-600/20 border-b border-emerald-500/30 text-xs text-emerald-300">
          {toast}
        </div>
      )}

      <div className="flex-1 min-h-0 flex items-center justify-center overflow-auto p-6 bg-[#07080B]">
        {activeImage?.content ? (
          <img
            src={activeImage.content}
            alt={activeImage.name}
            referrerPolicy="no-referrer"
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="max-w-full max-h-full object-contain rounded shadow-2xl border border-zinc-800"
          />
        ) : (
          <div className="text-xs text-zinc-500">VFS içinde görüntülenecek görsel bulunamadı.</div>
        )}
      </div>

      {/* Thumbnail Strip */}
      <div className="h-20 bg-[#11131B] border-t border-zinc-800 px-3 flex items-center gap-2 overflow-x-auto">
        {images.map((img) => (
          <button
            key={img.path}
            type="button"
            onClick={() => {
              setSelectedPath(img.path);
              setZoom(1);
              setRotation(0);
            }}
            className={`h-14 w-24 rounded overflow-hidden border-2 shrink-0 transition-colors ${
              img.path === activeImage?.path ? 'border-red-500' : 'border-zinc-800 hover:border-zinc-600'
            }`}
          >
            <img
              src={img.content}
              alt={img.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
};
