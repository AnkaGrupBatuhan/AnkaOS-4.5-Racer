export type VfsNodeType = 'drive' | 'folder' | 'file';

export interface VfsNode {
  id: string;
  name: string;
  path: string; // Normalized e.g. "C:", "C:/Users", "C:/Users/Racer/notes.txt"
  type: VfsNodeType;
  content?: string;
  mimeType?: string;
  size: number;
  updatedAt: string;
}

export interface VfsState {
  nodes: Record<string, VfsNode>;
}

const NOW_ISO = '2026-11-17T09:48:00.000Z';

export function normalizeVfsPath(rawPath: string, cwd = 'C:/Users/Racer'): string {
  let p = rawPath.trim().replace(/\\/g, '/');
  if (!p) return cwd;

  // Handle drive-relative or relative paths
  if (!/^[A-Za-z]:/.test(p)) {
    if (p.startsWith('/')) {
      const drive = cwd.slice(0, 2) || 'C:';
      p = `${drive}${p}`;
    } else {
      p = `${cwd}/${p}`;
    }
  }

  const driveMatch = p.match(/^([A-Za-z]:)(.*)$/);
  const drive = (driveMatch ? driveMatch[1] : 'C:').toUpperCase();
  const rest = driveMatch ? driveMatch[2] : p;

  const segments = rest.split('/');
  const resolved: string[] = [];
  for (const seg of segments) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      resolved.pop();
    } else {
      resolved.push(seg);
    }
  }

  return resolved.length === 0 ? drive : `${drive}/${resolved.join('/')}`;
}

export function getParentPath(normalizedPath: string): string | null {
  const norm = normalizeVfsPath(normalizedPath);
  const idx = norm.lastIndexOf('/');
  if (idx === -1) return null; // Drive root like "C:"
  return norm.slice(0, idx);
}

export function getBaseName(normalizedPath: string): string {
  const norm = normalizeVfsPath(normalizedPath);
  const idx = norm.lastIndexOf('/');
  return idx === -1 ? norm : norm.slice(idx + 1);
}

