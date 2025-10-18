"use client";

import React from 'react';
import { 
  Pen, 
  Eraser, 
  Square, 
  Circle, 
  Type, 
  Move, 
  MousePointer,
  Palette,
  Download,
  Upload,
  Layers,
  Undo,
  Redo,
  Brain,
  Box,
  PaintBucket,
  Minus
} from 'lucide-react';
import { DrawingTool, DrawingState } from '@/types';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  drawingState: DrawingState;
  onToolChange: (tool: DrawingTool) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: number) => void;
  onOpacityChange: (opacity: number) => void;
  onExport?: () => void;
  onImport?: (file: File) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onAnalyze?: () => void;
  onToggle3D?: () => void;
  hasAnalysis?: boolean;
}

const tools: { tool: DrawingTool; icon: React.ReactNode; label: string }[] = [
  { tool: 'select', icon: <MousePointer className="w-4 h-4" />, label: 'Select' },
  { tool: 'pen', icon: <Pen className="w-4 h-4" />, label: 'Pen' },
  { tool: 'eraser', icon: <Eraser className="w-4 h-4" />, label: 'Eraser' },
  { tool: 'fill', icon: <PaintBucket className="w-4 h-4" />, label: 'Fill' },
  { tool: 'line', icon: <Minus className="w-4 h-4" />, label: 'Line' },
  { tool: 'rectangle', icon: <Square className="w-4 h-4" />, label: 'Rectangle' },
  { tool: 'circle', icon: <Circle className="w-4 h-4" />, label: 'Circle' },
  { tool: 'text', icon: <Type className="w-4 h-4" />, label: 'Text' },
  { tool: 'move', icon: <Move className="w-4 h-4" />, label: 'Move' },
];

const colors = [
  // Primary colors
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  // Extended palette
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  // Additional colors for better drawing experience
  '#8B4513', '#2F4F4F', '#DC143C', '#32CD32', '#4169E1',
  '#FFD700', '#DA70D6', '#00CED1', '#FF6347', '#9370DB',
  '#20B2AA', '#FF69B4', '#00FA9A', '#1E90FF', '#FF1493',
  '#00BFFF', '#FF8C00', '#FF4500', '#8A2BE2'
];

export default function Toolbar({
  drawingState,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onOpacityChange,
  onExport,
  onImport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onAnalyze,
  onToggle3D,
  hasAnalysis = false,
}: ToolbarProps) {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImport) {
      onImport(file);
    }
  };

  return (
    <div className="glass border-b border-white/10 p-8 flex items-center gap-8 flex-wrap justify-start min-w-full">
      {/* Tools */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-sm font-medium text-white/80">Tools:</span>
        <div className="flex gap-2 flex-shrink-0">
          {tools.map(({ tool, icon, label }) => (
            <button
              key={tool}
              onClick={() => onToolChange(tool)}
              className={cn(
                "p-3 rounded-xl border transition-all duration-300 flex-shrink-0 min-w-[48px] min-h-[48px] flex items-center justify-center",
                drawingState.tool === tool
                  ? "btn-primary text-white border-transparent glow"
                  : "btn-secondary text-white/80 border-white/20 hover:border-blue-400/50 hover:text-white"
              )}
              title={label}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Undo/Redo */}
      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={cn(
            "p-3 rounded-xl border transition-all duration-300",
            canUndo
              ? "btn-secondary text-white/80 border-white/20 hover:border-blue-400/50 hover:text-white"
              : "bg-gray-800/50 text-white/40 border-white/10 cursor-not-allowed"
          )}
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={cn(
            "p-3 rounded-xl border transition-all duration-300",
            canRedo
              ? "btn-secondary text-white/80 border-white/20 hover:border-blue-400/50 hover:text-white"
              : "bg-gray-800/50 text-white/40 border-white/10 cursor-not-allowed"
          )}
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Color Wheel */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-white/80">Color:</span>
        <div className="relative">
          {/* Color Wheel */}
          <div className="w-16 h-16 rounded-full border-4 border-white/20 shadow-lg relative overflow-hidden">
            <input
              type="color"
              value={drawingState.color}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-full h-full rounded-full cursor-pointer opacity-0 absolute inset-0 z-10"
              title="Color Wheel"
            />
            <div 
              className="w-full h-full rounded-full"
              style={{ 
                background: `conic-gradient(
                  #ff0000 0deg,
                  #ffff00 60deg,
                  #00ff00 120deg,
                  #00ffff 180deg,
                  #0000ff 240deg,
                  #ff00ff 300deg,
                  #ff0000 360deg
                )`
              }}
            />
            {/* Current color indicator */}
            <div 
              className="absolute top-1/2 left-1/2 w-6 h-6 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2"
              style={{ backgroundColor: drawingState.color }}
            />
          </div>
        </div>
        
        {/* Quick color presets */}
        <div className="flex gap-1">
          {['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'].map((color) => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              className={cn(
                "w-6 h-6 rounded border-2 transition-all duration-300 hover:scale-110",
                drawingState.color === color
                  ? "border-white scale-110 shadow-lg"
                  : "border-white/30 hover:border-white/60"
              )}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>

      {/* Stroke Width */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-white/80">Width:</span>
        <input
          type="range"
          min="1"
          max="50"
          value={drawingState.strokeWidth}
          onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
          className="w-24 accent-blue-500"
        />
        <span className="text-sm text-white/80 w-6 font-mono">{drawingState.strokeWidth}</span>
        {/* Quick brush size buttons */}
        <div className="flex gap-1">
          {[1, 3, 5, 10, 20, 30].map((size) => (
            <button
              key={size}
              onClick={() => onStrokeWidthChange(size)}
              className={cn(
                "w-6 h-6 rounded-full border-2 text-xs font-mono transition-all",
                drawingState.strokeWidth === size
                  ? "border-white bg-white text-black"
                  : "border-white/30 text-white/70 hover:border-white/60"
              )}
              title={`${size}px`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Opacity */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-white/80">Opacity:</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={drawingState.opacity}
          onChange={(e) => onOpacityChange(Number(e.target.value))}
          className="w-24 accent-blue-500"
        />
        <span className="text-sm text-white/80 w-10 font-mono">{Math.round(drawingState.opacity * 100)}%</span>
      </div>

      {/* Import/Export */}
      <div className="flex items-center gap-3">
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 hover:scale-105 shadow-lg"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
        <label className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg cursor-pointer">
          <Upload className="w-4 h-4" />
          Import
          <input
            type="file"
            accept=".json,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Layers */}
      <button className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 hover:scale-105 shadow-lg">
        <Layers className="w-4 h-4" />
        Layers
      </button>

      {/* AI Analysis */}
      {onAnalyze && (
        <button
          onClick={onAnalyze}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl hover:from-indigo-600 hover:to-indigo-700 transition-all duration-300 hover:scale-105 shadow-lg"
        >
          <Brain className="w-4 h-4" />
          Analyze
        </button>
      )}

      {/* 3D View */}
      {onToggle3D && hasAnalysis && (
        <button
          onClick={onToggle3D}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-300 hover:scale-105 shadow-lg"
        >
          <Box className="w-4 h-4" />
          3D View
        </button>
      )}
    </div>
  );
}
