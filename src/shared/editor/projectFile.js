const fs = require('fs');
const path = require('path');

/**
 * Replace a project file only after its complete JSON payload has reached disk.
 * The temporary file lives beside the target so rename stays on the same volume.
 */
function writeProjectFileAtomically(filePath, project, fsModule = fs) {
  if (typeof filePath !== 'string' || !filePath) {
    throw new Error('A project file path is required.');
  }

  const directory = path.dirname(filePath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.tmp-${process.pid}-${Date.now()}`,
  );

  fsModule.writeFileSync(temporaryPath, JSON.stringify(project, null, 2), 'utf8');
  try {
    fsModule.renameSync(temporaryPath, filePath);
  } catch (error) {
    try { fsModule.unlinkSync(temporaryPath); } catch {}
    throw error;
  }
}

module.exports = { writeProjectFileAtomically };
