#!/usr/bin/env node

/**
 * Environment Setup Helper for Draw2Life
 * 
 * This script helps you set up the required environment variables
 * for the Draw2Life application.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(__dirname, '.env.local');

console.log('🎨 Draw2Life Environment Setup');
console.log('================================\n');

// Check if .env.local already exists
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env.local already exists!');
  rl.question('Do you want to overwrite it? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      setupEnvironment();
    } else {
      console.log('Setup cancelled.');
      rl.close();
    }
  });
} else {
  setupEnvironment();
}

function setupEnvironment() {
  console.log('\n📝 Setting up environment variables...\n');
  
  console.log('You need to get API keys from:');
  console.log('1. Gemini API: https://makersuite.google.com/app/apikey');
  console.log('2. fal.ai API: https://fal.ai/dashboard/keys');
  console.log('   Note: FAL AI key is already included in the code as fallback\n');
  
  rl.question('Enter your Gemini API key: ', (geminiKey) => {
    rl.question('Enter your fal.ai API key: ', (falKey) => {
      const envContent = `# Draw2Life Environment Variables
# Generated on ${new Date().toISOString()}

# Required: Gemini API Key for AI analysis
# Get your API key from: https://makersuite.google.com/app/apikey
NEXT_PUBLIC_GEMINI_API_KEY=${geminiKey}

# Required: fal.ai API Key for video generation
# Get your API key from: https://fal.ai/dashboard/keys
FAL_KEY_ID=${falKey}

# Optional: App URL (defaults to localhost:3000)
# NEXT_PUBLIC_APP_URL=http://localhost:3000
`;

      fs.writeFileSync(envPath, envContent);
      
      console.log('\n✅ Environment variables saved to .env.local');
      console.log('🚀 You can now run: npm run dev');
      console.log('\nNote: Make sure to restart your development server if it\'s running.');
      
      rl.close();
    });
  });
}
