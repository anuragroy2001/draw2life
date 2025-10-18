import { SceneObject } from './ai-service';
import { fal } from '@fal-ai/client';

export interface VideoExportRequest {
  projectId: string;
  sceneData: {
    width: number;
    height: number;
    backgroundColor: string;
    objects: SceneObject[];
  };
  animationSettings: {
    duration: number;
    fps: number;
    quality: 'low' | 'medium' | 'high';
  };
  narration?: string;
}

export interface VideoExportResponse {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  progress?: number;
  error?: string;
  estimatedTime?: number;
}

export interface VideoExportStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  completedAt?: Date;
}

class VideoExportService {
  private apiKey: string;

  constructor() {
    // Use FAL_KEY_ID as the single credentials string as per fal.ai docs
    // Try both server-side and client-side environment variables
    this.apiKey = process.env.FAL_KEY_ID || process.env.NEXT_PUBLIC_FAL_KEY_ID || "f8115053-cd81-4074-92af-d610f8f12dcb:9f4b59136f02641dd51814c907ba519c";
    
    // Debug logging
    console.log('FAL_KEY_ID:', this.apiKey ? 'Set' : 'Not set');
    console.log('API Key configured:', !!this.apiKey);
    
    if (!this.apiKey) {
      console.warn('FAL_KEY_ID is not set. Video export features will be disabled.');
    } else {
      try {
        fal.config({
          credentials: this.apiKey,
        });
        console.log('FAL AI configured for video export');
      } catch (error) {
        console.warn('Failed to configure FAL AI for video export:', error);
      }
    }
  }

  async exportVideo(request: VideoExportRequest): Promise<VideoExportResponse> {
    if (!this.apiKey) {
      throw new Error('Video export not available. Please set FAL_KEY_ID environment variable.');
    }

    try {
      // Prepare the animation frames data
      const animationData = await this.prepareAnimationData(request);
      
      // This method is not used in the current implementation
      // We use exportVideoFromImage instead
      throw new Error('This method is not implemented. Use exportVideoFromImage instead.');

    } catch (error) {
      console.error('Video export failed:', error);
      throw error;
    }
  }

  async getExportStatus(exportId: string): Promise<VideoExportStatus> {
    // This method is not used in the current implementation
    // The fal.ai SDK handles status internally
    throw new Error('This method is not implemented. Status is handled internally by fal.ai SDK.');
  }

  private async prepareAnimationData(request: VideoExportRequest): Promise<{ videoUrl: string }> {
    // For now, we'll create a simple animation sequence
    // In a real implementation, you'd capture the actual animation frames
    const canvas = document.createElement('canvas');
    canvas.width = request.sceneData.width;
    canvas.height = request.sceneData.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    // Set background
    ctx.fillStyle = request.sceneData.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw objects (simplified for now)
    request.sceneData.objects.forEach(obj => {
      ctx.fillStyle = obj.color;
      ctx.fillRect(obj.position.x, obj.position.y, obj.position.width, obj.position.height);
    });

    // Convert to blob and create URL
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Could not create video blob'));
          return;
        }
        
        const videoUrl = URL.createObjectURL(blob);
        resolve({ videoUrl });
      }, 'video/mp4');
    });
  }

  private generateVideoPrompt(request: VideoExportRequest): string {
    const objectDescriptions = request.sceneData.objects.map(obj => 
      `${obj.label} (${obj.type}) in ${obj.color}`
    ).join(', ');

    let prompt = `Animated children's drawing featuring: ${objectDescriptions}. `;
    
    if (request.narration) {
      prompt += `Educational theme: ${request.narration}. `;
    }
    
    prompt += `Colorful, child-friendly animation with smooth movements. `;
    prompt += `Educational content suitable for kids ages 5-12. `;
    prompt += `Bright, engaging visuals with educational value.`;

    return prompt;
  }

  // Alternative: Use a simpler approach with image-to-video
  async exportVideoFromImage(imageData: string, narration: string): Promise<VideoExportResponse> {
    if (!this.apiKey) {
      throw new Error('Video export not available. Please set FAL_KEY_ID environment variable.');
    }

    try {
      // Use fal.ai's image-to-video endpoint
      const result = await fal.subscribe('fal-ai/minimax/video-01-live/image-to-video', {
        input: {
          image_url: imageData,
          prompt: `Animated children's drawing: ${narration}. Colorful, educational animation for kids.`,
        },
        logs: true,
        onQueueUpdate: (update) => {
          console.log('Queue update:', update);
        },
      });

      // Handle the async result from fal.subscribe
      const videoResult = await result;
      
      console.log('Video export result:', videoResult);
      
      // Extract video URL from different possible locations
      let videoUrl = null;
      let thumbnailUrl = null;
      
      // Try multiple possible response structures
      const videoData: any = videoResult.data || {};
      const video: any = videoData.video || {};
      
      if (video.url) {
        videoUrl = video.url;
        thumbnailUrl = video.thumbnail_url;
      } else if (videoData.video_url) {
        videoUrl = videoData.video_url;
        thumbnailUrl = videoData.thumbnail_url;
      } else if (videoData.url) {
        videoUrl = videoData.url;
        thumbnailUrl = videoData.thumbnail_url;
      } else if ((videoResult as any).video?.url) {
        videoUrl = (videoResult as any).video.url;
        thumbnailUrl = (videoResult as any).video.thumbnail_url;
      } else if ((videoResult as any).video_url) {
        videoUrl = (videoResult as any).video_url;
        thumbnailUrl = (videoResult as any).thumbnail_url;
      } else if ((videoResult as any).url) {
        videoUrl = (videoResult as any).url;
        thumbnailUrl = (videoResult as any).thumbnail_url;
      } else if (videoData.output?.video_url) {
        videoUrl = videoData.output.video_url;
        thumbnailUrl = videoData.output.thumbnail_url;
      } else if ((videoResult as any).output?.video_url) {
        videoUrl = (videoResult as any).output.video_url;
        thumbnailUrl = (videoResult as any).output.thumbnail_url;
      }
      
      console.log('Extracted video URL:', videoUrl);
      console.log('Extracted thumbnail URL:', thumbnailUrl);
      
      // If no video URL found, log the full response structure for debugging
      if (!videoUrl) {
        console.log('No video URL found. Full response structure:');
        console.log(JSON.stringify(videoResult, null, 2));
      }
      
      return {
        id: videoResult.requestId || `video_${Date.now()}`,
        status: 'completed',
        progress: 100,
        videoUrl: videoUrl,
        thumbnailUrl: thumbnailUrl,
        estimatedTime: 20, // Estimated 20 seconds
      };

    } catch (error) {
      console.error('Video export failed:', error);
      throw error;
    }
  }
}

export const videoExportService = new VideoExportService();
