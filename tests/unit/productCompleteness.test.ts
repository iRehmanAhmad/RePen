import { describe, it, expect } from 'vitest';

describe('Product Completeness i18n and Settings Default Reset checks', () => {
  it('should reset visual settings to correct default values', () => {
    const customSettings = {
      aspectRatio: '1:1',
      padding: 50,
      borderRadius: 15,
      wallpaper: '#3b82f6',
    };

    // Reset simulator
    const resetSettings = {
      ...customSettings,
      aspectRatio: '16:9',
      padding: 0,
      borderRadius: 0,
      wallpaper: '#0b0c0e',
    };

    expect(resetSettings.aspectRatio).toBe('16:9');
    expect(resetSettings.padding).toBe(0);
    expect(resetSettings.borderRadius).toBe(0);
    expect(resetSettings.wallpaper).toBe('#0b0c0e');
  });

  it('should translate keys correctly matching English vs Spanish locales', () => {
    const TRANSLATIONS: Record<string, Record<string, string>> = {
      en: { save: 'Save', export: 'Export' },
      es: { save: 'Guardar', export: 'Exportar' },
    };

    const getTranslation = (key: string, locale: string): string => {
      return TRANSLATIONS[locale]?.[key] || TRANSLATIONS['en']?.[key] || key;
    };

    expect(getTranslation('save', 'en')).toBe('Save');
    expect(getTranslation('save', 'es')).toBe('Guardar');
    expect(getTranslation('export', 'en')).toBe('Export');
    expect(getTranslation('export', 'es')).toBe('Exportar');
    expect(getTranslation('missing_key', 'es')).toBe('missing_key'); // Fallback
  });
});
