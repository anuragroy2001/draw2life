"use client";

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  SkipBack, 
  SkipForward,
  Volume2,
  VolumeX,
  Settings,
  Zap
} from 'lucide-react';
import { animationEngine, AnimationInstance } from '@/lib/animation-engine';
import { cn } from '@/lib/utils';

interface AnimationControlsProps {
  onAnimationStateChange?: (state: {
    isPlaying: boolean;
    isPaused: boolean;
    progress: number;
  }) => void;
  disabled?: boolean;
}

export default function AnimationControls({
  onAnimationStateChange,
  disabled = false,
}: AnimationControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Update state from animation engine
  useEffect(() => {
    const updateState = () => {
      const state = animationEngine.getAnimationState();
      setIsPlaying(state.isPlaying);
      setIsPaused(state.isPaused);
      setProgress(state.progress);
      
      onAnimationStateChange?.({
        isPlaying: state.isPlaying,
        isPaused: state.isPaused,
        progress: state.progress,
      });
    };

    // Update every 100ms for smooth progress tracking
    const interval = setInterval(updateState, 100);
    return () => clearInterval(interval);
  }, [onAnimationStateChange]);

  const handlePlay = () => {
    if (disabled) return;
    
    if (isPaused) {
      animationEngine.resumeAllAnimations();
    } else {
      animationEngine.playTimeline();
    }
  };

  const handlePause = () => {
    if (disabled) return;
    animationEngine.pauseTimeline();
  };

  const handleStop = () => {
    if (disabled) return;
    animationEngine.stopTimeline();
  };

  const handleReset = () => {
    if (disabled) return;
    animationEngine.resetTimeline();
  };

  const handleSpeedChange = (newSpeed: number) => {
    if (disabled) return;
    setSpeed(newSpeed);
    gsap.globalTimeline.timeScale(newSpeed);
  };

  const handleVolumeChange = (newVolume: number) => {
    if (disabled) return;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const handleMute = () => {
    if (disabled) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    setVolume(newMuted ? 0 : 1);
  };

  const handleProgressChange = (newProgress: number) => {
    if (disabled) return;
    animationEngine.setTimelineProgress(newProgress);
  };

  return (
    <div className="glass-card rounded-xl p-6 space-y-6">
      <h3 className="text-xl font-bold text-white mb-4">🎬 Animation Controls</h3>
      
      {/* Main Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={handlePlay}
          disabled={disabled || isPlaying}
          className={cn(
            "p-3 rounded-xl transition-all duration-300",
            disabled || isPlaying
              ? "bg-gray-800/50 text-white/40 cursor-not-allowed"
              : "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 hover:scale-105 shadow-lg"
          )}
          title="Play"
        >
          <Play className="w-5 h-5" />
        </button>

        <button
          onClick={handlePause}
          disabled={disabled || !isPlaying}
          className={cn(
            "p-3 rounded-xl transition-all duration-300",
            disabled || !isPlaying
              ? "bg-gray-800/50 text-white/40 cursor-not-allowed"
              : "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white hover:from-yellow-600 hover:to-yellow-700 hover:scale-105 shadow-lg"
          )}
          title="Pause"
        >
          <Pause className="w-5 h-5" />
        </button>

        <button
          onClick={handleStop}
          disabled={disabled}
          className={cn(
            "p-3 rounded-xl transition-all duration-300",
            disabled
              ? "bg-gray-800/50 text-white/40 cursor-not-allowed"
              : "bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 hover:scale-105 shadow-lg"
          )}
          title="Stop"
        >
          <Square className="w-5 h-5" />
        </button>

        <button
          onClick={handleReset}
          disabled={disabled}
          className={cn(
            "p-3 rounded-xl transition-all duration-300",
            disabled
              ? "bg-gray-800/50 text-white/40 cursor-not-allowed"
              : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:scale-105 shadow-lg"
          )}
          title="Reset"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <div className="w-px h-10 bg-white/20" />

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            "p-3 rounded-xl transition-all duration-300",
            showSettings
              ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white"
              : "btn-secondary text-white/80 hover:text-white"
          )}
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-white/80">
          <span className="font-medium">Progress</span>
          <span className="font-mono text-blue-400">{Math.round(progress * 100)}%</span>
        </div>
        <div className="relative">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={progress}
            onChange={(e) => handleProgressChange(Number(e.target.value))}
            disabled={disabled}
            className="w-full h-3 bg-gray-800/50 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div
            className="absolute top-0 left-0 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg pointer-events-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="space-y-6 pt-6 border-t border-white/10">
          {/* Speed Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white">Speed</label>
              <span className="text-sm text-blue-400 font-mono">{speed}x</span>
            </div>
            <div className="flex items-center gap-2">
              {[0.5, 1, 1.5, 2].map((speedValue) => (
                <button
                  key={speedValue}
                  onClick={() => handleSpeedChange(speedValue)}
                  className={cn(
                    "px-3 py-2 text-xs rounded-lg transition-all duration-300",
                    speed === speedValue 
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg" 
                      : "bg-gray-800/50 text-white/70 hover:bg-gray-700/50 hover:text-white"
                  )}
                >
                  {speedValue}x
                </button>
              ))}
            </div>
          </div>

          {/* Volume Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white">Volume</label>
              <button
                onClick={handleMute}
                className="p-2 text-white/70 hover:text-white transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => handleVolumeChange(Number(e.target.value))}
              disabled={disabled}
              className="w-full h-3 bg-gray-800/50 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Animation Effects */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-white">Effects</label>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 text-xs bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-all duration-300 border border-purple-500/30">
                <Zap className="w-3 h-3" />
                Sparkle
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-xs bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all duration-300 border border-blue-500/30">
                <Zap className="w-3 h-3" />
                Glow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="text-center">
        <div className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium",
          isPlaying && !isPaused && "bg-green-500/20 text-green-400 border border-green-500/30",
          isPaused && "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
          !isPlaying && !isPaused && "bg-gray-500/20 text-gray-400 border border-gray-500/30"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            isPlaying && !isPaused && "bg-green-400 animate-pulse",
            isPaused && "bg-yellow-400",
            !isPlaying && !isPaused && "bg-gray-400"
          )} />
          {isPlaying && !isPaused && "Playing"}
          {isPaused && "Paused"}
          {!isPlaying && !isPaused && "Stopped"}
        </div>
      </div>
    </div>
  );
}
