import React, { useRef } from 'react';
import { Maximize2, Minimize2, Minus, X } from 'lucide-react';
import { useDesktop } from './DesktopContext';
import { WindowInstance } from './types';

interface WindowFrameProps {
  win: WindowInstance;
  icon: React.ReactNode;
  children: React.ReactNode;
}

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const WindowFrame: React.FC<WindowFrameProps> = ({ win, icon, children }) => {
  const {
    activeWindowId,
    accent,
    focusWindow,
    closeWindow,
    minimizeWindow,
    toggleMaximizeWindow,
    updateWindowGeometry,
  } = useDesktop();

  const isActive = activeWindowId === win.id;
  const dragStateRef = useRef<{
    mode: 'drag' | 'resize';
    dir?: ResizeDir;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  if (win.minimized) return null;

  const accentBorder =
    accent === 'amber'
      ? 'border-orange-500/70'
      : accent === 'cyan'
      ? 'border-cyan-500/70'
      : 'border-red-500/70';

  const startDrag = (e: React.PointerEvent) => {
    if (win.maximized) return;
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    focusWindow(win.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const origX = win.x;
    const origY = win.y;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const maxX = Math.max(0, window.innerWidth - 160);
      const maxY = Math.max(0, window.innerHeight - 92);
      updateWindowGeometry(win.id, {
        x: Math.max(-win.width + 160, Math.min(maxX, origX + dx)),
        y: Math.max(0, Math.min(maxY, origY + dy)),
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const startResize = (dir: ResizeDir) => (e: React.PointerEvent) => {
    if (win.maximized) return;
    e.preventDefault();
    e.stopPropagation();
    focusWindow(win.id);

    dragStateRef.current = {
      mode: 'resize',
      dir,
      startX: e.clientX,
      startY: e.clientY,
      origX: win.x,
      origY: win.y,
      origW: win.width,
      origH: win.height,
    };

    const onMove = (ev: PointerEvent) => {
      const st = dragStateRef.current;
      if (!st || !st.dir) return;
      const dx = ev.clientX - st.startX;
      const dy = ev.clientY - st.startY;
      const minW = 340;
      const minH = 260;

      let nextX = st.origX;
      let nextY = st.origY;
      let nextW = st.origW;
      let nextH = st.origH;

      if (st.dir.includes('e')) {
        nextW = Math.max(minW, st.origW + dx);
      }
      if (st.dir.includes('s')) {
        nextH = Math.max(minH, st.origH + dy);
      }
      if (st.dir.includes('w')) {
        const possibleW = st.origW - dx;
        if (possibleW >= minW) {
          nextW = possibleW;
          nextX = st.origX + dx;
        }
      }
      if (st.dir.includes('n')) {
        const possibleH = st.origH - dy;
        if (possibleH >= minH && st.origY + dy >= 0) {
          nextH = possibleH;
          nextY = st.origY + dy;
        }
      }

      updateWindowGeometry(win.id, { x: nextX, y: nextY, width: nextW, height: nextH });
    };

    const onUp = () => {
      dragStateRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const style: React.CSSProperties = win.maximized
    ? {
        left: 0,
        top: 0,
        width: '100%',
        height: 'calc(100vh - 52px)',
        zIndex: win.zIndex,
      }
    : {
        left: win.x,
        top: win.y,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
      };

  return (
    <section
      aria-label={win.title}
      data-testid={`window-${win.appId}`}
      onMouseDown={() => focusWindow(win.id)}
      style={style}
      className={`fixed flex flex-col bg-[#101218] overflow-hidden shadow-2xl transition-shadow duration-150 ${
        win.maximized ? 'rounded-none' : 'rounded-lg'
      } border ${isActive ? accentBorder : 'border-zinc-800'}`}
    >
      {/* Aerodynamic Title Bar */}
      <div
        onPointerDown={startDrag}
        onDoubleClick={() => toggleMaximizeWindow(win.id)}
        className={`h-10 shrink-0 flex items-center justify-between px-3 border-b select-none cursor-grab active:cursor-grabbing ${
          isActive
            ? 'bg-[#161923] border-zinc-800 text-zinc-100'
            : 'bg-[#11131A] border-zinc-800/70 text-zinc-400'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0 flex items-center justify-center w-5 h-5">{icon}</span>
          <span className="font-display text-sm font-semibold tracking-wide truncate">
            {win.title}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            aria-label={`Küçült ${win.title}`}
            onClick={(e) => {
              e.stopPropagation();
              minimizeWindow(win.id);
            }}
            className="w-8 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            aria-label={win.maximized ? `Geri Yükle ${win.title}` : `Tam Ekran ${win.title}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleMaximizeWindow(win.id);
            }}
            className="w-8 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            {win.maximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            aria-label={`Kapat ${win.title}`}
            onClick={(e) => {
              e.stopPropagation();
              closeWindow(win.id);
            }}
            className="w-8 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-red-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* App Content Body */}
      <div className="flex-1 min-h-0 bg-[#0C0E13] overflow-hidden relative">{children}</div>

      {/* Resize Handles (8 directions) */}
      {!win.maximized && (
        <>
          <div onPointerDown={startResize('n')} className="absolute top-0 left-2 right-2 h-1 cursor-n-resize" />
          <div onPointerDown={startResize('s')} className="absolute bottom-0 left-2 right-2 h-1.5 cursor-s-resize" />
          <div onPointerDown={startResize('w')} className="absolute top-2 bottom-2 left-0 w-1.5 cursor-w-resize" />
          <div onPointerDown={startResize('e')} className="absolute top-2 bottom-2 right-0 w-1.5 cursor-e-resize" />
          <div onPointerDown={startResize('nw')} className="absolute top-0 left-0 w-2.5 h-2.5 cursor-nw-resize" />
          <div onPointerDown={startResize('ne')} className="absolute top-0 right-0 w-2.5 h-2.5 cursor-ne-resize" />
          <div onPointerDown={startResize('sw')} className="absolute bottom-0 left-0 w-2.5 h-2.5 cursor-sw-resize" />
          <div onPointerDown={startResize('se')} className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize" />
        </>
      )}
    </section>
  );
};
