"use client";

import React, { useState, useCallback } from 'react';
import { Users, Copy, Check, Play, UserPlus } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface GameLobbyProps {
  onGameStart: () => void;
  onJoinGame: (sessionCode: string) => void;
  onSessionCreated?: (sessionCode: string) => void;
}

export default function GameLobby({ onGameStart, onJoinGame, onSessionCreated }: GameLobbyProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [sessionCode, setSessionCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinNickname, setJoinNickname] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const createSession = useMutation(api.gameSessions.createSession);
  const joinSession = useMutation(api.gameSessions.joinSession);
  const updatePlayerReady = useMutation(api.gameSessions.updatePlayerReady);

  const handleCreateGame = useCallback(async () => {
    console.log('=== CREATE GAME CLICKED ===');
    console.log('Nickname:', nickname);
    
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Generate a unique player ID that includes a random session ID
      const sessionId = sessionStorage.getItem('browserSessionId') || `session_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('browserSessionId', sessionId);
      const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${sessionId}`;
      console.log('Creating session with playerId:', playerId);
      
      const result = await createSession({
        hostId: playerId,
        hostNickname: nickname.trim(),
      });

      console.log('Session created successfully:', result);
      console.log('Session code:', result.sessionCode);
      
      setSessionCode(result.sessionCode);
      sessionStorage.setItem('playerId', playerId);
      sessionStorage.setItem('nickname', nickname.trim());
      sessionStorage.setItem('isHost', 'true');
      sessionStorage.setItem('sessionCode', result.sessionCode);
      // Also store in localStorage as backup
      localStorage.setItem('playerId', playerId);
      localStorage.setItem('nickname', nickname.trim());
      localStorage.setItem('isHost', 'true');
      localStorage.setItem('sessionCode', result.sessionCode);
      
      console.log('Session code state updated:', result.sessionCode);
      
      // Notify parent orchestrator about the new session
      if (onSessionCreated) {
        console.log('Notifying orchestrator of new session code:', result.sessionCode);
        onSessionCreated(result.sessionCode);
      }
    } catch (err) {
      setError('Failed to create game session');
      console.error('Create session error:', err);
    } finally {
      setIsCreating(false);
    }
  }, [nickname, createSession]);

  const handleJoinGame = useCallback(async () => {
    if (!joinCode.trim() || !joinNickname.trim()) {
      setError('Please enter both game code and nickname');
      return;
    }

    setIsJoining(true);
    setError('');

    try {
      // Generate a unique player ID that includes a random session ID
      const sessionId = sessionStorage.getItem('browserSessionId') || `session_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('browserSessionId', sessionId);
      const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${sessionId}`;
      console.log('Joining session with playerId:', playerId);
      await joinSession({
        sessionCode: joinCode.trim().toUpperCase(),
        playerId,
        nickname: joinNickname.trim(),
      });

      const code = joinCode.trim().toUpperCase();
      setSessionCode(code);
      sessionStorage.setItem('playerId', playerId);
      sessionStorage.setItem('nickname', joinNickname.trim());
      sessionStorage.setItem('isHost', 'false');
      sessionStorage.setItem('sessionCode', code);
      // Also store in localStorage as backup
      localStorage.setItem('playerId', playerId);
      localStorage.setItem('nickname', joinNickname.trim());
      localStorage.setItem('isHost', 'false');
      localStorage.setItem('sessionCode', code);
      
      // Notify parent orchestrator about the session
      onJoinGame(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
      console.error('Join session error:', err);
    } finally {
      setIsJoining(false);
    }
  }, [joinCode, joinNickname, joinSession]);

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sessionCode]);

  console.log('GameLobby render - sessionCode:', sessionCode);
  
  if (sessionCode) {
    console.log('Rendering GameLobbyRoom with sessionCode:', sessionCode);
    return <GameLobbyRoom sessionCode={sessionCode} onGameStart={onGameStart} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-2xl w-full">
        <div className="glass-card p-8 rounded-2xl text-center">
          <h1 className="text-4xl font-bold text-white mb-8">
            🎨 Draw2Life Multiplayer
          </h1>
          <p className="text-gray-300 mb-8 text-lg">
            Create or join a game session to start drawing and competing!
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Create Game */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-orange-400">
                <UserPlus className="w-6 h-6" />
                <h2 className="text-xl font-semibold">Create Game</h2>
              </div>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter your nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none"
                  maxLength={20}
                />
                
                <button
                  onClick={handleCreateGame}
                  disabled={isCreating || !nickname.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating...' : 'Create Game'}
                </button>
              </div>
            </div>

            {/* Join Game */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-blue-400">
                <Users className="w-6 h-6" />
                <h2 className="text-xl font-semibold">Join Game</h2>
              </div>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter game code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-center text-lg font-mono tracking-widest"
                  maxLength={6}
                />
                
                <input
                  type="text"
                  placeholder="Enter your nickname"
                  value={joinNickname}
                  onChange={(e) => setJoinNickname(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  maxLength={20}
                />
                
                <button
                  onClick={handleJoinGame}
                  disabled={isJoining || !joinCode.trim() || !joinNickname.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? 'Joining...' : 'Join Game'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface GameLobbyRoomProps {
  sessionCode: string;
  onGameStart: () => void;
}

function GameLobbyRoom({ sessionCode, onGameStart }: GameLobbyRoomProps) {
  console.log('=== GameLobbyRoom RENDERED ===');
  console.log('Session code:', sessionCode);
  
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  const session = useQuery(api.gameSessions.subscribeToSession, { sessionCode });
  console.log('Session data from query:', session);
  const updatePlayerReady = useMutation(api.gameSessions.updatePlayerReady);
  const startGame = useMutation(api.gameSessions.startGame);

  // Get player ID from sessionStorage (unique per tab) or localStorage as fallback
  const storedPlayerId = sessionStorage.getItem('playerId') || localStorage.getItem('playerId') || '';
  const currentPlayer = session?.players.find(p => p.userId === storedPlayerId);
  const playerId = currentPlayer?.userId || storedPlayerId;
  const isHost = currentPlayer?.isHost || false;
  const isReady = currentPlayer?.isReady || false;
  
  console.log('=== PLAYER INFO ===');
  console.log('Stored player ID:', storedPlayerId);
  console.log('Current player:', currentPlayer);
  console.log('Player ID:', playerId);
  console.log('Is ready:', isReady);
  console.log('Is host:', isHost);
  console.log('All players in session:', session?.players);
  console.log('==================');

  const handleToggleReady = useCallback(async () => {
    if (!session) return;

    try {
      await updatePlayerReady({
        sessionId: session._id as Id<"gameSessions">,
        playerId,
        isReady: !isReady,
      });
      // No need to set local state - it will be updated via the session query
    } catch (err) {
      setError('Failed to update ready status');
    }
  }, [session, playerId, isReady, updatePlayerReady]);

  const handleStartGame = useCallback(async () => {
    if (!session) return;

    setIsStarting(true);
    setError('');

    try {
      console.log('=== STARTING GAME ===');
      console.log('Session ID:', session._id);
      await startGame({
        sessionId: session._id as Id<"gameSessions">,
      });
      console.log('Game started successfully, state should now be active');
      // Don't call onGameStart here - let the orchestrator's useEffect handle the transition
    } catch (err) {
      setError('Failed to start game');
      console.error('Start game error:', err);
    } finally {
      setIsStarting(false);
    }
  }, [session, startGame]);

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(sessionCode);
  }, [sessionCode]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading game session...</div>
      </div>
    );
  }

  const allPlayersReady = session.players.every(p => p.isReady);
  const canStart = isHost && session.players.length >= 2 && allPlayersReady;
  
  console.log('=== GAME START CONDITIONS ===');
  console.log('Is host:', isHost);
  console.log('Player count:', session.players.length);
  console.log('All players ready:', allPlayersReady);
  console.log('Can start:', canStart);
  console.log('Players ready status:', session.players.map(p => ({ nickname: p.nickname, isReady: p.isReady })));
  console.log('=============================');

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-4xl w-full">
        <div className="glass-card p-8 rounded-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-4">
              🎨 Game Lobby
            </h1>
            
            {/* Game Code */}
            <div className="mb-6">
              <p className="text-gray-300 mb-2">Game Code</p>
              <div className="flex items-center justify-center gap-3">
                <div className="px-6 py-3 bg-gray-800/50 border border-gray-600 rounded-xl">
                  <span className="text-2xl font-mono tracking-widest text-white">
                    {sessionCode}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
                >
                  <Copy className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Players List */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Players ({session.players.length})
            </h2>
            
            <div className="grid gap-3">
              {session.players.map((player) => (
                <div
                  key={player.userId}
                  className={`flex items-center justify-between p-4 rounded-xl ${
                    player.userId === playerId
                      ? 'bg-orange-500/20 border border-orange-500/30'
                      : 'bg-gray-800/50 border border-gray-600/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {player.nickname.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {player.nickname}
                        {player.isHost && (
                          <span className="ml-2 text-orange-400 text-sm">(Host)</span>
                        )}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Score: {player.score}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {player.isReady ? (
                      <div className="flex items-center gap-2 text-green-400">
                        <Check className="w-4 h-4" />
                        <span className="text-sm">Ready</span>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-sm">Not ready</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* Ready button for all players */}
            <button
              onClick={handleToggleReady}
              className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                isReady
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-white'
              }`}
            >
              {isReady ? 'Not Ready' : 'Ready'}
            </button>

            {/* Start Game button only for host */}
            {isHost && (
              <button
                onClick={handleStartGame}
                disabled={!canStart || isStarting}
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Play className="w-5 h-5" />
                {isStarting ? 'Starting...' : 'Start Game'}
              </button>
            )}
          </div>

          {!canStart && isHost && (
            <p className="text-center text-gray-400 text-sm mt-4">
              {session.players.length < 2
                ? 'Need at least 2 players to start'
                : 'All players must be ready to start'}
            </p>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
