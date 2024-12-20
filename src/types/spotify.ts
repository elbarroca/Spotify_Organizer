export interface OrganizeCriteria {
  type: 'genre' | 'artist' | 'year'
  value: string
}

export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  uri: string;
  href: string;
  external_urls: { spotify: string };
  release_date: string;
  release_date_precision: 'year' | 'month' | 'day';
  album_type: 'album' | 'single' | 'compilation';
  type: 'album';
  artists: SpotifyArtist[];
  total_tracks: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
  href: string;
  external_urls: { spotify: string };
  type: 'artist';
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  uri: string;
  href: string;
  external_ids: { [key: string]: string };
  external_urls: { spotify: string };
  popularity: number;
  disc_number: number;
  track_number: number;
  explicit: boolean;
  preview_url: string | null;
  is_local: boolean;
  type: 'track';
  available_markets: string[];
  restrictions?: { reason: string };
}

export interface Track {
  id: string;
  name: string;
  artists: Array<{ id: string; name: string }>;
  album: {
    images: Array<{ url: string }>;
  };
  preview_url: string | null;
  uri: string;
}