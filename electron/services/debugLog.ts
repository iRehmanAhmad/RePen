import { app } from 'electron';
import fs from 'fs';
import path from 'path';

const DEBUG_LOG_ENABLED = process.env.REPEN_DEBUG_LOG === '1';
const MAX_LOG_BYTES = 1024 * 1024;
let writeQueue = Promise.resolve();

/**
 * Renderer logging is intentionally opt-in. When enabled for diagnostics, writes
 * are serialized off the UI thread and the file is truncated before it can grow
 * without bound.
 */
export function appendRendererDebugLog(scope: string, message: string, line: number, sourceId: string) {
  if (!DEBUG_LOG_ENABLED) return;

  const logLine = `[${scope}] ${message} (${sourceId}:${line})\n`;
  writeQueue = writeQueue
    .then(async () => {
      const logPath = path.join(app.getPath('userData'), 'rep-debug.log');
      await fs.promises.mkdir(path.dirname(logPath), { recursive: true });

      try {
        const stats = await fs.promises.stat(logPath);
        if (stats.size + Buffer.byteLength(logLine) > MAX_LOG_BYTES) {
          await fs.promises.writeFile(logPath, '', 'utf8');
        }
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== 'ENOENT') throw error;
      }

      await fs.promises.appendFile(logPath, logLine, 'utf8');
    })
    .catch((error) => {
      console.warn('Unable to write RePen debug log:', error);
    });
}
