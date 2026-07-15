const fs = require('fs');
const content = fs.readFileSync('C:/Users/TOSHIBA/.gemini/antigravity/scratch/epic-pen-clone/src/renderer/overlay.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('function draw') || line.includes('function render') || line.includes('function redraw')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
