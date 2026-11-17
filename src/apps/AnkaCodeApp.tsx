import React, { useEffect, useMemo, useState } from 'react';
import {
  Code2,
  Eye,
  FileCode,
  FilePlus,
  FolderOpen,
  Play,
  Save,
  Search,
  Terminal as TerminalIcon,
  Trash2,
  X,
} from 'lucide-react';
import { useDesktop } from '../os/DesktopContext';
import { getAllVfsFiles, readVfsFile, toWindowsDisplayPath } from '../core/vfs';

interface EditorTab {
  path: string;
  name: string;
  content: string;
  dirty: boolean;
}

export const AnkaCodeApp: React.FC<{ initialFilePath?: string }> = ({ initialFilePath }) => {
  const { vfs, vfsWriteFile, vfsDeleteNode, telemetry, turboMode } = useDesktop();

  const allFiles = useMemo(() => {
    return getAllVfsFiles(vfs).filter((f) => !f.mimeType?.startsWith('image/'));
  }, [vfs]);

  const [tabs, setTabs] = useState<EditorTab[]>(() => {
    const defaultPath = initialFilePath || 'D:/Projects/AnkaOS_Native/WindowManager.cs';
    const file = readVfsFile(vfs, defaultPath) || allFiles[0];
    if (!file) return [];
    return [
      {
        path: file.path,
        name: file.name,
        content: file.content ?? '',
        dirty: false,
      },
    ];
  });

  const [activePath, setActivePath] = useState<string>(() => tabs[0]?.path || '');
  const [newFileName, setNewFileName] = useState('');
  const [showNewInput, setShowNewInput] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    'AnkaCode Studio 4.5 hazır. C#, Python, TypeScript, HTML ve JS dosyalarını düzenleyip çalıştırabilirsiniz.',
  ]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const activeTab = tabs.find((t) => t.path === activePath) || tabs[0];

  const openFile = (filePath: string) => {
    const existing = tabs.find((t) => t.path === filePath);
    if (existing) {
      setActivePath(filePath);
      return;
    }
    const file = readVfsFile(vfs, filePath);
    if (!file) return;
    setTabs((prev) => [
      ...prev,
      { path: file.path, name: file.name, content: file.content ?? '', dirty: false },
    ]);
    setActivePath(file.path);
  };

  useEffect(() => {
    if (initialFilePath) {
      openFile(initialFilePath);
    }
  }, [initialFilePath]);

  const updateActiveContent = (nextContent: string) => {
    if (!activeTab) return;
    setTabs((prev) =>
      prev.map((t) => (t.path === activeTab.path ? { ...t, content: nextContent, dirty: true } : t))
    );
  };

  const saveActiveFile = () => {
    if (!activeTab) return;
    vfsWriteFile(activeTab.path, activeTab.content);
    setTabs((prev) =>
      prev.map((t) => (t.path === activeTab.path ? { ...t, dirty: false } : t))
    );
    setConsoleLogs((prev) => [
      ...prev,
      `[KAYIT] ${toWindowsDisplayPath(activeTab.path)} (${activeTab.content.length} karakter) diske yazıldı.`,
    ]);
  };

  // Ctrl+S shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        if (document.activeElement?.closest('[data-testid="window-code"]')) {
          e.preventDefault();
          saveActiveFile();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = newFileName.trim();
    if (!raw) return;
    const targetPath = raw.includes(':') || raw.includes('/') ? raw : `D:/Projects/WebLab/${raw}`;
    vfsWriteFile(targetPath, `// ${raw}\n`, 'text/plain');
    setNewFileName('');
    setShowNewInput(false);
    setTimeout(() => openFile(targetPath), 0);
  };

  const handleCloseTab = (pathToClose: string) => {
    const next = tabs.filter((t) => t.path !== pathToClose);
    setTabs(next);
    if (activePath === pathToClose) {
      setActivePath(next[next.length - 1]?.path || '');
    }
  };

  const handleRunActive = () => {
    if (!activeTab) return;
    const lower = activeTab.name.toLowerCase();

    if (lower.endsWith('.html') || lower.endsWith('.htm')) {
      setPreviewHtml(activeTab.content);
      setConsoleLogs((prev) => [...prev, `[ÖNİZLEME] ${activeTab.name} canlı HTML penceresinde açıldı.`]);
      return;
    }

    setPreviewHtml(null);

    if (lower.endsWith('.js')) {
      const captured: string[] = [];
      const mockConsole = {
        log: (...args: unknown[]) => captured.push(args.map((a) => String(a)).join(' ')),
        error: (...args: unknown[]) => captured.push('ERR: ' + args.map((a) => String(a)).join(' ')),
        warn: (...args: unknown[]) => captured.push('WARN: ' + args.map((a) => String(a)).join(' ')),
      };
      try {
        const fn = new Function('console', activeTab.content);
        fn(mockConsole);
        setConsoleLogs((prev) => [
          ...prev,
          `[JS RUNNER] ${activeTab.name} çalıştırıldı:`,
          ...(captured.length ? captured : ['(Çıktı üretilmedi)']),
        ]);
      } catch (err) {
        setConsoleLogs((prev) => [
          ...prev,
          `[JS HATA] ${err instanceof Error ? err.message : String(err)}`,
        ]);
      }
      return;
    }

    if (lower.endsWith('.py')) {
      const prints = [...activeTab.content.matchAll(/print\((.+)\)/g)].map((m) => m[1]);
      if (activeTab.name === 'anka_bridge.py') {
        setConsoleLogs((prev) => [
          ...prev,
          `[PYTHON 3.12] ${activeTab.name} yürütüldü:`,
          JSON.stringify(
            {
              cpu_percent: telemetry.cpuPercent,
              ram_used_mb: telemetry.ramUsedMb,
              fps_cap: telemetry.fps,
              turbo_mode: turboMode,
            },
            null,
            2
          ),
        ]);
      } else {
        setConsoleLogs((prev) => [
          ...prev,
          `[PYTHON 3.12] ${activeTab.name} yürütüldü:`,
          ...(prints.length ? prints : ['Çıkış kodu: 0 (Başarılı)']),
        ]);
      }
      return;
    }

    if (lower.endsWith('.cs') || lower.endsWith('.csproj')) {
      setConsoleLogs((prev) => [
        ...prev,
        `[MSBuild .NET 8] ${activeTab.name} sözdizimi doğrulandı — 0 Hata, 0 Uyarı.`,
      ]);
      return;
    }

    setConsoleLogs((prev) => [...prev, `[BİLGİ] ${activeTab.name} salt okunur / metin dosyası.`]);
  };

  const lineCount = activeTab ? activeTab.content.split('\n').length : 1;

  const filteredFiles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return allFiles;
    return allFiles.filter(
      (f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
    );
  }, [allFiles, searchTerm]);

  return (
    <div className="h-full flex bg-[#0C0E13] text-zinc-100">
      {/* Left VFS Explorer Sidebar */}
      <aside className="w-60 shrink-0 bg-[#101219] border-r border-zinc-800 flex flex-col">
        <div className="h-10 px-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
            <FolderOpen className="w-4 h-4 text-orange-400" />
            <span>Proje Dosyaları</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Dosyalarda Ara"
              onClick={() => setShowSearch((s) => !s)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              aria-label="Yeni Kod Dosyası"
              onClick={() => setShowNewInput((s) => !s)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
            >
              <FilePlus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {showSearch && (
          <div className="p-2 border-b border-zinc-800">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Dosya ara..."
              className="w-full bg-[#0A0B0F] border border-zinc-700 rounded px-2 py-1 text-xs outline-none focus:border-red-500"
            />
          </div>
        )}

        {showNewInput && (
          <form onSubmit={handleCreateFile} className="p-2 border-b border-zinc-800 flex gap-1">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="ornek.js / app.html"
              autoFocus
              className="flex-1 min-w-0 bg-[#0A0B0F] border border-zinc-700 rounded px-2 py-1 text-xs outline-none focus:border-red-500"
            />
            <button
              type="submit"
              className="px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold"
            >
              Ekle
            </button>
          </form>
        )}

        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {filteredFiles.map((file) => {
            const isSelected = activeTab?.path === file.path;
            return (
              <div
                key={file.path}
                className={`group flex items-center justify-between rounded px-2 py-1.5 text-xs ${
                  isSelected
                    ? 'bg-red-600/20 text-red-300 border border-red-500/30'
                    : 'text-zinc-300 hover:bg-zinc-800/70'
                }`}
              >
                <button
                  type="button"
                  onClick={() => openFile(file.path)}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left"
                >
                  <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{file.name}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Sil ${file.name}`}
                  onClick={() => {
                    vfsDeleteNode(file.path);
                    handleCloseTab(file.path);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Editor + Output Split */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Tabs & Toolbar */}
        <div className="h-10 bg-[#141720] border-b border-zinc-800 px-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto min-w-0">
            {tabs.map((t) => (
              <div
                key={t.path}
                className={`h-7 px-2.5 rounded flex items-center gap-2 text-xs shrink-0 ${
                  t.path === activeTab?.path
                    ? 'bg-[#0C0E13] text-zinc-100 border border-zinc-700'
                    : 'text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <button type="button" onClick={() => setActivePath(t.path)} className="truncate max-w-[140px]">
                  {t.name}
                  {t.dirty ? ' *' : ''}
                </button>
                <button
                  type="button"
                  aria-label={`Sekmeyi kapat ${t.name}`}
                  onClick={() => handleCloseTab(t.path)}
                  className="text-zinc-500 hover:text-zinc-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={saveActiveFile}
              disabled={!activeTab}
              className="h-7 px-2.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs font-medium flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kaydet</span>
            </button>
            <button
              type="button"
              onClick={handleRunActive}
              disabled={!activeTab}
              className="h-7 px-3 rounded bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Çalıştır</span>
            </button>
            {previewHtml !== null && (
              <button
                type="button"
                onClick={() => setPreviewHtml(null)}
                className="h-7 px-2 rounded bg-zinc-800 text-xs text-zinc-300 flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Önizlemeyi Kapat</span>
              </button>
            )}
          </div>
        </div>

        {/* Code Area + Optional Live HTML Preview */}
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 flex bg-[#0B0C10] overflow-hidden">
            {activeTab ? (
              <>
                <div
                  aria-hidden="true"
                  className="w-11 py-3 bg-[#0E1016] border-r border-zinc-800/80 text-right pr-2.5 font-mono-tabular text-xs leading-6 text-zinc-600 select-none overflow-hidden"
                >
                  {Array.from({ length: lineCount }, (_, idx) => (
                    <div key={idx}>{idx + 1}</div>
                  ))}
                </div>
                <textarea
                  aria-label="Kod Editörü"
                  value={activeTab.content}
                  onChange={(e) => updateActiveContent(e.target.value)}
                  spellCheck={false}
                  className="flex-1 p-3 bg-transparent text-zinc-100 font-mono text-xs leading-6 outline-none resize-none overflow-auto whitespace-pre"
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-xs gap-2">
                <Code2 className="w-8 h-8 text-zinc-700" />
                <span>Düzenlemek için soldan bir dosya seçin veya yeni dosya oluşturun.</span>
              </div>
            )}
          </div>

          {previewHtml !== null && (
            <div className="w-1/2 border-l border-zinc-800 bg-white flex flex-col">
              <div className="h-7 px-3 bg-[#151822] text-zinc-300 text-xs flex items-center justify-between border-b border-zinc-800">
                <span>Canlı HTML Önizleme</span>
              </div>
              <iframe
                title="AnkaCode Live Preview"
                srcDoc={previewHtml}
                sandbox="allow-scripts"
                className="flex-1 w-full border-0"
              />
            </div>
          )}
        </div>

        {/* Integrated Output Terminal */}
        <div className="h-32 shrink-0 bg-[#090A0E] border-t border-zinc-800 flex flex-col">
          <div className="h-7 px-3 bg-[#12141C] border-b border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
            <div className="flex items-center gap-1.5">
              <TerminalIcon className="w-3.5 h-3.5 text-orange-400" />
              <span>Çıktı Konsolu</span>
            </div>
            <button
              type="button"
              onClick={() => setConsoleLogs([])}
              className="hover:text-zinc-200"
            >
              Temizle
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-xs space-y-1 text-zinc-300">
            {consoleLogs.map((log, i) => (
              <pre key={i} className="whitespace-pre-wrap break-words font-mono">
                {log}
              </pre>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
