const fs = require('fs');
const content = fs.readFileSync('C:/Users/TOSHIBA/.gemini/antigravity/scratch/epic-pen-clone/main.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('render-export') || line.includes('renderExport')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
