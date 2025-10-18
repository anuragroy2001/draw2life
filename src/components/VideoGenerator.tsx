"use client";

import React, { useState, useCallback } from 'react';
import { Download, Video, Loader2, CheckCircle, AlertCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { aiService } from '@/lib/ai-service';

interface VideoGeneratorProps {
  firstSceneData: string;
  secondSceneData: string;
  firstDescription: string;
  secondDescription: string;
  onBack: () => void;
  onRestart: () => void;
}

export default function VideoGenerator({ 
  firstSceneData, 
  secondSceneData, 
  firstDescription, 
  secondDescription,
  onBack,
  onRestart 
}: VideoGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [analysis, setAnalysis] = useState<{
    firstAnalysis: any;
    secondAnalysis: any;
    animationPrompt: string;
  } | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [veoPrompt, setVeoPrompt] = useState<string>('');

  // Auto-analyze when component loads
  React.useEffect(() => {
    if (firstSceneData && secondSceneData && !analysisComplete && !isAnalyzing) {
      handleAutoAnalyze();
    }
  }, [firstSceneData, secondSceneData, analysisComplete, isAnalyzing]);

  const handleAutoAnalyze = useCallback(async () => {
    if (isAnalyzing || analysisComplete) return;

    setIsAnalyzing(true);
    setError(null);
    setCurrentStep('Analyzing your sketches with AI...');

    try {
      console.log('Auto-analyzing sketches for video generation...');
      
      // Generate the VEO prompt using intelligent analysis
      const { analysis } = await aiService.generateIntelligentVideo(
        firstSceneData,
        secondSceneData
      );
      
      setAnalysis(analysis);
      setVeoPrompt(analysis.animationPrompt);
      setAnalysisComplete(true);
      setCurrentStep('Analysis complete! Review the prompt below and click Generate Video when ready.');
      
      console.log('Auto-analysis complete. VEO Prompt:', analysis.animationPrompt);
    } catch (err) {
      console.error('Auto-analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setCurrentStep('Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [firstSceneData, secondSceneData, isAnalyzing, analysisComplete]);

  const handleGenerateVideo = useCallback(async () => {
    if (!analysisComplete || !veoPrompt) return;

    setIsGenerating(true);
    setError(null);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 500);

      // Generate video using the pre-generated prompt
      console.log('Starting video generation with pre-generated prompt...');
      setCurrentStep('Creating your magical animation...');
      
      const { videoResult } = await aiService.generateIntelligentVideo(
        firstSceneData,
        secondSceneData
      );

      console.log('Video generation completed!');
      console.log('Used prompt:', veoPrompt);

      setCurrentStep('Video generation complete!');
      clearInterval(progressInterval);
      setProgress(100);
      setVideoUrl(videoResult.video.url);
      setIsComplete(true);
    } catch (err) {
      console.error('Video generation failed:', err);
      setError(err instanceof Error ? err.message : 'Video generation failed');
    } finally {
      setIsGenerating(false);
    }
  }, [firstSceneData, secondSceneData, analysisComplete, veoPrompt]);

  const handleDownload = useCallback(() => {
    if (videoUrl) {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `draw2life-video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [videoUrl]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="glass border-b border-orange-500/20 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
                    <h1 className="text-3xl font-soria-bold text-orange-100">
                      Creating Your Magic Video
                    </h1>
              <p className="text-orange-300 mt-2">
                AI is bringing your two scenes together into an amazing animation!
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="px-6 py-3 bg-orange-600/20 text-orange-200 rounded-xl hover:bg-orange-600/30 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Drawing
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          {!isComplete ? (
            <div className="glass-card p-8 rounded-2xl text-center">
              <div className="mb-8">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                  {isGenerating ? (
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                  ) : (
                    <Video className="w-12 h-12 text-white" />
                  )}
                </div>
                
                <h2 className="text-2xl font-soria-bold text-orange-100 mb-4">
                  {isGenerating ? 'Creating Your Animation...' : 'Ready to Create Magic?'}
                </h2>
                
                <p className="text-orange-300 mb-8">
                  {isAnalyzing 
                    ? 'AI is analyzing your sketches and generating animation prompt...'
                    : isGenerating 
                    ? 'AI is analyzing your scenes and creating a smooth transition between them'
                    : analysisComplete
                    ? 'Review the animation prompt below and click Generate Video when ready!'
                    : 'Click the button below to generate your animated video!'
                  }
                </p>

                {isGenerating && (
                  <div className="mb-8">
                    <div className="w-full bg-orange-900/30 rounded-full h-3 mb-4">
                      <div 
                        className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-orange-300 text-sm mb-4">
                      {Math.round(progress)}% Complete
                    </p>
                    {currentStep && (
                      <p className="text-orange-300 text-lg font-soria">
                        {currentStep}
                      </p>
                    )}
                  </div>
                )}

                {analysis && (
                  <div className="mb-8 text-left">
                    <h3 className="text-xl font-soria-bold text-orange-100 mb-4 text-center">
                      AI Analysis Results
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div className="glass-card p-4 rounded-xl">
                        <h4 className="font-soria-bold text-orange-200 mb-2">First Scene</h4>
                        <p className="text-orange-300 text-sm mb-2">
                          Objects: {analysis.firstAnalysis.objects.map((obj: any) => obj.label).join(', ')}
                        </p>
                        <p className="text-orange-300 text-sm">
                          {analysis.firstAnalysis.story || 'No story detected'}
                        </p>
                      </div>
                      <div className="glass-card p-4 rounded-xl">
                        <h4 className="font-soria-bold text-orange-200 mb-2">Second Scene</h4>
                        <p className="text-orange-300 text-sm mb-2">
                          Objects: {analysis.secondAnalysis.objects.map((obj: any) => obj.label).join(', ')}
                        </p>
                        <p className="text-orange-300 text-sm">
                          {analysis.secondAnalysis.story || 'No story detected'}
                        </p>
                      </div>
                    </div>
                    <div className="glass-card p-4 rounded-xl">
                      <h4 className="font-soria-bold text-orange-200 mb-2">Generated Animation Prompt</h4>
                      <p className="text-orange-300 text-sm">
                        {analysis.animationPrompt}
                      </p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-8 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                    <div className="flex items-center gap-3 text-red-300">
                      <AlertCircle className="w-5 h-5" />
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                {/* VEO Prompt Display (Above Generate Button) */}
                {analysisComplete && veoPrompt && (
                  <div className="mb-8 p-6 bg-gradient-to-r from-orange-500/20 to-red-500/20 border-2 border-orange-400/30 rounded-xl shadow-lg">
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
                      This prompt will be sent to VEO to generate your video. Review it and click &quot;Generate My Video!&quot; when ready!
                    </p>
                  </div>
                )}

                {!isGenerating && !error && (
                  <button
                    onClick={handleGenerateVideo}
                    disabled={!analysisComplete}
                    className={`px-12 py-6 text-white text-xl font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg ${
                      analysisComplete
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                        : 'bg-gray-600 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-6 h-6 mr-3" />
                    {!analysisComplete ? 'Analyzing...' : 'Generate My Video!'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-card p-8 rounded-2xl">
              <div className="text-center mb-8">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
                
                    <h2 className="text-3xl font-soria-bold text-orange-100 mb-4">
                      Your Video is Ready!
                    </h2>
                
                <p className="text-orange-300 mb-8">
                  Your magical animation has been created! Watch your story come to life.
                </p>
              </div>

              {videoUrl && (
                <div className="mb-8">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full max-w-2xl mx-auto rounded-xl shadow-2xl"
                    poster={firstSceneData}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300"
                >
                  <Download className="w-5 h-5" />
                  Download Video
                </button>
                
                <button
                  onClick={onRestart}
                  className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300"
                >
                  <Sparkles className="w-5 h-5" />
                  Create Another Story
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
