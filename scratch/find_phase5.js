const fs = require('fs');
const content = fs.readFileSync('C:/Users/TOSHIBA/.gemini/antigravity/scratch/epic-pen-clone/.agent-hub/tasks/20260715-100737-integrate-full-openscreen-feature-set-into-repen.md', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('Phase 5') || line.includes('Phase 6')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
