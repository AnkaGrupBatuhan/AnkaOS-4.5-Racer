import {
  VfsState,
  createVfsFolder,
  deleteVfsNode,
  listDirectory,
  normalizeVfsPath,
  readVfsFile,
  toWindowsDisplayPath,
  writeVfsFile,
} from './vfs';

export interface TerminalProcessEntry {
  pid: number;
  name: string;
  title: string;
  cpu: number;
  memoryMb: number;
  type: 'kernel' | 'python' | 'app';
}

export interface TerminalContext {
  vfs: VfsState;
  cwd: string;
  turboMode: boolean;
  cpuPercent: number;
  ramUsedMb: number;
  ramTotalMb: number;
  fps: number;
  processes: TerminalProcessEntry[];
}

export interface TerminalLine {
  text: string;
  tone?: 'normal' | 'accent' | 'warn' | 'error' | 'muted' | 'success';
}

export type TerminalAction =
  | { type: 'CLEAR' }
  | { type: 'SET_TURBO'; enabled: boolean }
  | { type: 'LAUNCH_APP'; appId: string }
  | { type: 'KILL_PROCESS'; target: string };

export interface TerminalExecutionResult {
  lines: TerminalLine[];
  nextCwd: string;
  nextVfs: VfsState;
  actions: TerminalAction[];
}

function tokenizeCommand(raw: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes: '"' | "'" | null = null;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inQuotes) {
      if (ch === inQuotes) {
        inQuotes = null;
      } else {
        current += ch;
      }
    } else if (ch === '"' || ch === "'") {
      inQuotes = ch;
    } else if (/\s/.test(ch)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current.length > 0) tokens.push(current);
  return tokens;
}

