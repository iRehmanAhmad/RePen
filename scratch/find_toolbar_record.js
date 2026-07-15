const fs = require('fs');
const content = fs.readFileSync('C:/Users/TOSHIBA/.gemini/antigravity/scratch/epic-pen-clone/src/renderer/toolbar.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('record') || line.includes('Record') || line.includes('Start')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
