import { json, stripHtml, extractMeta, extractOgMeta, extractTwMeta, splitArtistAlbum } from "../utils";
import type { AlbumItem, ListMetadata, ParsedAlbumItem, JSONResponse } from "../types";

const ALBUM_ROW_REGEX = /<div id="rank-(\d+)" class="albumListRow">([\s\S]*?)<\/div>\s*<\/div>\s*<div class="clear">/g;
const URL_A_REGEX = /<a[^>]*itemprop="url"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/;
const COVER_IMG_REGEX = /<div class="albumListCover"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*\/?>/;
const DATE_REGEX = /<div class="albumListDate"[^>]*>([^<]+)<\/div>/;
const GENRE_A_REGEX = /<div class="albumListGenre"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/;
const SCORE_REGEX = /<div class="scoreValue"[^>]*>(\d+)<\/div>/;
const OTHER_LISTS_REGEX = /<div class="otherLists"[^>]*>In <strong>(\d+)<\/strong> Lists<\/div>/;
const BLURB_REGEX = /<div class="albumListBlurb"([^>]*)>([\s\S]*?)<\/div>/;
const MUST_HEAR_REGEX = /<div class="albumListCover"[^>]*class="([^"]*)mustHear([^"]*)"/;
const SEC_GENRE_REGEX = /<span class="secondary"[^>]*><a[^>]*>([^<]+)<\/a><\/span>/g;

const parseAlbum = (rank: number, rowHtml: string): AlbumItem => {
  const urlMatch = rowHtml.match(URL_A_REGEX);
  const artistAlbum = urlMatch ? urlMatch[2] : "";
  const albumUrl = urlMatch ? `https://www.albumoftheyear.org${urlMatch[1]}` : "";

  const imgMatch = rowHtml.match(COVER_IMG_REGEX);
  const image = imgMatch ? imgMatch[1].split("/").pop() || "" : "";

  const dateMatch = rowHtml.match(DATE_REGEX);
  const releaseDate = dateMatch ? dateMatch[1].trim() : "";

  const genreMatch = rowHtml.match(GENRE_A_REGEX);
  const genre = genreMatch ? genreMatch[1].trim() : "";

  const scoreMatch = rowHtml.match(SCORE_REGEX);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : null;

  const otherListsMatch = rowHtml.match(OTHER_LISTS_REGEX);
  const otherListsCount = otherListsMatch ? parseInt(otherListsMatch[1], 10) : null;

  const mustHearMatch = rowHtml.match(MUST_HEAR_REGEX);
  const mustHear = !!mustHearMatch;

  const blurbMatch = rowHtml.match(BLURB_REGEX);
  const blurb = blurbMatch ? stripHtml(blurbMatch[2]) : "";

  const secondaryGenres: string[] = [];
  let secMatch;
  while ((secMatch = SEC_GENRE_REGEX.exec(rowHtml)) !== null) {
    secondaryGenres.push(secMatch[1].trim());
  }

  return {
    rank,
    artistAlbum,
    image,
    score,
    genre,
    otherListsCount,
    blurb,
    releaseDate,
    url: albumUrl,
    secondaryGenres,
    mustHear,
  };
};

const parseMetadata = (html: string): ListMetadata => {
  const title = extractMeta(html, "Description")
    ? extractOgMeta(html, "og:title") || extractMeta(html, "Description")
    : html.match(/<h1 class="headline"[^>]*>([^<]+)<\/h1>/)?.[1] || "";

  return {
    title: title.trim(),
    description: extractMeta(html, "Description"),
    siteName: extractOgMeta(html, "og:site_name") || "Album of The Year",
    type: extractOgMeta(html, "og:type") || "article",
    image: extractOgMeta(html, "og:image"),
    twitterCard: extractTwMeta(html, "card") || "summary_large_image",
    twitterSite: extractTwMeta(html, "site") || "@aoty",
    twitterTitle: extractTwMeta(html, "title") || title.trim(),
    twitterDescription: extractTwMeta(html, "description") || extractMeta(html, "Description"),
    twitterImage: extractTwMeta(html, "image") || extractOgMeta(html, "og:image"),
    twitterUrl: extractTwMeta(html, "url") || "",
    fbAppId: extractOgMeta(html, "fb:app_id") || "387133090556",
    listImage: html.match(/<div class="listHeader"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[^>]*\/?>/)?.[1] || "",
    sourceUrl: html.match(/<div class="listHeader"[^>]*>[\s\S]*?<a class="gray"[^>]*href="([^"]+)"[^>]*>/)?.[1] || "",
  };
};

export const handleListItems = async (slug: string): Promise<JSONResponse> => {
  const res = await fetch(`https://www.albumoftheyear.org/list/${slug}/`, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" },
  });
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);

  const html = new TextDecoder().decode(await res.arrayBuffer());
  const metadata = parseMetadata(html);

  const items: AlbumItem[] = [];
  let match;
  while ((match = ALBUM_ROW_REGEX.exec(html)) !== null) {
    const rank = parseInt(match[1], 10);
    const album = parseAlbum(rank, match[2]);
    items.push(album);
  }

  const sorted = items
    .filter((i): i is AlbumItem => i.rank !== null && !!i.artistAlbum.trim())
    .sort((a, b) => a.rank! - b.rank!)
    .map((item) => {
      const { artist, album } = splitArtistAlbum(item.artistAlbum);
      return {
        rank: item.rank!,
        artist,
        album,
        image: item.image,
        score: item.score,
        genre: item.genre,
        secondaryGenres: item.secondaryGenres,
        otherListsCount: item.otherListsCount,
        blurb: item.blurb,
        releaseDate: item.releaseDate,
        url: item.url,
        mustHear: item.mustHear,
      } as ParsedAlbumItem;
    });

  return json({ metadata, items: sorted }, 200, true);
};