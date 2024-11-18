export interface OrganizeCriteria {
  type: 'genre' | 'artist' | 'year'
  value: string
}

export interface SpotifyTrack {
  id: string
  uri: string
  name: string
  artists: Array<{
    id: string
    name: string
  }>
  album: {
    id: string
    name: string
    release_date: string
  }
}

export interface Track {
  id: string;
  name: string;
  artists: { id: string; name: string; }[];
  album: {
    name: string;
    images: { url: string; }[];
  };
  duration_ms: number;
  uri: string;
} 