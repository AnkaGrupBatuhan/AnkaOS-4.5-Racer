import React, { useEffect, useRef, useState } from 'react';
import { executeTerminalCommand, TerminalLine } from '../core/terminalEngine';
import { toWindowsDisplayPath } from '../core/vfs';
import { useDesktop } from '../os/DesktopContext';
import { AppId } from '../os/types';

interface HistoryBlock {
  prompt?: string;
  lines: TerminalLine[];
}

const KNOWN_COMMANDS = [
  'help',
  'dir',
  'ls',
  'cd',
  'mkdir',
  'touch',
  'cat',
  'type',
  'rm',
  'del',
  'cls',
  'clear',
  'echo',
  'sysinfo',
  'tasklist',
  'taskkill',
  'turbo-mode',
  'race-start',
  'open',
  'python',
  'dotnet',
];

export const AnkaTermApp: React.FC = () => {
  const {
    vfs,
    setVfs,
    turboMode,
    setTurboMode,
    telemetry,
    processes,
    openApp,
    killProcess,
  } = useDesktop();

  const [cwd, setCwd] = useState('C:/Users/Racer');
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyCursor, setHistoryCursor] = useState(-1);
  const [blocks, setBlocks] = useState<HistoryBlock[]>([
    {
      lines: [
        { text: 'AnkaTerm 4.5 Racer Edition [Python 3.12 & VFS Bridge]', tone: 'accent' },
        { text: "Komut listesi için 'help' yazın. Örn: sysinfo, dir, turbo-mode on, race-start", tone: 'muted' },
      ],
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [blocks]);

  const runCommand = (raw: string) => {
    const displayPrompt = `${toWindowsDisplayPath(cwd)}> ${raw}`;
    const result = executeTerminalCommand(raw, {
      vfs,
      cwd,
      turboMode,
      cpuPercent: telemetry.cpuPercent,
      ramUsedMb: telemetry.ramUsedMb,
      ramTotalMb: telemetry.ramTotalMb,
      fps: telemetry.fps,
      processes,
    });

    setCwd(result.nextCwd);
    if (result.nextVfs !== vfs) {
      setVfs(result.nextVfs);
    }

    let cleared = false;
    for (const action of result.actions) {
      if (action.type === 'CLEAR') {
        cleared = true;
      } else if (action.type === 'SET_TURBO') {
        setTurboMode(action.enabled);
      } else if (action.type === 'LAUNCH_APP') {
        openApp(action.appId as AppId);
      } else if (action.type === 'KILL_PROCESS') {
        killProcess(action.target);
      }
    }

    if (cleared) {
      setBlocks([]);
    } else {
      setBlocks((prev) => [...prev, { prompt: displayPrompt, lines: result.lines }]);
    }

    if (raw.trim()) {
      setCmdHistory((prev) => [...prev, raw.trim()]);
      setHistoryCursor(-1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runCommand(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextCursor = historyCursor === -1 ? cmdHistory.length - 1 : Math.max(0, historyCursor - 1);
      setHistoryCursor(nextCursor);
      setInput(cmdHistory[nextCursor]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyCursor === -1) return;
      if (historyCursor >= cmdHistory.length - 1) {
        setHistoryCursor(-1);
        setInput('');
      } else {
        const nextCursor = historyCursor + 1;
        setHistoryCursor(nextCursor);
        setInput(cmdHistory[nextCursor]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const lower = input.toLowerCase();
      const match = KNOWN_COMMANDS.find((c) => c.startsWith(lower));
      if (match) setInput(match + ' ');
    }
  };

  const toneClass = (tone?: TerminalLine['tone']) => {
    switch (tone) {
      case 'accent':
        return 'text-red-400 font-semibold';
      case 'warn':
        return 'text-orange-400';
      case 'error':
        return 'text-rose-500';
      case 'success':
        return 'text-emerald-400';
      case 'muted':
        return 'text-zinc-500';
      default:
        return 'text-zinc-200';
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="h-full flex flex-col bg-[#08090C] text-zinc-100 font-mono text-xs p-3 cursor-text"
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pb-2">
        {blocks.map((block, bIdx) => (
          <div key={bIdx} className="space-y-0.5">
            {block.prompt && (
              <div className="text-orange-400 font-semibold">{block.prompt}</div>
            )}
            {block.lines.map((line, lIdx) => (
              <pre
                key={lIdx}
                className={`whitespace-pre-wrap break-words font-mono leading-relaxed ${toneClass(
                  line.tone
                )}`}
              >
                {line.text}
              </pre>
            ))}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="pt-2 border-t border-zinc-800/80 flex items-center gap-2">
        <span className="text-red-500 font-semibold shrink-0">
          {toWindowsDisplayPath(cwd)}&gt;
        </span>
        <input
          ref={inputRef}
          type="text"
          aria-label="Terminal Komut Girişi"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          spellCheck={false}
          placeholder="Komut yazın (help, dir, sysinfo, turbo-mode on, race-start)..."
          className="flex-1 bg-transparent text-zinc-100 placeholder:text-zinc-600 outline-none"
        />
      </form>
    </div>
  );
};
