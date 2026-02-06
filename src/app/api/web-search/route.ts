/**
 * Web Search API Route
 *
 * Provides server-side web search for the LiveIntelligenceGatherer.
 * Supports Tavily, Serper, or SerpAPI via WEB_SEARCH_API_KEY.
 *
 * POST: { query: string } → { results: Array<{ title, url, snippet }> }
 */

import { NextResponse } from 'next/server';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const apiKey = process.env.WEB_SEARCH_API_KEY;

    if (!apiKey) {
      // Graceful degradation: return empty results if no API key
      return NextResponse.json({ results: [] });
    }

    const results = await performSearch(query, apiKey);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[web-search] Error:', error);
    // Non-blocking: return empty results on failure
    return NextResponse.json({ results: [] });
  }
}

async function performSearch(query: string, apiKey: string): Promise<SearchResult[]> {
  // Detect provider based on API key format or env variable
  const provider = process.env.WEB_SEARCH_PROVIDER ?? detectProvider(apiKey);

  switch (provider) {
    case 'tavily':
      return searchTavily(query, apiKey);
    case 'serper':
      return searchSerper(query, apiKey);
    case 'serpapi':
      return searchSerpAPI(query, apiKey);
    default:
      return searchTavily(query, apiKey);
  }
}

function detectProvider(apiKey: string): string {
  if (apiKey.startsWith('tvly-')) return 'tavily';
  if (apiKey.length === 40) return 'serper';
  return 'tavily';
}

async function searchTavily(query: string, apiKey: string): Promise<SearchResult[]> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic',
      max_results: 5,
    }),
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.results ?? []).map((r: Record<string, string>) => ({
    title: r.title ?? '',
    url: r.url ?? '',
    snippet: r.content ?? '',
  }));
}

async function searchSerper(query: string, apiKey: string): Promise<SearchResult[]> {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ q: query, num: 5 }),
  });

  if (!response.ok) return [];

  const data = await response.json();
  return (data.organic ?? []).map((r: Record<string, string>) => ({
    title: r.title ?? '',
    url: r.link ?? '',
    snippet: r.snippet ?? '',
  }));
}

async function searchSerpAPI(query: string, apiKey: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    api_key: apiKey,
    q: query,
    engine: 'google',
    num: '5',
  });

  const response = await fetch(`https://serpapi.com/search?${params.toString()}`);

  if (!response.ok) return [];

  const data = await response.json();
  return (data.organic_results ?? []).map((r: Record<string, string>) => ({
    title: r.title ?? '',
    url: r.link ?? '',
    snippet: r.snippet ?? '',
  }));
}
