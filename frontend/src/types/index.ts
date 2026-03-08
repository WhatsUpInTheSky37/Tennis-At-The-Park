export interface Location {
  id: string;
  name: string;
  lighted: boolean;
  courtCount: number;
}

export interface Profile {
  userId: string;
  displayName: string;
  skillLevel: number;
  handedness: string;
  preferredFormats: string[];
  bio?: string;
  lookingToPlay: boolean;
  photoUrl?: string;
  yearsPlaying?: number | null;
  favoritePro?: string | null;
  phone?: string | null;
  okToText?: boolean;
  availability?: string[];
}

export interface Session {
  id: string;
  createdBy: string;
  locationId: string;
  courtNumber?: number;
  startTime: string;
  endTime: string;
  format: string;
  stakes: string;
  levelMin: number;
  levelMax: number;
  notes?: string;
  status: string;
  createdAt: string;
  location: Location;
  creator: { id: string; profile: { displayName: string; photoUrl?: string } | null };
  participants: Array<{
    userId: string;
    role: string;
    status: string;
    user: { id: string; profile: { displayName: string; photoUrl?: string; skillLevel?: number } | null };
  }>;
}

export interface Match {
  id: string;
  sessionId?: string;
  playedAt: string;
  locationId: string;
  courtNumber?: number;
  format: string;
  teamsJson: { team1: string[]; team2: string[] };
  scoreJson: { sets: Array<{ team1: number; team2: number; tiebreak?: { team1: number; team2: number } }> };
  winnerUserIds: string[];
  retiredFlag: boolean;
  timeRanOutFlag: boolean;
  notes?: string;
  status: string;
  submittedBy: string;
  location: Location;
}

export interface Rating {
  userId: string;
  elo: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  photoUrl?: string;
  skillLevel?: number;
  elo: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
}

export interface Challenge {
  id: string;
  challengerId: string;
  challengedId: string;
  locationId: string;
  proposedTime: string;
  proposedEndTime: string;
  format: string;
  stakes: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired' | 'completed';
  declineReason: string;
  matchId?: string;
  createdAt: string;
  updatedAt: string;
  challenger: {
    id: string;
    profile: { displayName: string; skillLevel: number; photoUrl?: string } | null;
    rating?: { elo: number; wins: number; losses: number; matchesPlayed: number } | null;
  };
  challenged: {
    id: string;
    profile: { displayName: string; skillLevel: number; photoUrl?: string } | null;
    rating?: { elo: number; wins: number; losses: number; matchesPlayed: number } | null;
  };
  location: Location;
}