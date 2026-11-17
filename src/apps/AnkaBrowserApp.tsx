import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Globe,
  Home,
  Lock,
  Plus,
  RotateCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { buildProxyUrl, resolveBrowserInput } from '../core/browserUtils';

interface SearchResultItem {
  title: string;
  url: string;
  displayUrl: string;
  snippet: string;
}

interface BrowserTab {
  id: string;
  title: string;
  mode: 'home' | 'search' | 'url';
  inputText: string;
  query?: string;
  url?: string;
  results?: SearchResultItem[];
  sourceLabel?: string;
  loading: boolean;
  history: Array<{ mode: 'home' | 'search' | 'url'; value: string }>;
  historyIndex: number;
}

const BOOKMARKS = [
  { label: 'Google', target: 'anka://home' },
  { label: 'Wikipedia', target: 'https://en.wikipedia.org/wiki/Formula_One' },
  { label: 'Example.com', target: 'https://example.com' },
  { label: 'Hacker News', target: 'https://news.ycombinator.com' },
  { label: 'MDN Docs', target: 'https://developer.mozilla.org/en-US/' },
];

function createTab(id: string): BrowserTab {
  return {
    id,
    title: 'Google — AnkaBrowser',
    mode: 'home',
    inputText: '',
    loading: false,
    history: [{ mode: 'home', value: 'anka://home' }],
    historyIndex: 0,
  };
}

