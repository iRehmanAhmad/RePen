const fs = require('fs');
const content = fs.readFileSync('C:/Users/TOSHIBA/.gemini/antigravity/scratch/openscreen-source/electron/ipc/handlers.ts', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('PROJECT_FILE_EXTENSION')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
