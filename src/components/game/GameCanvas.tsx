"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Stage, Layer, Line, Rect, Circle, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { Stage as StageType } from 'konva/lib/Stage';
import { Check, ArrowRight, Clock } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface GameCanvasProps {
  sessionId: Id<"gameSessions">;
  playerId: string;
  currentPrompt: string;
  round: number;
  onSubmissionComplete: () => void;
}

interface DrawingState {
  tool: 'pen' | 'eraser';
  color: string;
  strokeWidth: number;
}

interface LineData {
  points: number[];
  tool: string;
  color: string;
  strokeWidth: number;
}

export default function GameCanvas({
  sessionId,
  playerId,
  currentPrompt,
  round,
  onSubmissionComplete,
}: GameCanvasProps) {
  const [drawingState, setDrawingState] = useState<DrawingState>({
    tool: 'pen',
    color: '#000000',
    strokeWidth: 3,
  });
  
  const [lines, setLines] = useState<LineData[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentScene, setCurrentScene] = useState<'first' | 'second'>('first');
  const [firstSceneData, setFirstSceneData] = useState<string>('');
  const [secondSceneData, setSecondSceneData] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  const stageRef = useRef<StageType>(null);
  const submitScenes = useMutation(api.gameSubmissions.submitScenes);

  // Timer effect
  React.useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleMouseDown = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    
    setIsDrawing(true);
    
    setLines([...lines, {
      points: [pos.x, pos.y],
      tool: drawingState.tool,
      color: drawingState.color,
      strokeWidth: drawingState.strokeWidth,
    }]);
  }, [lines, drawingState]);

  const handleMouseMove = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing) return;
    
    const stage = e.target.getStage();
    const point = stage?.getPointerPosition();
    if (!point) return;
    
    const lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    
    setLines([...lines.slice(0, -1), lastLine]);
  }, [isDrawing, lines]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    setLines([]);
  }, []);

  const switchScene = useCallback(() => {
    if (currentScene === 'first') {
      // Capture first scene
      const canvas = (stageRef.current as any)?.toDataURL();
      if (canvas) {
        setFirstSceneData(canvas);
        setCurrentScene('second');
        setLines([]);
      }
    }
  }, [currentScene]);

  const handleSubmit = useCallback(async () => {
    if (currentScene === 'first') {
      switchScene();
      return;
    }

    // Capture second scene
    const canvas = (stageRef.current as any)?.toDataURL();
    if (!canvas) return;

    setIsSubmitting(true);
    try {
      await submitScenes({
        sessionId,
        playerId,
        round,
        firstSceneData,
        secondSceneData: canvas,
      });
      onSubmissionComplete();
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [currentScene, firstSceneData, sessionId, playerId, round, submitScenes, onSubmissionComplete, switchScene]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
                Draw the prompt: <span className="font-semibold">&ldquo;{currentPrompt}&rdquo;</span>
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

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-6xl w-full">
          <div className="glass-card p-6 rounded-2xl">
            {/* Scene Indicator */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-xl ${
                  currentScene === 'first' 
                    ? 'bg-orange-500 text-white' 
                    : firstSceneData 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-600 text-gray-300'
                }`}>
                  Scene 1
                  {firstSceneData && <Check className="w-4 h-4 ml-2 inline" />}
                </div>
                
                <ArrowRight className="w-5 h-5 text-gray-400" />
                
                <div className={`px-4 py-2 rounded-xl ${
                  currentScene === 'second' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-gray-600 text-gray-300'
                }`}>
                  Scene 2
                </div>
              </div>
            </div>

            {/* Drawing Canvas */}
            <div className="flex justify-center mb-6">
              <div className="border-2 border-gray-600 rounded-xl overflow-hidden">
                <Stage
                  width={800}
                  height={400}
                  onMouseDown={handleMouseDown}
                  onMousemove={handleMouseMove}
                  onMouseup={handleMouseUp}
                  ref={stageRef}
                >
                  <Layer>
                    {lines.map((line, i) => (
                      <Line
                        key={i}
                        points={line.points}
                        stroke={line.color}
                        strokeWidth={line.strokeWidth}
                        tension={0.5}
                        lineCap="round"
                        lineJoin="round"
                        globalCompositeOperation={
                          line.tool === 'eraser' ? 'destination-out' : 'source-over'
                        }
                      />
                    ))}
                  </Layer>
                </Stage>
              </div>
            </div>

            {/* Tools */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDrawingState(prev => ({ ...prev, tool: 'pen' }))}
                  className={`px-4 py-2 rounded-lg ${
                    drawingState.tool === 'pen' 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  Pen
                </button>
                <button
                  onClick={() => setDrawingState(prev => ({ ...prev, tool: 'eraser' }))}
                  className={`px-4 py-2 rounded-lg ${
                    drawingState.tool === 'eraser' 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  Eraser
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={drawingState.color}
                  onChange={(e) => setDrawingState(prev => ({ ...prev, color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border-2 border-gray-600 cursor-pointer"
                />
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={drawingState.strokeWidth}
                  onChange={(e) => setDrawingState(prev => ({ ...prev, strokeWidth: parseInt(e.target.value) }))}
                  className="w-20"
                />
              </div>

              <button
                onClick={clearCanvas}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500"
              >
                Clear
              </button>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || timeLeft === 0}
                className={`px-8 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  isSubmitting || timeLeft === 0
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'
                }`}
              >
                {isSubmitting 
                  ? 'Submitting...' 
                  : currentScene === 'first' 
                    ? 'Next Scene' 
                    : 'Submit Drawing'
                }
              </button>
            </div>

            {timeLeft === 0 && (
              <p className="text-center text-red-400 mt-4">
                Time&apos;s up! Your drawing will be submitted automatically.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
