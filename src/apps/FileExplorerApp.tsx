import React, { useState } from 'react';
import {
  ArrowUp,
  Code2,
  File,
  FilePlus,
  Folder,
  FolderPlus,
  HardDrive,
  Image as ImageIcon,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useDesktop } from '../os/DesktopContext';
import {
  VfsNode,
  getParentPath,
  listDirectory,
  normalizeVfsPath,
  toWindowsDisplayPath,
} from '../core/vfs';

const QUICK_LOCATIONS = [
  { label: 'Sürücü C:', path: 'C:' },
  { label: 'Sürücü D:', path: 'D:' },
  { label: 'Masaüstü', path: 'C:/Users/Racer/Desktop' },
  { label: 'Belgelerim', path: 'C:/Users/Racer/Documents' },
  { label: 'Resimlerim', path: 'C:/Users/Racer/Pictures' },
  { label: 'AnkaOS Native (C#/Py)', path: 'D:/Projects/AnkaOS_Native' },
  { label: 'WebLab Projeleri', path: 'D:/Projects/WebLab' },
  { label: 'AnkaRacer 3D Verisi', path: 'D:/Games/AnkaRacer3D' },
];

export const FileExplorerApp: React.FC<{ initialPath?: string }> = ({ initialPath }) => {
  const { vfs, vfsCreateFolder, vfsWriteFile, vfsDeleteNode, vfsRenameNode, openApp } =
    useDesktop();

  const [currentPath, setCurrentPath] = useState(() =>
    normalizeVfsPath(initialPath || 'C:/Users/Racer')
  );
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [creatingMode, setCreatingMode] = useState<'file' | 'folder' | 'rename' | null>(null);
  const [draftName, setDraftName] = useState('');

  const items = listDirectory(vfs, currentPath);

  const openNode = (node: VfsNode) => {
    if (node.type === 'folder' || node.type === 'drive') {
      setCurrentPath(node.path);
      setSelectedPath(null);
      return;
    }

    const lower = node.name.toLowerCase();
    if (node.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(lower)) {
      openApp('media', { filePath: node.path });
    } else if (/\.(cs|csproj|py|js|ts|html|css|json)$/i.test(lower)) {
      openApp('code', { filePath: node.path });
    } else {
      openApp('notepad', { filePath: node.path });
    }
  };

  const handleConfirmCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = draftName.trim();
    if (!clean) return;
    if (creatingMode === 'folder') {
      vfsCreateFolder(`${currentPath}/${clean}`);
    } else if (creatingMode === 'file') {
      vfsWriteFile(`${currentPath}/${clean}`, '', 'text/plain');
    } else if (creatingMode === 'rename' && selectedPath) {
      vfsRenameNode(selectedPath, clean);
      setSelectedPath(null);
    }
    setDraftName('');
    setCreatingMode(null);
  };

  const parent = getParentPath(currentPath);

  return (
    <div className="h-full flex bg-[#0C0E13] text-zinc-100">
      {/* Left Navigation Sidebar */}
      <aside className="w-52 shrink-0 bg-[#101219] border-r border-zinc-800 p-2.5 space-y-1 overflow-y-auto">
        <div className="px-2 py-1 text-[11px] font-semibold text-zinc-500">Hızlı Erişim</div>
        {QUICK_LOCATIONS.map((loc) => {
          const active = currentPath === loc.path;
          return (
            <button
              key={loc.path}
              type="button"
              onClick={() => {
                setCurrentPath(loc.path);
                setSelectedPath(null);
              }}
              className={`w-full px-2.5 py-1.5 rounded text-xs flex items-center gap-2 text-left transition-colors ${
                active
                  ? 'bg-red-600/20 text-red-300 border border-red-500/30'
                  : 'text-zinc-300 hover:bg-zinc-800/70'
              }`}
            >
              {loc.path.length === 2 ? (
                <HardDrive className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span className="truncate">{loc.label}</span>
            </button>
          );
        })}
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Address & Action Toolbar */}
        <div className="h-11 px-3 bg-[#141720] border-b border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              aria-label="Üst Klasör"
              disabled={!parent}
              onClick={() => parent && setCurrentPath(parent)}
              className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-35 text-zinc-200 shrink-0"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <div className="flex-1 min-w-0 h-7 px-3 rounded bg-[#0A0B0F] border border-zinc-800 flex items-center font-mono text-xs text-zinc-200 truncate">
              {toWindowsDisplayPath(currentPath)}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setCreatingMode('folder');
                setDraftName('');
              }}
              className="h-7 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs flex items-center gap-1.5"
            >
              <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Yeni Klasör</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatingMode('file');
                setDraftName('');
              }}
              className="h-7 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs flex items-center gap-1.5"
            >
              <FilePlus className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Yeni Dosya</span>
            </button>
            {selectedPath && (
              <>
                <button
                  type="button"
                  aria-label="Yeniden Adlandır"
                  onClick={() => {
                    setCreatingMode('rename');
                    setDraftName(vfs.nodes[selectedPath]?.name || '');
                  }}
                  className="h-7 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-xs flex items-center gap-1"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Seçileni Sil"
                  onClick={() => {
                    vfsDeleteNode(selectedPath);
                    setSelectedPath(null);
                  }}
                  className="h-7 px-2 rounded bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Inline Creation Bar */}
        {creatingMode && (
          <form
            onSubmit={handleConfirmCreate}
            className="px-3 py-2 bg-[#171B26] border-b border-zinc-800 flex items-center gap-2"
          >
            <span className="text-xs text-zinc-300">
              {creatingMode === 'folder'
                ? 'Klasör adı:'
                : creatingMode === 'file'
                ? 'Dosya adı:'
                : 'Yeni ad:'}
            </span>
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              autoFocus
              placeholder="Ad girin..."
              className="flex-1 max-w-xs h-7 px-2 rounded bg-[#0A0B0F] border border-zinc-700 text-xs outline-none focus:border-red-500"
            />
            <button type="submit" className="h-7 px-3 rounded bg-red-600 text-white text-xs font-semibold">
              Kaydet
            </button>
            <button
              type="button"
              onClick={() => setCreatingMode(null)}
              className="h-7 px-2.5 rounded bg-zinc-800 text-zinc-300 text-xs"
            >
              İptal
            </button>
          </form>
        )}

        {/* Directory Listing */}
        <div className="flex-1 overflow-y-auto p-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs gap-2">
              <Folder className="w-8 h-8 text-zinc-700" />
              <span>Bu klasör boş.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {items.map((item) => {
                const isSelected = selectedPath === item.path;
                const isImg = item.mimeType?.startsWith('image/');
                const isCode = /\.(cs|csproj|py|js|ts|html|json)$/i.test(item.name);

                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => setSelectedPath(item.path)}
                    onDoubleClick={() => openNode(item)}
                    className={`p-3 rounded-md border text-left flex flex-col gap-2 transition-colors ${
                      isSelected
                        ? 'bg-red-600/15 border-red-500/60'
                        : 'bg-[#12151E] border-zinc-800/80 hover:border-zinc-700 hover:bg-[#171B26]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {item.type === 'folder' ? (
                        <Folder className="w-7 h-7 text-amber-400" />
                      ) : isImg ? (
                        <ImageIcon className="w-7 h-7 text-sky-400" />
                      ) : isCode ? (
                        <Code2 className="w-7 h-7 text-cyan-400" />
                      ) : (
                        <File className="w-7 h-7 text-zinc-400" />
                      )}
                      {item.type === 'file' && (
                        <span className="font-mono-tabular text-[10px] text-zinc-500">
                          {item.size} B
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-zinc-100 truncate">{item.name}</div>
                      <div className="text-[10px] text-zinc-500">
                        {item.type === 'folder' ? 'Klasör' : 'Çift tıklayarak aç'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
