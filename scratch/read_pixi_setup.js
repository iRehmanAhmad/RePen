const fs = require('fs');
const content = fs.readFileSync('C:/Users/TOSHIBA/.gemini/antigravity/scratch/openscreen-source/src/components/video-editor/VideoPlayback.tsx', 'utf8');

const lines = content.split('\n');
for (let i = 400; i < 600; i++) {
  if (lines[i].includes('Pixi') || lines[i].includes('Application') || lines[i].includes('new') || lines[i].includes('Sprite') || lines[i].includes('Webcam')) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
