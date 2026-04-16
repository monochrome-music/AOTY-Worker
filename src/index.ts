import { error } from "./utils";
import { handleListItems } from "./handlers/listItems";
import { handleLists } from "./handlers/lists";
import { handleAlbum } from "./handlers/album";
import type { Env, JSONResponse } from "./types";

const API_INFO = {
  name: "Album of the Year API",
  version: "1.0.0",
  endpoints: {
    "/": "API documentation",
    "/lists": "Get all year end lists (optional: ?y=2025 for specific year)",
    "/list?slug=<slug>": "Get a specific list by slug (e.g., ?slug=2618-the-needle-drops-top-50-albums-of-2025)",
    "/album?artist=<artist>&album=<album>": "Get album details with critics and user reviews"
  },
  examples: {
    lists: [
      "GET /lists - All lists",
      "GET /lists?y=2025 - 2025 lists only"
    ],
    list: [
      "GET /list?slug=2618-the-needle-drops-top-50-albums-of-2025"
    ],
    album: [
      "GET /album?artist=Tyler+Childers&album=Snipe+Hunter"
    ]
  }
};

const handleRoot = (): JSONResponse => {
  return new Response(JSON.stringify(API_INFO, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
};

const parseQuery = (search: string): Record<string, string> => {
  const params: Record<string, string> = {};
  const url = new URL(`http://localhost?${search}`);
  url.searchParams.forEach((v, k) => { params[k] = v; });
  return params;
};

const handleRequest = async (request: Request, _env: Env): Promise<JSONResponse> => {
  const url = new URL(request.url);
  const { pathname, search } = url;
  const params = parseQuery(search);

  switch (pathname) {
    case "/":
      return handleRoot();

    case "/lists": {
      const year = params.y;
      return handleLists(year);
    }

    case "/list": {
      const slug = params.slug;
      if (!slug) return error("Missing slug parameter", 400);
      return handleListItems(slug);
    }

    case "/album": {
      const artist = params.artist;
      const album = params.album;
      if (!artist || !album) return error("Missing artist or album parameter", 400);
      return handleAlbum(artist, album);
    }

    default: {
      return error(`Unknown endpoint: ${pathname}. Available: /, /lists, /list, /album`, 404);
    }
  }
};

export default {
  fetch(request: Request, env: Env): Promise<JSONResponse> {
    return handleRequest(request, env);
  }
} satisfies ExportedHandler<Env>;