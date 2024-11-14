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