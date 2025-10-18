// Core types for the Draw2Life application

export interface Project {
  id: string;
  title: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  collaborators: Collaborator[];
}

export interface Collaborator {
  id: string;
  projectId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  cursorPosition?: CursorPosition;
  lastSeen: Date;
}

export interface CursorPosition {
  x: number;
  y: number;
  tool: DrawingTool;
}

export interface Scene {
  id: string;
  projectId: string;
  sceneData: SceneData;
  layers: Layer[];
  metadata: SceneMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface SceneData {
  width: number;
  height: number;
  backgroundColor: string;
  objects: SceneObject[];
}

export interface SceneObject {
  id: string;
  type: 'shape' | 'image' | 'text' | 'group';
  shapeType?: 'rectangle' | 'circle' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: number[];
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  visible: boolean;
  children?: SceneObject[];
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  objects: string[]; // Object IDs
}

export interface SceneMetadata {
  title: string;
  description?: string;
  tags: string[];
  animationSettings?: AnimationSettings;
}

export interface AnimationSettings {
  duration: number;
  loop: boolean;
  easing: string;
  keyframes: Keyframe[];
}

export interface Keyframe {
  time: number;
  properties: Partial<SceneObject>;
}

export type DrawingTool = 
  | 'pen'
  | 'eraser'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'text'
  | 'select'
  | 'move'
  | 'fill';

export interface DrawingState {
  tool: DrawingTool;
  color: string;
  strokeWidth: number;
  opacity: number;
  selectedObjects: string[];
  clipboard: SceneObject[];
}

export interface VoiceTutoringSession {
  id: string;
  projectId: string;
  isActive: boolean;
  lastMessage?: string;
  createdAt: Date;
}

export interface VideoExport {
  id: string;
  projectId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface SceneAnalysis {
  objects: SceneAnalysisObject[];
  relationships: ObjectRelationship[];
  suggestedAnimations: AnimationSuggestion[];
  confidence: number;
}

export interface SceneAnalysisObject {
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
