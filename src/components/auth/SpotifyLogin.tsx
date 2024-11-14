'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useSpotify } from '@/hooks/useSpotify'

export default function SpotifyLogin() {
  const { login, isAuthenticated } = useSpotify()
  
  if (isAuthenticated) {
    return null
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8">
      <h2 className="text-2xl font-semibold">Connect Your Spotify Account</h2>
      <Button 
        onClick={login}
        className="bg-[#1DB954] hover:bg-[#1ed760] text-white"
      >
        Login with Spotify
      </Button>
    </div>
  )
} 