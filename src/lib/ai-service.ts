import { GoogleGenerativeAI } from '@google/generative-ai';
import { fal } from '@fal-ai/client';

export interface SceneAnalysis {
  objects: SceneObject[];
  relationships: ObjectRelationship[];
  suggestedAnimations: AnimationSuggestion[];
  confidence: number;
}

export interface SceneObject {
  id: string;
  type: 'person' | 'animal' | 'vehicle' | 'building' | 'nature' | 'object' | 'shape' | 'text';
  label: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  color: string;
  description: string;
  properties: {
    isAnimated?: boolean;
    canMove?: boolean;
    canRotate?: boolean;
    canScale?: boolean;
  };
}

export interface ObjectRelationship {
  from: string;
  to: string;
  type: 'above' | 'below' | 'left' | 'right' | 'inside' | 'near' | 'touching';
  description: string;
}

export interface AnimationSuggestion {
  objectId: string;
  animationType: 'bounce' | 'float' | 'rotate' | 'scale' | 'move' | 'fade';
  parameters: {
    duration?: number;
    direction?: 'up' | 'down' | 'left' | 'right' | 'clockwise' | 'counterclockwise';
    intensity?: 'low' | 'medium' | 'high';
    loop?: boolean;
  };
  description: string;
}

export interface FALImageGenerationResult {
  images: FALImage[];
  timings?: {
    inference: number;
  };
  seed?: number;
  has_nsfw_concepts?: boolean;
  request_id?: string;
}

export interface FALImage {
  content: Uint8Array;
  width: number;
  height: number;
  content_type: string;
  url?: string;
}

export interface FALVideoGenerationResult {
  video: {
    url: string;
    content_type: string;
    width: number;
    height: number;
    duration: number;
  };
  timings?: {
    inference: number;
  };
  request_id?: string;
}

export interface VideoGenerationOptions {
  firstFrameUrl: string;
  lastFrameUrl: string;
  prompt: string;
  duration?: number; // Will be converted to "8s" string for Veo3.1
}

