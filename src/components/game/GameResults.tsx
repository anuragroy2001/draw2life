"use client";

import React, { useState, useCallback } from 'react';
import { Trophy, Medal, Award, Play, Home, Users, Star } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface GameResultsProps {
  sessionId: Id<"gameSessions">;
  playerId: string;
  round: number;
  onNextRound: () => void;
  onEndGame: () => void;
  onBackToHome: () => void;
}

export default function GameResults({
  sessionId,
  playerId,
  round,
  onNextRound,
  onEndGame,
  onBackToHome,
}: GameResultsProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const session = useQuery(api.gameSessions.getSessionById, { sessionId });
  const leaderboard = useQuery(api.gameVotes.getRoundLeaderboard, { sessionId });
  const voteResults = useQuery(api.gameVotes.getVoteResults, { sessionId, round });
  const submissions = useQuery(api.gameSubmissions.getSessionSubmissions, { sessionId, round });

  const nextRound = useMutation(api.gameSessions.nextRound);
  const endGame = useMutation(api.gameSessions.endGame);
  const calculateScores = useMutation(api.gameVotes.calculateRoundScores);

  const isHost = session?.players.find(p => p.userId === playerId)?.isHost || false;

  React.useEffect(() => {
    // Calculate scores when component mounts
    if (voteResults && Object.keys(voteResults).length > 0) {
      calculateScores({ sessionId, round });
    }
  }, [voteResults, calculateScores, sessionId, round]);

  const handleNextRound = useCallback(async () => {
    setIsProcessing(true);
    try {
      await nextRound({ sessionId });
      onNextRound();
    } catch (error) {
      console.error('Next round error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [sessionId, nextRound, onNextRound]);

  const handleEndGame = useCallback(async () => {
    setIsProcessing(true);
    try {
      await endGame({ sessionId });
      onEndGame();
    } catch (error) {
      console.error('End game error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [sessionId, endGame, onEndGame]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <Star className="w-5 h-5 text-gray-500" />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-500 to-yellow-600';
      case 2:
        return 'from-gray-400 to-gray-500';
      case 3:
        return 'from-amber-600 to-amber-700';
      default:
        return 'from-gray-600 to-gray-700';
    }
  };

  if (!session || !leaderboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="text-white">Loading results...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="glass border-b border-orange-500/20 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-orange-100 mb-2">
              🏆 Round {round} Results
            </h1>
            <p className="text-orange-300">
              Prompt: <span className="font-semibold">&quot;{session.currentPrompt}&quot;</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Leaderboard */}
          <div className="glass-card p-8 rounded-2xl mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Trophy className="w-7 h-7 text-yellow-500" />
              Current Leaderboard
            </h2>
            
            <div className="space-y-4">
              {leaderboard.map((player, index) => (
                <div
                  key={player.userId}
                  className={`flex items-center justify-between p-4 rounded-xl ${
                    player.userId === playerId
                      ? 'bg-orange-500/20 border border-orange-500/30'
                      : 'bg-gray-800/50 border border-gray-600/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getRankColor(player.rank)} flex items-center justify-center`}>
                      {getRankIcon(player.rank)}
                    </div>
                    
                    <div>
                      <p className="text-white font-semibold text-lg">
                        {player.nickname}
                        {player.userId === playerId && (
                          <span className="ml-2 text-orange-400 text-sm">(You)</span>
                        )}
                      </p>
                      <p className="text-gray-400">
                        {player.isHost && 'Host • '}
                        Round {round} Score: {player.score}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      {player.score}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {player.rank === 1 ? 'Winner!' : 
                       player.rank === 2 ? '2nd Place' :
                       player.rank === 3 ? '3rd Place' :
                       `${player.rank}th Place`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Round Summary */}
          {submissions && submissions.length > 0 && (
            <div className="glass-card p-6 rounded-2xl mb-8">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Round Summary
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {submissions.map((submission) => {
                  const voteCount = voteResults?.[submission._id] || 0;
                  const isOwn = submission.playerId === playerId;
                  
                  return (
                    <div
                      key={submission._id}
                      className={`p-4 rounded-xl ${
                        isOwn ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-gray-800/30'
                      }`}
                    >
                      <div className="aspect-square bg-white rounded-lg mb-3 overflow-hidden">
                        <img
                          src={submission.firstSceneData}
                          alt="First scene"
                          className="w-full h-1/2 object-cover border-b border-gray-200"
                        />
                        <img
                          src={submission.secondSceneData}
                          alt="Second scene"
                          className="w-full h-1/2 object-cover"
                        />
                      </div>
                      
                      <div className="text-center">
                        <p className="text-white font-medium mb-1">
                          {isOwn ? 'Your Drawing' : `Player ${submission.playerId.slice(-4)}`}
                        </p>
                        <p className="text-orange-400 font-semibold">
                          {voteCount} vote{voteCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onBackToHome}
              className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-xl hover:bg-gray-500 transition-all duration-300 flex items-center gap-2"
            >
              <Home className="w-5 h-5" />
              Back to Home
            </button>

            {isHost && (
              <>
                <button
                  onClick={handleNextRound}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  {isProcessing ? 'Starting...' : 'Next Round'}
                </button>

                <button
                  onClick={handleEndGame}
                  disabled={isProcessing}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Trophy className="w-5 h-5" />
                  {isProcessing ? 'Ending...' : 'End Game'}
                </button>
              </>
            )}
          </div>

          {!isHost && (
            <p className="text-center text-gray-400 mt-4">
              Waiting for host to start the next round or end the game...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
