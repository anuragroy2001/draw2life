"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import GameOrchestrator from '../../components/game/GameOrchestrator';

export default function GamePage() {
  const router = useRouter();

  const handleBackToHome = () => {
    router.push('/');
  };

  return <GameOrchestrator onBackToHome={handleBackToHome} />;
}
