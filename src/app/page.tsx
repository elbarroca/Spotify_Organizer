import SpotifyLogin from '@/components/auth/SpotifyLogin'
import PlaylistCreator from '@/components/playlist/PlaylistCreator'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-900 to-black text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Spotify Playlist Organizer</h1>
        <SpotifyLogin />
        <PlaylistCreator />
      </div>
    </main>
  )
} 