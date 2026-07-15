const fs = require('fs');
const content = fs.readFileSync('C:/Users/TOSHIBA/.gemini/antigravity/scratch/openscreen-source/electron/ipc/handlers.ts', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('save') || line.includes('write') || line.includes('project') || line.includes('Project')) {
    if (line.includes('function') || line.includes('const') || line.includes('let') || line.includes('ipcMain')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  }
});
