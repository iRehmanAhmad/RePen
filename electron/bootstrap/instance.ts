import { app } from 'electron';

export function initializeSingleInstanceLock(): boolean {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return false;
  }
  
  app.setAppUserModelId('com.repen.app');
  return true;
}
