const fs = require('fs');
const content = fs.readFileSync('C:/Users/TOSHIBA/.gemini/antigravity/scratch/openscreen-source/src/components/video-editor/VideoPlayback.tsx', 'utf8');

const lines = content.split('\n');
for (let i = 990; i < 1060; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
