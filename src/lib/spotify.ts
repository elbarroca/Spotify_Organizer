const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'

export async function getLikedSongs(accessToken: string) {
  const response = await fetch(`${SPOTIFY_API_BASE}/me/tracks`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  return response.json()
}

export async function createPlaylist(
  accessToken: string,
  userId: string,
  name: string,
  tracks: string[]
) {
  // Create playlist
  const playlist = await fetch(`${SPOTIFY_API_BASE}/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description: 'Created by Spotify Organizer',
      public: false,
    }),
  }).then(res => res.json())

  // Add tracks to playlist
  await fetch(`${SPOTIFY_API_BASE}/playlists/${playlist.id}/tracks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uris: tracks,
    }),
  })

  return playlist
} 