"use client";

import React, { useState } from 'react';
import IntroPage from '@/components/IntroPage';
import SceneDrawer from '@/components/SceneDrawer';
import VideoGenerator from '@/components/VideoGenerator';

type AppState = 'intro' | 'scene1' | 'scene2' | 'video';

export default function Home() {
  const [appState, setAppState] = useState<AppState>('intro');
  const [firstSceneData, setFirstSceneData] = useState<string>('');
  const [secondSceneData, setSecondSceneData] = useState<string>('');
  const [firstDescription, setFirstDescription] = useState<string>('');
  const [secondDescription, setSecondDescription] = useState<string>('');

  const handleStart = () => {
    setAppState('scene1');
  };

  const handleScene1Complete = (sceneData: string, description: string) => {
    setFirstSceneData(sceneData);
    setFirstDescription(description);
    setAppState('scene2');
  };

  const handleScene2Complete = (sceneData: string, description: string) => {
    setSecondSceneData(sceneData);
    setSecondDescription(description);
    setAppState('video');
  };

  const handleBackToScene1 = () => {
    setAppState('scene1');
  };

  const handleBackToScene2 = () => {
    setAppState('scene2');
  };

  const handleRestart = () => {
    setAppState('intro');
    setFirstSceneData('');
    setSecondSceneData('');
    setFirstDescription('');
    setSecondDescription('');
  };

  return (
    <main className="min-h-screen">
      {appState === 'intro' && <IntroPage onStart={handleStart} />}
      {appState === 'scene1' && (
        <SceneDrawer 
          sceneNumber={1} 
          onSceneComplete={handleScene1Complete}
        />
      )}
      {appState === 'scene2' && (
        <SceneDrawer 
          sceneNumber={2} 
          onSceneComplete={handleScene2Complete}
          onBack={handleBackToScene1}
        />
      )}
      {appState === 'video' && (
        <VideoGenerator
          firstSceneData={firstSceneData}
          secondSceneData={secondSceneData}
          firstDescription={firstDescription}
          secondDescription={secondDescription}
          onBack={handleBackToScene2}
          onRestart={handleRestart}
        />
      )}
    </main>
  );
}