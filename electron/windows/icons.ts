import { nativeImage } from 'electron';
import path from 'path';

export function createAppIcon() {
  const appPngPath = path.join(__dirname, '../../src/renderer/assets/app-icon.png');
  const pngIcon = nativeImage.createFromPath(appPngPath);
  if (!pngIcon.isEmpty()) {
    pngIcon.setTemplateImage(false);
    return pngIcon;
  }
  const fallback = nativeImage.createFromPath(path.join(__dirname, '../../src/renderer/icon.svg'));
  fallback.setTemplateImage(false);
  return fallback;
}

export function createTrayIcon() {
  const traySvg = `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#0f172a"/>
      <rect x="2" y="2" width="60" height="60" rx="12" stroke="#334155" stroke-width="2"/>
      <path d="M12 12h40v40H12z" fill="#1e293b"/>
      <path d="M22 28v26h8V34l-8-6Z" fill="#f8fafc"/>
      <path d="M42 28v26h-8V34l8-6Z" fill="#22d3ee"/>
      <path d="M26 48h12l-3 10h-6l-3-10Z" fill="#38bdf8"/>
      <path d="M27 25h10l-5 10-5-10Z" fill="#111827"/>
      <path d="M16 51h8" stroke="#67e8f9" stroke-width="3" stroke-linecap="round"/>
      <path d="M40 51h8" stroke="#facc15" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `.trim();
  const img = nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(traySvg)}`);
  if (!img.isEmpty()) {
    const resized = img.resize({ width: 20, height: 20, quality: 'best' });
    resized.setTemplateImage(false);
    return resized;
  }
  const fallback = nativeImage.createFromPath(path.join(__dirname, '../../src/renderer/icon.svg'));
  const resizedFallback = fallback.resize({ width: 20, height: 20, quality: 'best' });
  resizedFallback.setTemplateImage(false);
  return resizedFallback;
}
