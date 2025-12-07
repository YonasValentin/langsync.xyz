import { beforeEach, describe, expect, it } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TranslationCache } from '../cache.js';

const sampleTranslations = {
  'common.welcome': 'Welcome back',
  'auth.login.title': 'Sign in',
  'profile.details.name': 'Name',
};

describe('TranslationCache', () => {
  beforeEach(() => {
    (AsyncStorage as any).__reset?.();
  });

  it('stores and retrieves flat translation dictionaries', async () => {
    const cache = new TranslationCache('@test');

    await cache.set('en', sampleTranslations, 60);
    const result = await cache.get('en');

    expect(result).toEqual(sampleTranslations);
    expect(result?.['common.welcome']).toBe('Welcome back');
  });

  it('lists cached languages using the configured prefix', async () => {
    const cache = new TranslationCache('@test');

    await cache.set('en', sampleTranslations, 60);
    await cache.set('es', { ...sampleTranslations, 'common.welcome': 'Bienvenido' }, 60);

    const languages = await cache.getCachedLanguages();
    expect(languages.sort()).toEqual(['en', 'es']);
  });
});
