import { BrowserWindow } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';

const configuredDevServerUrl = process.env.REPEN_VITE_DEV_SERVER_URL?.trim();

function getDevServerUrl(): string | null {
  if (!configuredDevServerUrl) return null;

  const url = new URL(configuredDevServerUrl);
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    throw new Error('REPEN_VITE_DEV_SERVER_URL must use HTTP on the local machine.');
  }
  return url.origin;
}

export function loadWindowContent(win: BrowserWindow, htmlFileName: string, query: Record<string, string> = {}) {
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    urlParams.set(key, String(value));
  }
  const queryString = urlParams.toString() ? `?${urlParams.toString()}` : '';

  const devServerUrl = getDevServerUrl();
  if (devServerUrl) {
    // In development mode, load from Vite dev server
    const url = `${devServerUrl}/${htmlFileName}${queryString}`;
    win.loadURL(url);
  } else {
    // In production mode, load from the built dist-renderer assets
    const filePath = path.join(__dirname, `../../dist-renderer/${htmlFileName}`);
    const fileUrl = pathToFileURL(filePath).toString() + queryString;
    win.loadURL(fileUrl);
  }
}