class AIService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private falConfigured: boolean = false;

  constructor() {
    // Initialize Gemini AI
    const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.warn('NEXT_PUBLIC_GEMINI_API_KEY is not set. Gemini AI features will be disabled.');
    } else {
      this.genAI = new GoogleGenerativeAI(geminiApiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }
    
    // Initialize FAL AI
    const falApiKey = process.env.FAL_KEY_ID || process.env.NEXT_PUBLIC_FAL_KEY_ID || "f8115053-cd81-4074-92af-d610f8f12dcb:9f4b59136f02641dd51814c907ba519c";
    if (falApiKey) {
      try {
        fal.config({
          credentials: falApiKey,
        });
        this.falConfigured = true;
        console.log('FAL AI configured successfully');
      } catch (error) {
        console.warn('Failed to configure FAL AI:', error);
      }
    } else {
      console.warn('FAL_KEY_ID is not set. FAL AI features will be disabled.');
    }
  }

  async analyzeDrawing(imageData: string): Promise<SceneAnalysis> {
    if (!this.genAI || !this.model) {
      throw new Error('AI service not initialized. Please set NEXT_PUBLIC_GEMINI_API_KEY environment variable.');
    }
    
    // Try different models if the current one fails (using working models from test)
    const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-2.5-flash-lite'];
    
    for (const modelName of modelsToTry) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        return await this.performAnalysis(model, imageData);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Model ${modelName} failed:`, errorMessage);
        if (errorMessage.includes('not found')) {
          continue; // Try next model
        }
        throw error; // Re-throw if it's not a model not found error
      }
    }
    
    // If all models fail, return fallback
    console.warn('All models failed, returning fallback analysis');
    return {
      objects: [],
      relationships: [],
      suggestedAnimations: [],
      confidence: 0.5
    };
  }

  private async performAnalysis(model: any, imageData: string): Promise<SceneAnalysis> {
    try {
      // Convert data URL to base64 - handle both data URLs and direct base64
      let base64Data: string;
      if (imageData.startsWith('data:')) {
        base64Data = imageData.split(',')[1];
      } else {
        base64Data = imageData;
      }
      
      const prompt = `
        Analyze this children's drawing and return a structured JSON response with the following schema:
        
        {
          "objects": [
            {
              "id": "unique_id",
              "type": "person|animal|vehicle|building|nature|object|shape|text",
              "label": "descriptive_name",
              "position": {"x": number, "y": number, "width": number, "height": number},
              "color": "hex_color",
              "description": "what this object is",
              "properties": {
                "isAnimated": boolean,
                "canMove": boolean,
                "canRotate": boolean,
                "canScale": boolean
              }
            }
          ],
          "relationships": [
            {
              "from": "object_id",
              "to": "object_id", 
              "type": "above|below|left|right|inside|near|touching",
              "description": "relationship description"
            }
          ],
          "suggestedAnimations": [
            {
              "objectId": "object_id",
              "animationType": "bounce|float|rotate|scale|move|fade",
              "parameters": {
                "duration": number,
                "direction": "up|down|left|right|clockwise|counterclockwise",
                "intensity": "low|medium|high",
                "loop": boolean
              },
              "description": "why this animation makes sense"
            }
          ],
          "confidence": number
        }
        
        Focus on:
        1. Identifying all drawn objects (people, animals, vehicles, buildings, nature, shapes)
        2. Understanding spatial relationships between objects
        3. Suggesting appropriate animations based on object types and context
        4. Being creative and educational - think about what would be fun for kids
        5. Consider physics and natural movement patterns
        
        Return ONLY valid JSON, no other text.
      `;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/png'
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      
      // Clean the response to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }
      
      const analysis = JSON.parse(jsonMatch[0]);
      
      // Validate and enhance the response
      return this.validateAndEnhanceAnalysis(analysis);
      
    } catch (error) {
      console.error('Error in performAnalysis:', error);
      throw error; // Re-throw to be handled by the calling method
    }
  }

  private validateAndEnhanceAnalysis(analysis: any): SceneAnalysis {
    // Ensure all required fields exist with defaults
    const enhancedAnalysis: SceneAnalysis = {
      objects: (analysis.objects || []).map((obj: any, index: number) => ({
        id: obj.id || `obj_${index}`,
        type: obj.type || 'object',
        label: obj.label || 'Unknown Object',
        position: {
          x: obj.position?.x || 0,
          y: obj.position?.y || 0,
          width: obj.position?.width || 50,
          height: obj.position?.height || 50,
        },
        color: obj.color || '#000000',
        description: obj.description || 'A drawn object',
        properties: {
          isAnimated: obj.properties?.isAnimated ?? true,
          canMove: obj.properties?.canMove ?? true,
          canRotate: obj.properties?.canRotate ?? false,
          canScale: obj.properties?.canScale ?? false,
        },
      })),
      relationships: analysis.relationships || [],
      suggestedAnimations: (analysis.suggestedAnimations || []).map((anim: any) => ({
        objectId: anim.objectId || '',
        animationType: anim.animationType || 'bounce',
        parameters: {
          duration: anim.parameters?.duration || 2,
          direction: anim.parameters?.direction || 'up',
          intensity: anim.parameters?.intensity || 'medium',
          loop: anim.parameters?.loop ?? true,
        },
        description: anim.description || 'Suggested animation',
      })),
      confidence: Math.max(0, Math.min(1, analysis.confidence || 0.7)),
    };

    return enhancedAnalysis;
  }

  async generateEducationalNarration(sceneAnalysis: SceneAnalysis): Promise<string> {
    if (!this.genAI || !this.model) {
      return "Wow! What an amazing drawing! I can see you've created something really special! 🌟";
    }
    
    try {
      const prompt = `
        Based on this scene analysis, create a super fun and exciting narration for kids (ages 4-10):
        
        Objects: ${sceneAnalysis.objects.map(obj => `${obj.label} (${obj.type})`).join(', ')}
        Relationships: ${sceneAnalysis.relationships.map(rel => rel.description).join(', ')}
        Animations: ${sceneAnalysis.suggestedAnimations.map(anim => anim.description).join(', ')}
        
        Create an AMAZING, kid-friendly narration that:
        1. Starts with excitement and praise ("Wow!", "Amazing!", "Fantastic!")
        2. Describes what they drew in super simple, fun terms
        3. Uses lots of exclamation points and enthusiasm
        4. Teaches something cool in a fun way (like "Did you know...")
        5. Is super encouraging and makes them feel proud
        6. Suggests what cool animations will happen
        7. Keeps it under 80 words
        8. Uses words like "awesome", "cool", "amazing", "fantastic"
        
        Make it sound like their favorite cartoon character or a super excited friend!
        Use lots of emojis and exclamation points!
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
      
    } catch (error) {
      console.error('Error generating narration:', error);
      return "Wow! What an amazing drawing! I can see you've created something really special! 🌟";
    }
  }

  /**
   * Generate an AI image using FAL AI based on a text prompt
   */
  async generateImage(prompt: string, options?: {
    imageUrl?: string;
    syncMode?: boolean;
    numInferenceSteps?: number;
    guidanceScale?: number;
    seed?: number;
  }): Promise<FALImageGenerationResult> {
    if (!this.falConfigured) {
      throw new Error('FAL AI not configured. Please set FAL_KEY_ID environment variable.');
    }

    const {
      imageUrl,
      syncMode = true,
      numInferenceSteps = 4,
      guidanceScale = 1.0,
      seed
    } = options || {};

    return new Promise((resolve, reject) => {
      const connection = fal.realtime.connect("fal-ai/fast-lcm-diffusion", {
        onResult: (result: any) => {
          console.log('FAL AI image generation completed:', result);
          connection.close();
          resolve(result as FALImageGenerationResult);
        },
        onError: (error: any) => {
          console.error('FAL AI image generation error:', error);
          connection.close();
          reject(error);
        },
      });

      const requestData: any = {
        prompt,
        sync_mode: syncMode,
        num_inference_steps: numInferenceSteps,
        guidance_scale: guidanceScale,
      };

      if (imageUrl) {
        requestData.image_url = imageUrl;
      }

      if (seed) {
        requestData.seed = seed;
      }

      connection.send(requestData);

      // Set timeout
      setTimeout(() => {
        connection.close();
        reject(new Error('FAL AI request timeout'));
      }, 60000);
    });
  }

  /**
   * Generate an AI image based on a scene analysis
   */
  async generateImageFromScene(sceneAnalysis: SceneAnalysis): Promise<FALImageGenerationResult> {
    const prompt = this.createImagePromptFromScene(sceneAnalysis);
    return this.generateImage(prompt);
  }

  /**
   * Generate an enhanced version of a drawing using FAL AI
   */
  async enhanceDrawing(imageData: string, sceneAnalysis: SceneAnalysis): Promise<FALImageGenerationResult> {
    const prompt = this.createImagePromptFromScene(sceneAnalysis);
    const imageUrl = `data:image/png;base64,${imageData}`;
    
    return this.generateImage(prompt, {
      imageUrl,
      syncMode: true,
      numInferenceSteps: 8, // More steps for better quality
      guidanceScale: 1.5,
    });
  }

  /**
   * Convert image data to base64 data URL
   */
  convertImageToDataUrl(imageData: Uint8Array, contentType: string = 'image/png'): string {
    const base64 = Buffer.from(imageData).toString('base64');
    return `data:${contentType};base64,${base64}`;
  }

  /**
   * Convert data URL to a format that Veo3.1 can process
   * Veo3.1 supports base64 data URIs directly, so we can use them as-is
   */
  private async convertDataUrlToHttpUrl(dataUrl: string): Promise<string> {
    if (!dataUrl.startsWith('data:')) {
      return dataUrl; // Already an HTTP URL
    }

    try {
      // Veo3.1 supports base64 data URIs directly according to the documentation
      // So we can use the data URL as-is
      console.log('Using data URL directly - Veo3.1 supports base64 data URIs');
      return dataUrl;
    } catch (error) {
      console.error('Failed to process data URL:', error);
      throw new Error('Failed to process image data URL');
    }
  }

  /**
   * Generate a video using Veo3.1 First-Last-Frame-to-Video model
   */
  async generateVideo(options: VideoGenerationOptions): Promise<FALVideoGenerationResult> {
    if (!this.falConfigured) {
      throw new Error('FAL AI not configured. Please set FAL_KEY_ID environment variable.');
    }

    try {
      // Validate input URLs
      if (!options.firstFrameUrl || !options.lastFrameUrl) {
        throw new Error('Both first_frame_url and last_frame_url are required');
      }

      // Validate prompt
      if (!options.prompt || options.prompt.trim().length === 0) {
        throw new Error('Prompt is required for video generation');
      }

      // Validate duration - Veo3.1 only supports 8s duration
      const duration = "8s"; // Veo3.1 only supports 8 seconds

      // Convert data URLs to HTTP URLs if needed
      let firstFrameUrl = await this.convertDataUrlToHttpUrl(options.firstFrameUrl);
      let lastFrameUrl = await this.convertDataUrlToHttpUrl(options.lastFrameUrl);

      // If we have data URLs, we might need to convert them or use a different approach
      if (firstFrameUrl.startsWith('data:') || lastFrameUrl.startsWith('data:')) {
        console.warn('Data URLs detected - Veo3.1 might not support data URLs directly');
        console.log('Attempting to use data URLs anyway - if this fails, we may need to upload to a temporary URL service');
      }

      console.log('Generating video with:', {
        firstFrameUrl: firstFrameUrl.substring(0, 50) + '...',
        lastFrameUrl: lastFrameUrl.substring(0, 50) + '...',
        prompt: options.prompt,
        duration: duration,
      });

      const result = await fal.subscribe("fal-ai/veo3.1/fast/first-last-frame-to-video", {
        input: {
          first_frame_url: firstFrameUrl,
          last_frame_url: lastFrameUrl,
          prompt: options.prompt.trim(),
          duration: duration,
          aspect_ratio: "auto",
          resolution: "720p",
          generate_audio: true,
        },
        logs: true,
        onQueueUpdate: (update: any) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log: any) => log.message).forEach(console.log);
          }
        },
      });

      console.log('Video generation result:', result.data);
      console.log('Request ID:', result.requestId);

      // Safely extract video data with fallbacks
      const videoData: any = result.data?.video || result.data || {};
      const videoUrl = videoData.url || videoData.video_url || videoData.output?.video_url;
      
      if (!videoUrl) {
        console.error('No video URL found in response:', result.data);
        throw new Error('Video generation succeeded but no video URL was returned');
      }

      return {
        video: {
          url: videoUrl,
          content_type: videoData.content_type || videoData.mime_type || 'video/mp4',
          width: videoData.width || 1280,
          height: videoData.height || 720,
          duration: videoData.duration || options.duration || 4,
        },
        timings: (result.data as any)?.timings,
        request_id: result.requestId,
      };
    } catch (error) {
      console.error('Video generation error:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('ValidationError')) {
          throw new Error(`Video generation validation failed: ${error.message}. This might be due to unsupported data URLs or invalid parameters.`);
        } else if (error.message.includes('first_frame_url') || error.message.includes('last_frame_url')) {
          throw new Error(`Video generation failed: Invalid frame URLs. Please ensure the images are properly formatted.`);
        } else if (error.message.includes('prompt')) {
          throw new Error(`Video generation failed: Invalid prompt. Please provide a valid description.`);
        } else {
          throw new Error(`Video generation failed: ${error.message}`);
        }
      } else {
        throw new Error(`Video generation failed: ${String(error)}`);
      }
    }
  }

  /**
   * Generate a video from scene analysis and drawing frames
   */
  async generateVideoFromScene(
    sceneAnalysis: SceneAnalysis,
    firstFrameUrl: string,
    lastFrameUrl: string
  ): Promise<FALVideoGenerationResult & { prompt: string }> {
    // Use intelligent prompt generation instead of simple template
    const prompt = await this.generateIntelligentVideoPrompt(sceneAnalysis);

    try {
      const result = await this.generateVideo({
        firstFrameUrl,
        lastFrameUrl,
        prompt,
        duration: 4,
      });
      return { ...result, prompt };
    } catch (error) {
      console.warn('Veo3.1 failed, falling back to image-to-video:', error);
      // Fallback to simpler image-to-video approach
      const result = await this.generateVideoFallback(firstFrameUrl, prompt);
      return { ...result, prompt };
    }
  }

  /**
   * Analyze both sketches and generate an intelligent animation prompt
   */
  async analyzeSketchesAndGeneratePrompt(
    firstFrameUrl: string,
    lastFrameUrl: string
  ): Promise<{ firstAnalysis: SceneAnalysis; secondAnalysis: SceneAnalysis; animationPrompt: string }> {
    if (!this.genAI) {
      throw new Error('AI service not initialized. Please set NEXT_PUBLIC_GEMINI_API_KEY environment variable.');
    }

    try {
      // Analyze both sketches
      const [firstAnalysis, secondAnalysis] = await Promise.all([
        this.analyzeDrawing(firstFrameUrl),
        this.analyzeDrawing(lastFrameUrl)
      ]);

      // Generate intelligent animation prompt
      const animationPrompt = await this.generateAnimationPrompt(firstAnalysis, secondAnalysis);

      return {
        firstAnalysis,
        secondAnalysis,
        animationPrompt
      };
    } catch (error) {
      console.error('Error analyzing sketches:', error);
      throw new Error(`Failed to analyze sketches: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate an intelligent animation prompt based on both scene analyses
   */
  private async generateAnimationPrompt(
    firstAnalysis: SceneAnalysis,
    secondAnalysis: SceneAnalysis
  ): Promise<string> {
    if (!this.genAI) {
      throw new Error('AI service not initialized.');
    }

    try {
      const prompt = `
        Based on these two scene analyses, create a detailed animation prompt for video generation that connects the two scenes with smooth, natural movement.

        FIRST SCENE ANALYSIS:
        Objects: ${firstAnalysis.objects.map(obj => `${obj.label} (${obj.type})`).join(', ')}
        Relationships: ${firstAnalysis.relationships.map(rel => rel.description).join(', ')}
        Suggested Animations: ${firstAnalysis.suggestedAnimations.map(anim => anim.description).join(', ')}
        Confidence: ${firstAnalysis.confidence}

        SECOND SCENE ANALYSIS:
        Objects: ${secondAnalysis.objects.map(obj => `${obj.label} (${obj.type})`).join(', ')}
        Relationships: ${secondAnalysis.relationships.map(rel => rel.description).join(', ')}
        Suggested Animations: ${secondAnalysis.suggestedAnimations.map(anim => anim.description).join(', ')}
        Confidence: ${secondAnalysis.confidence}

        Create an animation prompt that:
        1. Describes the transition from the first scene to the second scene
        2. Explains what objects move, change, or transform
        3. Suggests natural physics and movement patterns
        4. Creates a cohesive narrative flow
        5. Is suitable for children (ages 4-10)
        6. Uses engaging, descriptive language
        7. Keeps it under 100 words
        8. Focuses on smooth, natural animations

        The prompt should be written as if describing what the viewer will see in the animated video.
        Make it exciting and educational for kids!
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error generating animation prompt:', error);
      // Fallback to a generic prompt
      return this.createFallbackAnimationPrompt(firstAnalysis, secondAnalysis);
    }
  }

  /**
   * Create a fallback animation prompt if AI generation fails
   */
  private createFallbackAnimationPrompt(
    firstAnalysis: SceneAnalysis,
    secondAnalysis: SceneAnalysis
  ): string {
    const firstObjects = firstAnalysis.objects.map(obj => obj.label).join(', ');
    const secondObjects = secondAnalysis.objects.map(obj => obj.label).join(', ');
    
    return `A magical animation showing the transition from a scene with ${firstObjects} to a scene with ${secondObjects}. Objects move naturally with smooth, delightful motion that brings the story to life in an engaging way for children.`;
  }

  /**
   * Generate a creative game prompt for multiplayer drawing game
   */
  async generateGamePrompt(): Promise<string> {
    if (!this.genAI || !this.model) {
      // Fallback to predefined prompts if AI is not available
      const fallbackPrompts = [
        "A cat jumping into a tree sleeping",
        "A bird flying into a fish swimming",
        "A car driving into a rocket launching",
        "A dog running into a cat sleeping",
        "A flower growing into a butterfly flying",
        "A house building into a tree growing",
        "A robot dancing into a ball bouncing",
        "A sun shining into a moon glowing",
        "A train chugging into a plane flying",
        "A book opening into a story telling"
      ];
      return fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
    }

    try {
      const prompt = `Generate a creative, kid-friendly drawing prompt for a multiplayer game. 
      
      Format: "[Subject] [Action1] into [Subject] [Action2]"
      
      Requirements:
      - Use simple, recognizable objects (animals, vehicles, nature, everyday items)
      - Include fun, active verbs (jumping, flying, dancing, growing, etc.)
      - Make it imaginative and playful
      - Keep it under 8 words total
      - Examples: "A cat jumping into a tree sleeping", "A bird flying into a fish swimming"
      
      Generate one creative prompt:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const generatedPrompt = response.text().trim();
      
      // Clean up the response to ensure proper format
      return this.cleanGamePrompt(generatedPrompt);
    } catch (error) {
      console.error('Error generating game prompt:', error);
      // Fallback to predefined prompts
      const fallbackPrompts = [
        "A cat jumping into a tree sleeping",
        "A bird flying into a fish swimming",
        "A car driving into a rocket launching",
        "A dog running into a cat sleeping",
        "A flower growing into a butterfly flying"
      ];
      return fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
    }
  }

  /**
   * Clean and validate the generated game prompt
   */
  private cleanGamePrompt(prompt: string): string {
    // Remove quotes and extra whitespace
    let cleaned = prompt.replace(/['"]/g, '').trim();
    
    // Ensure it follows the format: [Subject] [Action] into [Subject] [Action]
    const parts = cleaned.split(' into ');
    if (parts.length === 2) {
      const firstPart = parts[0].trim();
      const secondPart = parts[1].trim();
      
      // Ensure both parts have at least 2 words
      if (firstPart.split(' ').length >= 2 && secondPart.split(' ').length >= 2) {
        return `${firstPart} into ${secondPart}`;
      }
    }
    
    // If format is wrong, return a fallback
    const fallbackPrompts = [
      "A cat jumping into a tree sleeping",
      "A bird flying into a fish swimming",
      "A car driving into a rocket launching"
    ];
    return fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
  }

  /**
   * Generate a video from drawing with custom prompt
   */
  async generateVideoFromDrawing(
    firstFrameUrl: string,
    lastFrameUrl: string,
    customPrompt?: string
  ): Promise<FALVideoGenerationResult> {
    const prompt = customPrompt || "A magical animation bringing the drawing to life with smooth, natural movement and delightful character interactions.";

    try {
      return await this.generateVideo({
        firstFrameUrl,
        lastFrameUrl,
        prompt,
        duration: 4,
      });
    } catch (error) {
      console.warn('Veo3.1 failed, falling back to image-to-video:', error);
      // Fallback to simpler image-to-video approach
      return await this.generateVideoFallback(firstFrameUrl, prompt);
    }
  }

  /**
   * Intelligently analyze sketches and generate video with AI-generated prompt
   */
  async generateIntelligentVideo(
    firstFrameUrl: string,
    lastFrameUrl: string
  ): Promise<{ videoResult: FALVideoGenerationResult; analysis: { firstAnalysis: SceneAnalysis; secondAnalysis: SceneAnalysis; animationPrompt: string } }> {
    try {
      // Step 1: Analyze both sketches and generate intelligent prompt
      console.log('Analyzing sketches and generating intelligent prompt...');
      const analysis = await this.analyzeSketchesAndGeneratePrompt(firstFrameUrl, lastFrameUrl);
      
      console.log('Generated animation prompt:', analysis.animationPrompt);
      console.log('First scene objects:', analysis.firstAnalysis.objects.map(obj => obj.label));
      console.log('Second scene objects:', analysis.secondAnalysis.objects.map(obj => obj.label));

      // Step 2: Generate video with the intelligent prompt
      console.log('Generating video with intelligent prompt...');
      const videoResult = await this.generateVideo({
        firstFrameUrl,
        lastFrameUrl,
        prompt: analysis.animationPrompt,
        duration: 6, // Longer duration for more complex animations
      });

      return {
        videoResult,
        analysis
      };
    } catch (error) {
      console.error('Intelligent video generation failed:', error);
      
      // Fallback to basic video generation
      console.log('Falling back to basic video generation...');
      const fallbackPrompt = "A magical animation bringing the drawings to life with smooth, natural movement and delightful character interactions.";
      
      const videoResult = await this.generateVideo({
        firstFrameUrl,
        lastFrameUrl,
        prompt: fallbackPrompt,
        duration: 4,
      });

      return {
        videoResult,
        analysis: {
          firstAnalysis: { objects: [], relationships: [], suggestedAnimations: [], confidence: 0.5 },
          secondAnalysis: { objects: [], relationships: [], suggestedAnimations: [], confidence: 0.5 },
          animationPrompt: fallbackPrompt
        }
      };
    }
  }

  /**
   * Fallback video generation using image-to-video
   */
  private async generateVideoFallback(imageUrl: string, prompt: string): Promise<FALVideoGenerationResult> {
    try {
      // Check if we have a data URL and warn about potential issues
      if (imageUrl.startsWith('data:')) {
        console.warn('Fallback video generation with data URL - this might not work with all models');
      }
      
      const result = await fal.subscribe('fal-ai/minimax/video-01-live/image-to-video', {
        input: {
          image_url: imageUrl,
          prompt: prompt,
        },
        logs: true,
        onQueueUpdate: (update: any) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log: any) => log.message).forEach(console.log);
          }
        },
      });

      console.log('Fallback video generation result:', result.data);

      // Safely extract video data with fallbacks
      const videoData: any = result.data?.video || result.data || {};
      const videoUrl = videoData.url || videoData.video_url || videoData.output?.video_url;
      
      if (!videoUrl) {
        console.error('No video URL found in fallback response:', result.data);
        throw new Error('Fallback video generation succeeded but no video URL was returned');
      }

      return {
        video: {
          url: videoUrl,
          content_type: videoData.content_type || videoData.mime_type || 'video/mp4',
          width: videoData.width || 1280,
          height: videoData.height || 720,
          duration: videoData.duration || 4,
        },
        timings: (result.data as any)?.timings,
        request_id: result.requestId,
      };
    } catch (error) {
      console.error('Fallback video generation failed:', error);
      
      // Provide more specific error messages for fallback
      if (error instanceof Error) {
        if (error.message.includes('ValidationError')) {
          throw new Error(`Fallback video generation validation failed: ${error.message}. Data URLs might not be supported by this model.`);
        } else if (error.message.includes('image_url')) {
          throw new Error(`Fallback video generation failed: Invalid image URL. Please ensure the image is properly formatted.`);
        } else {
          throw new Error(`Fallback video generation failed: ${error.message}`);
        }
      } else {
        throw new Error(`Fallback video generation failed: ${String(error)}`);
      }
    }
  }

  /**
   * Test the Veo3.1 model with sample data
   */
  async testVeo3Model(): Promise<boolean> {
    if (!this.falConfigured) {
      console.warn('FAL AI not configured');
      return false;
    }

    try {
      // Use sample images from the FAL documentation
      const result = await fal.subscribe("fal-ai/veo3.1/fast/first-last-frame-to-video", {
        input: {
          first_frame_url: "https://storage.googleapis.com/falserverless/example_inputs/veo31-flf2v-input-1.jpeg",
          last_frame_url: "https://storage.googleapis.com/falserverless/example_inputs/veo31-flf2v-input-2.jpeg",
          prompt: "A simple test animation with smooth movement between frames"
        },
        logs: true,
        onQueueUpdate: (update: any) => {
          console.log('Test queue update:', update);
        },
      });

      console.log('Veo3.1 test successful:', result.data);
      return true;
    } catch (error) {
      console.error('Veo3.1 test failed:', error);
      return false;
    }
  }

  /**
   * Generate an intelligent video prompt using Gemini AI
   */
  async generateIntelligentVideoPrompt(sceneAnalysis: SceneAnalysis): Promise<string> {
    if (!this.genAI || !this.model) {
      // Fallback to template-based prompt if AI is not available
      return this.createVideoPromptFromScene(sceneAnalysis);
    }

    try {
      const prompt = `
        Based on this scene analysis, create a detailed animation prompt for video generation that will bring this children's drawing to life.

        SCENE ANALYSIS:
        Objects: ${sceneAnalysis.objects.map(obj => `${obj.label} (${obj.type}, ${obj.color})`).join(', ')}
        Relationships: ${sceneAnalysis.relationships.map(rel => rel.description).join(', ')}
        Suggested Animations: ${sceneAnalysis.suggestedAnimations.map(anim => anim.description).join(', ')}
        Confidence: ${sceneAnalysis.confidence}

        Create an animation prompt that:
        1. Describes what the viewer will see in the animated video
        2. Explains how objects move, change, or transform
        3. Suggests natural physics and movement patterns
        4. Creates an engaging narrative flow
        5. Is suitable for children (ages 4-10)
        6. Uses engaging, descriptive language
        7. Keeps it under 100 words
        8. Focuses on smooth, natural animations
        9. Makes it exciting and educational

        The prompt should be written as if describing what the viewer will see in the animated video.
        Make it exciting and educational for kids!
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    } catch (error) {
      console.error('Error generating intelligent video prompt:', error);
      // Fallback to template-based prompt
      return this.createVideoPromptFromScene(sceneAnalysis);
    }
  }

  /**
   * Create a descriptive prompt from scene analysis for video generation
   */
  private createVideoPromptFromScene(sceneAnalysis: SceneAnalysis): string {
    const objects = sceneAnalysis.objects.map(obj => 
      `${obj.label} (${obj.color})`
    ).join(', ');

    const relationships = sceneAnalysis.relationships.map(rel => 
      `${rel.description}`
    ).join(', ');

    const animations = sceneAnalysis.suggestedAnimations.map(anim => 
      `${anim.description}`
    ).join(', ');

    return `A magical animation bringing this children's drawing to life featuring: ${objects}. ${relationships}. ${animations}. Smooth, natural movement with delightful character interactions, colorful and educational animation style suitable for kids.`;
  }

  /**
   * Create a descriptive prompt from scene analysis
   */
  private createImagePromptFromScene(sceneAnalysis: SceneAnalysis): string {
    const objects = sceneAnalysis.objects.map(obj => 
      `${obj.label} (${obj.color})`
    ).join(', ');

    const relationships = sceneAnalysis.relationships.map(rel => 
      `${rel.description}`
    ).join(', ');

    return `A children's drawing style illustration featuring: ${objects}. ${relationships}. Colorful, simple, and educational art style suitable for kids.`;
  }
}

export const aiService = new AIService();
