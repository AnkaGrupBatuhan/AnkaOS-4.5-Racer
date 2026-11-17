import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

interface SearchResult {
  title: string;
  url: string;
  displayUrl: string;
  snippet: string;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
}

async function fetchDuckDuckGoResults(query: string): Promise<SearchResult[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const resp = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const results: SearchResult[] = [];
    const blockRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match: RegExpExecArray | null;
    while ((match = blockRegex.exec(html)) !== null && results.length < 10) {
      let rawHref = match[1];
      if (rawHref.includes('uddg=')) {
        try {
          const parsed = new URL(rawHref.startsWith('//') ? `https:${rawHref}` : rawHref);
          const uddg = parsed.searchParams.get('uddg');
          if (uddg) rawHref = uddg;
        } catch {
          // keep rawHref
        }
      }
      if (!rawHref.startsWith('http')) continue;
      if (/duckduckgo\.com\/y\.js/i.test(rawHref)) continue;
      const title = decodeHtmlEntities(match[2]);
      const snippet = decodeHtmlEntities(match[3]);
      let displayUrl = rawHref;
      try {
        const u = new URL(rawHref);
        displayUrl = `${u.hostname}${u.pathname === '/' ? '' : u.pathname}`;
      } catch {
        // ignore
      }
      if (title) {
        results.push({ title, url: rawHref, displayUrl, snippet });
      }
    }
    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWikipediaResults(query: string): Promise<SearchResult[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const resp = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        query
      )}&format=json&utf8=1&srlimit=6`,
      { signal: controller.signal }
    );
    if (!resp.ok) return [];
    const data = (await resp.json()) as {
      query?: { search?: Array<{ title: string; snippet: string }> };
    };
    const items = data?.query?.search || [];
    return items.map((item) => {
      const slug = encodeURIComponent(item.title.replace(/ /g, '_'));
      const url = `https://en.wikipedia.org/wiki/${slug}`;
      return {
        title: `${item.title} - Wikipedia`,
        url,
        displayUrl: `en.wikipedia.org/wiki/${slug}`,
        snippet: decodeHtmlEntities(item.snippet),
      };
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function buildCuratedFallback(query: string): SearchResult[] {
  const q = encodeURIComponent(query);
  return [
    {
      title: `${query} - Wikipedia Encyclopedia`,
      url: `https://en.wikipedia.org/wiki/Special:Search?search=${q}`,
      displayUrl: `en.wikipedia.org › wiki › ${query}`,
      snippet: `Comprehensive encyclopedia articles, history, and technical specifications related to "${query}". Click to open directly inside AnkaBrowser without iframe restrictions.`,
    },
    {
      title: `${query} - MDN Web Docs & Developer Reference`,
      url: `https://developer.mozilla.org/en-US/search?q=${q}`,
      displayUrl: `developer.mozilla.org › search`,
      snippet: `Technical documentation, API guides, and code examples matching "${query}".`,
    },
    {
      title: `${query} - Example Interactive Web Page`,
      url: `https://example.com/`,
      displayUrl: `example.com`,
      snippet: `Verified fast-loading test page rendered through the AnkaBrowser Reverse Proxy (X-Frame-Options & CSP frame-ancestors bypassed).`,
    },
    {
      title: `Hacker News Discussions: ${query}`,
      url: `https://news.ycombinator.com/`,
      displayUrl: `news.ycombinator.com`,
      snippet: `Latest engineering discussions, benchmarks, and releases across the software ecosystem.`,
    },
  ];
}

