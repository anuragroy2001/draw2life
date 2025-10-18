"use client";

import React, { useState, useCallback } from 'react';
import { Brain, Loader2, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { aiService, SceneAnalysis } from '@/lib/ai-service';
import { imageProcessor } from '@/lib/image-processor';
import { cn } from '@/lib/utils';

interface SceneAnalyzerProps {
  onAnalysisComplete: (analysis: SceneAnalysis) => void;
  onNarrationGenerated: (narration: string) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  disabled?: boolean;
}

export default function SceneAnalyzer({
  onAnalysisComplete,
  onNarrationGenerated,
  canvasRef,
  disabled = false,
}: SceneAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SceneAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [narration, setNarration] = useState<string>('');

  const captureCanvas = useCallback(async (): Promise<string> => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) {
      throw new Error('Canvas not found');
    }

    // Get the canvas as base64
    const dataURL = canvas.toDataURL('image/png');
    return dataURL;
  }, [canvasRef]);

  const handleAnalyze = useCallback(async () => {
    if (isAnalyzing || disabled) return;

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);
    setNarration('');

    try {
      // 1. Capture canvas
      const imageData = await captureCanvas();
      
      // 2. Preprocess image for better AI analysis (with fallback)
      let processedImageData = imageData;
      try {
        const processedImage = await imageProcessor.enhanceForAI(imageData);
        processedImageData = processedImage.data;
      } catch (processingError) {
        console.warn('Image processing failed, using original image:', processingError);
        // Continue with original image if processing fails
      }
      
      // 3. Resize for optimal AI processing (with fallback)
      let resizedImageData = processedImageData;
      try {
        const resizedImage = await imageProcessor.resizeForAI(processedImageData, 1024);
        resizedImageData = resizedImage.data;
      } catch (resizeError) {
        console.warn('Image resize failed, using processed image:', resizeError);
        // Continue with processed image if resize fails
      }
      
      // 4. Extract base64 data (remove data:image/png;base64, prefix)
      const base64Data = resizedImageData.split(',')[1];
      
      // 5. Analyze with AI
      const analysisResult = await aiService.analyzeDrawing(base64Data);
      setAnalysis(analysisResult);
      onAnalysisComplete(analysisResult);

      // 6. Generate educational narration
      const narrationText = await aiService.generateEducationalNarration(analysisResult);
      setNarration(narrationText);
      onNarrationGenerated(narrationText);

    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, disabled, captureCanvas, onAnalysisComplete, onNarrationGenerated]);

  const handleRetry = useCallback(() => {
    setError(null);
    handleAnalyze();
  }, [handleAnalyze]);

  return (
    <div className="space-y-6">
      {/* Analysis Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || disabled}
          className={cn(
            "flex items-center gap-3 px-6 py-4 rounded-xl font-medium transition-all duration-300",
            isAnalyzing || disabled
              ? "bg-gray-800/50 text-white/40 cursor-not-allowed border border-white/10"
              : "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 hover:scale-105 shadow-lg"
          )}
        >
          {isAnalyzing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Brain className="w-5 h-5" />
          )}
          {isAnalyzing ? 'Analyzing...' : 'Understand My Drawing'}
        </button>

        {error && (
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-4 py-3 text-sm bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 hover:scale-105 shadow-lg"
          >
            <AlertCircle className="w-4 h-4" />
            Retry
          </button>
        )}
      </div>

      {/* Status Messages */}
      {isAnalyzing && (
        <div className="flex items-center gap-3 text-blue-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-medium">AI is analyzing your drawing...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 text-red-400 bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Analysis Complete!</span>
          </div>

          {/* Analysis Results */}
          <div className="glass-card p-6 rounded-xl">
            <h4 className="font-medium text-white mb-4 text-lg">🔍 What I Found:</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{analysis.objects.length}</div>
                <div className="text-white/70">Objects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{Math.round(analysis.confidence * 100)}%</div>
                <div className="text-white/70">Confidence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{analysis.suggestedAnimations.length}</div>
                <div className="text-white/70">Animations</div>
              </div>
            </div>
          </div>

          {/* Detected Objects */}
          {analysis.objects.length > 0 && (
            <div className="glass-card p-6 rounded-xl">
              <h4 className="font-medium text-white mb-4 text-lg">🎯 Detected Objects:</h4>
              <div className="grid grid-cols-2 gap-3">
                {analysis.objects.map((obj, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg">
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-white/20"
                      style={{ backgroundColor: obj.color }}
                    />
                    <span className="text-white/90 font-medium">{obj.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Animations */}
          {analysis.suggestedAnimations.length > 0 && (
            <div className="glass-card p-6 rounded-xl">
              <h4 className="font-medium text-white mb-4 text-lg">✨ Suggested Animations:</h4>
              <div className="space-y-3">
                {analysis.suggestedAnimations.map((anim, index) => (
                  <div key={index} className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <div className="text-sm text-white/90">
                      <span className="font-medium text-purple-300">{anim.objectId}:</span> {anim.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Educational Narration */}
      {narration && (
        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <h4 className="font-medium text-white text-lg">🎓 Educational Insight:</h4>
          </div>
          <p className="text-sm text-white/80 leading-relaxed">{narration}</p>
        </div>
      )}
    </div>
  );
}
