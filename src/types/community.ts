export interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  image?: string;
  tags: string[];
  isPrivate: boolean;
  recentActivity: {
    type: 'playlist' | 'message' | 'member';
    user: string;
    content: string;
    timestamp: string;
  }[];
  topPlaylists: {
    name: string;
    creator: string;
    trackCount: number;
    duration: string;
  }[];
}

export interface CommunityDetails extends Community {
  memberList?: string[];
  createdAt?: string;
} 