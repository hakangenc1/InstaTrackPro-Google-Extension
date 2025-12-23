
export interface InstagramUser {
  id: string;
  username: string;
  full_name: string;
  profile_pic_url: string;
  is_verified: boolean;
  follows_viewer: boolean;
}

export interface ScanStats {
  totalFollowed: number;
  processedCount: number;
  nonFollowersCount: number;
  progress: number;
  status: 'idle' | 'scanning' | 'paused' | 'completed' | 'error';
  source?: 'scan' | 'import';
}

export interface Config {
  userId: string;
  csrfToken: string;
  delayMs: number;
}
