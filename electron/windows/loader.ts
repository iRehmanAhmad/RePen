import { app, BrowserWindow } from 'electron';
import path from 'path';
import { pathToFileURL } from 'url';

const IS_DEV = !app.isPackaged && process.env.NODE_ENV !== 'production';
const DEV_SERVER_URL = 'http://localhost:5173';

export function loadWindowContent(win: BrowserWindow, htmlFileName: string, query: Record<string, string> = {}) {
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    urlParams.set(key, String(value));
  }
  const queryString = urlParams.toString() ? `?${urlParams.toString()}` : '';

  if (IS_DEV) {
    // In development mode, load from Vite dev server
    const url = `${DEV_SERVER_URL}/${htmlFileName}${queryString}`;
    win.loadURL(url);
  } else {
    // In production mode, load from the built dist-renderer assets
    const filePath = path.join(__dirname, `../../dist-renderer/${htmlFileName}`);
    const fileUrl = pathToFileURL(filePath).toString() + queryString;
    win.loadURL(fileUrl);
  }
}
