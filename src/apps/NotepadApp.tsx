import React, { useEffect, useState } from 'react';
import { FileText, FolderOpen, Save } from 'lucide-react';
import { useDesktop } from '../os/DesktopContext';
import { getAllVfsFiles, readVfsFile, toWindowsDisplayPath } from '../core/vfs';

export const NotepadApp: React.FC<{ initialFilePath?: string }> = ({ initialFilePath }) => {
  const { vfs, vfsWriteFile } = useDesktop();
  const textFiles = getAllVfsFiles(vfs).filter((f) => !f.mimeType?.startsWith('image/'));

  const [filePath, setFilePath] = useState(
    initialFilePath || 'C:/Users/Racer/Documents/hosgeldiniz.txt'
  );
  const [content, setContent] = useState(() => {
    const f = readVfsFile(vfs, initialFilePath || 'C:/Users/Racer/Documents/hosgeldiniz.txt');
    return f?.content ?? '';
  });
  const [statusMsg, setStatusMsg] = useState('Hazır');
  const [showOpenDrawer, setShowOpenDrawer] = useState(false);

  useEffect(() => {
    if (initialFilePath) {
      const f = readVfsFile(vfs, initialFilePath);
      if (f) {
        setFilePath(f.path);
        setContent(f.content ?? '');
      }
    }
  }, [initialFilePath]);

  const handleSave = () => {
    vfsWriteFile(filePath, content, 'text/plain');
    setStatusMsg(`Kaydedildi: ${toWindowsDisplayPath(filePath)}`);
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="h-full flex flex-col bg-[#0C0E13] text-zinc-100">
      <div className="h-10 px-3 bg-[#141720] border-b border-zinc-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            type="text"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            aria-label="Dosya Yolu"
            className="w-64 max-w-full h-7 px-2 rounded bg-[#0A0B0F] border border-zinc-800 text-xs font-mono text-zinc-200 outline-none focus:border-red-500"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowOpenDrawer((s) => !s)}
            className="h-7 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs flex items-center gap-1.5"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Aç</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-7 px-3 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Kaydet</span>
          </button>
        </div>
      </div>

      {showOpenDrawer && (
        <div className="p-2 bg-[#12151E] border-b border-zinc-800 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
          {textFiles.map((f) => (
            <button
              key={f.path}
              type="button"
              onClick={() => {
                setFilePath(f.path);
                setContent(f.content ?? '');
                setShowOpenDrawer(false);
                setStatusMsg(`Açıldı: ${f.name}`);
              }}
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200"
            >
              {f.name}
            </button>
          ))}
        </div>
      )}

      <textarea
        aria-label="Not Defteri İçeriği"
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setStatusMsg('Değiştirildi');
        }}
        className="flex-1 p-4 bg-[#0B0C10] text-zinc-100 text-sm leading-relaxed outline-none resize-none font-sans"
        placeholder="Notlarınızı yazın..."
      />

      <div className="h-7 px-3 bg-[#11131A] border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 font-mono-tabular">
        <span>{statusMsg}</span>
        <span>
          {wordCount} kelime · {content.length} karakter
        </span>
      </div>
    </div>
  );
};