export function toWindowsDisplayPath(normalizedPath: string): string {
  const norm = normalizeVfsPath(normalizedPath);
  return norm.includes('/') ? norm.replace(/\//g, '\\') : `${norm}\\`;
}

function makeNode(
  path: string,
  type: VfsNodeType,
  content?: string,
  mimeType?: string
): VfsNode {
  const norm = normalizeVfsPath(path);
  const name = getBaseName(norm);
  const size = content ? new TextEncoder().encode(content).length : 0;
  return {
    id: norm,
    name,
    path: norm,
    type,
    content,
    mimeType,
    size,
    updatedAt: NOW_ISO,
  };
}

export function createInitialVfs(): VfsState {
  const nodes: Record<string, VfsNode> = {};
  const add = (node: VfsNode) => {
    nodes[node.path] = node;
  };

  // Drives & Core System Folders
  add(makeNode('C:', 'drive'));
  add(makeNode('D:', 'drive'));

  add(makeNode('C:/Users', 'folder'));
  add(makeNode('C:/Users/Racer', 'folder'));
  add(makeNode('C:/Users/Racer/Desktop', 'folder'));
  add(makeNode('C:/Users/Racer/Documents', 'folder'));
  add(makeNode('C:/Users/Racer/Pictures', 'folder'));
  add(makeNode('C:/AnkaOS', 'folder'));
  add(makeNode('C:/AnkaOS/System', 'folder'));

  add(makeNode('D:/Games', 'folder'));
  add(makeNode('D:/Games/AnkaRacer3D', 'folder'));
  add(makeNode('D:/Projects', 'folder'));
  add(makeNode('D:/Projects/AnkaOS_Native', 'folder'));
  add(makeNode('D:/Projects/WebLab', 'folder'));

  // System Files
  add(
    makeNode(
      'C:/AnkaOS/System/kernel.cfg',
      'file',
      `# AnkaOS 4.5 Racer Edition Kernel Configuration
EDITION=RACER_4.5_PRO
SHELL_ENGINE=AnkaShell.WPF
PYTHON_DAEMON=anka_vfs_daemon.py
TURBO_MODE=false
TELEMETRY_POLL_MS=800
VFS_SANDBOX=C:\\AnkaOS\\Sandbox
`,
      'text/plain'
    )
  );

  // User Documents
  add(
    makeNode(
      'C:/Users/Racer/Documents/hosgeldiniz.txt',
      'file',
      `AnkaOS 4.5 "Racer Edition" Masaüstü Ortamına Hoş Geldiniz!

Öne Çıkan Özellikler:
1. AnkaBrowser: Iframe engeli olmadan web'de gezinin, adres çubuğuna doğrudan Google arama kelimesi yazın.
2. AnkaCode Studio: C#, Python, TypeScript, HTML/JS düzenleyin ve anında çalıştırın.
3. AnkaTerm: Python destekli terminal ile 'turbo-mode on', 'sysinfo', 'tasklist', 'race-start' komutlarını kullanın.
4. Görev Yöneticisi (Ctrl+Shift+Esc): Canlı CPU/RAM telemetrisini izleyin ve süreçleri yönetin.
5. AnkaRacer 3D: Gece otoyolunda NOS destekli 3D yarış deneyimi.

İyi sürüşler!`,
      'text/plain'
    )
  );

  add(
    makeNode(
      'C:/Users/Racer/Documents/telemetry_notes.md',
      'file',
      `# AnkaOS 4.5 Telemetry Benchmarks
- Idle CPU Load: 12% - 18%
- Turbo Mode Clock Boost: +35% Frame Pacing
- VFS Latency: < 1.2ms (In-Memory + Persistent Store)
- Active Daemons: anka_shell.exe, anka_vfs_daemon.py, anka_telemetry.py`,
      'text/markdown'
    )
  );

  // Pictures referencing generated local assets
  add(
    makeNode(
      'C:/Users/Racer/Pictures/racer_carbon.jpg',
      'file',
      '/src/assets/images/wallpaper_racer_carbon_1794908972332.jpg',
      'image/jpeg'
    )
  );
  add(
    makeNode(
      'C:/Users/Racer/Pictures/night_highway.jpg',
      'file',
      '/src/assets/images/wallpaper_night_highway_1794908972947.jpg',
      'image/jpeg'
    )
  );
  add(
    makeNode(
      'C:/Users/Racer/Pictures/pit_garage.jpg',
      'file',
      '/src/assets/images/wallpaper_pit_garage_1794908973610.jpg',
      'image/jpeg'
    )
  );
  add(
    makeNode(
      'C:/Users/Racer/Pictures/anka_hypercar.jpg',
      'file',
      '/src/assets/images/app_racer_cover_1794908974403.jpg',
      'image/jpeg'
    )
  );

  // Game Highscores
  add(
    makeNode(
      'D:/Games/AnkaRacer3D/highscores.json',
      'file',
      JSON.stringify(
        [
          { driver: 'ANKA_PRO', score: 4850, topSpeed: 312, date: '2026-11-16' },
          { driver: 'APEX_TURBO', score: 3420, topSpeed: 289, date: '2026-11-15' },
          { driver: 'NIGHT_SHIFT', score: 2150, topSpeed: 264, date: '2026-11-14' },
        ],
        null,
        2
      ),
      'application/json'
    )
  );

  // Native C# + Python Bridge Source Project
  add(
    makeNode(
      'D:/Projects/AnkaOS_Native/AnkaShell.csproj',
      'file',
      `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net8.0-windows</TargetFramework>
    <UseWPF>true</UseWPF>
    <PublishSingleFile>true</PublishSingleFile>
    <SelfContained>true</SelfContained>
    <AssemblyName>AnkaOS_Racer_4_5</AssemblyName>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Microsoft.Web.WebView2" Version="1.0.2592.51" />
  </ItemGroup>
</Project>`,
      'application/xml'
    )
  );

  add(
    makeNode(
      'D:/Projects/AnkaOS_Native/WindowManager.cs',
      'file',
      `using System;
using System.Diagnostics;
using System.Windows;
using System.Windows.Controls;

namespace AnkaOS.Racer.Shell
{
    public class WindowManager
    {
        private readonly Canvas _desktopSurface;
        private int _zIndexCounter = 10;

        public WindowManager(Canvas desktopSurface)
        {
            _desktopSurface = desktopSurface;
        }

        public void FocusWindow(FrameworkElement windowFrame)
        {
            Panel.SetZIndex(windowFrame, ++_zIndexCounter);
        }

        public string InvokePythonBridge(string command)
        {
            var psi = new ProcessStartInfo("python", $"anka_bridge.py \\"{command}\\"")
            {
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            using var proc = Process.Start(psi);
            return proc?.StandardOutput.ReadToEnd() ?? string.Empty;
        }
    }
}`,
      'text/x-csharp'
    )
  );

  add(
    makeNode(
      'D:/Projects/AnkaOS_Native/anka_bridge.py',
      'file',
      `import json
import os
import sys
import time

SANDBOX_ROOT = os.path.abspath("./AnkaSandbox")

def get_telemetry(turbo: bool = False) -> dict:
    base_cpu = 42.4 if turbo else 18.6
    return {
        "cpu_percent": round(base_cpu + (time.time() % 7), 1),
        "ram_used_mb": 3420 if turbo else 2810,
        "ram_total_mb": 16384,
        "fps_cap": 144 if turbo else 60,
        "turbo_mode": turbo,
    }

def list_vfs(rel_path: str = ""):
    target = os.path.normpath(os.path.join(SANDBOX_ROOT, rel_path))
    if not target.startswith(SANDBOX_ROOT):
        raise PermissionError("Sandbox escape blocked")
    return os.listdir(target) if os.path.exists(target) else []

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "telemetry"
    print(json.dumps(get_telemetry(turbo=(cmd == "turbo"))))
`,
      'text/x-python'
    )
  );

  // WebLab Sample Files for Live Preview in Code Editor
  add(
    makeNode(
      'D:/Projects/WebLab/racer_widget.html',
      'file',
      `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <style>
    body {
      margin: 0; font-family: system-ui, sans-serif;
      background: #0b0c10; color: #f4f4f5;
      display: flex; align-items: center; justify-content: center; height: 100vh;
    }
    .panel {
      border: 1px solid #ef4444; background: #14161f;
      padding: 24px 32px; border-radius: 10px; text-align: center;
    }
    h1 { margin: 0 0 8px; color: #ef4444; font-size: 22px; }
    button {
      margin-top: 12px; padding: 8px 18px; border: 0; border-radius: 6px;
      background: #f97316; color: #090a0e; font-weight: 700; cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="panel">
    <h1>AnkaCode Live Preview</h1>
    <p id="rpm">RPM: 3,200</p>
    <button onclick="boost()">NOS Boost</button>
  </div>
  <script>
    let rpm = 3200;
    function boost() {
      rpm = Math.min(9000, rpm + 1200);
      document.getElementById('rpm').textContent = 'RPM: ' + rpm.toLocaleString();
    }
  </script>
</body>
</html>`,
      'text/html'
    )
  );

  add(
    makeNode(
      'D:/Projects/WebLab/lap_timer.js',
      'file',
      `// AnkaCode JS Runner Demo
const laps = [58.42, 57.19, 56.84, 57.05];
const best = Math.min(...laps);
const avg = laps.reduce((a, b) => a + b, 0) / laps.length;

console.log("AnkaRacer Telemetry Summary");
console.log("Laps:", laps.join("s, ") + "s");
console.log("Best Lap:", best.toFixed(2) + "s");
console.log("Average:", avg.toFixed(2) + "s");
`,
      'text/javascript'
    )
  );

  return { nodes };
}

export function listDirectory(state: VfsState, dirPath: string): VfsNode[] {
  const norm = normalizeVfsPath(dirPath);
  const children: VfsNode[] = [];
  for (const node of Object.values(state.nodes)) {
    if (node.path === norm) continue;
    if (getParentPath(node.path) === norm) {
      children.push(node);
    }
  }
  return children.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export function ensureFolderHierarchy(state: VfsState, folderPath: string): VfsState {
  const norm = normalizeVfsPath(folderPath);
  const parts = norm.split('/');
  const nextNodes = { ...state.nodes };
  let current = parts[0];
  if (!nextNodes[current]) {
    nextNodes[current] = makeNode(current, 'drive');
  }
  for (let i = 1; i < parts.length; i++) {
    current = `${current}/${parts[i]}`;
    if (!nextNodes[current]) {
      nextNodes[current] = makeNode(current, 'folder');
    }
  }
  return { nodes: nextNodes };
}

export function writeVfsFile(
  state: VfsState,
  filePath: string,
  content: string,
  mimeType = 'text/plain'
): VfsState {
  const norm = normalizeVfsPath(filePath);
  const parent = getParentPath(norm);
  let nextState = state;
  if (parent) {
    nextState = ensureFolderHierarchy(state, parent);
  }
  const existing = nextState.nodes[norm];
  const node: VfsNode = {
    id: norm,
    name: getBaseName(norm),
    path: norm,
    type: 'file',
    content,
    mimeType: existing?.mimeType || mimeType,
    size: new TextEncoder().encode(content).length,
    updatedAt: new Date().toISOString(),
  };
  return {
    nodes: {
      ...nextState.nodes,
      [norm]: node,
    },
  };
}

export function createVfsFolder(state: VfsState, folderPath: string): VfsState {
  const norm = normalizeVfsPath(folderPath);
  if (state.nodes[norm]) return state;
  return ensureFolderHierarchy(state, norm);
}

export function deleteVfsNode(state: VfsState, targetPath: string): VfsState {
  const norm = normalizeVfsPath(targetPath);
  const node = state.nodes[norm];
  if (!node || node.type === 'drive') return state;
  const nextNodes: Record<string, VfsNode> = {};
  const prefix = `${norm}/`;
  for (const [k, v] of Object.entries(state.nodes)) {
    if (k === norm || k.startsWith(prefix)) continue;
    nextNodes[k] = v;
  }
  return { nodes: nextNodes };
}

export function renameVfsNode(state: VfsState, targetPath: string, newName: string): VfsState {
  const cleanName = newName.trim().replace(/[\\/]/g, '');
  if (!cleanName) return state;
  const norm = normalizeVfsPath(targetPath);
  const node = state.nodes[norm];
  const parent = getParentPath(norm);
  if (!node || !parent) return state;

  const newPath = `${parent}/${cleanName}`;
  if (state.nodes[newPath]) return state;

  const nextNodes: Record<string, VfsNode> = {};
  const oldPrefix = `${norm}/`;
  for (const [k, v] of Object.entries(state.nodes)) {
    if (k === norm) {
      nextNodes[newPath] = {
        ...v,
        id: newPath,
        name: cleanName,
        path: newPath,
        updatedAt: new Date().toISOString(),
      };
    } else if (k.startsWith(oldPrefix)) {
      const updatedChildPath = `${newPath}/${k.slice(oldPrefix.length)}`;
      nextNodes[updatedChildPath] = {
        ...v,
        id: updatedChildPath,
        path: updatedChildPath,
      };
    } else {
      nextNodes[k] = v;
    }
  }
  return { nodes: nextNodes };
}

export function readVfsFile(state: VfsState, filePath: string): VfsNode | null {
  const norm = normalizeVfsPath(filePath);
  const node = state.nodes[norm];
  return node && node.type === 'file' ? node : null;
}

export function getAllVfsFiles(state: VfsState): VfsNode[] {
  return Object.values(state.nodes)
    .filter((n) => n.type === 'file')
    .sort((a, b) => a.path.localeCompare(b.path));
}
