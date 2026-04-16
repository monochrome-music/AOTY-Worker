import { json, extractMeta, extractOgMeta, error } from "../utils";
import type { ListItem, ListsMetadata, JSONResponse } from "../types";

const parseListsMetadata = (html: string): ListsMetadata => {
  const titleMatch = html.match(/<h1[^>]*class="headline"[^>]*>([^<]+)<\/h1>/);
  const description = extractMeta(html, "description");
  const image = extractOgMeta(html, "og:image") || "http://cdn.albumoftheyear.org/images/logo-2015.png";

  const yearMatch = html.match(/<h1[^>]*class="headline"[^>]*>(\d{4}) Music Year End Lists<\/h1>/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : null;

  return {
    title: titleMatch ? titleMatch[1].trim() : "Year End Lists",
    description,
    siteName: "Album of The Year",
    image,
    year,
  };
};

export const handleLists = async (year?: string): Promise<JSONResponse> => {
  const path = year 
    ? `https://www.albumoftheyear.org/lists.php?y=${year}`
    : "https://www.albumoftheyear.org/lists.php";

  const res = await fetch(path, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36" },
  });
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);

  const html = new TextDecoder().decode(await res.arrayBuffer());
  const metadata = parseListsMetadata(html);

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

  const items = lists
    .filter((l): l is ListItem => !!l.slug)
    .map((l) => ({ name: l.name.trim(), slug: l.slug, image: l.image }));

  return json({ metadata, lists: items }, 200, true);
};