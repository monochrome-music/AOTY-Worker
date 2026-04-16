import type { JSONResponse } from "./types";

const CORSHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const CacheHeaders: Record<string, string> = {
  ...CORSHeaders,
  "Cache-Control": "public, max-age=300, s-maxage=3600",
};

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const json = (data: unknown, status = 200, useCache = false): JSONResponse => {
  return new Response(JSON.stringify(data), {
    status,
    headers: useCache ? CacheHeaders : CORSHeaders,
  });
};

const error = (message: string, status = 500): JSONResponse => {
  return json({ error: message }, status);
};

const fetchAoty = async (path: string, useCache = false): Promise<Response> => {
  const res = await fetch(path, {
    headers: { "User-Agent": USER_AGENT },
    ...(useCache && { cf: { cacheTtl: 3600, cacheEverything: true } }),
  });
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  return res;
};

const extractNumbers = (str: string): string => {
  const match = str.match(/[\d,]+/);
  return match ? match[0] : "N/A";
};

const splitArtistAlbum = (artistAlbum: string): { artist: string; album: string } => {
  const sep = artistAlbum.indexOf(" - ");
  if (sep === -1) return { artist: artistAlbum.trim(), album: "" };
  return {
    artist: artistAlbum.slice(0, sep).trim(),
    album: artistAlbum.slice(sep + 3).trim(),
  };
};

const stripHtml = (html: string): string => {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, "")
    .trim();
};

const extractMeta = (html: string, name: string): string => {
  const match = html.match(new RegExp(`<meta[^>]*name="${name}"[^>]*content="([^"]*)"`, "i"));
  return match ? match[1] : "";
};

const extractOgMeta = (html: string, property: string): string => {
  const match = html.match(new RegExp(`<meta[^>]*property="${property}"[^>]*content="([^"]*)"`, "i"));
  return match ? match[1] : "";
};

const extractTwMeta = (html: string, name: string): string => {
  const match = html.match(new RegExp(`<meta[^>]*name="twitter:${name}"[^>]*content="([^"]*)"`, "i"));
  return match ? match[1] : "";
};

export {
  CORSHeaders,
  CacheHeaders,
  USER_AGENT,
  json,
  error,
  fetchAoty,
  extractNumbers,
  splitArtistAlbum,
  stripHtml,
  extractMeta,
  extractOgMeta,
  extractTwMeta,
};