const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'third_party', 'openscreen', 'wgc-capture');
const BUILD_DIR = path.join(SOURCE_DIR, 'build');
const COMPAT_LIB_DIR = path.join(BUILD_DIR, 'compat-libs');
const BIN_DIR = path.join(ROOT, 'dist-electron', 'native', 'bin', 'win32-x64');

// Visual Studio Build Tools detection paths
const VS_ROOT = 'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools';
const VCVARSALL = path.join(VS_ROOT, 'VC', 'Auxiliary', 'Build', 'vcvarsall.bat');
const CMAKE_EXE = path.join(VS_ROOT, 'Common7', 'IDE', 'CommonExtensions', 'Microsoft', 'CMake', 'CMake', 'bin', 'cmake.exe');
const NINJA_DIR = path.join(VS_ROOT, 'Common7', 'IDE', 'CommonExtensions', 'Microsoft', 'CMake', 'Ninja');

function findVcVarsAll() {
  if (fs.existsSync(VCVARSALL)) {
    return VCVARSALL;
  }
  return null;
}

function findWindowsSdkUmLibDir() {
  const sdkLibRoot = 'C:\\Program Files (x86)\\Windows Kits\\10\\Lib';
  if (!fs.existsSync(sdkLibRoot)) {
    return null;
  }

  try {
    const dirs = fs.readdirSync(sdkLibRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(sdkLibRoot, entry.name, 'um', 'x64'))
      .filter((candidate) => fs.existsSync(path.join(candidate, 'kernel32.lib')))
      .sort();
    return dirs.at(-1) || null;
  } catch (e) {
    return null;
  }
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    // Inject Ninja folder into PATH so CMake can resolve "Ninja" generator
    const env = { ...process.env };
    if (fs.existsSync(NINJA_DIR)) {
      env.PATH = `${NINJA_DIR};${env.PATH || ''}`;
    }

    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: 'inherit',
      windowsHide: true,
      env,
      ...options,
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`));
      }
    });
  });
}

async function runInVsEnv(command) {
  const vcvarsAll = findVcVarsAll();
  if (!vcvarsAll) {
    throw new Error('Could not find Visual Studio Build Tools vcvarsall.bat.');
  }

  const sdkUmLibDir = findWindowsSdkUmLibDir();
  const cmdPath = path.join(os.tmpdir(), `repen-build-wgc-${process.pid}-${Date.now()}.cmd`);
  
  fs.writeFileSync(
    cmdPath,
    [
      '@echo off',
      `call "${vcvarsAll}" x64`,
      'if errorlevel 1 exit /b %errorlevel%',
      `if not exist "${COMPAT_LIB_DIR}" mkdir "${COMPAT_LIB_DIR}"`,
      `for %%L in (gdi32.lib gdiplus.lib winspool.lib shell32.lib oleaut32.lib uuid.lib comdlg32.lib advapi32.lib) do if not exist "%WindowsSdkDir%Lib\\%WindowsSDKLibVersion%um\\x64\\%%L" copy /Y "%WindowsSdkDir%Lib\\%WindowsSDKLibVersion%um\\x64\\kernel32.Lib" "${COMPAT_LIB_DIR}\\%%L" >nul`,
      'if errorlevel 1 exit /b %errorlevel%',
      `set "LIB=${sdkUmLibDir ? `${sdkUmLibDir};` : ''}%LIB%;${COMPAT_LIB_DIR}"`,
      command,
      'exit /b %errorlevel%',
      '',
    ].join('\r\n'),
  );

  try {
    await run('cmd.exe', ['/d', '/c', cmdPath]);
  } finally {
    fs.rmSync(cmdPath, { force: true });
  }
}

async function main() {
  if (process.platform !== 'win32') {
    console.log('Skipping native helper build: Windows-only.');
    process.exit(0);
  }

  if (!fs.existsSync(CMAKE_EXE)) {
    throw new Error(`Could not find bundled CMake at: ${CMAKE_EXE}`);
  }

  fs.mkdirSync(BUILD_DIR, { recursive: true });

  console.log('Configuring CMake project...');
  await runInVsEnv(`"${CMAKE_EXE}" -S "${SOURCE_DIR}" -B "${BUILD_DIR}" -G Ninja -DCMAKE_BUILD_TYPE=Release`);

  console.log('Building C++ binary targets...');
  await runInVsEnv(`"${CMAKE_EXE}" --build "${BUILD_DIR}" --config Release`);

  const wgcPath = path.join(BUILD_DIR, 'wgc-capture.exe');
  const cursorPath = path.join(BUILD_DIR, 'cursor-sampler.exe');

  if (!fs.existsSync(wgcPath) || !fs.existsSync(cursorPath)) {
    throw new Error('Compilation finished but output binaries are missing!');
  }

  fs.mkdirSync(BIN_DIR, { recursive: true });
  fs.copyFileSync(wgcPath, path.join(BIN_DIR, 'wgc-capture.exe'));
  fs.copyFileSync(cursorPath, path.join(BIN_DIR, 'cursor-sampler.exe'));

  console.log(`\nSuccess! Native binaries built and copied to: ${BIN_DIR}`);
}

main().catch((err) => {
  console.error('Native build failed:', err);
  process.exit(1);
});
