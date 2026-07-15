const fs = require('fs');
const content = fs.readFileSync('C:/Users/TOSHIBA/.gemini/antigravity/scratch/openscreen-source/src/components/video-editor/VideoPlayback.tsx', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('new Application') || line.includes('Application(') || line.includes('.init(') || line.includes('canvas')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
