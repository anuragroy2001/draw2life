import { gsap } from 'gsap';
import { SceneObject, AnimationSuggestion } from '@/types';

export interface AnimationConfig {
  duration: number;
  ease: string;
  loop: boolean;
  yoyo: boolean;
  delay?: number;
}

export interface AnimationInstance {
  id: string;
  objectId: string;
  type: string;
  isPlaying: boolean;
  isPaused: boolean;
  progress: number;
  config: AnimationConfig;
}

class AnimationEngine {
  private animations: Map<string, AnimationInstance> = new Map();
  private timeline: gsap.core.Timeline | null = null;
  private isPlaying = false;
  private isPaused = false;

  // Animation presets for different object types
  private animationPresets = {
    bounce: {
      duration: 1,
      ease: 'bounce.out',
      loop: true,
      yoyo: false,
    },
    float: {
      duration: 2,
      ease: 'sine.inOut',
      loop: true,
      yoyo: true,
    },
    rotate: {
      duration: 3,
      ease: 'none',
      loop: true,
      yoyo: false,
    },
    scale: {
      duration: 1.5,
      ease: 'elastic.out',
      loop: true,
      yoyo: true,
    },
    move: {
      duration: 2,
      ease: 'power2.inOut',
      loop: true,
      yoyo: true,
    },
    fade: {
      duration: 1,
      ease: 'power2.inOut',
      loop: true,
      yoyo: true,
    },
  };

  createAnimation(
    objectId: string,
    animationType: string,
    element: HTMLElement,
    config?: Partial<AnimationConfig>
  ): AnimationInstance {
    const preset = this.animationPresets[animationType as keyof typeof this.animationPresets];
    const finalConfig: AnimationConfig = {
      ...preset,
      ...config,
    };

    const animationId = `${objectId}_${animationType}_${Date.now()}`;
    
    const animation: AnimationInstance = {
      id: animationId,
      objectId,
      type: animationType,
      isPlaying: false,
      isPaused: false,
      progress: 0,
      config: finalConfig,
    };

    this.animations.set(animationId, animation);
    return animation;
  }

  applyAnimation(animation: AnimationInstance, element: HTMLElement): void {
    const { type, config } = animation;
    
    // Clear any existing animations on this element
    gsap.killTweensOf(element);

    switch (type) {
      case 'bounce':
        gsap.to(element, {
          y: -20,
          duration: config.duration,
          ease: config.ease,
          repeat: config.loop ? -1 : 0,
          yoyo: config.yoyo,
          delay: config.delay,
          onUpdate: () => {
            const tween = gsap.getTweensOf(element)[0];
            animation.progress = tween ? (tween.progress as unknown as number) : 0;
          },
        });
        break;

      case 'float':
        gsap.to(element, {
          y: -15,
          duration: config.duration,
          ease: config.ease,
          repeat: config.loop ? -1 : 0,
          yoyo: config.yoyo,
          delay: config.delay,
          onUpdate: () => {
            const tween = gsap.getTweensOf(element)[0];
            animation.progress = tween ? (tween.progress as unknown as number) : 0;
          },
        });
        break;

      case 'rotate':
        gsap.to(element, {
          rotation: 360,
          duration: config.duration,
          ease: config.ease,
          repeat: config.loop ? -1 : 0,
          yoyo: config.yoyo,
          delay: config.delay,
          onUpdate: () => {
            const tween = gsap.getTweensOf(element)[0];
            animation.progress = tween ? (tween.progress as unknown as number) : 0;
          },
        });
        break;

      case 'scale':
        gsap.to(element, {
          scale: 1.2,
          duration: config.duration,
          ease: config.ease,
          repeat: config.loop ? -1 : 0,
          yoyo: config.yoyo,
          delay: config.delay,
          onUpdate: () => {
            const tween = gsap.getTweensOf(element)[0];
            animation.progress = tween ? (tween.progress as unknown as number) : 0;
          },
        });
        break;

      case 'move':
        gsap.to(element, {
          x: 50,
          duration: config.duration,
          ease: config.ease,
          repeat: config.loop ? -1 : 0,
          yoyo: config.yoyo,
          delay: config.delay,
          onUpdate: () => {
            const tween = gsap.getTweensOf(element)[0];
            animation.progress = tween ? (tween.progress as unknown as number) : 0;
          },
        });
        break;

      case 'fade':
        gsap.to(element, {
          opacity: 0.3,
          duration: config.duration,
          ease: config.ease,
          repeat: config.loop ? -1 : 0,
          yoyo: config.yoyo,
          delay: config.delay,
          onUpdate: () => {
            const tween = gsap.getTweensOf(element)[0];
            animation.progress = tween ? (tween.progress as unknown as number) : 0;
          },
        });
        break;

      default:
        console.warn(`Unknown animation type: ${type}`);
    }

    animation.isPlaying = true;
  }

