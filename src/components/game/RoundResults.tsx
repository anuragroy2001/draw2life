"use client";

import React from 'react';
import { Trophy, Star, ArrowRight, Crown } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface RoundResultsProps {
  sessionId: Id<"gameSessions">;
  playerId: string;
  round: number;
  roundWinnerId: string;
  onNextRound: () => void;
}

export default function RoundResults({
  sessionId,
  playerId,
  round,
  roundWinnerId,
  onNextRound,
}: RoundResultsProps) {
  const session = useQuery(api.gameSessions.getSessionById, { sessionId });
  const completeRound = useMutation(api.gameSessions.completeRound);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const roundWinner = session?.players.find(p => p.userId === roundWinnerId);
  const isCurrentPlayer = playerId === roundWinnerId;
  const isHost = session?.players.find(p => p.userId === playerId)?.isHost || false;

  // Sort players by points (score) first, then by round wins as tiebreaker
  const sortedPlayers = session?.players
    .slice()
    .sort((a, b) => {
      // First, sort by score (points)
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // If scores are tied, sort by round wins
      return (b.roundWins || 0) - (a.roundWins || 0);
    }) || [];

  const handleContinue = async () => {
    if (!session || !isHost) return;

    setIsProcessing(true);
    try {
      // Complete the round (updates scores and round wins)
      await completeRound({
        sessionId,
        roundWinnerId,
      });
      
      // Check if game is complete
      const completedRounds = (session.totalRounds || 0) + 1;
      const maxRounds = session.maxRounds || 3;
      
      console.log(`Completed rounds: ${completedRounds}/${maxRounds}`);
      
      if (completedRounds >= maxRounds) {
        // Game is complete, session state will be set to "completed"
        // The GameOrchestrator will automatically show final results
        console.log('Game complete! Showing final results...');
      } else {
        // Continue to next round
        console.log('Starting next round...');
        await onNextRound();
      }
    } catch (error) {
      console.error('Error completing round:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!session || !roundWinner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="text-white">Loading results...</div>
      </div>
    );
  }

  const isGameComplete = (session.totalRounds || 0) + 1 >= (session.maxRounds || 3);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="glass border-b border-orange-500/20 p-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-orange-100 mb-2">
            Round {round} Complete! 🎉
          </h1>
          <p className="text-gray-300">
            {isGameComplete 
              ? `Final Round - Game Complete!`
              : `Round ${(session.totalRounds || 0) + 1} of ${session.maxRounds || 3}`
            }
          </p>
        </div>
      </div>

      {/* Winner Announcement */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full space-y-8">
          {/* Round Winner Card */}
          <div className={`glass-card p-12 rounded-2xl text-center relative overflow-hidden ${
            isCurrentPlayer ? 'ring-4 ring-yellow-500' : ''
          }`}>
            {/* Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 animate-pulse"></div>
            
            <div className="relative">
              {/* Trophy Icon */}
              <div className="mb-6">
                <div className="w-24 h-24 mx-auto bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
                  <Trophy className="w-12 h-12 text-white" />
                </div>
              </div>

              <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-4">
                Round Winner!
              </h2>
              
              <p className="text-3xl font-bold text-white mb-2">
                {roundWinner.nickname}
              </p>
              
              {isCurrentPlayer && (
                <p className="text-green-400 text-lg flex items-center justify-center gap-2">
                  <Star className="w-5 h-5" />
                  That's you! Amazing work!
                  <Star className="w-5 h-5" />
                </p>
              )}
            </div>
          </div>

          {/* Current Standings */}
          <div className="glass-card p-8 rounded-2xl">
            <h3 className="text-2xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2">
              <Crown className="w-6 h-6 text-yellow-500" />
              Current Standings
            </h3>
            
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.userId}
                  className={`flex items-center justify-between p-4 rounded-xl ${
                    index === 0
                      ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30'
                      : 'bg-gray-800/50 border border-gray-600/30'
                  } ${player.userId === playerId ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      index === 0
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                        : index === 1
                          ? 'bg-gray-400 text-white'
                          : index === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-gray-600 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    
                    <div>
                      <p className="text-white font-semibold">
                        {player.nickname}
                        {player.userId === playerId && (
                          <span className="ml-2 text-blue-400 text-sm">(You)</span>
                        )}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {player.roundWins || 0} {(player.roundWins || 0) === 1 ? 'win' : 'wins'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{player.score}</p>
                    <p className="text-gray-400 text-sm">points</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Continue Button */}
          {isHost && (
            <div className="text-center">
              <button
                onClick={handleContinue}
                disabled={isProcessing}
                className="px-12 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xl font-bold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 mx-auto"
              >
                {isProcessing ? (
                  'Processing...'
                ) : isGameComplete ? (
                  <>
                    View Final Results
                    <Trophy className="w-6 h-6" />
                  </>
                ) : (
                  <>
                    Continue to Round {(session.totalRounds || 0) + 2}
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </button>
            </div>
          )}

          {!isHost && (
            <p className="text-center text-gray-400">
              Waiting for host to continue...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