function rewriteProxiedHtml(html: string, targetUrl: string): string {
  const parsed = new URL(targetUrl);
  const origin = parsed.origin;

  // Strip meta CSP / X-Frame-Options tags if present in HTML
  let cleaned = html
    .replace(/<meta[^>]+http-equiv=["']?(Content-Security-Policy|X-Frame-Options)["']?[^>]*>/gi, '')
    // Resolve root-relative src/href to absolute origin URLs so CSS, JS, and images load directly
    .replace(/\b(href|src)=["']\/([^/"'][^"']*)["']/gi, (_m, attr, rel) => {
      return `${attr}="${origin}/${rel}"`;
    })
    .replace(/\b(href|src)=["']\/\/([^"']+)["']/gi, (_m, attr, rest) => {
      return `${attr}="${parsed.protocol}//${rest}"`;
    });

  const injectedHead = `
    <base href="${origin}/">
    <style>
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-thumb { background: #52525b; border-radius: 4px; }
    </style>
    <script>
      (function() {
        document.addEventListener('click', function(e) {
          var a = e.target && e.target.closest ? e.target.closest('a') : null;
          if (!a) return;
          var href = a.getAttribute('href');
          if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
          e.preventDefault();
          var resolved = href;
          try { resolved = new URL(href, ${JSON.stringify(targetUrl)}).href; } catch(err) {}
          window.parent.postMessage({ type: 'ANKABROWSER_NAVIGATE', url: resolved }, '*');
        }, true);

        document.addEventListener('submit', function(e) {
          var form = e.target;
          if (!form || !form.action) return;
          var method = (form.method || 'GET').toUpperCase();
          if (method === 'GET') {
            e.preventDefault();
            try {
              var u = new URL(form.action, ${JSON.stringify(targetUrl)});
              var fd = new FormData(form);
              fd.forEach(function(val, key) { u.searchParams.set(key, String(val)); });
              window.parent.postMessage({ type: 'ANKABROWSER_NAVIGATE', url: u.href }, '*');
            } catch(err) {}
          }
        }, true);
      })();
    </script>
  `;

  if (/<head[^>]*>/i.test(cleaned)) {
    cleaned = cleaned.replace(/<head[^>]*>/i, (m) => `${m}\n${injectedHead}`);
  } else {
    cleaned = `<head>${injectedHead}</head>${cleaned}`;
  }

  return cleaned;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', os: 'AnkaOS 4.5 Racer Edition' });
  });

  // Search endpoint for AnkaBrowser (supports normal text queries cleanly without URL)
  app.get('/api/browser/search', async (req, res) => {
    const query = String(req.query.q || '').trim();
    if (!query) {
      return res.json({ query: '', engine: 'Google', results: [] });
    }

    let results = await fetchDuckDuckGoResults(query);
    let source = 'live-web';

    if (results.length === 0) {
      results = await fetchWikipediaResults(query);
      source = results.length > 0 ? 'wikipedia-index' : 'curated';
    }

    if (results.length === 0) {
      results = buildCuratedFallback(query);
      source = 'curated';
    }

    res.json({
      query,
      engine: 'Google',
      source,
      results,
    });
  });

  // Reverse proxy endpoint that strips X-Frame-Options & CSP frame-ancestors
  app.get('/api/browser/proxy', async (req, res) => {
    const rawUrl = String(req.query.url || '').trim();
    if (!rawUrl) {
      return res.status(400).send('Missing url parameter');
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
      if (!['http:', 'https:'].includes(targetUrl.protocol)) {
        return res.status(400).send('Only HTTP/HTTPS protocols are supported');
      }
    } catch {
      return res.status(400).send('Invalid target URL');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const upstream = await fetch(targetUrl.href, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/*,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });

      const contentType = upstream.headers.get('content-type') || 'text/html; charset=utf-8';
      const finalUrl = upstream.url || targetUrl.href;

      // Explicitly do NOT forward X-Frame-Options or CSP frame-ancestors
      res.setHeader('X-AnkaBrowser-Proxied', finalUrl);
      res.setHeader('Content-Type', contentType);

      if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
        const html = await upstream.text();
        const rewritten = rewriteProxiedHtml(html, finalUrl);
        return res.status(upstream.status).send(rewritten);
      }

      const buffer = Buffer.from(await upstream.arrayBuffer());
      return res.status(upstream.status).send(buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      return res.status(502).send(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { background: #0f1117; color: #e4e4e7; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .box { max-width: 480px; padding: 32px; background: #181a22; border: 1px solid #27272a; border-radius: 12px; }
              h2 { margin: 0 0 8px; color: #ef4444; font-size: 18px; }
              p { margin: 0 0 12px; color: #a1a1aa; font-size: 14px; line-height: 1.5; }
              code { display: block; padding: 10px; background: #090a0e; border-radius: 6px; font-size: 12px; color: #f97316; word-break: break-all; }
            </style>
          </head>
          <body>
            <div class="box">
              <h2>AnkaBrowser Proxy — Sayfaya Ulaşılamadı</h2>
              <p>Hedef sunucu bağlantıyı reddetti veya zaman aşımına uğradı (${message}).</p>
              <code>${targetUrl.href}</code>
            </div>
          </body>
        </html>
      `);
    } finally {
      clearTimeout(timeout);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AnkaOS 4.5 Racer Edition server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
