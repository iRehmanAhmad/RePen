import { globalShortcut } from 'electron';

export class ShortcutManager {
  private shortcuts: Map<string, string> = new Map(); // key: command, value: accelerator

  register(command: string, accelerator: string, callback: () => void) {
    this.unregister(command);
    
    try {
      const success = globalShortcut.register(accelerator, callback);
      if (success) {
        this.shortcuts.set(command, accelerator);
      } else {
        console.warn(`Shortcut registration failed for command "${command}" with accelerator: ${accelerator}`);
      }
    } catch (e) {
      console.error(`Error registering shortcut for command "${command}":`, e);
    }
  }

  unregister(command: string) {
    const accelerator = this.shortcuts.get(command);
    if (accelerator) {
      try {
        globalShortcut.unregister(accelerator);
      } catch (e) {
        console.error(`Error unregistering shortcut for command "${command}":`, e);
      }
      this.shortcuts.delete(command);
    }
  }

  unregisterAll() {
    try {
      globalShortcut.unregisterAll();
    } catch (e) {
      console.error('Error unregistering all shortcuts:', e);
    }
    this.shortcuts.clear();
  }

  isRegistered(command: string): boolean {
    return this.shortcuts.has(command);
  }
}
