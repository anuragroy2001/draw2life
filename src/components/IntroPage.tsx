"use client";

import React, { useState, useEffect } from 'react';
import { Sparkles, Palette, Video, Wand2, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface IntroPageProps {
  onStart: () => void;
}

export default function IntroPage({ onStart }: IntroPageProps) {
  const [displayedTitle, setDisplayedTitle] = useState('');
  const [displayedSubtitle, setDisplayedSubtitle] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const router = useRouter();
  
  const title = 'Draw2Life';
  const subtitle = 'Ready to make your sketch come to life?';

  useEffect(() => {
    let titleIndex = 0;
    let subtitleIndex = 0;
    let titleTimeout: NodeJS.Timeout;
    let subtitleTimeout: NodeJS.Timeout;

    // Type the title
    const typeTitle = () => {
      if (titleIndex < title.length) {
        setDisplayedTitle(title.slice(0, titleIndex + 1));
        titleIndex++;
        titleTimeout = setTimeout(typeTitle, 150);
      } else {
        // Start typing subtitle after a short delay
        setTimeout(() => {
          const typeSubtitle = () => {
            if (subtitleIndex < subtitle.length) {
              setDisplayedSubtitle(subtitle.slice(0, subtitleIndex + 1));
              subtitleIndex++;
              subtitleTimeout = setTimeout(typeSubtitle, 50);
            } else {
              setIsTyping(false);
            }
          };
          typeSubtitle();
        }, 500);
      }
    };

    typeTitle();

    return () => {
      clearTimeout(titleTimeout);
      clearTimeout(subtitleTimeout);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-4xl mx-auto text-center">
        {/* Main Title */}
        <div className="mb-12">
          <h1 className="text-6xl md:text-8xl font-soria-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 mb-6">
            {displayedTitle}
            {isTyping && <span className="animate-pulse">|</span>}
          </h1>
          <p className="text-2xl md:text-3xl text-orange-200 font-soria">
            {displayedSubtitle}
            {isTyping && displayedTitle === title && <span className="animate-pulse">|</span>}
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="glass-card p-8 rounded-2xl">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
              <Palette className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-soria text-orange-100 mb-2">Draw Your Story</h3>
            <p className="text-orange-300">Create two scenes that tell your story</p>
          </div>

          <div className="glass-card p-8 rounded-2xl">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
              <Wand2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-soria text-orange-100 mb-2">AI Magic</h3>
            <p className="text-orange-300">Watch AI bring your drawings to life</p>
          </div>

          <div className="glass-card p-8 rounded-2xl">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
              <Video className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-soria text-orange-100 mb-2">Animated Video</h3>
            <p className="text-orange-300">Get a smooth animated video of your story</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <button
            onClick={onStart}
            className="group relative px-12 py-6 text-2xl font-bold text-white bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg"
          >
            <span className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 group-hover:rotate-12 transition-transform duration-300" />
              Let&apos;s Create Magic!
              <Sparkles className="w-8 h-8 group-hover:-rotate-12 transition-transform duration-300" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-400 rounded-2xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300 -z-10"></div>
          </button>

          <button
            onClick={() => router.push('/game')}
            className="group relative px-12 py-6 text-2xl font-bold text-white bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl shadow-lg"
          >
            <span className="flex items-center gap-3">
              <Users className="w-8 h-8 group-hover:scale-110 transition-transform duration-300" />
              Play Multiplayer Game
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300 -z-10"></div>
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-12 text-orange-300 text-lg">
          <p>✨ Draw your first scene, then your second scene</p>
          <p>🎬 Watch as AI creates a magical animation between them</p>
        </div>
      </div>
    </div>
  );
}
