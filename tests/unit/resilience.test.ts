import { describe, it, expect, vi } from 'vitest';
import { RecorderService } from '../../electron/services/recorder';
import fs from 'fs';
import path from 'path';

describe('Recorder Resilience Unit Tests', () => {
  it('should redact usernames from directory path strings in logs', () => {
    const service = new RecorderService();
    const rawLog = 'Process started by C:\\Users\\john_doe\\Documents\\RePen\\bin.exe with config at C:\\Users\\another_user\\AppData\\Local\\Temp';
    const redacted = service.redactLogs(rawLog);
    expect(redacted).not.toContain('john_doe');
    expect(redacted).not.toContain('another_user');
    expect(redacted).toContain('C:\\Users\\<User>');
  });

  it('atomically updates and deletes recovery session manifests', () => {
    const service = new RecorderService();
    const tempDir = path.resolve(__dirname, '..', '..', 'scratch');
    fs.mkdirSync(tempDir, { recursive: true });
    const targetFile = path.join(tempDir, `test-recording-${Date.now()}.mp4`);

    // Bind paths to service session
    (service as any).currentOutputPath = targetFile;
    (service as any).currentSessionId = 987654;

    const manifestPath = service.getManifestPath();
    expect(manifestPath).toBe(targetFile + '.session.json');

    // Write manifest
    service.writeSessionManifest('recording');
    expect(fs.existsSync(manifestPath!)).toBe(true);

    const content = JSON.parse(fs.readFileSync(manifestPath!, 'utf8'));
    expect(content.sessionId).toBe(987654);
    expect(content.status).toBe('recording');
    expect(content.startTime).toEqual(expect.any(String));
    expect(content.updatedAt).toEqual(expect.any(String));

    service.writeSessionManifest('finalizing');
    const finalizingContent = JSON.parse(fs.readFileSync(manifestPath!, 'utf8'));
    expect(finalizingContent.status).toBe('finalizing');
    expect(finalizingContent.startTime).toBe(content.startTime);
    expect(fs.readdirSync(tempDir).filter((name) => name.startsWith(path.basename(manifestPath!) + '.tmp-'))).toEqual([]);

    // Delete manifest
    service.deleteSessionManifest();
    expect(fs.existsSync(manifestPath!)).toBe(false);
  });
});
