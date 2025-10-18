export interface GamePlayer {
  userId: string;
  nickname: string;
  score: number;
  isReady: boolean;
  isHost: boolean;
  joinedAt: number;
}

export interface GameSession {
  _id: string;
  sessionCode: string;
  hostId: string;
  state: 'waiting' | 'active' | 'voting' | 'completed';
  currentRound: number;
  currentPrompt: string;
  players: GamePlayer[];
  createdAt: number;
  expiresAt: number;
}

export interface GameSubmission {
  _id: string;
  sessionId: string;
  playerId: string;
  round: number;
  firstSceneData: string;
  secondSceneData: string;
  submittedAt: number;
  isComplete: boolean;
}

export interface GameVote {
  _id: string;
  sessionId: string;
  voterId: string;
  submissionId: string;
  round: number;
  votedAt: number;
}

export interface VoteResult {
  submissionId: string;
  voteCount: number;
  pointsAwarded: number;
}

export interface GameState {
  session: GameSession | null;
  submissions: GameSubmission[];
  votes: Record<string, number>;
  playerVote: GameVote | null;
  leaderboard: (GamePlayer & { rank: number })[];
}

export type GamePhase = 'lobby' | 'drawing' | 'voting' | 'results';

export interface GamePrompt {
  text: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}
