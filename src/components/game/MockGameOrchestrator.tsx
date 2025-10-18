"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import GameLobby from './GameLobby';
import GameCanvas from './GameCanvas';
import VotingScreen from './VotingScreen';
import GameResults from './GameResults';

// Mock data for development
const mockSession = {
  _id: 'mock-session-id',
  sessionCode: 'ABC123',
  hostId: 'host-1',
  state: 'waiting' as 'waiting' | 'active' | 'voting' | 'completed',
  currentRound: 0,
  currentPrompt: 'A cat jumping into a tree sleeping',
  players: [
    { userId: 'host-1', nickname: 'Host', score: 0, isReady: true, isHost: true, joinedAt: Date.now() },
    { userId: 'player-2', nickname: 'Player 2', score: 0, isReady: true, isHost: false, joinedAt: Date.now() },
  ],
  createdAt: Date.now(),
  expiresAt: Date.now() + 7200000, // 2 hours
};

const mockSubmissions = [
  {
    _id: 'sub-1',
    sessionId: 'mock-session-id',
    playerId: 'host-1',
    round: 1,
    firstSceneData: 'data:image/png;base64,mock1',
    secondSceneData: 'data:image/png;base64,mock2',
    submittedAt: Date.now(),
    isComplete: true,
  },
  {
    _id: 'sub-2',
    sessionId: 'mock-session-id',
    playerId: 'player-2',
    round: 1,
    firstSceneData: 'data:image/png;base64,mock3',
    secondSceneData: 'data:image/png;base64,mock4',
    submittedAt: Date.now(),
    isComplete: true,
  },
];

export function MockGameOrchestrator() {
  const searchParams = useSearchParams();
  const sessionCode = searchParams.get('code');
  
  const [session, setSession] = useState(mockSession);
  const [submissions, setSubmissions] = useState(mockSubmissions);
  const [playerId] = useState('host-1');
  const [sessionId] = useState('mock-session-id');

  const handleGameStart = () => {
    console.log('Starting game');
    setSession(prev => ({ ...prev, state: 'active', currentRound: 1 }));
  };

  const handleJoinGame = (sessionCode: string) => {
    console.log('Joining session:', sessionCode);
    // Mock session joining
  };

  const handleNextRound = () => {
    console.log('Next round');
    setSession(prev => ({ 
      ...prev, 
      currentRound: prev.currentRound + 1,
      currentPrompt: 'A bird flying into a fish swimming' // Mock new prompt
    }));
  };

  const handleEndGame = () => {
    console.log('Ending game');
    setSession(prev => ({ ...prev, state: 'completed' }));
  };

  const handleSubmitScenes = (firstScene: string, secondScene: string) => {
    console.log('Submitting scenes');
    // Mock submission
  };

  const handleCastVote = (submissionId: string) => {
    console.log('Casting vote for:', submissionId);
    // Mock voting
  };

  // Mock game state transitions
  useEffect(() => {
    if (session.state === 'active' && session.currentRound > 0) {
      // Simulate drawing phase
      setTimeout(() => {
        setSession(prev => ({ ...prev, state: 'voting' }));
      }, 5000);
    }
  }, [session.state, session.currentRound]);

  if (!sessionCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="glass-card p-8 rounded-2xl text-center">
          <h1 className="text-2xl font-bold text-orange-100 mb-4">
            Multiplayer Game Mode
          </h1>
          <p className="text-gray-300 mb-6">
            This is a mock implementation for development.
          </p>
          <div className="space-y-4">
            <button
              onClick={() => window.location.href = '/game?code=ABC123'}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Join Mock Session (ABC123)
            </button>
            <button
              onClick={() => window.location.href = '/game?code=XYZ789'}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Create New Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render appropriate component based on game state
  switch (session.state) {
    case 'waiting':
      return (
        <GameLobby
          onGameStart={handleGameStart}
          onJoinGame={handleJoinGame}
        />
      );
    
    case 'active':
      return (
        <GameCanvas
          sessionId={sessionId as any}
          playerId={playerId}
          currentPrompt={session.currentPrompt}
          round={session.currentRound}
          onSubmissionComplete={() => {
            console.log('Submission complete');
            setSession(prev => ({ ...prev, state: 'voting' }));
          }}
        />
      );
    
    case 'voting':
      return (
        <VotingScreen
          sessionId={sessionId as any}
          playerId={playerId}
          currentPrompt={session.currentPrompt}
          round={session.currentRound}
          onVotingComplete={() => {
            console.log('Voting complete');
            setSession(prev => ({ ...prev, state: 'completed' }));
          }}
        />
      );
    
    case 'completed':
      return (
        <GameResults
          sessionId={sessionId as any}
          playerId={playerId}
          round={session.currentRound}
          onNextRound={handleNextRound}
          onEndGame={handleEndGame}
          onBackToHome={() => window.location.href = '/'}
        />
      );
    
    default:
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
          <div className="glass-card p-8 rounded-2xl text-center">
            <h1 className="text-2xl font-bold text-orange-100 mb-4">
              Unknown Game State
            </h1>
            <p className="text-gray-300">
              State: {session.state}
            </p>
          </div>
        </div>
      );
  }
}
