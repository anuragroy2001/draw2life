"use client";

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Rect, Circle, Line, Text, Group, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { DrawingTool, SceneObject, DrawingState } from '@/types';
import { generateId, getRandomColor } from '@/lib/utils';

interface DrawingCanvasProps {
  width: number;
  height: number;
  onSceneChange?: (objects: SceneObject[]) => void;
  initialObjects?: SceneObject[];
  drawingState?: DrawingState;
}

export default function DrawingCanvas({
  width,
  height,
  onSceneChange,
  initialObjects = [],
  drawingState: externalDrawingState,
}: DrawingCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const [objects, setObjects] = useState<SceneObject[]>(initialObjects);
  const [drawingState, setDrawingState] = useState<DrawingState>(
    externalDrawingState || {
      tool: 'pen',
      color: '#000000',
      strokeWidth: 2,
      opacity: 1,
      selectedObjects: [],
      clipboard: [],
    }
  );

  // Update local state when external state changes
  useEffect(() => {
    if (externalDrawingState) {
      setDrawingState(externalDrawingState);
    }
  }, [externalDrawingState]);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<number[]>([]);
  const [currentShape, setCurrentShape] = useState<SceneObject | null>(null);
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<{ x: number; y: number } | null>(null);
  const [pathSegments, setPathSegments] = useState<SceneObject[]>([]);

  // Notify parent of scene changes (only when objects actually change)
  useEffect(() => {
    if (objects.length > 0) {
      onSceneChange?.(objects);
    }
  }, [objects.length]); // Only depend on length to avoid infinite loops

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    const { tool, color, strokeWidth, opacity } = drawingState;

    switch (tool) {
      case 'pen':
        setIsDrawing(true);
        setCurrentPath([pos.x, pos.y]);
        setPathSegments([]); // Clear any previous path segments
        break;

      case 'eraser':
        // For eraser, we'll start drawing an eraser path
        setIsDrawing(true);
        setCurrentPath([pos.x, pos.y]);
        // Immediately start erasing at the click point
        handleEraserAtPoint(pos.x, pos.y);
        break;

      case 'rectangle':
        setIsDrawing(true);
        const rect = {
          id: generateId(),
          type: 'shape' as const,
          shapeType: 'rectangle' as const,
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
          fill: 'transparent',
          stroke: color,
          strokeWidth,
          opacity,
          visible: true,
        };
        setCurrentShape(rect);
        setObjects(prev => [...prev, rect]);
        break;

      case 'circle':
        setIsDrawing(true);
        const circle = {
          id: generateId(),
          type: 'shape' as const,
          shapeType: 'circle' as const,
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
          fill: 'transparent',
          stroke: color,
          strokeWidth,
          opacity,
          visible: true,
        };
        setCurrentShape(circle);
        setObjects(prev => [...prev, circle]);
        break;

      case 'line':
        if (!lineStart) {
          setLineStart({ x: pos.x, y: pos.y });
        } else {
          const line = {
            id: generateId(),
            type: 'shape' as const,
            shapeType: 'line' as const,
            x: lineStart.x,
            y: lineStart.y,
            points: [0, 0, pos.x - lineStart.x, pos.y - lineStart.y],
            stroke: color,
            strokeWidth,
            opacity,
            visible: true,
          };
          setObjects(prev => [...prev, line]);
          setLineStart(null);
          setCurrentMousePos(null);
        }
        break;

      case 'fill':
        // Fill bucket - fill the area with the selected color
        // For now, we'll create a filled rectangle at the click point
        // In a more advanced implementation, this would use flood fill algorithm
        const fillRect = {
          id: generateId(),
          type: 'shape' as const,
          shapeType: 'rectangle' as const,
          x: pos.x - 10,
          y: pos.y - 10,
          width: 20,
          height: 20,
          fill: color,
          stroke: 'transparent',
          strokeWidth: 0,
          opacity,
          visible: true,
        };
        setObjects(prev => [...prev, fillRect]);
        break;

      case 'text':
        const text = {
          id: generateId(),
          type: 'text' as const,
          x: pos.x,
          y: pos.y,
          fill: color,
          fontSize: 16,
          opacity,
          visible: true,
          text: 'Text', // Add default text
        };
        setObjects(prev => [...prev, text]);
        break;
    }
  }, [drawingState]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;

    const { tool } = drawingState;

    // Handle line tool preview
    if (tool === 'line' && lineStart) {
      // Update the current mouse position for line preview
      setCurrentMousePos({ x: pos.x, y: pos.y });
      return;
    }

    if (!isDrawing) return;

    if (tool === 'pen') {
      setCurrentPath(prev => {
        const newPath = [...prev, pos.x, pos.y];
        // If path gets too long, finalize it and start a new one
        if (newPath.length > 1000) {
          // Create a line from the current path
          const line = {
            id: generateId(),
            type: 'shape' as const,
            shapeType: 'line' as const,
            x: 0,
            y: 0,
            points: prev,
            stroke: drawingState.color,
            strokeWidth: drawingState.strokeWidth,
            opacity: drawingState.opacity,
            visible: true,
          };
          setPathSegments(prevSegments => [...prevSegments, line]);
          // Start new path with current position
          return [pos.x, pos.y];
        }
        return newPath;
      });
    } else if (tool === 'eraser') {
      setCurrentPath(prev => {
        const newPath = [...prev, pos.x, pos.y];
        // If path gets too long, finalize it and start a new one
        if (newPath.length > 2000) {
          // Start new path with current position
          return [pos.x, pos.y];
        }
        return newPath;
      });
      // Continuously erase while dragging
      handleEraserAtPoint(pos.x, pos.y);
    } else if ((tool === 'rectangle' || tool === 'circle') && currentShape) {
      const newWidth = pos.x - currentShape.x;
      const newHeight = pos.y - currentShape.y;
      
      // Calculate the actual position and dimensions for proper dragging in any direction
      const newX = newWidth < 0 ? pos.x : currentShape.x;
      const newY = newHeight < 0 ? pos.y : currentShape.y;
      const newWidthAbs = Math.abs(newWidth);
      const newHeightAbs = Math.abs(newHeight);
      
      setObjects(prev => prev.map(obj => 
        obj.id === currentShape.id 
          ? { 
              ...obj, 
              x: newX,
              y: newY,
              width: newWidthAbs, 
              height: newHeightAbs 
            }
          : obj
      ));
    }
  }, [isDrawing, drawingState.tool, currentShape, lineStart]);

  // Function to check if a point is within eraser range
  const isPointInEraserRange = useCallback((point: { x: number; y: number }, eraserPath: number[], eraserWidth: number) => {
    for (let i = 0; i < eraserPath.length - 1; i += 2) {
      const eraserX = eraserPath[i];
      const eraserY = eraserPath[i + 1];
      const distance = Math.sqrt(Math.pow(point.x - eraserX, 2) + Math.pow(point.y - eraserY, 2));
      if (distance <= eraserWidth / 2) {
        return true;
      }
    }
    return false;
  }, []);

  // Function to handle eraser at a specific point
  const handleEraserAtPoint = useCallback((x: number, y: number) => {
    const eraserWidth = drawingState.strokeWidth * 2;
    setObjects(prev => prev.filter(obj => {
      if (obj.type === 'shape' && obj.points) {
        // Check if any point in the line is within eraser range
        for (let i = 0; i < obj.points.length - 1; i += 2) {
          if (isPointInEraserRange({ x: obj.points[i], y: obj.points[i + 1] }, [x, y], eraserWidth)) {
            return false; // Remove this object
          }
        }
      } else if (obj.type === 'shape' && obj.width && obj.height) {
        // Check if shape center is within eraser range
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        if (isPointInEraserRange({ x: centerX, y: centerY }, [x, y], eraserWidth)) {
          return false; // Remove this object
        }
      }
      return true; // Keep this object
    }));
  }, [drawingState.strokeWidth, isPointInEraserRange]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing) {
      if ((drawingState.tool === 'pen' || drawingState.tool === 'eraser') && currentPath.length > 0) {
        if (drawingState.tool === 'pen') {
          // Add all path segments to objects
          if (pathSegments.length > 0) {
            setObjects(prev => [...prev, ...pathSegments]);
            setPathSegments([]);
          }
          // Add the final current path if it has points
          if (currentPath.length > 0) {
            const line = {
              id: generateId(),
              type: 'shape' as const,
              shapeType: 'line' as const,
              x: 0,
              y: 0,
              points: currentPath,
              stroke: drawingState.color,
              strokeWidth: drawingState.strokeWidth,
              opacity: drawingState.opacity,
              visible: true,
            };
            setObjects(prev => [...prev, line]);
          }
        } else if (drawingState.tool === 'eraser') {
          // For eraser, check collision with existing objects and remove them
          const eraserWidth = drawingState.strokeWidth * 2;
          setObjects(prev => prev.filter(obj => {
            if (obj.type === 'shape' && obj.points) {
              // Check if any point in the line is within eraser range
              for (let i = 0; i < obj.points.length - 1; i += 2) {
                if (isPointInEraserRange({ x: obj.points[i], y: obj.points[i + 1] }, currentPath, eraserWidth)) {
                  return false; // Remove this object
                }
              }
            } else if (obj.type === 'shape' && obj.width && obj.height) {
              // Check if shape center is within eraser range
              const centerX = obj.x + obj.width / 2;
              const centerY = obj.y + obj.height / 2;
              if (isPointInEraserRange({ x: centerX, y: centerY }, currentPath, eraserWidth)) {
                return false; // Remove this object
              }
            }
            return true; // Keep this object
          }));
        }
        setCurrentPath([]);
        setPathSegments([]); // Clear path segments
      } else if (drawingState.tool === 'rectangle' || drawingState.tool === 'circle') {
        // Finalize the shape
        setCurrentShape(null);
      }
    }
    setIsDrawing(false);
  }, [isDrawing, drawingState.tool, drawingState.color, drawingState.strokeWidth, drawingState.opacity, currentPath, isPointInEraserRange]);

  const handleMouseLeave = useCallback(() => {
    // Clean up line preview when mouse leaves canvas
    if (drawingState.tool === 'line' && lineStart) {
      setCurrentMousePos(null);
    }
  }, [drawingState.tool, lineStart]);

  const handleObjectClick = useCallback((objectId: string) => {
    if (drawingState.tool === 'select') {
      setDrawingState(prev => ({
        ...prev,
        selectedObjects: prev.selectedObjects.includes(objectId)
          ? prev.selectedObjects.filter(id => id !== objectId)
          : [...prev.selectedObjects, objectId],
      }));
    }
  }, [drawingState.tool]);

  const renderObject = (obj: SceneObject) => {
    const commonProps = {
      id: obj.id,
      x: obj.x,
      y: obj.y,
      fill: obj.fill,
      stroke: obj.stroke,
      strokeWidth: obj.strokeWidth,
      opacity: obj.opacity,
      visible: obj.visible,
      onClick: () => handleObjectClick(obj.id),
      draggable: drawingState.tool === 'move',
    };

    switch (obj.type) {
      case 'shape':
        if ('points' in obj && obj.points) {
          return <Line {...commonProps} points={obj.points as number[]} />;
        } else if ('width' in obj && 'height' in obj) {
          // Check if this is a circle by looking at the shape type
          if (obj.shapeType === 'circle') {
            const radius = Math.min(obj.width || 0, obj.height || 0) / 2;
            return <Circle {...commonProps} radius={radius} />;
          } else {
            return <Rect {...commonProps} width={obj.width || 0} height={obj.height || 0} />;
          }
        }
        return null;

      case 'text':
        return (
          <Text
            {...commonProps}
            text={obj.text || 'Text'}
            fontSize={16}
            fontFamily="Arial"
          />
        );

      default:
        return null;
    }
  };

  // Get cursor style based on current tool
  const getCursorStyle = () => {
    switch (drawingState.tool) {
      case 'pen':
        return 'crosshair';
      case 'eraser':
        return 'grab';
      case 'fill':
        return 'grab';
      case 'line':
        return 'crosshair';
      case 'rectangle':
      case 'circle':
        return 'crosshair';
      case 'text':
        return 'text';
      case 'select':
        return 'default';
      case 'move':
        return 'move';
      default:
        return 'default';
    }
  };

  return (
    <div className="relative w-full h-full">
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="border border-gray-300 rounded-lg"
        style={{ cursor: getCursorStyle() }}
      >
        <Layer>
          {/* White background */}
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill="white"
            stroke="transparent"
          />
          
          {objects.map((obj, index) => (
            <React.Fragment key={obj.id || `obj-${index}`}>
              {renderObject(obj)}
            </React.Fragment>
          ))}
          {pathSegments.map((obj, index) => (
            <React.Fragment key={`segment-${obj.id || index}`}>
              {renderObject(obj)}
            </React.Fragment>
          ))}
          {currentPath.length > 0 && (
            <Line
              key="current-path"
              points={currentPath}
              stroke={drawingState.tool === 'eraser' ? 'rgba(255, 255, 255, 0.8)' : drawingState.color}
              strokeWidth={drawingState.tool === 'eraser' ? drawingState.strokeWidth * 2 : drawingState.strokeWidth}
              opacity={drawingState.tool === 'eraser' ? 0.5 : drawingState.opacity}
              lineCap="round"
              lineJoin="round"
            />
          )}
          {lineStart && drawingState.tool === 'line' && currentMousePos && (
            <Line
              key="line-preview"
              points={[lineStart.x, lineStart.y, currentMousePos.x, currentMousePos.y]}
              stroke={drawingState.color}
              strokeWidth={drawingState.strokeWidth}
              opacity={drawingState.opacity * 0.7}
              dash={[8, 4]}
              lineCap="round"
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