export function executeTerminalCommand(
  rawInput: string,
  ctx: TerminalContext
): TerminalExecutionResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { lines: [], nextCwd: ctx.cwd, nextVfs: ctx.vfs, actions: [] };
  }

  // Handle echo redirection: echo content > filepath
  const redirectMatch = trimmed.match(/^echo\s+([\s\S]+?)\s*>\s*(.+)$/i);
  if (redirectMatch) {
    const textContent = redirectMatch[1].replace(/^["']|["']$/g, '');
    const targetRaw = redirectMatch[2].trim().replace(/^["']|["']$/g, '');
    const targetPath = normalizeVfsPath(targetRaw, ctx.cwd);
    const nextVfs = writeVfsFile(ctx.vfs, targetPath, textContent, 'text/plain');
    return {
      lines: [
        {
          text: `[VFS] Dosya yazıldı: ${toWindowsDisplayPath(targetPath)} (${textContent.length} bayt)`,
          tone: 'success',
        },
      ],
      nextCwd: ctx.cwd,
      nextVfs,
      actions: [],
    };
  }

  const tokens = tokenizeCommand(trimmed);
  const cmd = tokens[0].toLowerCase();
  const args = tokens.slice(1);
  const lines: TerminalLine[] = [];
  const actions: TerminalAction[] = [];
  let nextCwd = ctx.cwd;
  let nextVfs = ctx.vfs;

  switch (cmd) {
    case 'help': {
      lines.push(
        { text: 'AnkaTerm 4.5 Racer CLI — Python & VFS Komut Yorumlayıcısı', tone: 'accent' },
        { text: '  help                    Kullanılabilir komutları listeler' },
        { text: '  dir | ls [yol]          Dizin içeriğini görüntüler' },
        { text: '  cd <yol>                Çalışma dizinini değiştirir' },
        { text: '  mkdir <klasör>          Yeni klasör oluşturur' },
        { text: '  touch <dosya>           Boş dosya oluşturur' },
        { text: '  cat | type <dosya>      Dosya içeriğini okur' },
        { text: '  echo <metin> [> dosya]  Metin yazdırır veya dosyaya kaydeder' },
        { text: '  rm | del <yol>          Dosya veya klasörü siler' },
        { text: '  cls | clear             Terminal ekranını temizler' },
        { text: '  sysinfo                 Sistem, CPU/RAM ve C#/Python durumunu gösterir' },
        { text: '  tasklist                Çalışan aktif süreçleri listeler' },
        { text: '  taskkill <pid|ad>       Belirtilen süreci sonlandırır' },
        { text: '  turbo-mode [on|off]     Turbo Performans Modunu açar/kapatır' },
        { text: '  race-start              AnkaRacer 3D oyununu başlatır' },
        { text: '  open <uygulama>         browser | code | explorer | taskmgr | notepad' },
        { text: '  python <dosya.py>       VFS içindeki Python betiğini çalıştırır' },
        { text: '  dotnet build            AnkaOS Native C# WPF paketini doğrular' }
      );
      break;
    }

    case 'cls':
    case 'clear': {
      actions.push({ type: 'CLEAR' });
      break;
    }

    case 'pwd': {
      lines.push({ text: toWindowsDisplayPath(ctx.cwd) });
      break;
    }

    case 'whoami': {
      lines.push({ text: 'ANKA-RACER\\Racer (Administrator · Racer Shell)' });
      break;
    }

    case 'date': {
      lines.push({ text: new Date().toLocaleString('tr-TR') });
      break;
    }

    case 'echo': {
      lines.push({ text: args.join(' ') });
      break;
    }

    case 'dir':
    case 'ls': {
      const target = args[0] ? normalizeVfsPath(args[0], ctx.cwd) : ctx.cwd;
      const node = ctx.vfs.nodes[target];
      if (!node || node.type === 'file') {
        lines.push({ text: `Dizin bulunamadı: ${toWindowsDisplayPath(target)}`, tone: 'error' });
        break;
      }
      const items = listDirectory(ctx.vfs, target);
      lines.push({ text: ` Dizin: ${toWindowsDisplayPath(target)}`, tone: 'accent' });
      if (items.length === 0) {
        lines.push({ text: '  (Boş dizin)', tone: 'muted' });
      } else {
        for (const item of items) {
          const kind = item.type === 'folder' ? '<DIR>     ' : `${String(item.size).padStart(7)} B `;
          lines.push({
            text: `  ${kind}  ${item.name}`,
            tone: item.type === 'folder' ? 'warn' : 'normal',
          });
        }
      }
      break;
    }

    case 'cd': {
      if (!args[0]) {
        lines.push({ text: toWindowsDisplayPath(ctx.cwd) });
        break;
      }
      const target = normalizeVfsPath(args[0], ctx.cwd);
      const node = ctx.vfs.nodes[target];
      if (!node || node.type === 'file') {
        lines.push({ text: `Geçersiz dizin: ${args[0]}`, tone: 'error' });
      } else {
        nextCwd = target;
      }
      break;
    }

    case 'mkdir': {
      if (!args[0]) {
        lines.push({ text: 'Kullanım: mkdir <klasör_adı>', tone: 'warn' });
        break;
      }
      const target = normalizeVfsPath(args[0], ctx.cwd);
      nextVfs = createVfsFolder(ctx.vfs, target);
      lines.push({ text: `Klasör oluşturuldu: ${toWindowsDisplayPath(target)}`, tone: 'success' });
      break;
    }

    case 'touch': {
      if (!args[0]) {
        lines.push({ text: 'Kullanım: touch <dosya_adı>', tone: 'warn' });
        break;
      }
      const target = normalizeVfsPath(args[0], ctx.cwd);
      nextVfs = writeVfsFile(ctx.vfs, target, '', 'text/plain');
      lines.push({ text: `Dosya oluşturuldu: ${toWindowsDisplayPath(target)}`, tone: 'success' });
      break;
    }

    case 'cat':
    case 'type': {
      if (!args[0]) {
        lines.push({ text: `Kullanım: ${cmd} <dosya>`, tone: 'warn' });
        break;
      }
      const target = normalizeVfsPath(args[0], ctx.cwd);
      const file = readVfsFile(ctx.vfs, target);
      if (!file) {
        lines.push({ text: `Dosya bulunamadı: ${toWindowsDisplayPath(target)}`, tone: 'error' });
      } else {
        const contentLines = (file.content ?? '').split('\n');
        for (const l of contentLines) {
          lines.push({ text: l });
        }
      }
      break;
    }

    case 'rm':
    case 'del': {
      if (!args[0]) {
        lines.push({ text: `Kullanım: ${cmd} <yol>`, tone: 'warn' });
        break;
      }
      const target = normalizeVfsPath(args[0], ctx.cwd);
      const existing = ctx.vfs.nodes[target];
      if (!existing) {
        lines.push({ text: `Bulunamadı: ${toWindowsDisplayPath(target)}`, tone: 'error' });
      } else if (existing.type === 'drive') {
        lines.push({ text: 'Sürücü kök dizini silinemez.', tone: 'error' });
      } else {
        nextVfs = deleteVfsNode(ctx.vfs, target);
        lines.push({ text: `Silindi: ${toWindowsDisplayPath(target)}`, tone: 'success' });
      }
      break;
    }

    case 'sysinfo': {
      lines.push(
        { text: '=== AnkaOS 4.5 "Racer Edition" Sistem Telemetrisi ===', tone: 'accent' },
        { text: 'OS Çekirdeği   : AnkaShell 4.5 (.NET 8 WPF + Python 3.12 Bridge)' },
        { text: `Turbo Modu     : ${ctx.turboMode ? 'AKTİF (Yüksek Performans)' : 'STANDART'}`, tone: ctx.turboMode ? 'warn' : 'normal' },
        { text: `CPU Kullanımı  : %${ctx.cpuPercent.toFixed(1)}` },
        { text: `Sanal Bellek   : ${ctx.ramUsedMb} MB / ${ctx.ramTotalMb} MB` },
        { text: `Görüntü Hızı   : ${ctx.fps} FPS` },
        { text: `Aktif Süreç    : ${ctx.processes.length} işlem` },
        { text: `Bağlı Sürücü   : C:\\ (Sistem), D:\\ (Oyun & Projeler)` }
      );
      break;
    }

    case 'tasklist': {
      lines.push({ text: 'PID     SÜREÇ ADI                TÜR      CPU %   BELLEK', tone: 'accent' });
      lines.push({ text: '-------------------------------------------------------------', tone: 'muted' });
      for (const proc of ctx.processes) {
        const pidStr = String(proc.pid).padEnd(7);
        const nameStr = proc.name.slice(0, 23).padEnd(24);
        const typeStr = proc.type.toUpperCase().padEnd(8);
        const cpuStr = `${proc.cpu.toFixed(1)}%`.padStart(6);
        const memStr = `${proc.memoryMb} MB`.padStart(8);
        lines.push({ text: `${pidStr} ${nameStr} ${typeStr} ${cpuStr} ${memStr}` });
      }
      break;
    }

    case 'taskkill': {
      if (!args[0]) {
        lines.push({ text: 'Kullanım: taskkill <pid | süreç_adı>', tone: 'warn' });
        break;
      }
      const target = args.join(' ');
      const found = ctx.processes.find(
        (p) => String(p.pid) === target || p.name.toLowerCase() === target.toLowerCase()
      );
      if (!found) {
        lines.push({ text: `Süreç bulunamadı: ${target}`, tone: 'error' });
      } else if (found.type === 'kernel') {
        lines.push({ text: `Kritik çekirdek süreci sonlandırılamaz: ${found.name}`, tone: 'error' });
      } else {
        actions.push({ type: 'KILL_PROCESS', target: String(found.pid) });
        lines.push({ text: `Sonlandırma sinyali gönderildi: ${found.name} (PID ${found.pid})`, tone: 'success' });
      }
      break;
    }

    case 'turbo-mode': {
      const arg = (args[0] || '').toLowerCase();
      const nextState = arg === 'on' || arg === '1' || arg === 'true'
        ? true
        : arg === 'off' || arg === '0' || arg === 'false'
        ? false
        : !ctx.turboMode;
      actions.push({ type: 'SET_TURBO', enabled: nextState });
      lines.push({
        text: nextState
          ? '[TURBO] Nitro Performans Modu AKTİF! Saat frekansı ve telemetri örneklemesi artırıldı.'
          : '[TURBO] Standart Dengeli Mod etkinleştirildi.',
        tone: nextState ? 'warn' : 'normal',
      });
      break;
    }

    case 'race-start': {
      actions.push({ type: 'LAUNCH_APP', appId: 'racer3d' });
      lines.push({ text: '[AnkaRacer 3D] GPU & Three.js motoru başlatılıyor...', tone: 'accent' });
      break;
    }

    case 'open': {
      const target = (args[0] || '').toLowerCase();
      const map: Record<string, string> = {
        browser: 'browser',
        ankabrowser: 'browser',
        code: 'code',
        ankacode: 'code',
        explorer: 'explorer',
        files: 'explorer',
        taskmgr: 'taskmanager',
        taskmanager: 'taskmanager',
        notepad: 'notepad',
        calc: 'calculator',
        calculator: 'calculator',
        racer: 'racer3d',
        racer3d: 'racer3d',
        paint: 'paint',
        media: 'media',
        audio: 'audio',
        settings: 'settings',
      };
      const appId = map[target];
      if (!appId) {
        lines.push({
          text: 'Bilinmeyen uygulama. Seçenekler: browser, code, explorer, taskmgr, notepad, calc, racer3d, paint, media, audio, settings',
          tone: 'warn',
        });
      } else {
        actions.push({ type: 'LAUNCH_APP', appId });
        lines.push({ text: `Başlatılıyor: ${appId}`, tone: 'success' });
      }
      break;
    }

    case 'python': {
      if (!args[0]) {
        lines.push({ text: 'Python 3.12.4 (AnkaOS Bridge Runtime) — Kullanım: python <dosya.py>', tone: 'accent' });
        break;
      }
      const target = normalizeVfsPath(args[0], ctx.cwd);
      const file = readVfsFile(ctx.vfs, target);
      if (!file) {
        lines.push({ text: `python: can't open file '${args[0]}': No such file`, tone: 'error' });
      } else {
        lines.push({ text: `[Python Runtime] Çalıştırılıyor: ${toWindowsDisplayPath(target)}`, tone: 'accent' });
        if (target.endsWith('anka_bridge.py')) {
          lines.push({
            text: JSON.stringify(
              {
                cpu_percent: ctx.cpuPercent,
                ram_used_mb: ctx.ramUsedMb,
                ram_total_mb: ctx.ramTotalMb,
                fps_cap: ctx.fps,
                turbo_mode: ctx.turboMode,
              },
              null,
              2
            ),
            tone: 'success',
          });
        } else {
          const printMatches = [...(file.content || '').matchAll(/print\((.+)\)/g)];
          if (printMatches.length > 0) {
            for (const m of printMatches) {
              lines.push({ text: m[1].replace(/^["']|["']$/g, '') });
            }
          } else {
            lines.push({ text: '(Betik hatasız tamamlandı — çıkış kodu 0)', tone: 'success' });
          }
        }
      }
      break;
    }

    case 'dotnet': {
      if (args[0] === 'build') {
        lines.push(
          { text: 'MSBuild version 17.10.4 for .NET 8.0 (AnkaShell.csproj)', tone: 'accent' },
          { text: '  Determining projects to restore...' },
          { text: '  AnkaShell -> D:\\Projects\\AnkaOS_Native\\bin\\Release\\net8.0-windows\\AnkaOS_Racer_4_5.exe', tone: 'success' },
          { text: 'Build succeeded. 0 Warning(s), 0 Error(s).' }
        );
      } else {
        lines.push({ text: '.NET SDK 8.0.302 — Kullanım: dotnet build', tone: 'muted' });
      }
      break;
    }

    default: {
      lines.push({
        text: `'${tokens[0]}' dahili veya harici bir komut olarak tanınmıyor. Yardım için 'help' yazın.`,
        tone: 'error',
      });
    }
  }

  return { lines, nextCwd, nextVfs, actions };
}
