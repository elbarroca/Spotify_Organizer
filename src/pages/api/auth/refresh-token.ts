import type { NextApiRequest, NextApiResponse } from 'next';
import { spotifyApi } from '@/lib/spotify-api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const data = await spotifyApi.refreshAccessToken();
    return res.status(200).json({
      access_token: data.body.access_token,
      expires_in: data.body.expires_in,
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return res.status(500).json({ message: 'Error refreshing token' });
  }
} 