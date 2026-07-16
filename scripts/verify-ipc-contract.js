const fs = require('fs');
const path = require('path');

const preloadPath = path.join(__dirname, '../src/preload.js');
const mainPath = path.join(__dirname, '../main.js');

const preloadContent = fs.readFileSync(preloadPath, 'utf8');
const mainContent = fs.readFileSync(mainPath, 'utf8');

// Extract invoked channels in preload.js
const invokeRegex = /ipcRenderer\.invoke\(['"]([^'"]+)['"]/g;
let match;
const invokedChannels = new Set();
while ((match = invokeRegex.exec(preloadContent)) !== null) {
  invokedChannels.add(match[1]);
}

// Extract listened channels in preload.js
const onRegex = /on\(['"]([^'"]+)['"]/g;
const listenedChannels = new Set();
while ((match = onRegex.exec(preloadContent)) !== null) {
  listenedChannels.add(match[1]);
}

// Extract handled channels in main.js
const handleRegex = /ipcMain\.handle\(['"]([^'"]+)['"]/g;
const handledChannels = new Set();
while ((match = handleRegex.exec(mainContent)) !== null) {
  handledChannels.add(match[1]);
}

// Extract sent channels in main.js
const sendRegex = /\.send\(['"]([^'"]+)['"]/g;
const sentChannels = new Set();
while ((match = sendRegex.exec(mainContent)) !== null) {
  sentChannels.add(match[1]);
}
const safeSendRegex = /safeSend\([^,]+,\s*['"]([^'"]+)['"]/g;
while ((match = safeSendRegex.exec(mainContent)) !== null) {
  sentChannels.add(match[1]);
}

let hasError = false;
console.log('--- Verifying IPC Contract ---');

for (const ch of invokedChannels) {
  if (!handledChannels.has(ch)) {
    console.error(`[FAIL] Channel "${ch}" is invoked in preload.js but missing ipcMain.handle in main.js`);
    hasError = true;
  } else {
    console.log(`[PASS] Invoked channel "${ch}" matched in main.js`);
  }
}

for (const ch of listenedChannels) {
  if (!sentChannels.has(ch)) {
    console.error(`[FAIL] Channel "${ch}" is listened in preload.js but never sent in main.js`);
    hasError = true;
  } else {
    console.log(`[PASS] Listened channel "${ch}" matched in main.js`);
  }
}

if (hasError) {
  console.error('IPC Contract verification failed!');
  process.exit(1);
} else {
  console.log('IPC Contract verified successfully!');
  process.exit(0);
}
