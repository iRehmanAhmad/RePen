const fs = require('fs');
const content = fs.readFileSync('C:/Users/TOSHIBA/.gemini/antigravity/scratch/epic-pen-clone/main.js', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('recording:') || line.includes('ipcMain.handle(') || line.includes('ipcMain.on(')) {
    if (line.includes('recording') || line.includes('start') || line.includes('stop') || line.includes('settings')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  }
});
