const fs = require('fs');
const content = fs.readFileSync('C:/Users/TOSHIBA/.gemini/antigravity/scratch/epic-pen-clone/main.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('annotations.push') || line.includes('type:') && (line.includes('pen') || line.includes('highlighter') || line.includes('arrow'))) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
