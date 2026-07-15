const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      searchDir(full);
    } else {
      if (file.toLowerCase().includes('ffmpeg') || file.toLowerCase().includes('fluent-ffmpeg')) {
        console.log(full);
      }
    }
  }
}

searchDir('C:/Users/TOSHIBA/.gemini/antigravity/scratch/openscreen-source/electron');
