export interface BrowserInputResolution {
  mode: 'home' | 'search' | 'url';
  query?: string;
  url?: string;
  displayValue: string;
}

/**
 * Classifies AnkaBrowser omnibox input:
 * - Empty or "anka://home" -> home
 * - Contains spaces or lacks protocol/TLD -> Google Search mode (works with normal text!)
 * - Looks like URL or domain -> URL proxy mode
 */
export function resolveBrowserInput(rawInput: string): BrowserInputResolution {
  const input = rawInput.trim();
  if (!input || input === 'anka://home' || input === 'about:blank') {
    return { mode: 'home', displayValue: '' };
  }

  // Handle explicit google search URL if pasted
  if (/^https?:\/\/(www\.)?google\.[a-z.]+\/search/i.test(input)) {
    try {
      const u = new URL(input);
      const q = u.searchParams.get('q');
      if (q) {
        return { mode: 'search', query: q, displayValue: q };
      }
    } catch {
      // fall through
    }
  }

  // Explicit http:// or https://
  if (/^https?:\/\//i.test(input)) {
    return { mode: 'url', url: input, displayValue: input };
  }

  // If input contains spaces, it's definitely a normal text search query
  if (/\s/.test(input)) {
    return { mode: 'search', query: input, displayValue: input };
  }

  // Domain-like pattern (e.g. example.com, en.wikipedia.org, localhost:3000) without spaces
  const looksLikeDomain =
    /^localhost(:\d+)?(\/.*)?$/i.test(input) ||
    /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+(:\d+)?(\/.*)?$/.test(input);

  if (looksLikeDomain) {
    const protocol = /^localhost/i.test(input) ? 'http://' : 'https://';
    const fullUrl = `${protocol}${input}`;
    return { mode: 'url', url: fullUrl, displayValue: fullUrl };
  }

  // Single word like "fenerbahçe" or "haberler" -> Google Search!
  return { mode: 'search', query: input, displayValue: input };
}

export function buildProxyUrl(targetUrl: string): string {
  return `/api/browser/proxy?url=${encodeURIComponent(targetUrl)}`;
}
