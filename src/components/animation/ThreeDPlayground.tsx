"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Box, Plane, Text } from '@react-three/drei';
import { motion } from 'framer-motion';
import { SceneObject } from '@/types';
import { cn } from '@/lib/utils';

interface ThreeDPlaygroundProps {
  objects: SceneObject[];
  isVisible: boolean;
  onClose: () => void;
}

// Animated 3D Object Component
function AnimatedObject({ object, index }: { object: SceneObject; index: number }) {
  const meshRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime + index) * 0.1;
      
      // Rotation based on object type
      if (object.type === 'shape') {
        meshRef.current.rotation.y += 0.01;
      }
    }
  });

  const getGeometry = () => {
    switch (object.type) {
      case 'shape':
        if (object.width && object.height && Math.abs(object.width - object.height) < 10) {
          return <Sphere args={[0.5, 16, 16]} />;
        }
        return <Box args={[1, 1, 1]} />;
      default:
        return <Sphere args={[0.5, 16, 16]} />;
    }
  };

  return (
    <mesh
      ref={meshRef}
      position={[object.x / 100 - 5, 0, object.y / 100 - 3]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      scale={hovered ? 1.2 : 1}
    >
      {getGeometry()}
      <meshStandardMaterial
        color={object.fill || '#ff6b6b'}
        roughness={0.3}
        metalness={0.1}
        transparent
        opacity={object.opacity || 1}
      />
    </mesh>
  );
}

// Camera Controller
function CameraController() {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return null;
}

// Scene Lighting
function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
    </>
  );
}

// Ground Plane
function GroundPlane() {
  return (
    <Plane
      args={[20, 20]}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -2, 0]}
    >
      <meshStandardMaterial color="#f0f0f0" />
    </Plane>
  );
}

export default function ThreeDPlayground({ objects, isVisible, onClose }: ThreeDPlaygroundProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time for 3D scene
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">3D Playground</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 3D Canvas */}
        <div className="flex-1 relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading 3D scene...</p>
              </div>
            </div>
          ) : (
            <Canvas
              camera={{ position: [0, 5, 10], fov: 60 }}
              style={{ background: 'linear-gradient(to bottom, #87CEEB, #98FB98)' }}
            >
              <CameraController />
              <SceneLighting />
              <GroundPlane />
              
              {/* Render 3D objects */}
              {objects.map((object, index) => (
                <AnimatedObject key={object.id} object={object} index={index} />
              ))}

              {/* Welcome Text */}
              <Text
                position={[0, 3, 0]}
                fontSize={1}
                color="#333"
                anchorX="center"
                anchorY="middle"
              >
                Your Drawing in 3D!
              </Text>

              <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                minDistance={5}
                maxDistance={20}
              />
            </Canvas>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p>• Drag to rotate • Scroll to zoom • Right-click to pan</p>
              <p>• Objects float and rotate automatically</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Back to 2D
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
