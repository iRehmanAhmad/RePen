const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        searchDir(full);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('new BrowserWindow')) {
          console.log(full);
        }
      }
    }
  }
}

searchDir('C:/Users/TOSHIBA/.gemini/antigravity/scratch/openscreen-source/electron');
