const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const syntaxRoots = ['main.js', 'src', 'scripts'];

function collectJsFiles(targetPath, files = []) {
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(targetPath)) {
      collectJsFiles(path.join(targetPath, entry), files);
    }
    return files;
  }

  if (targetPath.endsWith('.js')) {
    files.push(targetPath);
  }
  return files;
}

const files = syntaxRoots.flatMap((entry) => collectJsFiles(path.join(rootDir, entry)));
let hasError = false;

console.log('--- Verifying JavaScript Syntax ---');
for (const file of files) {
  const result = spawnSync(process.execPath, ['-c', file], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  const relative = path.relative(rootDir, file);
  if (result.status === 0) {
    console.log(`[PASS] ${relative}`);
  } else {
    hasError = true;
    console.error(`[FAIL] ${relative}`);
    if (result.stderr) {
      console.error(result.stderr.trim());
    }
  }
}

if (hasError) {
  console.error('JavaScript syntax verification failed!');
  process.exit(1);
}

console.log('JavaScript syntax verified successfully!');
