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
      if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('presenterToolbar') || content.includes('videoPlaybackSync')) {
          console.log(full);
        }
      }
    }
  }
}

searchDir('c:/Users/TOSHIBA/.gemini/antigravity/scratch/epic-pen-clone/src');
