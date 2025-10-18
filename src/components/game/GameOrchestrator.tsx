"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { aiService } from '../../lib/ai-service';
import GameLobby from './GameLobby';
import MultiplayerDrawingCanvas from './MultiplayerDrawingCanvas';
import VotingScreen from './VotingScreen';
import RoundResults from './RoundResults';
import GameResults from './GameResults';

type GamePhase = 'lobby' | 'drawing' | 'voting' | 'roundResults' | 'results';

interface GameOrchestratorProps {
  onBackToHome: () => void;
}

export default function GameOrchestrator({ onBackToHome }: GameOrchestratorProps) {
  const [gamePhase, setGamePhase] = useState<GamePhase>('lobby');
  const [sessionCode, setSessionCode] = useState<string>('');
  const [sessionId, setSessionId] = useState<Id<"gameSessions"> | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [round, setRound] = useState<number>(0);
  const [roundWinnerId, setRoundWinnerId] = useState<string>('');
  const previousRoundRef = React.useRef<number>(0);

  const session = useQuery(
    api.gameSessions.subscribeToSession, 
    sessionCode ? { sessionCode } : "skip"
  ) || null;

  const startGame = useMutation(api.gameSessions.startGame);
  const nextRound = useMutation(api.gameSessions.nextRound);

  // Initialize player data from sessionStorage (or localStorage as fallback)
  // But only if we're explicitly resuming a session
  useEffect(() => {
    const storedPlayerId = sessionStorage.getItem('playerId') || localStorage.getItem('playerId');
    const storedSessionCode = sessionStorage.getItem('sessionCode') || localStorage.getItem('sessionCode');
    
    console.log('=== INITIALIZING ORCHESTRATOR ===');
    console.log('Stored player ID:', storedPlayerId);
    console.log('Stored session code:', storedSessionCode);
    
    // Don't auto-restore sessions - let users start fresh
    // Storage will be set when they create/join a new game
    // This prevents auto-joining old/completed sessions
    
    // Clear old session data to start fresh
    if (storedSessionCode || storedPlayerId) {
      console.log('Clearing old session data to start fresh');
      sessionStorage.removeItem('playerId');
      sessionStorage.removeItem('nickname');
      sessionStorage.removeItem('isHost');
      sessionStorage.removeItem('sessionCode');
      sessionStorage.removeItem('browserSessionId');
      localStorage.removeItem('playerId');
      localStorage.removeItem('nickname');
      localStorage.removeItem('isHost');
      localStorage.removeItem('sessionCode');
    }
  }, []);

  // Update session data when session changes
  useEffect(() => {
    if (session) {
      console.log('=== GAME ORCHESTRATOR: Session Updated ===');
      console.log('Session state:', session.state);
      console.log('Current round:', session.currentRound);
      console.log('Current prompt:', session.currentPrompt);
      
      setSessionId(session._id as Id<"gameSessions">);
      setCurrentPrompt(session.currentPrompt);
      setRound(session.currentRound);
      
      // Store session code in both storage types
      sessionStorage.setItem('sessionCode', session.sessionCode);
      localStorage.setItem('sessionCode', session.sessionCode);
      
      // Detect round changes for transitioning from roundResults to next round
      const roundIncreased = session.currentRound > previousRoundRef.current;
      if (roundIncreased) {
        console.log(`Round increased from ${previousRoundRef.current} to ${session.currentRound}`);
        previousRoundRef.current = session.currentRound;
      }
      
      // Only auto-sync game phase for certain states
      // Handle state transitions carefully to avoid disrupting manual phase control
      if (session.state === 'waiting' && gamePhase === 'lobby') {
        // Initial lobby state
        console.log('Staying in lobby phase');
      } else if (session.state === 'active') {
        // Transition to drawing phase when round becomes active
        // Don't interrupt voting or roundResults UNLESS the round number increased
        if (gamePhase !== 'voting' && gamePhase !== 'roundResults') {
          console.log('Setting game phase to: drawing');
          setGamePhase('drawing');
        } else if (gamePhase === 'roundResults' && roundIncreased) {
          console.log('Round increased while in results, transitioning to drawing for new round');
          setGamePhase('drawing');
        }
      } else if (session.state === 'completed') {
        console.log('Setting game phase to: results');
        setGamePhase('results');
      }
      console.log('==========================================');
    }
  }, [session, gamePhase, round]);

  const handleGameStart = useCallback(() => {
    // This is just a placeholder callback now
    // The actual game start is handled by GameLobby's startGame mutation
    // and the phase transition is handled by the useEffect above
    console.log('handleGameStart called - phase transition will be handled by useEffect');
  }, []);

  const handleJoinGame = useCallback((code: string) => {
    console.log('=== HANDLE JOIN GAME ===');
    console.log('Setting session code:', code);
    setSessionCode(code);
    
    // Also restore playerId from storage since GameLobby just set it
    const storedPlayerId = sessionStorage.getItem('playerId') || localStorage.getItem('playerId');
    if (storedPlayerId) {
      console.log('Setting playerId from storage:', storedPlayerId);
      setPlayerId(storedPlayerId);
    }
  }, []);

  const handleSessionCreated = useCallback((code: string) => {
    console.log('=== HANDLE SESSION CREATED ===');
    console.log('Host created session with code:', code);
    setSessionCode(code);
    
    // Also restore playerId from storage since GameLobby just set it
    const storedPlayerId = sessionStorage.getItem('playerId') || localStorage.getItem('playerId');
    if (storedPlayerId) {
      console.log('Setting playerId from storage:', storedPlayerId);
      setPlayerId(storedPlayerId);
    }
  }, []);

  const handleDrawingComplete = useCallback(() => {
    setGamePhase('voting');
  }, []);

  const handleVotingComplete = useCallback((winnerId: string) => {
    console.log('=== HANDLE VOTING COMPLETE CALLED ===');
    console.log('Winner ID:', winnerId);
    console.log('Current game phase:', gamePhase);
    setRoundWinnerId(winnerId);
    setGamePhase('roundResults');
    console.log('Set phase to roundResults and winner ID to:', winnerId);
  }, [gamePhase]);

  const handleNextRound = useCallback(async () => {
    if (!session) return;

    try {
      console.log('Starting next round...');
      
      // Call nextRound mutation which will generate a random prompt and start the round
      await nextRound({
        sessionId: session._id as Id<"gameSessions">,
      });
      
      console.log('Next round started, phase will auto-update from session state');
      // Don't manually set phase here - let the useEffect handle it based on session state
    } catch (error) {
      console.error('Failed to start next round:', error);
    }
  }, [session, nextRound]);

  const handleEndGame = useCallback(() => {
    setGamePhase('results');
  }, []);

  const handleBackToHome = useCallback(() => {
    // Clear stored data from both storage types
    sessionStorage.removeItem('playerId');
    sessionStorage.removeItem('nickname');
    sessionStorage.removeItem('isHost');
    sessionStorage.removeItem('sessionCode');
    sessionStorage.removeItem('browserSessionId');
    localStorage.removeItem('playerId');
    localStorage.removeItem('nickname');
    localStorage.removeItem('isHost');
    localStorage.removeItem('sessionCode');
    
    // Reset state
    setGamePhase('lobby');
    setSessionCode('');
    setSessionId(null);
    setPlayerId('');
    setCurrentPrompt('');
    setRound(0);
    
    onBackToHome();
  }, [onBackToHome]);

  // Render appropriate component based on game phase
  if (gamePhase === 'lobby') {
    return (
      <GameLobby
        onGameStart={handleGameStart}
        onJoinGame={handleJoinGame}
        onSessionCreated={handleSessionCreated}
      />
    );
  }

  if (gamePhase === 'drawing' && sessionId && playerId) {
    return (
      <MultiplayerDrawingCanvas
        sessionId={sessionId}
        playerId={playerId}
        currentPrompt={currentPrompt}
        round={round}
        onSubmissionComplete={handleDrawingComplete}
      />
    );
  }

  if (gamePhase === 'voting' && sessionId && playerId) {
    return (
      <VotingScreen
        sessionId={sessionId}
        playerId={playerId}
        currentPrompt={currentPrompt}
        round={round}
        onVotingComplete={handleVotingComplete}
      />
    );
  }

  if (gamePhase === 'roundResults' && sessionId && playerId && roundWinnerId) {
    console.log('=== RENDERING ROUND RESULTS ===');
    console.log('Round:', round);
    console.log('Winner ID:', roundWinnerId);
    return (
      <RoundResults
        sessionId={sessionId}
        playerId={playerId}
        round={round}
        roundWinnerId={roundWinnerId}
        onNextRound={handleNextRound}
      />
    );
  }

  if (gamePhase === 'roundResults') {
    console.log('=== ROUND RESULTS PHASE BUT MISSING DATA ===');
    console.log('Session ID:', sessionId ? 'present' : 'missing');
    console.log('Player ID:', playerId ? 'present' : 'missing');
    console.log('Round Winner ID:', roundWinnerId ? 'present' : 'missing');
    console.log('Values:', { sessionId, playerId, roundWinnerId });
  }

  if (gamePhase === 'results' && sessionId && playerId) {
    return (
      <GameResults
        sessionId={sessionId}
        playerId={playerId}
        round={round}
        onNextRound={handleNextRound}
        onEndGame={handleEndGame}
        onBackToHome={handleBackToHome}
      />
    );
  }

  // Loading state
  console.log('=== LOADING STATE ===');
  console.log('Game phase:', gamePhase);
  console.log('Session ID:', sessionId);
  console.log('Player ID:', playerId);
  console.log('Session code:', sessionCode);
  console.log('Session data:', session);
  console.log('====================');
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">Loading game...</p>
        <p className="text-gray-400 text-sm mt-2">Phase: {gamePhase}</p>
        <p className="text-gray-400 text-sm">Session: {sessionCode || 'none'}</p>
        <p className="text-gray-400 text-sm">Player: {playerId ? 'set' : 'missing'}</p>
      </div>
    </div>
  );
}