  createTimeline(animations: AnimationSuggestion[]): gsap.core.Timeline {
    this.timeline = gsap.timeline();
    
    animations.forEach((suggestion, index) => {
      const element = document.getElementById(`object-${suggestion.objectId}`);
      if (!element) return;

      const preset = this.animationPresets[suggestion.animationType as keyof typeof this.animationPresets];
      const config: AnimationConfig = {
        ...preset,
        duration: suggestion.parameters.duration || preset.duration,
        delay: index * 0.2, // Stagger animations
      };

      switch (suggestion.animationType) {
        case 'bounce':
          this.timeline!.to(element, {
            y: -20,
            duration: config.duration,
            ease: config.ease,
            repeat: config.loop ? -1 : 0,
            yoyo: config.yoyo,
          }, config.delay);
          break;

        case 'float':
          this.timeline!.to(element, {
            y: -15,
            duration: config.duration,
            ease: config.ease,
            repeat: config.loop ? -1 : 0,
            yoyo: config.yoyo,
          }, config.delay);
          break;

        case 'rotate':
          this.timeline!.to(element, {
            rotation: 360,
            duration: config.duration,
            ease: config.ease,
            repeat: config.loop ? -1 : 0,
            yoyo: config.yoyo,
          }, config.delay);
          break;

        case 'scale':
          this.timeline!.to(element, {
            scale: 1.2,
            duration: config.duration,
            ease: config.ease,
            repeat: config.loop ? -1 : 0,
            yoyo: config.yoyo,
          }, config.delay);
          break;

        case 'move':
          this.timeline!.to(element, {
            x: 50,
            duration: config.duration,
            ease: config.ease,
            repeat: config.loop ? -1 : 0,
            yoyo: config.yoyo,
          }, config.delay);
          break;

        case 'fade':
          this.timeline!.to(element, {
            opacity: 0.3,
            duration: config.duration,
            ease: config.ease,
            repeat: config.loop ? -1 : 0,
            yoyo: config.yoyo,
          }, config.delay);
          break;
      }
    });

    return this.timeline;
  }

  playTimeline(): void {
    if (this.timeline) {
      this.timeline.play();
      this.isPlaying = true;
      this.isPaused = false;
    }
  }

  pauseTimeline(): void {
    if (this.timeline) {
      this.timeline.pause();
      this.isPaused = true;
      this.isPlaying = false;
    }
  }

  stopTimeline(): void {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
      this.isPlaying = false;
      this.isPaused = false;
    }
  }

  resetTimeline(): void {
    if (this.timeline) {
      this.timeline.restart();
    }
  }

  getTimelineProgress(): number {
    if (!this.timeline) return 0;
    return this.timeline.progress();
  }

  setTimelineProgress(progress: number): void {
    if (this.timeline) {
      this.timeline.progress(progress);
    }
  }

  // Utility methods
  stopAllAnimations(): void {
    gsap.killTweensOf('*');
    this.animations.clear();
    this.stopTimeline();
  }

  pauseAllAnimations(): void {
    gsap.globalTimeline.pause();
    this.isPaused = true;
    this.isPlaying = false;
  }

  resumeAllAnimations(): void {
    gsap.globalTimeline.resume();
    this.isPaused = false;
    this.isPlaying = true;
  }

  getAnimationState(): {
    isPlaying: boolean;
    isPaused: boolean;
    progress: number;
    animations: AnimationInstance[];
  } {
    return {
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      progress: this.getTimelineProgress(),
      animations: Array.from(this.animations.values()),
    };
  }
}

export const animationEngine = new AnimationEngine();
