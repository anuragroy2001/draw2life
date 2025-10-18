"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Download, Video, Loader2, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { videoExportService, VideoExportStatus } from '@/lib/video-export-service';
import { SceneAnalysis, aiService, FALVideoGenerationResult } from '@/lib/ai-service';
import { cn } from '@/lib/utils';

// Typing animation component
const TypingAnimation = ({ text, speed = 50 }: { text: string; speed?: number }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  return (
    <div className="text-white/90 text-sm leading-relaxed">
      {displayedText}
      <span className="animate-pulse">|</span>
    </div>
  );
};

interface VideoExporterProps {
  sceneAnalysis: SceneAnalysis | null;
  narration: string;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  disabled?: boolean;
}

export default function VideoExporter({
  sceneAnalysis,
  narration,
  canvasRef,
  disabled = false,
}: VideoExporterProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<VideoExportStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [firstFrame, setFirstFrame] = useState<string | null>(null);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const [videoResult, setVideoResult] = useState<FALVideoGenerationResult | null>(null);
  const [friendlyPrompt, setFriendlyPrompt] = useState<string>('');
  const [veoPrompt, setVeoPrompt] = useState<string>('');
  const [showTypingAnimation, setShowTypingAnimation] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // Update progress when export status changes
  useEffect(() => {
    if (exportStatus) {
      setProgress(exportStatus.progress);
      if (exportStatus.status === 'completed' || exportStatus.status === 'failed') {
        setIsExporting(false);
      }
    }
  }, [exportStatus]);

  // Auto-analyze when both frames are captured
  useEffect(() => {
    if (firstFrame && lastFrame && !analysisComplete && !isAnalyzing) {
      handleAutoAnalyze();
    }
  }, [firstFrame, lastFrame, analysisComplete, isAnalyzing]);

  const captureCanvas = useCallback(async (): Promise<string> => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) {
      throw new Error('Canvas not found');
    }
    return canvas.toDataURL('image/png');
  }, [canvasRef]);

  const generateFriendlyPrompt = useCallback(async (originalPrompt: string): Promise<string> => {
    try {
      // Use Gemini to make the prompt more friendly and kid-friendly
      const friendlyPrompt = await aiService.generateEducationalNarration({
        objects: [],
        relationships: [],
        suggestedAnimations: [],
        confidence: 1.0
      });
      
      // Create a friendly version of the video prompt
      const prompt = `
        Transform this technical video generation prompt into a friendly, kid-friendly explanation:
        
        Original prompt: "${originalPrompt}"
        
        Make it sound like you're explaining to a child what amazing animation will happen in their video. 
        Use words like "magical", "amazing", "wonderful", "exciting", "fantastic", "incredible".
        Keep it under 100 words and make it sound enthusiastic and educational.
        Start with something like "Get ready for an amazing adventure!" or "Your drawing is about to come to life!"
      `;
      
      // For now, return a friendly version - in a real implementation, you'd call Gemini here
      return `Get ready for an amazing adventure! Your drawing is about to come to life with magical movement and wonderful animations that will make your artwork dance and play in the most incredible way! 🌟✨`;
    } catch (error) {
      console.error('Error generating friendly prompt:', error);
      return `Your amazing drawing is about to come to life with magical animations! 🌟`;
    }
  }, []);

  const handleAutoAnalyze = useCallback(async () => {
    if (!sceneAnalysis || isAnalyzing || analysisComplete) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      console.log('Auto-analyzing frames for video generation...');
      
      // Generate the VEO prompt using the scene analysis
      const prompt = await aiService.generateIntelligentVideoPrompt(sceneAnalysis);
      setVeoPrompt(prompt);
      setAnalysisComplete(true);
      
      console.log('Auto-analysis complete. VEO Prompt:', prompt);
    } catch (err) {
      console.error('Auto-analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [sceneAnalysis, isAnalyzing, analysisComplete]);

  const handleExportVideo = useCallback(async () => {
    if (isExporting || disabled || !sceneAnalysis || !analysisComplete) return;

    setIsExporting(true);
    setError(null);
    setProgress(0);

    try {
      // Generate friendly prompt for display early
      const friendlyPromptText = await generateFriendlyPrompt("Your drawing animation");
      setFriendlyPrompt(friendlyPromptText);
      // Start typing animation after a short delay
      setTimeout(() => {
        setShowTypingAnimation(true);
      }, 500);

      // Use captured frames or capture current canvas
      let firstFrameData = firstFrame;
      let lastFrameData = lastFrame;
      
      if (!firstFrameData) {
        firstFrameData = await captureCanvas();
        setFirstFrame(firstFrameData);
      }
      
      if (!lastFrameData) {
        lastFrameData = await captureCanvas();
        setLastFrame(lastFrameData);
      }
      
      // Convert data URLs to proper URLs for the API
      const firstFrameUrl = firstFrameData;
      const lastFrameUrl = lastFrameData;
      
      // Generate video using the pre-generated VEO prompt
      let videoResult;
      try {
        videoResult = await aiService.generateVideo({
          firstFrameUrl,
          lastFrameUrl,
          prompt: veoPrompt, // Use the pre-generated prompt
          duration: 4,
        });
      } catch (videoError) {
        console.error('Video generation API error:', videoError);
        throw new Error(`Video generation failed: ${videoError instanceof Error ? videoError.message : 'Unknown error'}`);
      }
      
      console.log('Video generation result:', videoResult);
      setVideoResult(videoResult);
      
      // Validate video result before setting status
      if (!videoResult || !videoResult.video || !videoResult.video.url) {
        console.error('Invalid video result:', videoResult);
        throw new Error('Video generation completed but no video URL was returned');
      }
      
      setExportStatus({
        id: videoResult.request_id || `video_${Date.now()}`,
        status: 'completed',
        progress: 100,
        videoUrl: videoResult.video.url,
        thumbnailUrl: firstFrameUrl, // Use first frame as thumbnail
      });

    } catch (err) {
      console.error('Video export failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Video export failed';
      
      // Provide more helpful error messages
      if (errorMessage.includes('FAL_KEY_ID')) {
        setError('Video export requires API configuration. Please set up your FAL.AI API key in environment variables.');
      } else if (errorMessage.includes('ValidationError')) {
        setError('Video generation failed due to invalid input. Please try capturing frames again.');
      } else if (errorMessage.includes('Both first_frame_url and last_frame_url are required')) {
        setError('Please capture both first and last frames before generating video.');
      } else {
        setError(`Video export failed: ${errorMessage}`);
      }
      setIsExporting(false);
    }
  }, [isExporting, disabled, sceneAnalysis, analysisComplete, veoPrompt, captureCanvas, firstFrame, lastFrame, generateFriendlyPrompt]);

  const handleCaptureFirstFrame = useCallback(async () => {
    try {
      const frameData = await captureCanvas();
      setFirstFrame(frameData);
      console.log('First frame captured');
    } catch (err) {
      console.error('Failed to capture first frame:', err);
      setError('Failed to capture first frame');
    }
  }, [captureCanvas]);

  const handleCaptureLastFrame = useCallback(async () => {
    try {
      const frameData = await captureCanvas();
      setLastFrame(frameData);
      console.log('Last frame captured');
    } catch (err) {
      console.error('Failed to capture last frame:', err);
      setError('Failed to capture last frame');
    }
  }, [captureCanvas]);

  const handleDownload = useCallback(() => {
    if (exportStatus?.videoUrl) {
      const link = document.createElement('a');
      link.href = exportStatus.videoUrl;
      link.download = `draw2life-video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [exportStatus?.videoUrl]);

  const getStatusIcon = () => {
    if (isExporting) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    if (exportStatus?.status === 'completed') {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    if (exportStatus?.status === 'failed') {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
    return <Video className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (isExporting) {
      return `Creating video... ${Math.round(progress)}%`;
    }
    if (exportStatus?.status === 'completed') {
      return 'Video ready!';
    }
    if (exportStatus?.status === 'failed') {
      return 'Export failed';
    }
    return 'Export Video';
  };

  const isExportDisabled = disabled || !sceneAnalysis || isExporting;

  return (
    <div className="space-y-6">
      {/* Frame Capture Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleCaptureFirstFrame}
          className="flex items-center gap-2 px-4 py-3 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 hover:scale-105 shadow-lg"
        >
          <Camera className="w-4 h-4" />
          {firstFrame ? 'First Frame ✓' : 'Capture First Frame'}
        </button>
        
        <button
          onClick={handleCaptureLastFrame}
          className="flex items-center gap-2 px-4 py-3 text-sm bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-300 hover:scale-105 shadow-lg"
        >
          <Camera className="w-4 h-4" />
          {lastFrame ? 'Last Frame ✓' : 'Capture Last Frame'}
        </button>
      </div>

      {/* Analysis Status */}
      {isAnalyzing && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-blue-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">AI is analyzing your frames and generating animation prompt...</span>
          </div>
        </div>
      )}

      {/* VEO Prompt Display (Above Generate Button) */}
      {analysisComplete && veoPrompt && (
        <div className="mb-6 p-6 bg-gradient-to-r from-orange-500/20 to-red-500/20 border-2 border-orange-400/30 rounded-xl shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
              <span className="text-white text-lg">🤖</span>
            </div>
            <h5 className="text-orange-200 font-semibold text-lg">AI Animation Prompt:</h5>
          </div>
          <div className="text-white/90 text-sm leading-relaxed bg-black/20 p-4 rounded-lg border border-orange-400/20">
            {veoPrompt}
          </div>
          <p className="text-orange-300/80 text-xs mt-3">
            This prompt will be sent to VEO to generate your video. Review it and click "Generate Video" when ready!
          </p>
        </div>
      )}

      {/* Export Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleExportVideo}
          disabled={isExportDisabled || !analysisComplete}
          className={cn(
            "flex items-center gap-3 px-6 py-4 rounded-xl font-medium transition-all duration-300",
            (isExportDisabled || !analysisComplete)
              ? "bg-gray-800/50 text-white/40 cursor-not-allowed border border-white/10"
              : "btn-primary hover:scale-105 shadow-lg"
          )}
        >
          {getStatusIcon()}
          {!analysisComplete ? 'Analyzing...' : getStatusText()}
        </button>

        {exportStatus?.status === 'completed' && exportStatus.videoUrl && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-3 text-sm bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 hover:scale-105 shadow-lg"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {isExporting && (
        <div className="space-y-6">
          {/* Friendly Prompt Display */}
          {friendlyPrompt && (
            <div className="p-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-2 border-blue-400/30 rounded-xl shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg">✨</span>
                </div>
                <h5 className="text-blue-200 font-semibold text-lg">What's happening in your video:</h5>
              </div>
              {showTypingAnimation ? (
                <TypingAnimation text={friendlyPrompt} speed={40} />
              ) : (
                <div className="text-white/80 text-sm">Preparing your magical animation description...</div>
              )}
            </div>
          )}
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-blue-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">AI is creating your video...</span>
            </div>
            <div className="w-full bg-gray-800/50 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-white/60">
              This usually takes 20-30 seconds
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-red-400 bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          
          {error.includes('API configuration') && (
            <div className="glass-card border border-blue-500/20 p-6 rounded-xl">
              <h4 className="font-medium text-blue-300 mb-3">Setup Instructions:</h4>
              <ol className="text-sm text-white/80 space-y-2 list-decimal list-inside">
                <li>Get your API key from <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200 text-blue-300">fal.ai dashboard</a></li>
                <li>Create a <code className="bg-gray-800/50 px-2 py-1 rounded text-blue-300">.env.local</code> file in your project root</li>
                <li>Add: <code className="bg-gray-800/50 px-2 py-1 rounded text-blue-300">FAL_KEY_ID=your_api_key_here</code></li>
                <li>Restart your development server</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Success Message */}
      {exportStatus?.status === 'completed' && (
        <div className="flex items-center gap-3 text-green-400 bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Your video is ready! Click download to save it.</span>
        </div>
      )}

      {/* Video Preview */}
      {exportStatus?.status === 'completed' && (
        <div className="glass-card p-8 rounded-xl">
          <h4 className="font-medium text-white mb-6 text-xl">🎬 Your Generated Video</h4>
          
          {/* VEO Prompt Display */}
          {veoPrompt && (
            <div className="mb-6 p-6 bg-gradient-to-r from-orange-500/20 to-red-500/20 border-2 border-orange-400/30 rounded-xl shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg">🤖</span>
                </div>
                <h5 className="text-orange-200 font-semibold text-lg">AI Prompt sent to VEO:</h5>
              </div>
              <div className="text-white/90 text-sm leading-relaxed bg-black/20 p-4 rounded-lg border border-orange-400/20">
                {veoPrompt}
              </div>
            </div>
          )}
          
          {/* Friendly Prompt Animation */}
          {exportStatus?.status === 'completed' && (
            <div className="mb-6 p-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-2 border-blue-400/30 rounded-xl shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                  <span className="text-white text-lg">✨</span>
                </div>
                <h5 className="text-blue-200 font-semibold text-lg">What's happening in your video:</h5>
              </div>
              {showTypingAnimation && friendlyPrompt ? (
                <TypingAnimation text={friendlyPrompt} speed={40} />
              ) : (
                <div className="text-white/80 text-sm">Preparing your magical animation description...</div>
              )}
            </div>
          )}
          
          {exportStatus.videoUrl ? (
            <div className="video-player w-full">
              <video 
                src={exportStatus.videoUrl} 
                controls 
                className="w-full h-auto max-w-none rounded-xl shadow-2xl"
                style={{ minHeight: '600px', maxHeight: '1000px' }}
                poster={exportStatus.thumbnailUrl}
                onError={(e) => {
                  console.error('Video load error:', e);
                  console.error('Video URL:', exportStatus.videoUrl);
                }}
                onLoadStart={() => console.log('Video loading started')}
                onCanPlay={() => console.log('Video can play')}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            <div className="text-center p-8 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <p className="text-yellow-300 font-medium">Video was generated but no preview URL was returned.</p>
              <p className="text-sm text-yellow-400/80 mt-2">Check the console for debugging information.</p>
            </div>
          )}

          {/* Video Info */}
          <div className="mt-6 grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", exportStatus.videoUrl ? "bg-green-400" : "bg-red-400")} />
              <span className="text-white/60">Video URL: {exportStatus.videoUrl ? 'Available' : 'Not available'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", exportStatus.thumbnailUrl ? "bg-green-400" : "bg-red-400")} />
              <span className="text-white/60">Thumbnail: {exportStatus.thumbnailUrl ? 'Available' : 'Not available'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      {!sceneAnalysis && (
        <div className="text-sm text-white/60 glass-card p-4 rounded-xl">
          Complete the &quot;Understand My Drawing&quot; analysis first to enable video export.
        </div>
      )}
    </div>
  );
}
