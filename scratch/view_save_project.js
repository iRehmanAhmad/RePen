const fs = require('fs');
const content = fs.readFileSync('C:/Users/TOSHIBA/.gemini/antigravity/scratch/openscreen-source/electron/ipc/handlers.ts', 'utf8');

const lines = content.split('\n');
for (let i = 2550; i < 2635; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
