"use client";

import React, { useState, useCallback } from 'react';
import { Heart, Users, CheckCircle, Video, Loader2 } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface VotingScreenProps {
  sessionId: Id<"gameSessions">;
  playerId: string;
  currentPrompt: string;
  round: number;
  onVotingComplete: (winnerId: string) => void;
}

export default function VotingScreen({
  sessionId,
  playerId,
  currentPrompt,
  round,
  onVotingComplete,
}: VotingScreenProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const scoresCalculatedRef = React.useRef(false);

  const session = useQuery(api.gameSessions.getSessionById, { sessionId });

  const submissions = useQuery(api.gameSubmissions.getSessionSubmissions, {
    sessionId,
    round,
  });

  const voteResults = useQuery(api.gameVotes.getVoteResults, {
    sessionId,
    round,
  });

  const playerVote = useQuery(api.gameVotes.getPlayerVote, {
    sessionId,
    voterId: playerId,
    round,
  });

  const roundWinner = useQuery(api.gameVotes.getRoundWinner, {
    sessionId,
    round,
  });

  const castVote = useMutation(api.gameVotes.castVote);
  const calculateRoundScores = useMutation(api.gameVotes.calculateRoundScores);

  React.useEffect(() => {
    if (playerVote) {
      setHasVoted(true);
      setSelectedSubmission(playerVote.submissionId);
    }
  }, [playerVote]);

  // Reset scores calculated flag when round changes
  React.useEffect(() => {
    scoresCalculatedRef.current = false;
  }, [round]);

  // Auto-transition when all votes are in
  React.useEffect(() => {
    const checkAndTransition = async () => {
      if (!session || !voteResults || !roundWinner) {
        if (!session) console.log('VotingScreen: No session');
        if (!voteResults) console.log('VotingScreen: No vote results');
        if (!roundWinner) console.log('VotingScreen: No round winner yet');
        return;
      }
      
      // Prevent duplicate calculations using ref
      if (scoresCalculatedRef.current) return;

      // Count total votes cast
      const totalVotes = Object.values(voteResults).reduce((sum, count) => sum + count, 0);
      const totalPlayers = session.players.length;

      console.log(`Vote progress: ${totalVotes}/${totalPlayers} votes cast`);
      console.log('Scores already calculated?', scoresCalculatedRef.current);

      // If all players have voted, calculate scores and show results
      if (totalVotes === totalPlayers && totalVotes > 0) {
        console.log('All votes are in! Calculating scores...');
        scoresCalculatedRef.current = true; // Prevent duplicate calculations
        
        try {
          // Calculate and award points based on vote rankings
          await calculateRoundScores({
            sessionId,
            round,
          });

          console.log('Scores calculated! Showing results in 3 seconds...');
          console.log('Round winner:', roundWinner);
          
          // Auto-transition to round results after 3 seconds
          setTimeout(() => {
            console.log('=== TIMEOUT FIRED: Transitioning to round results now! ===');
            console.log('Calling onVotingComplete with winner ID:', roundWinner.playerId);
            onVotingComplete(roundWinner.playerId);
          }, 3000);
        } catch (error) {
          console.error('Error calculating scores:', error);
          scoresCalculatedRef.current = false; // Allow retry on error
        }
      }
    };

    checkAndTransition();
  }, [session, voteResults, roundWinner, sessionId, round, calculateRoundScores, onVotingComplete]);

  const handleVote = useCallback(async (submissionId: Id<"gameSubmissions">) => {
    if (hasVoted || isVoting) return;

    setIsVoting(true);
    try {
      await castVote({
        sessionId,
        voterId: playerId,
        submissionId,
        round,
      });
      setSelectedSubmission(submissionId);
      setHasVoted(true);
    } catch (error) {
      console.error('Vote error:', error);
    } finally {
      setIsVoting(false);
    }
  }, [sessionId, playerId, round, castVote, hasVoted, isVoting]);

  const getVoteCount = (submissionId: string) => {
    return voteResults?.[submissionId] || 0;
  };

  const isOwnSubmission = (submission: any) => {
    return submission.playerId === playerId;
  };

  // Check if all votes are in
  const totalVotes = voteResults ? Object.values(voteResults).reduce((sum, count) => sum + count, 0) : 0;
  const totalPlayers = session?.players.length || 0;
  const allVotesIn = totalVotes === totalPlayers && totalVotes > 0;

  if (!submissions || submissions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="text-white">Loading submissions...</div>
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
              🎬 Vote for the Best Animation
            </h1>
            <p className="text-orange-300 text-lg">
              Round {round} - <span className="font-semibold">&quot;{currentPrompt}&quot;</span>
            </p>
            {hasVoted && (
              <p className="text-green-400 mt-2 flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Vote submitted!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Submissions Grid */}
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {submissions.map((submission) => {
              const isOwn = isOwnSubmission(submission);
              const voteCount = getVoteCount(submission._id);
              const isSelected = selectedSubmission === submission._id;
              
              return (
                <div
                  key={submission._id}
                  className={`glass-card p-4 rounded-xl transition-all duration-300 ${
                    isSelected
                      ? 'ring-2 ring-orange-500 bg-orange-500/10'
                      : 'hover:bg-gray-800/50'
                  } ${isOwn ? 'opacity-60' : 'cursor-pointer'}`}
                  onClick={() => !isOwn && !hasVoted && handleVote(submission._id)}
                >
                  {/* Video Preview */}
                  <div className="aspect-video bg-black rounded-lg mb-4 overflow-hidden relative">
                    {submission.videoUrl && submission.videoStatus === 'completed' ? (
                      <video
                        src={submission.videoUrl}
                        controls
                        loop
                        autoPlay
                        muted
                        className="w-full h-full object-contain"
                        playsInline
                      />
                    ) : submission.videoStatus === 'processing' ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
                        <Loader2 className="w-8 h-8 text-orange-400 animate-spin mb-2" />
                        <p className="text-gray-400 text-sm">Generating video...</p>
                      </div>
                    ) : (
                      // Fallback to showing both scenes as images
                      <div className="h-full flex flex-col">
                        <img
                          src={submission.firstSceneData}
                          alt="First scene"
                          className="w-full h-1/2 object-contain bg-white border-b border-gray-700"
                        />
                        <img
                          src={submission.secondSceneData}
                          alt="Second scene"
                          className="w-full h-1/2 object-contain bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Submission Info */}
                  <div className="text-center">
                    <p className="text-white font-medium mb-2">
                      {isOwn ? 'Your Drawing' : `Player ${submission.playerId.slice(-4)}`}
                    </p>
                    
                    {/* Vote Count */}
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Heart className={`w-4 h-4 ${
                        voteCount > 0 ? 'text-red-500 fill-current' : 'text-gray-400'
                      }`} />
                      <span className="text-white font-semibold">
                        {voteCount} vote{voteCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Vote Button */}
                    {!isOwn && !hasVoted && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleVote(submission._id);
                        }}
                        disabled={isVoting}
                        className={`w-full px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                          isVoting
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'
                        }`}
                      >
                        {isVoting ? 'Voting...' : 'Vote'}
                      </button>
                    )}

                    {isOwn && (
                      <div className="text-gray-400 text-sm">
                        (Cannot vote for yourself)
                      </div>
                    )}

                    {isSelected && !isOwn && (
                      <div className="text-green-400 text-sm flex items-center justify-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        Voted
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

              {/* Voting Status */}
              <div className="mt-8 text-center">
                <div className="glass-card p-6 rounded-xl max-w-md mx-auto">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-orange-400" />
                    <h3 className="text-lg font-semibold text-white">Voting Status</h3>
                  </div>
                  
                  <p className="text-gray-300 mb-4">
                    {allVotesIn
                      ? '🎉 All votes are in! Calculating results...'
                      : hasVoted 
                        ? `You have voted! Waiting for other players... (${totalVotes}/${totalPlayers})`
                        : 'Watch the animations and vote for the best one!'
                    }
                  </p>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(totalVotes / totalPlayers) * 100}%` }}
                    ></div>
                  </div>

                  {allVotesIn && (
                    <div className="flex items-center justify-center gap-2 text-green-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Showing results shortly...</span>
                    </div>
                  )}
                </div>
              </div>
        </div>
      </div>
    </div>
  );
}
