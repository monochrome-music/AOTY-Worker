interface Env {
  AOTY_WORKER: unknown;
}

interface AlbumItem {
  rank: number | null;
  artistAlbum: string;
  image: string;
}

interface ListItem {
  name: string;
  slug: string;
  image: string;
}

interface Review {
  score: string;
  publication: string;
  author: string;
  text: string;
  image: string;
}

interface Album {
  artist: string;
  album: string;
  url: string;
  critic: {
    score: string;
    count: string;
    reviews: Review[];
  };
  user: {
    score: string;
    count: string;
  };
}

type JSONResponse = Response;

const CORS_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const json = (data: unknown, status = 200, extraHeaders?: Record<string, string>): JSONResponse => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, ...extraHeaders },
  });
};

const error = (message: string, status = 500): JSONResponse => {
  return json({ error: message }, status);
};

const fetchAoty = async (path: string): Promise<Response> => {
  const res = await fetch(path, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  return res;
};

const extractNumbers = (str: string): string => {
  const match = str.match(/[\d,]+/);
  return match ? match[0] : "N/A";
};

const parseAlbumEntry = (item: AlbumItem): { rank: number; artist: string; album: string; image: string } => {
  const { rank, artistAlbum, image } = item;
  const sepIndex = artistAlbum.indexOf(" - ");
  const artist = sepIndex >= 0 ? artistAlbum.slice(0, sepIndex).trim() : artistAlbum.trim();
  const album = sepIndex >= 0 ? artistAlbum.slice(sepIndex + 3).trim() : "";
  return { rank: rank!, artist, album, image };
};

const handleListItems = async (slug: string): Promise<JSONResponse> => {
  const res = await fetchAoty(`https://www.albumoftheyear.org/list/${slug}/`);

  const items: AlbumItem[] = [];
  let current: AlbumItem | null = null;
  let listName = "";
  let sourceUrl = "";

  await new HTMLRewriter()
    .on("h1.headline", {
      text(t) { listName += t.text; }
    })
    .on("div.listHeader a.gray", {
      element(el) {
        if (!sourceUrl) sourceUrl = el.getAttribute("href") || "";
      }
    })
    .on("div.albumListRow", {
      element(el) {
        const id = el.getAttribute("id") || "";
        const m = id.match(/^rank-(\d+)$/);
        current = { rank: m ? parseInt(m[1], 10) : null, artistAlbum: "", image: "" };
        items.push(current);
      }
    })
    .on('a[itemprop="url"]', {
      text(t) {
        if (current) current.artistAlbum += t.text;
      }
    })
    .on("div.albumListCover img", {
      element(el) {
        if (current && !current.image) current.image = el.getAttribute("src")?.split("/").pop() || "";
      }
    })
    .transform(res)
    .arrayBuffer();

  const result = {
    name: listName.trim(),
    sourceUrl,
    items: items
      .filter((i): i is AlbumItem => i.rank !== null && !!i.artistAlbum.trim())
      .sort((a, b) => a.rank - b.rank)
      .map(parseAlbumEntry),
  };

  return json(result);
};

const handleLists = async (): Promise<JSONResponse> => {
  const res = await fetchAoty("https://www.albumoftheyear.org/lists.php");

  const lists: ListItem[] = [];
  let current: ListItem | null = null;

  await new HTMLRewriter()
    .on("div.listPub", {
      element() {
        current = { name: "", slug: "", image: "" };
        lists.push(current);
      }
    })
    .on("div.listText a", {
      element(el) {
        if (current) {
          const href = el.getAttribute("href") || "";
          current.slug = href.replace(/^\/list\//, "").replace(/\/$/, "");
        }
      },
      text(t) {
        if (current) current.name += t.text;
      }
    })
    .on("div.listLogo img", {
      element(el) {
        if (current) current.image = el.getAttribute("src")?.split("/").pop() || "";
      }
    })
    .transform(res)
    .arrayBuffer();

  const result = lists
    .filter((l): l is ListItem => !!l.slug)
    .map((l) => ({ name: l.name.trim(), slug: l.slug, image: l.image }));

  return json(result);
};

const handleAlbum = async (artistQuery: string, albumQuery: string): Promise<JSONResponse> => {
  const searchUrl = `https://www.albumoftheyear.org/search/albums/?q=${encodeURIComponent(`${artistQuery} - ${albumQuery}`)}`;

  const searchRes = await fetchAoty(searchUrl);
  let albumPageUrl: string | null = null;

  await new HTMLRewriter().on("div.albumBlock a", {
    element(el) {
      if (!albumPageUrl) {
        const href = el.getAttribute("href");
        if (href) albumPageUrl = `https://www.albumoftheyear.org${href}`;
      }
    },
  }).transform(searchRes).arrayBuffer();

  if (!albumPageUrl) return error("Album not found", 404);

  const albumRes = await fetchAoty(albumPageUrl);

  let criticScore = "";
  let userScore = "";
  let criticReviewsRaw = "";
  let userReviewsRaw = "";
  let reviewsCount = 0;

  const reviews: Review[] = [];
  let currentReview: Review | null = null;
  let inReviewText = false;
  let inPublication = false;
  let inAuthor = false;

  await new HTMLRewriter()
    .on('a[href="#critics"]', {
      text(t) { criticScore += t.text; }
    })
    .on('a[href="#users"]', {
      text(t) { userScore += t.text; }
    })
    .on("div.text.numReviews", {
      element() { reviewsCount++; },
      text(t) {
        if (reviewsCount === 1) criticReviewsRaw += t.text;
        if (reviewsCount === 2) userReviewsRaw += t.text;
      }
    })
    .on("div.albumReviewRow", {
      element() {
        currentReview = { score: "", publication: "", author: "", text: "", image: "" };
        reviews.push(currentReview);
        inReviewText = false;
        inPublication = false;
        inAuthor = false;
      }
    })
    .on("div.albumReviewRating", {
      text(t) {
        if (currentReview) currentReview.score += t.text;
      }
    })
    .on("div.albumReviewImage img", {
      element(el) {
        if (currentReview) currentReview.image = el.getAttribute("src") || "";
      }
    })
    .on("div.publication a", {
      element() { inPublication = true; },
      text(t) {
        if (currentReview && inPublication) currentReview.publication += t.text;
      }
    })
    .on("div.author a", {
      element() { inAuthor = true; },
      text(t) {
        if (currentReview && inAuthor) currentReview.author += t.text;
      }
    })
    .on("div.albumReviewText", {
      element() {
        inReviewText = true;
        inPublication = false;
        inAuthor = false;
      }
    })
    .on("div.albumReviewText *", {
      text(t) {
        if (currentReview && inReviewText) currentReview.text += t.text;
      }
    })
    .transform(albumRes)
    .arrayBuffer();

  const album: Album = {
    artist: artistQuery,
    album: albumQuery,
    url: albumPageUrl,
    critic: {
      score: criticScore.trim() || "N/A",
      count: extractNumbers(criticReviewsRaw),
      reviews: reviews
        .slice(0, 50)
        .filter((r): r is Review => !!r.publication.trim())
        .map((r) => ({
          score: r.score.trim(),
          publication: r.publication.trim(),
          author: r.author.trim(),
          text: r.text.trim(),
          image: r.image,
        })),
    },
    user: {
      score: userScore.trim() || "N/A",
      count: extractNumbers(userReviewsRaw),
    },
  };

  return json(album);
};

const handleRequest = async (request: Request, env: Env): Promise<JSONResponse> => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname === "/lists") {
    return handleLists();
  }

  if (pathname === "/list") {
    const slug = url.searchParams.get("slug");
    if (!slug) return error("Missing slug parameter", 400);
    return handleListItems(slug);
  }

  const album = url.searchParams.get("album");
  const artist = url.searchParams.get("artist");

  if (!album || !artist) return error("Missing parameters", 400);

  return handleAlbum(artist, album);
};

export default {
  fetch(request: Request, env: Env): Promise<JSONResponse> {
    return handleRequest(request, env);
  }
} satisfies ExportedHandler<Env>;