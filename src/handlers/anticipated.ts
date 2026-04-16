import { fetchAoty, json } from "../utils";
import type { AnticipatedAlbum, JSONResponse } from "../types";

export const handleAnticipated = async (): Promise<JSONResponse> => {
  const res = await fetchAoty("/discover/");
  const html = new TextDecoder().decode(await res.arrayBuffer());

  const albums: AnticipatedAlbum[] = [];

  const albumBlockRegex = /<div class="albumBlock"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
  let match;

  while ((match = albumBlockRegex.exec(html)) !== null) {
    const blockHtml = match[1];

    const imageMatch = blockHtml.match(/<img[^>]*src="([^"]+)"[^>]*\/?>/);
    const image = imageMatch ? imageMatch[1].split("/").pop() || "" : "";

    const artistMatch = blockHtml.match(/<div class="artistTitle"[^>]*>([^<]+)<\/div>/);
    const artist = artistMatch ? artistMatch[1].trim() : "";

    const albumMatch = blockHtml.match(/<div class="albumTitle"[^>]*>([^<]+)<\/div>/);
    const album = albumMatch ? albumMatch[1].trim() : "";

    const typeMatch = blockHtml.match(/<div class="type"[^>]*>([^<]+)<\/div>/);
    const releaseDate = typeMatch ? typeMatch[1].trim() : "";

    const linkMatch = blockHtml.match(/<div class="image"><a href="([^"]+)"[^>]*>/);
    const url = linkMatch ? `https://www.albumoftheyear.org${linkMatch[1]}` : "";

    const ratingMatch = blockHtml.match(/<div class="rating"[^>]*>(\d+)<\/div>/);
    const score = ratingMatch ? parseInt(ratingMatch[1], 10) : null;

    const commentMatches = blockHtml.matchAll(/<div class="comment_count"[^>]*>([^<]+)<\/div>/g);
    const commentCounts = Array.from(commentMatches, m => parseInt(m[1].replace(/,/g, ""), 10) || 0);
    const commentCount = commentCounts[0] || 0;
    const wantCount = commentCounts[1] || 0;

    if (artist && album) {
      albums.push({
        artist,
        album,
        image,
        releaseDate,
        url,
        score,
        commentCount,
        wantCount,
      });
    }
  }

  return json({ albums }, 200, true);
};