export const AnkaBrowserApp: React.FC<{ initialUrl?: string }> = ({ initialUrl }) => {
  const [tabs, setTabs] = useState<BrowserTab[]>(() => [createTab('tab_1')]);
  const [activeTabId, setActiveTabId] = useState('tab_1');
  const [homeQuery, setHomeQuery] = useState('');
  const tabCounterRef = useRef(1);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const updateTab = (tabId: string, updater: (prev: BrowserTab) => BrowserTab) => {
    setTabs((prev) => prev.map((t) => (t.id === tabId ? updater(t) : t)));
  };

  const navigateTab = async (tabId: string, rawInput: string, pushHistory = true) => {
    const resolved = resolveBrowserInput(rawInput);

    if (resolved.mode === 'home') {
      updateTab(tabId, (t) => {
        const nextHistory = pushHistory
          ? [...t.history.slice(0, t.historyIndex + 1), { mode: 'home' as const, value: 'anka://home' }]
          : t.history;
        return {
          ...t,
          mode: 'home',
          title: 'Google — AnkaBrowser',
          inputText: '',
          query: undefined,
          url: undefined,
          results: undefined,
          loading: false,
          history: nextHistory,
          historyIndex: pushHistory ? nextHistory.length - 1 : t.historyIndex,
        };
      });
      return;
    }

    if (resolved.mode === 'search' && resolved.query) {
      const q = resolved.query;
      updateTab(tabId, (t) => {
        const nextHistory = pushHistory
          ? [...t.history.slice(0, t.historyIndex + 1), { mode: 'search' as const, value: q }]
          : t.history;
        return {
          ...t,
          mode: 'search',
          title: `${q} — Google Arama`,
          inputText: q,
          query: q,
          url: undefined,
          loading: true,
          history: nextHistory,
          historyIndex: pushHistory ? nextHistory.length - 1 : t.historyIndex,
        };
      });

      try {
        const resp = await fetch(`/api/browser/search?q=${encodeURIComponent(q)}`);
        const data = (await resp.json()) as { results?: SearchResultItem[]; source?: string };
        updateTab(tabId, (t) => ({
          ...t,
          results: data.results || [],
          sourceLabel: data.source || 'live-web',
          loading: false,
        }));
      } catch {
        updateTab(tabId, (t) => ({
          ...t,
          results: [],
          loading: false,
        }));
      }
      return;
    }

    if (resolved.mode === 'url' && resolved.url) {
      const targetUrl = resolved.url;
      let hostTitle = targetUrl;
      try {
        hostTitle = new URL(targetUrl).hostname;
      } catch {
        // ignore
      }
      updateTab(tabId, (t) => {
        const nextHistory = pushHistory
          ? [...t.history.slice(0, t.historyIndex + 1), { mode: 'url' as const, value: targetUrl }]
          : t.history;
        return {
          ...t,
          mode: 'url',
          title: hostTitle,
          inputText: targetUrl,
          url: targetUrl,
          query: undefined,
          loading: true,
          history: nextHistory,
          historyIndex: pushHistory ? nextHistory.length - 1 : t.historyIndex,
        };
      });
    }
  };

  // Support initialUrl prop
  useEffect(() => {
    if (initialUrl) {
      navigateTab('tab_1', initialUrl);
    }
  }, [initialUrl]);

  // Listen to link navigation events posted by proxied iframe pages
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'ANKABROWSER_NAVIGATE' && typeof e.data.url === 'string') {
        navigateTab(activeTabId, e.data.url);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [activeTabId]);

  const handleGoBack = () => {
    if (activeTab.historyIndex <= 0) return;
    const nextIdx = activeTab.historyIndex - 1;
    const entry = activeTab.history[nextIdx];
    updateTab(activeTab.id, (t) => ({ ...t, historyIndex: nextIdx }));
    navigateTab(activeTab.id, entry.value, false);
  };

  const handleGoForward = () => {
    if (activeTab.historyIndex >= activeTab.history.length - 1) return;
    const nextIdx = activeTab.historyIndex + 1;
    const entry = activeTab.history[nextIdx];
    updateTab(activeTab.id, (t) => ({ ...t, historyIndex: nextIdx }));
    navigateTab(activeTab.id, entry.value, false);
  };

  const handleReload = () => {
    const cur = activeTab.history[activeTab.historyIndex];
    if (cur) navigateTab(activeTab.id, cur.value, false);
  };

  const handleNewTab = () => {
    const id = `tab_${++tabCounterRef.current}`;
    setTabs((prev) => [...prev, createTab(id)]);
    setActiveTabId(id);
  };

  const handleCloseTab = (tabId: string) => {
    if (tabs.length === 1) {
      navigateTab(tabId, 'anka://home');
      return;
    }
    const remaining = tabs.filter((t) => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[remaining.length - 1].id);
    }
  };

  const handleOmniboxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTab(activeTab.id, activeTab.inputText);
  };

  return (
    <div className="h-full flex flex-col bg-[#0E1016] text-zinc-100">
      {/* Tab Strip */}
      <div className="h-9 bg-[#090A0E] border-b border-zinc-800 px-2 flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const isCurrent = tab.id === activeTab.id;
          return (
            <div
              key={tab.id}
              className={`group h-7 px-2.5 rounded-t flex items-center gap-2 text-xs max-w-[190px] shrink-0 border-t border-x ${
                isCurrent
                  ? 'bg-[#151822] text-zinc-100 border-zinc-700'
                  : 'bg-[#0D0F15] text-zinc-400 border-transparent hover:bg-[#131620]'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className="flex items-center gap-1.5 min-w-0 flex-1 text-left"
              >
                <Globe className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="truncate">{tab.title}</span>
              </button>
              <button
                type="button"
                aria-label={`Sekmeyi kapat ${tab.title}`}
                onClick={() => handleCloseTab(tab.id)}
                className="p-0.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          aria-label="Yeni Sekme"
          onClick={handleNewTab}
          className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Navigation & Omnibox */}
      <div className="h-11 bg-[#151822] border-b border-zinc-800 px-3 flex items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Geri"
            disabled={activeTab.historyIndex <= 0}
            onClick={handleGoBack}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-800 disabled:opacity-35 text-zinc-300"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="İleri"
            disabled={activeTab.historyIndex >= activeTab.history.length - 1}
            onClick={handleGoForward}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-800 disabled:opacity-35 text-zinc-300"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Yenile"
            onClick={handleReload}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-300"
          >
            <RotateCw className={`w-3.5 h-3.5 ${activeTab.loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            aria-label="Google Ana Sayfa"
            onClick={() => navigateTab(activeTab.id, 'anka://home')}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-300"
          >
            <Home className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleOmniboxSubmit} className="flex-1 flex items-center relative">
          <Lock className="w-3.5 h-3.5 text-emerald-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            aria-label="Google'da ara veya URL girin"
            value={activeTab.inputText}
            onChange={(e) => updateTab(activeTab.id, (t) => ({ ...t, inputText: e.target.value }))}
            placeholder="Google'da arayın (örn: fenerbahçe haberleri) veya URL yazın..."
            className="w-full h-8 bg-[#0B0C10] border border-zinc-700 focus:border-red-500 rounded-md pl-8 pr-28 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none"
          />
          <button
            type="submit"
            className="absolute right-1 h-6 px-2.5 rounded bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold"
          >
            Git / Ara
          </button>
        </form>

        <div
          title="Iframe engeli kaldırıldı: X-Frame-Options ve CSP Proxy katmanı aktif"
          className="hidden md:flex items-center gap-1.5 text-[11px] text-emerald-400 shrink-0"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Proxy Aktif</span>
        </div>
      </div>

      {/* Bookmarks Bar */}
      <div className="h-8 bg-[#11131B] border-b border-zinc-800/80 px-3 flex items-center gap-2 overflow-x-auto">
        <Bookmark className="w-3 h-3 text-zinc-500 shrink-0" />
        {BOOKMARKS.map((bm) => (
          <button
            key={bm.label}
            type="button"
            onClick={() => navigateTab(activeTab.id, bm.target)}
            className="px-2 py-0.5 rounded text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
          >
            {bm.label}
          </button>
        ))}
      </div>

      {/* Viewport */}
      <div className="flex-1 min-h-0 overflow-auto bg-[#0C0E13]">
        {activeTab.mode === 'home' && (
          <div className="min-h-full flex flex-col items-center justify-center px-6 py-12">
            <div className="w-full max-w-xl text-center">
              <div className="font-display text-5xl font-bold tracking-tight mb-2">
                <span className="text-blue-500">G</span>
                <span className="text-red-500">o</span>
                <span className="text-amber-400">o</span>
                <span className="text-blue-500">g</span>
                <span className="text-emerald-500">l</span>
                <span className="text-red-500">e</span>
              </div>
              <p className="text-xs text-zinc-400 mb-6">
                AnkaBrowser Engelsiz Arama Motoru · Doğal metin yazarak arama yapın veya adres girin
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (homeQuery.trim()) {
                    navigateTab(activeTab.id, homeQuery);
                    setHomeQuery('');
                  }
                }}
                className="relative"
              >
                <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  aria-label="Google Arama Kutusu"
                  value={homeQuery}
                  onChange={(e) => setHomeQuery(e.target.value)}
                  placeholder="Google'da bir şey arayın (URL gerekmez)..."
                  className="w-full h-11 bg-[#161923] border border-zinc-700 focus:border-red-500 rounded-lg pl-11 pr-28 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none shadow-lg"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-4 rounded bg-red-600 hover:bg-red-500 text-xs font-semibold text-white"
                >
                  Google Ara
                </button>
              </form>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {['Formula 1 2026', 'Türkiye teknoloji haberleri', 'TypeScript rehberi', 'example.com'].map(
                  (sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => navigateTab(activeTab.id, sample)}
                      className="px-3 py-1.5 rounded bg-[#151822] hover:bg-[#1E2331] border border-zinc-800 text-xs text-zinc-300"
                    >
                      {sample}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab.mode === 'search' && (
          <div className="max-w-3xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="font-display text-xl font-bold">
                  <span className="text-blue-500">G</span>
                  <span className="text-red-500">o</span>
                  <span className="text-amber-400">o</span>
                  <span className="text-blue-500">g</span>
                  <span className="text-emerald-500">l</span>
                  <span className="text-red-500">e</span>
                </span>
                <span className="text-xs text-zinc-400">
                  "{activeTab.query}" için sonuçlar
                </span>
              </div>
              <span className="text-[11px] text-zinc-500">
                Iframe-Bypass Proxy Hazır
              </span>
            </div>

            {activeTab.loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-4 rounded bg-[#141720] border border-zinc-800/70 animate-pulse">
                    <div className="h-3 w-48 bg-zinc-800 rounded mb-2" />
                    <div className="h-4 w-80 bg-zinc-700 rounded mb-2" />
                    <div className="h-3 w-full bg-zinc-800 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                {(activeTab.results || []).map((res, idx) => (
                  <article key={`${res.url}_${idx}`} className="group">
                    <div className="text-xs text-zinc-400 truncate mb-0.5">{res.displayUrl}</div>
                    <button
                      type="button"
                      onClick={() => navigateTab(activeTab.id, res.url)}
                      className="text-left text-base font-semibold text-blue-400 group-hover:text-blue-300 group-hover:underline"
                    >
                      {res.title}
                    </button>
                    <p className="mt-1 text-xs text-zinc-300 leading-relaxed">{res.snippet}</p>
                  </article>
                ))}
                {(activeTab.results || []).length === 0 && (
                  <div className="p-6 rounded bg-[#141720] border border-zinc-800 text-sm text-zinc-400">
                    Sonuç bulunamadı. Başka bir anahtar kelime deneyin.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab.mode === 'url' && activeTab.url && (
          <div className="w-full h-full relative bg-white">
            <iframe
              key={`${activeTab.id}_${activeTab.url}`}
              title={activeTab.title}
              src={buildProxyUrl(activeTab.url)}
              onLoad={() => updateTab(activeTab.id, (t) => ({ ...t, loading: false }))}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        )}
      </div>
    </div>
  );
};
