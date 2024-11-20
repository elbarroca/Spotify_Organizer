'use client'

import { useState } from 'react'
import Button from '@/components/Button'
import { useSpotify } from '@/hooks/useSpotify'
import type { OrganizeCriteria } from '@/types/spotify'

export default function PlaylistCreator() {
  const { isAuthenticated, createPlaylist } = useSpotify()
  const [criteria, setCriteria] = useState<OrganizeCriteria>({
    type: 'genre',
    value: ''
  })

  if (!isAuthenticated) {
    return null
  }

  const handleCreatePlaylist = async () => {
    try {
      await createPlaylist(criteria)
    } catch (error) {
      console.error('Failed to create playlist:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <select
          value={criteria.type}
          onChange={(e) => setCriteria(prev => ({ ...prev, type: e.target.value as OrganizeCriteria['type'] }))}
          className="bg-zinc-800 text-white p-2 rounded"
        >
          <option value="genre">Genre</option>
          <option value="artist">Artist</option>
          <option value="year">Release Year</option>
        </select>
        
        <input
          type="text"
          value={criteria.value}
          onChange={(e) => setCriteria(prev => ({ ...prev, value: e.target.value }))}
          placeholder="Enter criteria value..."
          className="bg-zinc-800 text-white p-2 rounded"
        />
      </div>

      <Button
        onClick={handleCreatePlaylist}
        className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white"
      >
        Create Playlist
      </Button>
    </div>
  )
} 