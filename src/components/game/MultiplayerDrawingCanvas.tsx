"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Check, ArrowRight, Clock, Wand2, Video } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import DrawingCanvas from '../canvas/DrawingCanvas';
import Toolbar from '../canvas/Toolbar';
import { DrawingTool, DrawingState, SceneObject } from '@/types';
import { aiService } from '@/lib/ai-service';

interface MultiplayerDrawingCanvasProps {
  sessionId: Id<"gameSessions">;
  playerId: string;
  currentPrompt: string;
  round: number;
  onSubmissionComplete: () => void;
}

export default function MultiplayerDrawingCanvas({
  sessionId,
  playerId,
  currentPrompt,
  round,
  onSubmissionComplete,
}: MultiplayerDrawingCanvasProps) {
  const [drawingState, setDrawingState] = useState<DrawingState>({
    tool: 'pen',
    color: '#000000',
    strokeWidth: 3,
    opacity: 1,
    selectedObjects: [],
    clipboard: [],
  });
  
  const [currentScene, setCurrentScene] = useState<'first' | 'second' | 'processing'>('first');
  const [firstSceneData, setFirstSceneData] = useState<string>('');
  const [secondSceneData, setSecondSceneData] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canvasKey, setCanvasKey] = useState(0); // Key to force canvas remount

  const submitScenes = useMutation(api.gameSubmissions.submitScenes);
  const updateSubmissionVideo = useMutation(api.gameSubmissions.updateSubmissionVideo);

  // Timer effect
  React.useEffect(() => {
    if (timeLeft > 0 && currentScene !== 'processing') {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && currentScene === 'first') {
      // Auto-advance to second scene if time runs out
      handleNextScene();
    }
  }, [timeLeft, currentScene]);

  const captureCanvas = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return '';
    return canvas.toDataURL('image/png');
  }, []);

  const handleNextScene = useCallback(async () => {
    if (currentScene === 'first') {
      // Capture first scene
      const canvasData = captureCanvas();
      if (!canvasData) return;
      
      setFirstSceneData(canvasData);
      setCurrentScene('second');
      setTimeLeft(300); // Reset timer for second scene
      setCanvasKey(prev => prev + 1); // Force canvas to remount and clear
    }
  }, [currentScene, captureCanvas]);

  const processAIAndVideo = useCallback(async (
    firstData: string,
    secondData: string
  ): Promise<{ videoUrl: string; firstAnalysis: string; secondAnalysis: string }> => {
    try {
      // Step 1: Analyze both scenes with AI
      setProcessingStatus('Analyzing your first scene with AI...');
      console.log('Analyzing first scene...');
      const firstAnalysisResult = await aiService.analyzeDrawing(firstData);
      const firstAnalysis = JSON.stringify(firstAnalysisResult);
      
      setProcessingStatus('Analyzing your second scene with AI...');
      console.log('Analyzing second scene...');
      const secondAnalysisResult = await aiService.analyzeDrawing(secondData);
      const secondAnalysis = JSON.stringify(secondAnalysisResult);
      
      // Step 2: Generate video from the two scenes using Veo
      setProcessingStatus('Creating your animation video... This may take a minute...');
      console.log('Generating video from scenes...');
      const videoResult = await aiService.generateVideoFromDrawing(firstData, secondData);
      
      console.log('Video generated successfully:', videoResult.video.url);
      
      return {
        videoUrl: videoResult.video.url,
        firstAnalysis,
        secondAnalysis,
      };
    } catch (error) {
      console.error('AI/Video processing error:', error);
      throw error;
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (currentScene === 'first') {
      handleNextScene();
      return;
    }

    if (currentScene !== 'second') return;

    // Capture second scene
    const secondCanvas = captureCanvas();
    if (!secondCanvas) return;

    setSecondSceneData(secondCanvas);
    setCurrentScene('processing');
    setIsSubmitting(true);

    try {
      // Process AI and video generation
      setProcessingStatus('Processing your submission...');
      const { videoUrl, firstAnalysis, secondAnalysis } = await processAIAndVideo(
        firstSceneData,
        secondCanvas
      );

      // Submit to Convex with AI analysis
      setProcessingStatus('Submitting your creation...');
      const submissionId = await submitScenes({
        sessionId,
        playerId,
        round,
        firstSceneData,
        secondSceneData: secondCanvas,
        firstSceneAnalysis: firstAnalysis,
        secondSceneAnalysis: secondAnalysis,
      });

      // Update with video URL
      await updateSubmissionVideo({
        submissionId,
        videoUrl,
        videoStatus: 'completed',
      });

      setProcessingStatus('Complete!');
      setTimeout(() => {
        onSubmissionComplete();
      }, 1000);
    } catch (error) {
      console.error('Submission error:', error);
      setProcessingStatus('Error: ' + (error instanceof Error ? error.message : 'Failed to process'));
      setIsSubmitting(false);
      // Allow retry
      setTimeout(() => {
        setCurrentScene('second');
        setProcessingStatus('');
      }, 3000);
    }
  }, [currentScene, firstSceneData, sessionId, playerId, round, submitScenes, updateSubmissionVideo, onSubmissionComplete, handleNextScene, captureCanvas, processAIAndVideo]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Processing screen
  if (currentScene === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="max-w-2xl w-full p-8">
          <div className="glass-card p-12 rounded-2xl text-center">
            <div className="mb-8">
              <div className="w-24 h-24 mx-auto mb-6 relative">
                <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-3 border-4 border-purple-500 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
                <div className="absolute inset-6 flex items-center justify-center">
                  {processingStatus.includes('video') ? (
                    <Video className="w-8 h-8 text-orange-400" />
                  ) : (
                    <Wand2 className="w-8 h-8 text-purple-400" />
                  )}
                </div>
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-4">
                Creating Magic! ✨
              </h2>
              <p className="text-orange-300 text-lg mb-2">
                {processingStatus}
              </p>
              <p className="text-gray-400 text-sm">
                This may take up to a minute...
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-gray-300">
                <span>AI Scene Analysis</span>
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span>Video Generation</span>
                {processingStatus.includes('Complete') ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="glass border-b border-orange-500/20 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-orange-100">
                Round {round} - Drawing Phase
              </h1>
              <p className="text-orange-300 mt-1">
                Prompt: <span className="font-semibold">&ldquo;{currentPrompt}&rdquo;</span>
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-orange-400">
                <Clock className="w-5 h-5" />
                <span className="text-lg font-mono">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scene Indicator */}
      <div className="flex items-center justify-center py-6 bg-black/20">
        <div className="flex items-center gap-4">
          <div className={`px-6 py-3 rounded-xl font-semibold transition-all ${
            currentScene === 'first' 
              ? 'bg-orange-500 text-white shadow-lg' 
              : firstSceneData 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-700 text-gray-400'
          }`}>
            Scene 1
            {firstSceneData && <Check className="w-5 h-5 ml-2 inline" />}
          </div>
          
          <ArrowRight className="w-6 h-6 text-gray-400" />
          
          <div className={`px-6 py-3 rounded-xl font-semibold transition-all ${
            currentScene === 'second' 
              ? 'bg-orange-500 text-white shadow-lg' 
              : 'bg-gray-700 text-gray-400'
          }`}>
            Scene 2
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-6xl w-full">
          <div className="glass-card p-8 rounded-2xl">
            {/* Toolbar */}
            <div className="mb-6">
              <Toolbar
                drawingState={drawingState}
                onToolChange={(tool) => setDrawingState(prev => ({ ...prev, tool }))}
                onColorChange={(color) => setDrawingState(prev => ({ ...prev, color }))}
                onStrokeWidthChange={(strokeWidth) => setDrawingState(prev => ({ ...prev, strokeWidth }))}
                onOpacityChange={(opacity) => setDrawingState(prev => ({ ...prev, opacity }))}
              />
            </div>

            <DrawingCanvas
              key={canvasKey}
              width={800}
              height={500}
              drawingState={drawingState}
            />

            {/* Submit Button */}
            <div className="flex justify-center mt-8 gap-4">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || timeLeft === 0}
                className={`px-12 py-4 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center gap-3 ${
                  isSubmitting || timeLeft === 0
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-lg hover:shadow-xl transform hover:scale-105'
                }`}
              >
                {isSubmitting 
                  ? 'Processing...' 
                  : currentScene === 'first' 
                    ? (
                      <>
                        Next Scene
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )
                    : (
                      <>
                        <Wand2 className="w-5 h-5" />
                        Submit & Create Video
                      </>
                    )
                }
              </button>
            </div>

            {timeLeft === 0 && (
              <p className="text-center text-red-400 mt-4 font-semibold">
                Time&apos;s up! Submit your drawing now.
              </p>
            )}

            {currentScene === 'second' && (
              <p className="text-center text-gray-400 mt-4 text-sm">
                Your drawing will be analyzed by AI and automatically converted into an animated video!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

