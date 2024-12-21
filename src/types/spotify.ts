export interface OrganizeCriteria {
  type: 'genre' | 'artist' | 'year'
  value: string
}

export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
  href: string;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  uri: string;
  href: string;
  external_urls: {
    spotify: string;
  };
  album_type: string;
  release_date: string;
  total_tracks: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  uri: string;
  href: string;
  external_urls: {
    spotify: string;
  };
  external_ids: {
    isrc: string;
  };
  popularity: number;
  preview_url: string | null;
  explicit: boolean;
  type: string;
  track_number: number;
  disc_number: number;
  is_local: boolean;
  is_playable?: boolean;
  linked_from?: {
    uri: string;
    id: string;
  };
  restrictions?: {
    reason: string;
  };
  available_markets?: string[];
}

export interface SpotifyUser {
  id: string;
  display_name: string | null;
  email: string;
  images: SpotifyImage[];
  country: string;
  product: string;
  external_urls: {
    spotify: string;
  };
  followers: {
    total: number;
  };
  uri: string;
  href: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: SpotifyImage[];
  owner: SpotifyUser;
  tracks: {
    total: number;
    items: {
      added_at: string;
      track: SpotifyTrack;
    }[];
  };
  external_urls: {
    spotify: string;
  };
  uri: string;
  href: string;
  public: boolean;
  collaborative: boolean;
  followers: {
    total: number;
  };
}

export interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
}

export interface SpotifyPlaybackState {
  device: SpotifyDevice;
  repeat_state: 'off' | 'track' | 'context';
  shuffle_state: boolean;
  context: {
    type: string;
    href: string;
    external_urls: {
      spotify: string;
    };
    uri: string;
  } | null;
  timestamp: number;
  progress_ms: number;
  is_playing: boolean;
  item: SpotifyTrack;
  currently_playing_type: 'track' | 'episode' | 'ad' | 'unknown';
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