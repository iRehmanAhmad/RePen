const fs = require('fs');
const content = fs.readFileSync('C:/Users/TOSHIBA/.gemini/antigravity/scratch/epic-pen-clone/src/renderer/overlay.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('erase') || line.includes('segmentToSegmentDistance') || line.includes('pointToSegmentDistance')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
