"use client";

import React, { useState, useCallback, useRef } from 'react';
import DrawingCanvas from './DrawingCanvas';
import Toolbar from './Toolbar';
import LayerPanel from './LayerPanel';
import SceneAnalyzer from '../ai/SceneAnalyzer';
import AIImageGenerator from '../ai/AIImageGenerator';
import SceneEnhancer from '../ai/SceneEnhancer';
import AnimationControls from '../animation/AnimationControls';
import ThreeDPlayground from '../animation/ThreeDPlayground';
import VideoExporter from '../video/VideoExporter';
import { DrawingTool, DrawingState, SceneObject, Layer, SceneAnalysis } from '@/types';
import { generateId, downloadCanvasAsImage, downloadSceneAsJSON, loadImageFromFile } from '@/lib/utils';
import { animationEngine } from '@/lib/animation-engine';

interface WorkspaceProps {
  width?: number;
  height?: number;
  initialObjects?: SceneObject[];
  initialLayers?: Layer[];
}

export default function Workspace({
  width = 800,
  height = 600,
  initialObjects = [],
  initialLayers = [],
}: WorkspaceProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [objects, setObjects] = useState<SceneObject[]>(initialObjects);
  const [layers, setLayers] = useState<Layer[]>(
    initialLayers.length > 0 
      ? initialLayers 
      : [{
          id: generateId(),
          name: 'Layer 1',
          visible: true,
          locked: false,
          opacity: 1,
          objects: [],
        }]
  );
  const [activeLayerId, setActiveLayerId] = useState<string>(layers[0]?.id || '');
  const [drawingState, setDrawingState] = useState<DrawingState>({
    tool: 'pen',
    color: '#000000',
    strokeWidth: 2,
    opacity: 1,
    selectedObjects: [],
    clipboard: [],
  });
  const [history, setHistory] = useState<SceneObject[][]>([initialObjects]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // AI and Animation state
  const [sceneAnalysis, setSceneAnalysis] = useState<SceneAnalysis | null>(null);
  const [narration, setNarration] = useState<string>('');
  const [show3D, setShow3D] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [animationState, setAnimationState] = useState({
    isPlaying: false,
    isPaused: false,
    progress: 0,
  });

  const handleSceneChange = useCallback((newObjects: SceneObject[]) => {
    setObjects(prevObjects => {
      // Only update if objects actually changed
      if (JSON.stringify(prevObjects) === JSON.stringify(newObjects)) {
        return prevObjects;
      }
      
      // Add to history
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newObjects);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      
      return newObjects;
    });
  }, [history, historyIndex]);

  const handleToolChange = useCallback((tool: DrawingTool) => {
    setDrawingState(prev => ({ ...prev, tool }));
  }, []);

  const handleColorChange = useCallback((color: string) => {
    console.log('Color changed to:', color);
    setDrawingState(prev => ({ ...prev, color }));
  }, []);

  const handleStrokeWidthChange = useCallback((width: number) => {
    setDrawingState(prev => ({ ...prev, strokeWidth: width }));
  }, []);

  const handleOpacityChange = useCallback((opacity: number) => {
    setDrawingState(prev => ({ ...prev, opacity }));
  }, []);

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (canvas) {
      downloadCanvasAsImage(canvas, 'drawing.png');
    }
    
    // Also export as JSON
    const sceneData = {
      objects,
      layers,
      metadata: {
        title: 'My Drawing',
        description: 'Exported from Draw2Life',
        tags: ['drawing', 'art'],
      },
    };
    downloadSceneAsJSON(sceneData, 'scene.json');
  }, [objects, layers]);

  const handleImport = useCallback(async (file: File) => {
    if (file.type === 'application/json') {
      const text = await file.text();
      const sceneData = JSON.parse(text);
      setObjects(sceneData.objects || []);
      setLayers(sceneData.layers || []);
    } else if (file.type.startsWith('image/')) {
      const img = await loadImageFromFile(file);
      const imageObject: SceneObject = {
        id: generateId(),
        type: 'image',
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
        visible: true,
      };
      setObjects(prev => [...prev, imageObject]);
    }
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setObjects(history[newIndex]);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setObjects(history[newIndex]);
    }
  }, [history, historyIndex]);

  const handleLayerSelect = useCallback((layerId: string) => {
    setActiveLayerId(layerId);
  }, []);

  const handleLayerToggleVisibility = useCallback((layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, visible: !layer.visible }
        : layer
    ));
  }, []);

  const handleLayerToggleLock = useCallback((layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId 
        ? { ...layer, locked: !layer.locked }
        : layer
    ));
  }, []);

  const handleLayerAdd = useCallback(() => {
    const newLayer: Layer = {
      id: generateId(),
      name: `Layer ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      objects: [],
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  }, [layers.length]);

  const handleLayerDelete = useCallback((layerId: string) => {
    if (layers.length <= 1) return; // Don't delete the last layer
    
    setLayers(prev => prev.filter(layer => layer.id !== layerId));
    if (activeLayerId === layerId) {
      const remainingLayers = layers.filter(layer => layer.id !== layerId);
      setActiveLayerId(remainingLayers[0]?.id || '');
    }
  }, [layers, activeLayerId]);

  const handleLayerReorder = useCallback((fromIndex: number, toIndex: number) => {
    setLayers(prev => {
      const newLayers = [...prev];
      const [movedLayer] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, movedLayer);
      return newLayers;
    });
  }, []);

  // AI and Animation handlers
  const handleAnalysisComplete = useCallback((analysis: SceneAnalysis) => {
    setSceneAnalysis(analysis);
    
    // Create animation timeline if we have suggestions
    if (analysis.suggestedAnimations.length > 0) {
      animationEngine.createTimeline(analysis.suggestedAnimations);
    }
  }, []);

  const handleNarrationGenerated = useCallback((narrationText: string) => {
    setNarration(narrationText);
  }, []);

  const handleAnimationStateChange = useCallback((state: {
    isPlaying: boolean;
    isPaused: boolean;
    progress: number;
  }) => {
    setAnimationState(state);
  }, []);

  const handleToggle3D = useCallback(() => {
    setShow3D(prev => !prev);
  }, []);

  const handleToggleAIPanel = useCallback(() => {
    setShowAIPanel(prev => !prev);
  }, []);

  const handleAIImageGenerated = useCallback((imageData: string) => {
    // Convert base64 data URL to image object
    const img = new Image();
    img.onload = () => {
      const imageObject: SceneObject = {
        id: generateId(),
        type: 'image',
        x: 0,
        y: 0,
        width: img.width,
        height: img.height,
        visible: true,
        fill: imageData, // Store the data URL as fill
      };
      setObjects(prev => [...prev, imageObject]);
    };
    img.src = imageData;
  }, []);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        <Toolbar
          drawingState={drawingState}
          onToolChange={handleToolChange}
          onColorChange={handleColorChange}
          onStrokeWidthChange={handleStrokeWidthChange}
          onOpacityChange={handleOpacityChange}
          onExport={handleExport}
          onImport={handleImport}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          onAnalyze={() => {
            // This will be handled by the SceneAnalyzer component
            console.log('Analyze button clicked');
          }}
          onToggle3D={handleToggle3D}
          hasAnalysis={!!sceneAnalysis}
        />
        
        <div className="flex-1 flex items-center justify-center p-6">
          <div ref={canvasRef} className="glass-card rounded-2xl p-4 relative">
            {/* Tool indicator */}
            <div className="absolute top-2 left-2 z-10">
              <div className="bg-black/50 text-white px-3 py-1 rounded-lg text-sm font-medium">
                {drawingState.tool === 'pen' && 'Pen'}
                {drawingState.tool === 'eraser' && 'Eraser'}
                {drawingState.tool === 'fill' && 'Fill Bucket'}
                {drawingState.tool === 'line' && 'Line'}
                {drawingState.tool === 'rectangle' && 'Rectangle'}
                {drawingState.tool === 'circle' && 'Circle'}
                {drawingState.tool === 'text' && 'Text'}
                {drawingState.tool === 'select' && 'Select'}
                {drawingState.tool === 'move' && 'Move'}
              </div>
            </div>
            <DrawingCanvas
              width={width}
              height={height}
              onSceneChange={handleSceneChange}
              initialObjects={objects}
              drawingState={drawingState}
            />
          </div>
        </div>

        {/* AI Analysis Panel */}
        <div className="glass border-t border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">AI Features</h3>
            <button
              onClick={handleToggleAIPanel}
              className="btn-primary px-6 py-3 rounded-xl text-sm font-medium"
            >
              {showAIPanel ? 'Hide AI Panel' : 'Show AI Panel'}
            </button>
          </div>
          
          <SceneAnalyzer
            onAnalysisComplete={handleAnalysisComplete}
            onNarrationGenerated={handleNarrationGenerated}
            canvasRef={canvasRef}
          />
          
          {showAIPanel && (
            <div className="mt-8 space-y-8">
              <AIImageGenerator
                onImageGenerated={handleAIImageGenerated}
              />
              
              {sceneAnalysis && (
                <SceneEnhancer
                  sceneAnalysis={sceneAnalysis}
                  onEnhancedImage={handleAIImageGenerated}
                />
              )}
            </div>
          )}
        </div>

        {/* Animation Controls */}
        {sceneAnalysis && sceneAnalysis.suggestedAnimations.length > 0 && (
          <div className="glass border-t border-white/10 p-6">
            <AnimationControls
              onAnimationStateChange={handleAnimationStateChange}
            />
          </div>
        )}

        {/* Video Export */}
        {sceneAnalysis && (
          <div className="glass border-t border-white/10 p-6">
            <VideoExporter
              sceneAnalysis={sceneAnalysis}
              narration={narration}
              canvasRef={canvasRef}
            />
          </div>
        )}
      </div>

      {/* Layer Panel */}
      <LayerPanel
        layers={layers}
        activeLayerId={activeLayerId}
        onLayerSelect={handleLayerSelect}
        onLayerToggleVisibility={handleLayerToggleVisibility}
        onLayerToggleLock={handleLayerToggleLock}
        onLayerAdd={handleLayerAdd}
        onLayerDelete={handleLayerDelete}
        onLayerReorder={handleLayerReorder}
      />

      {/* 3D Playground Modal */}
      <ThreeDPlayground
        objects={objects}
        isVisible={show3D}
        onClose={() => setShow3D(false)}
      />
    </div>
  );
}
