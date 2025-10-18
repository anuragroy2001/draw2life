'use client';

import React, { useState } from 'react';
import { aiService, SceneAnalysis, FALImageGenerationResult } from '@/lib/ai-service';

interface SceneEnhancerProps {
  sceneAnalysis: SceneAnalysis;
  originalImageData?: string;
  onEnhancedImage?: (imageData: string) => void;
  className?: string;
}

export default function SceneEnhancer({ 
  sceneAnalysis, 
  originalImageData, 
  onEnhancedImage, 
  className = '' 
}: SceneEnhancerProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enhancementResult, setEnhancementResult] = useState<FALImageGenerationResult | null>(null);

  const handleEnhance = async () => {
    setIsEnhancing(true);
    setError(null);
    setEnhancedImage(null);

    try {
      let result: FALImageGenerationResult;

      if (originalImageData) {
        // Enhance existing drawing
        result = await aiService.enhanceDrawing(originalImageData, sceneAnalysis);
      } else {
        // Generate new image from scene analysis
        result = await aiService.generateImageFromScene(sceneAnalysis);
      }

      setEnhancementResult(result);

      if (result.images && result.images.length > 0) {
        const image = result.images[0];
        const dataUrl = aiService.convertImageToDataUrl(image.content, image.content_type);
        setEnhancedImage(dataUrl);
        
        if (onEnhancedImage) {
          onEnhancedImage(dataUrl);
        }
      } else {
        setError('No enhanced image generated');
      }
    } catch (err) {
      console.error('Image enhancement error:', err);
      setError(err instanceof Error ? err.message : 'Failed to enhance image');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleClear = () => {
    setEnhancedImage(null);
    setEnhancementResult(null);
    setError(null);
  };

  return (
    <div className={`glass-card p-6 rounded-xl ${className}`}>
      <h3 className="text-xl font-bold mb-6 text-white">✨ AI Scene Enhancer</h3>
      
      <div className="space-y-6">
        <div className="glass-card p-4 rounded-xl border border-blue-500/20">
          <h4 className="font-semibold text-blue-300 mb-3">Scene Analysis:</h4>
          <div className="text-sm text-white/80 space-y-2">
            <p><strong className="text-blue-400">Objects:</strong> {sceneAnalysis.objects.map(obj => obj.label).join(', ')}</p>
            <p><strong className="text-green-400">Confidence:</strong> {(sceneAnalysis.confidence * 100).toFixed(1)}%</p>
            {sceneAnalysis.relationships.length > 0 && (
              <p><strong className="text-purple-400">Relationships:</strong> {sceneAnalysis.relationships.map(rel => rel.description).join(', ')}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleEnhance}
            disabled={isEnhancing}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 disabled:bg-gray-800/50 disabled:text-white/40 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 shadow-lg"
          >
            {isEnhancing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {originalImageData ? 'Enhancing...' : 'Generating...'}
              </>
            ) : (
              originalImageData ? 'Enhance Drawing' : 'Generate Scene'
            )}
          </button>
          
          <button
            onClick={handleClear}
            disabled={isEnhancing}
            className="px-4 py-3 bg-gray-700/50 text-white rounded-xl hover:bg-gray-600/50 disabled:bg-gray-800/50 disabled:text-white/40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105"
          >
            Clear
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
            {error}
          </div>
        )}

        {enhancedImage && (
          <div className="space-y-6">
            <h4 className="text-lg font-semibold text-white">
              {originalImageData ? '✨ Enhanced Image:' : '🎨 Generated Scene:'}
            </h4>
            <div className="glass-card border border-white/20 rounded-xl overflow-hidden">
              <img
                src={enhancedImage}
                alt="Enhanced by AI"
                className="w-full h-auto max-w-md mx-auto"
              />
            </div>
            
            {enhancementResult && (
              <div className="glass-card p-4 rounded-xl">
                <h5 className="text-sm font-medium text-white mb-3">Enhancement Details:</h5>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div className="text-center">
                    <div className="text-blue-400 font-mono">{enhancementResult.timings?.inference?.toFixed(2)}s</div>
                    <div className="text-white/60">Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-green-400 font-mono">{enhancementResult.seed}</div>
                    <div className="text-white/60">Seed</div>
                  </div>
                  <div className="text-center">
                    <div className={enhancementResult.has_nsfw_concepts ? "text-red-400" : "text-green-400"}>
                      {enhancementResult.has_nsfw_concepts ? 'Yes' : 'No'}
                    </div>
                    <div className="text-white/60">NSFW</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
