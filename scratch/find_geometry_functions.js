const fs = require('fs');
const content = fs.readFileSync('C:/Users/TOSHIBA/.gemini/antigravity/scratch/epic-pen-clone/src/renderer/overlay.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('Distance') || line.includes('Math.sqrt') || line.includes('eraser') || line.includes('hit') || line.includes('intersect')) {
    if (line.includes('function') || line.includes('const') || line.includes('let')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  }
});
