"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import DrawingCanvas from './canvas/DrawingCanvas';
import Toolbar from './canvas/Toolbar';
import { DrawingState, SceneObject } from '@/types';
import { aiService } from '@/lib/ai-service';

interface SceneDrawerProps {
  sceneNumber: 1 | 2;
  onSceneComplete: (sceneData: string, description: string) => void;
  onBack?: () => void;
}

export default function SceneDrawer({ sceneNumber, onSceneComplete, onBack }: SceneDrawerProps) {
  const [drawingState, setDrawingState] = useState<DrawingState>({
    tool: 'pen',
    color: '#000000',
    strokeWidth: 3,
    opacity: 1,
    selectedObjects: [],
    clipboard: []
  });
  
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [description, setDescription] = useState<string>('');
  const [showDescription, setShowDescription] = useState(false);
  const [displayedTitle, setDisplayedTitle] = useState('');
  const [displayedSubtitle, setDisplayedSubtitle] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  const title = `Make the ${sceneNumber === 1 ? 'first' : 'second'} scene!`;
  const subtitle = sceneNumber === 1 
    ? 'Draw your starting scene - what happens first?'
    : 'Now draw what happens next - the second part of your story!';

  useEffect(() => {
    let titleIndex = 0;
    let subtitleIndex = 0;
    let titleTimeout: NodeJS.Timeout;
    let subtitleTimeout: NodeJS.Timeout;

    // Type the title
    const typeTitle = () => {
      if (titleIndex < title.length) {
        setDisplayedTitle(title.slice(0, titleIndex + 1));
        titleIndex++;
        titleTimeout = setTimeout(typeTitle, 100);
      } else {
        // Start typing subtitle after a short delay
        setTimeout(() => {
          const typeSubtitle = () => {
            if (subtitleIndex < subtitle.length) {
              setDisplayedSubtitle(subtitle.slice(0, subtitleIndex + 1));
              subtitleIndex++;
              subtitleTimeout = setTimeout(typeSubtitle, 30);
            } else {
              setIsTyping(false);
            }
          };
          typeSubtitle();
        }, 500);
      }
    };

    typeTitle();

    return () => {
      clearTimeout(titleTimeout);
      clearTimeout(subtitleTimeout);
    };
  }, [title, subtitle]);

  const handleToolChange = useCallback((tool: any) => {
    setDrawingState(prev => ({ ...prev, tool }));
  }, []);

  const handleColorChange = useCallback((color: string) => {
    setDrawingState(prev => ({ ...prev, color }));
  }, []);

  const handleStrokeWidthChange = useCallback((strokeWidth: number) => {
    setDrawingState(prev => ({ ...prev, strokeWidth }));
  }, []);

  const handleOpacityChange = useCallback((opacity: number) => {
    setDrawingState(prev => ({ ...prev, opacity }));
  }, []);

  const handleSceneChange = useCallback((newObjects: SceneObject[]) => {
    setObjects(newObjects);
  }, []);

  const captureCanvas = useCallback(async (): Promise<string> => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) {
      throw new Error('Canvas not found');
    }
    return canvas.toDataURL('image/png');
  }, []);

  const handleAnalyzeScene = useCallback(async () => {
    if (objects.length === 0) {
      alert('Please draw something first!');
      return;
    }

    setIsAnalyzing(true);
    try {
      const imageData = await captureCanvas();
      const analysis = await aiService.analyzeDrawing(imageData);
      const narration = await aiService.generateEducationalNarration(analysis);
      
      setDescription(narration);
      setShowDescription(true);
    } catch (error) {
      console.error('Analysis failed:', error);
      setDescription('Great drawing! Let\'s see what happens next!');
      setShowDescription(true);
    } finally {
      setIsAnalyzing(false);
    }
  }, [objects, captureCanvas]);

  const handleCompleteScene = useCallback(async () => {
    try {
      const sceneData = await captureCanvas();
      onSceneComplete(sceneData, description);
    } catch (error) {
      console.error('Failed to capture scene:', error);
    }
  }, [captureCanvas, description, onSceneComplete]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-950 via-orange-900 to-orange-950">
      {/* Header with Typing Animation */}
      <div className="glass border-b border-orange-500/20 p-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-6">
            <h1 className="text-5xl md:text-7xl font-soria-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 mb-4">
              {displayedTitle}
              {isTyping && <span className="animate-pulse">|</span>}
            </h1>
            <p className="text-2xl md:text-3xl text-orange-200 font-soria">
              {displayedSubtitle}
              {isTyping && displayedTitle === title && <span className="animate-pulse">|</span>}
            </p>
          </div>
          
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-3 bg-orange-600/20 text-orange-200 rounded-xl hover:bg-orange-600/30 transition-colors"
            >
              Back
            </button>
          )}
        </div>
      </div>

      {/* Toolbar at Top */}
      <div className="glass border-b border-orange-500/20 p-4">
        <div className="max-w-7xl mx-auto">
          <Toolbar
            drawingState={drawingState}
            onToolChange={handleToolChange}
            onColorChange={handleColorChange}
            onStrokeWidthChange={handleStrokeWidthChange}
            onOpacityChange={handleOpacityChange}
          />
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div ref={canvasRef} className="glass-card rounded-2xl p-6 relative w-full max-w-7xl">
          <DrawingCanvas
            width={1200}
            height={800}
            onSceneChange={handleSceneChange}
            initialObjects={objects}
            drawingState={drawingState}
          />
        </div>
      </div>

      {/* Action Buttons - Centered */}
      <div className="glass border-t border-orange-500/20 p-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-6 mb-4">
            {objects.length > 0 && (
              <span className="text-orange-300 text-lg font-soria">
                {objects.length} object{objects.length !== 1 ? 's' : ''} drawn
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={handleAnalyzeScene}
              disabled={isAnalyzing || objects.length === 0}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-soria"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Analyze Scene
                </>
              )}
            </button>
            
            <button
              onClick={handleCompleteScene}
              disabled={objects.length === 0}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-soria"
            >
              <Check className="w-5 h-5" />
              Complete Scene
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Description Modal */}
      {showDescription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="glass-card p-8 rounded-2xl max-w-3xl w-full text-center">
            <h2 className="text-4xl font-soria-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 mb-6">
              Amazing Work!
            </h2>
            <div className="text-2xl text-orange-200 leading-relaxed mb-8 font-soria">
              {description}
            </div>
            <button
              onClick={() => setShowDescription(false)}
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 text-lg font-soria"
            >
              Awesome! Keep Drawing!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
