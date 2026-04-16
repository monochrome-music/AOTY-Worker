import { error } from "./utils";
import { handleListItems } from "./handlers/listItems";
import { handleLists } from "./handlers/lists";
import { handleAlbum } from "./handlers/album";
import { handleAnticipated } from "./handlers/anticipated";
import type { Env, JSONResponse } from "./types";

const API_INFO = {
  name: "Album of the Year API",
  version: "1.0.0",
  endpoints: {
    "/": "API documentation",
    "/lists": "Get all year end lists (optional: ?y=2025 for specific year)",
    "/list?slug=<slug>": "Get a specific list by slug (e.g., ?slug=2618-the-needle-drops-top-50-albums-of-2025)",
    "/album?artist=<artist>&album=<album>": "Get album details with critics and user reviews",
    "/anticipated": "Get highly anticipated albums"
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
      "GET /album?artist=Kanye+Wests&album=Late+Registration"
    ],
    anticipated: [
      "GET /anticipated"
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

const handleRequest = async (request: Request, _env: Env): Promise<JSONResponse> => {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const params: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { params[k] = v; });

  switch (pathname) {
    case "/":
      return handleRoot();

    case "/lists":
      return handleLists(params.y);

    case "/list": {
      if (!params.slug) return error("Missing slug parameter", 400);
      return handleListItems(params.slug);
    }

    case "/album": {
      if (!params.artist || !params.album) return error("Missing artist or album parameter", 400);
      return handleAlbum(params.artist, params.album);
    }

    case "/anticipated": {
      return handleAnticipated();
    }

    default: {
      return error(`Unknown endpoint: ${pathname}. Available: /, /lists, /list, /album, /anticipated`, 404);
    }
  }
};

export default {
  fetch(request: Request, env: Env): Promise<JSONResponse> {
    return handleRequest(request, env);
  }
} satisfies ExportedHandler<Env>;