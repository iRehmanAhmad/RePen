const fs = require('fs');
const content = fs.readFileSync('C:/Users/TOSHIBA/.gemini/antigravity/scratch/openscreen-source/src/components/video-editor/VideoPlayback.tsx', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('const VideoPlayback') || line.includes('useRef') || line.includes('useEffect') || line.includes('play') || line.includes('pause') || line.includes('currentTime')) {
    if (line.includes('function') || line.includes('const') || line.includes('use') || line.includes('handle') || line.includes('sync')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  }
});
