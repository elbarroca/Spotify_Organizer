interface LikedTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  duration_ms: number;
  genres?: string[];
  language?: string;
  popularity: number;
}

interface MusicGroup {
  name: string;
  tracks: LikedTrack[];
  type: 'genre' | 'language' | 'decade' | 'popularity';
  count: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const musicService = {
  async syncLikedSongs(userId: string, accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/music/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) throw new Error('Failed to sync music');
      return true;
    } catch (error) {
      console.error('Sync error:', error);
      return false;
    }
  },

  async getLikedSongs(userId: string): Promise<LikedTrack[]> {
    try {
      const response = await fetch(`${API_URL}/api/music/${userId}/liked`);
      if (!response.ok) throw new Error('Failed to fetch liked songs');
      return await response.json();
    } catch (error) {
      console.error('Fetch error:', error);
      return [];
    }
  },

  async getOrganizedGroups(userId: string): Promise<MusicGroup[]> {
    try {
      const response = await fetch(`${API_URL}/api/music/${userId}/groups`);
      if (!response.ok) throw new Error('Failed to fetch music groups');
      return await response.json();
    } catch (error) {
      console.error('Fetch error:', error);
      return [];
    }
  }
}; 