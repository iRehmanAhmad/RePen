const fs = require('fs');
const content = fs.readFileSync('C:/Users/TOSHIBA/.gemini/antigravity/scratch/epic-pen-clone/main.js', 'utf8');

const lines = content.split('\n');
lines.slice(0, 200).forEach((line, index) => {
  if (line.includes('let ') && (line.includes('Window') || line.includes('window'))) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
