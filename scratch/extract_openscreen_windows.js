const fs = require('fs');
const content = fs.readFileSync('C:/Users/TOSHIBA/.gemini/antigravity/scratch/openscreen-source/electron/windows.ts', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('export function') || line.includes('new BrowserWindow') || line.includes('loadURL') || line.includes('loadFile')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
