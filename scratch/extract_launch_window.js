const fs = require('fs');
const content = fs.readFileSync('C:/Users/TOSHIBA/.gemini/antigravity/scratch/openscreen-source/src/components/launch/LaunchWindow.tsx', 'utf8');

const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('const [') || line.includes('function ') || line.includes('async ') || line.includes('useEffect(') || line.includes('ipcRenderer') || line.includes('electronAPI')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
