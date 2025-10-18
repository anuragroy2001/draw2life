# Draw2Life - Sketch to Animation Education Tool

A collaborative, kid-friendly Sketch → Understand → Animate web app that turns children's drawings into living scenes with 2D/3D animations and educational narration.

## Features

### Phase 1 ✅ (Completed)
- **Drawing Canvas**: Full-featured drawing with react-konva
  - Multiple tools: pen, eraser, shapes, text, selection, move
  - Color picker with 20+ colors + custom color input
  - Stroke width and opacity controls
  - Layer management system
  - Undo/Redo functionality
  - Import/Export capabilities

### Phase 2 ✅ (Completed)
- **AI Understanding**: Gemini API integration for sketch analysis
  - Structured scene analysis with object detection
  - Educational narration generation
  - Image preprocessing with OpenCV.js
- **Animation Engine**: 2D and 3D animation system
  - GSAP-powered 2D animations (bounce, float, rotate, scale, move, fade)
  - Three.js 3D playground with interactive objects
  - Animation controls (play, pause, stop, speed, volume)
  - Timeline-based animation sequences

### Phase 3 ✅ (Completed)
- **Video Export**: AI-generated video creation with fal.ai
  - Export drawings as animated MP4 videos
  - Real-time progress tracking
  - Video preview and download
  - Educational narration integration

### Upcoming Features
- **Voice Tutoring**: Real-time voice interaction with Gemini Live API
- **Collaboration**: Real-time collaborative drawing
- **PWA**: Offline support and installability
- **Safety**: COPPA compliance and accessibility features

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables

#### Option A: Use the setup script (Recommended)
```bash
npm run setup
```

#### Option B: Manual setup
Create a `.env.local` file in the root directory:

```env
# Required: Gemini API Key
# Get your API key from: https://makersuite.google.com/app/apikey
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# Required: fal.ai API Key for video generation
# Get your API key from: https://fal.ai/dashboard/keys
FAL_KEY_ID=your_fal_api_key_here
```

### 3. Get API Keys (if not using setup script)

#### Gemini API Key (Required for AI features)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key and add it to your `.env.local` file

#### fal.ai API Key (Required for video generation)
1. Go to [fal.ai dashboard](https://fal.ai/dashboard/keys)
2. Sign up for an account
3. Create a new API key
4. Copy the key and add it to your `.env.local` file as `FAL_KEY_ID`

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

### Drawing
1. **Draw**: Use the pen tool to draw on the canvas
2. **Shapes**: Use rectangle, circle tools for geometric shapes
3. **Colors**: Select from the color palette or use the custom color picker
4. **Layers**: Organize your drawing with multiple layers
5. **Tools**: Switch between pen, eraser, selection, and move tools

### AI Analysis
1. **Analyze**: Click the "Understand My Drawing" button
2. **Wait**: The AI will analyze your drawing (requires Gemini API key)
3. **Learn**: Read the educational narration about your drawing
4. **Animate**: Use the animation controls to bring your drawing to life

### 3D View
1. **Analyze First**: Complete AI analysis to enable 3D view
2. **3D Button**: Click the "3D View" button in the toolbar
3. **Explore**: Navigate the 3D scene with mouse controls
4. **Interact**: Objects float and rotate automatically

### Animation Controls
- **Play/Pause**: Control animation playback
- **Speed**: Adjust animation speed (0.5x to 2x)
- **Volume**: Control audio volume (when implemented)
- **Progress**: Scrub through animation timeline

### Video Export
1. **Analyze First**: Complete AI analysis to enable video export
2. **Export**: Click the "Export Video" button
3. **Wait**: AI creates an animated video (20-30 seconds)
4. **Download**: Click download to save the MP4 file
5. **Preview**: Watch the video preview before downloading

## Technical Architecture

### Frontend
- **Next.js 14** with App Router and TypeScript
- **React Konva** for 2D canvas drawing
- **Framer Motion** for UI animations
- **GSAP** for complex 2D animations
- **Three.js** (react-three-fiber) for 3D rendering
- **Tailwind CSS** for styling

### Backend
- **Convex** for real-time database and file storage
- **Gemini API** for AI analysis and narration
- **OpenCV.js** for image preprocessing
- **fal.ai** for video generation

### AI Integration
- **Gemini 1.5 Flash** for structured scene analysis
- **OpenCV.js** for image enhancement and preprocessing
- **Structured JSON** output for consistent data format
- **Educational prompts** optimized for children's content

## Development

### Project Structure
```
src/
├── app/                    # Next.js App Router
├── components/
│   ├── canvas/            # Drawing canvas components
│   ├── ai/                # AI analysis components
│   └── animation/         # Animation components
├── lib/                   # Utilities and services
├── types/                 # TypeScript type definitions
└── convex/                # Convex backend functions
```

### Key Components
- **Workspace**: Main application container
- **DrawingCanvas**: react-konva drawing interface
- **SceneAnalyzer**: AI analysis and narration
- **AnimationControls**: Animation playback controls
- **ThreeDPlayground**: 3D scene viewer

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the GitHub Issues page
2. Create a new issue with detailed description
3. Include steps to reproduce any bugs

---

**Built with ❤️ for kids and education**