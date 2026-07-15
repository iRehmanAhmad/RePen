const fs = require('fs');
const content = fs.readFileSync('C:/Users/TOSHIBA/.gemini/antigravity/scratch/epic-pen-clone/main.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('function undo') || line.includes('function redo') || line.includes('function clear') || line.includes('function recordSceneChange')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
