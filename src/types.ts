export interface Env {
  AOTY_WORKER: unknown;
}

export interface AlbumItem {
  rank: number | null;
  artistAlbum: string;
  image: string;
  score: number | null;
  genre: string;
  otherListsCount: number | null;
  blurb: string;
  releaseDate: string;
  url: string;
  secondaryGenres: string[];
  mustHear: boolean;
}

export interface ListItem {
  name: string;
  slug: string;
  image: string;
}

export interface ListsMetadata {
  title: string;
  description: string;
  siteName: string;
  image: string;
  year: number | null;
}

export interface Review {
  score: string;
  publication: string;
  author: string;
  text: string;
  image: string;
}

export interface Album {
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

export interface ListMetadata {
  title: string;
  description: string;
  siteName: string;
  type: string;
  image: string;
  twitterCard: string;
  twitterSite: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  twitterUrl: string;
  fbAppId: string;
  listImage: string;
  sourceUrl: string;
}

export interface ListResult {
  metadata: ListMetadata;
  items: ParsedAlbumItem[];
}

export interface ParsedAlbumItem {
  rank: number;
  artist: string;
  album: string;
  image: string;
  score: number | null;
  genre: string;
  secondaryGenres: string[];
  otherListsCount: number | null;
  blurb: string;
  releaseDate: string;
  url: string;
  mustHear: boolean;
}

export type JSONResponse = Response;