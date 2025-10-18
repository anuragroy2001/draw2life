"use client";

import React from 'react';
import { Eye, EyeOff, Lock, Unlock, Plus, Trash2, GripVertical } from 'lucide-react';
import { Layer } from '@/types';
import { cn } from '@/lib/utils';

interface LayerPanelProps {
  layers: Layer[];
  activeLayerId?: string;
  onLayerSelect: (layerId: string) => void;
  onLayerToggleVisibility: (layerId: string) => void;
  onLayerToggleLock: (layerId: string) => void;
  onLayerAdd: () => void;
  onLayerDelete: (layerId: string) => void;
  onLayerReorder: (fromIndex: number, toIndex: number) => void;
}

export default function LayerPanel({
  layers,
  activeLayerId,
  onLayerSelect,
  onLayerToggleVisibility,
  onLayerToggleLock,
  onLayerAdd,
  onLayerDelete,
  onLayerReorder,
}: LayerPanelProps) {
  return (
    <div className="w-72 glass border-l border-white/10 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white">Layers</h3>
        <button
          onClick={onLayerAdd}
          className="btn-primary p-3 rounded-xl hover:scale-105 transition-all duration-300"
          title="Add Layer"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3">
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            className={cn(
              "flex items-center gap-3 p-4 rounded-xl border transition-all duration-300",
              activeLayerId === layer.id
                ? "glass-card border-blue-400/50 bg-blue-500/10"
                : "bg-gray-800/30 border-white/10 hover:bg-gray-700/40 hover:border-white/20"
            )}
          >
            <button
              className="p-2 text-white/40 hover:text-white/80 transition-colors"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>

            <button
              onClick={() => onLayerToggleVisibility(layer.id)}
              className={cn(
                "p-2 rounded-lg transition-all duration-300",
                layer.visible 
                  ? "text-white bg-white/10 hover:bg-white/20" 
                  : "text-white/40 hover:text-white/60 hover:bg-white/5"
              )}
              title={layer.visible ? "Hide layer" : "Show layer"}
            >
              {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onLayerToggleLock(layer.id)}
              className={cn(
                "p-2 rounded-lg transition-all duration-300",
                layer.locked 
                  ? "text-red-400 bg-red-500/10 hover:bg-red-500/20" 
                  : "text-white/40 hover:text-white/60 hover:bg-white/5"
              )}
              title={layer.locked ? "Unlock layer" : "Lock layer"}
            >
              {layer.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onLayerSelect(layer.id)}
              className="flex-1 text-left text-sm font-medium text-white hover:text-blue-300 transition-colors"
            >
              {layer.name}
            </button>

            <button
              onClick={() => onLayerDelete(layer.id)}
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-300"
              title="Delete layer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {layers.length === 0 && (
          <div className="text-center text-white/60 py-12">
            <p className="text-sm">No layers yet</p>
            <p className="text-xs mt-2">Click the + button to add a layer</p>
          </div>
        )}
      </div>

      <div className="mt-8 p-4 glass-card rounded-xl">
        <h4 className="text-sm font-medium text-white mb-3">Layer Tips</h4>
        <ul className="text-xs text-white/70 space-y-2">
          <li>• Use layers to organize your drawing</li>
          <li>• Lock layers to prevent accidental changes</li>
          <li>• Hide layers to focus on specific parts</li>
          <li>• Drag to reorder layers</li>
        </ul>
      </div>
    </div>
  );
}
