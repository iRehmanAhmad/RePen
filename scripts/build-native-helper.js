const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'third_party', 'openscreen', 'wgc-capture');
const BUILD_DIR = path.join(SOURCE_DIR, 'build');
const BIN_DIR = path.join(ROOT, 'dist-electron', 'native', 'bin', 'win32-x64');

function firstExisting(candidates) {
  return candidates.filter(Boolean).find((candidate) => fs.existsSync(candidate)) || null;
}

function findOnPath(executable) {
  const result = spawnSync('where.exe', [executable], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.status !== 0) return null;
  return result.stdout
    .split(/\r?\n/)
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate && fs.existsSync(candidate)) || null;
}

function findVisualStudioRoot() {
  if (process.env.VSINSTALLDIR && fs.existsSync(process.env.VSINSTALLDIR)) {
    return process.env.VSINSTALLDIR;
  }

  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const vswhere = firstExisting([
    process.env.VSWHERE,
    path.join(programFilesX86, 'Microsoft Visual Studio', 'Installer', 'vswhere.exe'),
    findOnPath('vswhere.exe'),
  ]);
  if (vswhere) {
    const result = spawnSync(vswhere, [
      '-latest',
      '-products',
      '*',
      '-requires',
      'Microsoft.VisualStudio.Component.VC.Tools.x86.x64',
      '-property',
      'installationPath',
    ], {
      encoding: 'utf8',
      windowsHide: true,
    });
    const installationPath = result.status === 0 ? result.stdout.trim() : '';
    if (installationPath && fs.existsSync(installationPath)) return installationPath;
  }

  const editions = ['BuildTools', 'Community', 'Professional', 'Enterprise'];
  return firstExisting([
    ...editions.map((edition) => path.join(programFiles, 'Microsoft Visual Studio', '2022', edition)),
    ...editions.map((edition) => path.join(programFilesX86, 'Microsoft Visual Studio', '2022', edition)),
  ]);
}

function findBuildTools() {
  const visualStudioRoot = findVisualStudioRoot();
  const vcvarsAll = firstExisting([
    process.env.VCVARSALL,
    visualStudioRoot && path.join(visualStudioRoot, 'VC', 'Auxiliary', 'Build', 'vcvarsall.bat'),
  ]);
  if (!vcvarsAll) {
    throw new Error('Could not find vcvarsall.bat. Install the Visual Studio C++ desktop workload or set VCVARSALL.');
  }

  const cmake = firstExisting([
    process.env.CMAKE_EXE,
    findOnPath('cmake.exe'),
    visualStudioRoot && path.join(
      visualStudioRoot,
      'Common7',
      'IDE',
      'CommonExtensions',
      'Microsoft',
      'CMake',
      'CMake',
      'bin',
      'cmake.exe',
    ),
  ]);
  if (!cmake) {
    throw new Error('Could not find cmake.exe. Install CMake or set CMAKE_EXE.');
  }

  const ninja = firstExisting([
    process.env.NINJA_EXE,
    findOnPath('ninja.exe'),
    visualStudioRoot && path.join(
      visualStudioRoot,
      'Common7',
      'IDE',
      'CommonExtensions',
      'Microsoft',
      'CMake',
      'Ninja',
      'ninja.exe',
    ),
  ]);
  return { vcvarsAll, cmake, ninja };
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: 'inherit',
      windowsHide: true,
      ...options,
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`));
    });
  });
}

function quoteBatchArgument(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

async function runInVsEnvironment(vcvarsAll, command, args) {
  const cmdPath = path.join(os.tmpdir(), `repen-build-wgc-${process.pid}-${Date.now()}.cmd`);
  const commandLine = [quoteBatchArgument(command), ...args.map(quoteBatchArgument)].join(' ');
  fs.writeFileSync(cmdPath, [
    '@echo off',
    `call ${quoteBatchArgument(vcvarsAll)} x64`,
    'if errorlevel 1 exit /b %errorlevel%',
    commandLine,
    'exit /b %errorlevel%',
    '',
  ].join('\r\n'));

  try {
    await run('cmd.exe', ['/d', '/c', cmdPath]);
  } finally {
    fs.rmSync(cmdPath, { force: true });
  }
}

function findBuiltBinary(name) {
  return firstExisting([
    path.join(BUILD_DIR, name),
    path.join(BUILD_DIR, 'Release', name),
  ]);
}

async function main() {
  if (process.platform !== 'win32') {
    console.log('Skipping native helper build: Windows-only.');
    return;
  }
  if (process.arch !== 'x64') {
    throw new Error(`Native helper build currently supports x64 only; current architecture is ${process.arch}.`);
  }

  const { vcvarsAll, cmake, ninja } = findBuildTools();
  fs.mkdirSync(BUILD_DIR, { recursive: true });

  const configureArgs = ['-S', SOURCE_DIR, '-B', BUILD_DIR];
  if (ninja) {
    configureArgs.push('-G', 'Ninja', '-DCMAKE_BUILD_TYPE=Release', `-DCMAKE_MAKE_PROGRAM=${ninja}`);
  } else {
    configureArgs.push('-G', 'Visual Studio 17 2022', '-A', 'x64');
  }

  console.log(`Configuring native helper with ${ninja ? 'Ninja' : 'Visual Studio'}...`);
  await runInVsEnvironment(vcvarsAll, cmake, configureArgs);

  console.log('Building native helper targets...');
  await runInVsEnvironment(vcvarsAll, cmake, ['--build', BUILD_DIR, '--config', 'Release']);

  const wgcPath = findBuiltBinary('wgc-capture.exe');
  const cursorPath = findBuiltBinary('cursor-sampler.exe');
  if (!wgcPath || !cursorPath) {
    throw new Error('Compilation finished but one or more native helper binaries are missing.');
  }

  fs.mkdirSync(BIN_DIR, { recursive: true });
  fs.copyFileSync(wgcPath, path.join(BIN_DIR, 'wgc-capture.exe'));
  fs.copyFileSync(cursorPath, path.join(BIN_DIR, 'cursor-sampler.exe'));
  console.log(`Native binaries copied to: ${BIN_DIR}`);
}

main().catch((error) => {
  console.error('Native build failed:', error);
  process.exitCode = 1;
});
