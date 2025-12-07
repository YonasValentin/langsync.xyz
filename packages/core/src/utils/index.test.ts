import { describe, it, expect } from 'vitest';
import {
  flattenTranslations,
  unflattenTranslations,
  getNestedValue,
  isValidLanguageCode,
  normalizeLanguageCode,
  interpolate,
  createKeyBuilder,
} from './index';

describe('flattenTranslations', () => {
  it('flattens nested translation objects', () => {
    const nested = {
      hero: {
        title: 'Welcome',
        subtitle: 'Get started',
      },
      auth: {
        login: {
          button: 'Sign In',
        },
      },
    };

    const result = flattenTranslations(nested);

    expect(result).toEqual({
      'hero.title': 'Welcome',
      'hero.subtitle': 'Get started',
      'auth.login.button': 'Sign In',
    });
  });

  it('handles empty objects', () => {
    expect(flattenTranslations({})).toEqual({});
  });

  it('handles already flat objects', () => {
    const flat = { simple: 'value' };
    expect(flattenTranslations(flat)).toEqual({ simple: 'value' });
  });
});

describe('unflattenTranslations', () => {
  it('unflattens flat translation dictionaries', () => {
    const flat = {
      'hero.title': 'Welcome',
      'hero.subtitle': 'Get started',
      'auth.login.button': 'Sign In',
    };

    const result = unflattenTranslations(flat);

    expect(result).toEqual({
      hero: {
        title: 'Welcome',
        subtitle: 'Get started',
      },
      auth: {
        login: {
          button: 'Sign In',
        },
      },
    });
  });

  it('throws error on conflicting key paths', () => {
    const flat = {
      'hero': 'Welcome', // hero is a string
      'hero.title': 'Title', // but here we try to access hero.title
    };

    expect(() => unflattenTranslations(flat)).toThrow(
      /conflicts with existing string value/
    );
  });

  it('handles empty dictionaries', () => {
    expect(unflattenTranslations({})).toEqual({});
  });
});

describe('getNestedValue', () => {
  const obj = {
    hero: {
      title: 'Welcome',
      subtitle: 'Get started',
    },
    simple: 'value',
  };

  it('retrieves nested values with dot notation', () => {
    expect(getNestedValue(obj, 'hero.title')).toBe('Welcome');
    expect(getNestedValue(obj, 'hero.subtitle')).toBe('Get started');
  });

  it('retrieves top-level values', () => {
    expect(getNestedValue(obj, 'simple')).toBe('value');
  });

  it('returns fallback for missing paths', () => {
    expect(getNestedValue(obj, 'hero.missing', 'default')).toBe('default');
    expect(getNestedValue(obj, 'nonexistent.path', 'fallback')).toBe('fallback');
  });

  it('returns undefined when no fallback provided', () => {
    expect(getNestedValue(obj, 'missing.path')).toBeUndefined();
  });

  it('handles traversing through non-object values gracefully', () => {
    expect(getNestedValue(obj, 'simple.nested')).toBeUndefined();
    expect(getNestedValue(obj, 'simple.nested', 'fallback')).toBe('fallback');
  });

  it('returns fallback when final value is not a string', () => {
    expect(getNestedValue(obj, 'hero', 'fallback')).toBe('fallback');
  });
});

describe('isValidLanguageCode', () => {
  it('validates simple language codes', () => {
    expect(isValidLanguageCode('en')).toBe(true);
    expect(isValidLanguageCode('fr')).toBe(true);
    expect(isValidLanguageCode('es')).toBe(true);
    expect(isValidLanguageCode('zh')).toBe(true);
  });

  it('validates language-region codes', () => {
    expect(isValidLanguageCode('en-US')).toBe(true);
    expect(isValidLanguageCode('en-GB')).toBe(true);
    expect(isValidLanguageCode('fr-FR')).toBe(true);
    expect(isValidLanguageCode('pt-BR')).toBe(true);
  });

  it('validates language-script codes', () => {
    expect(isValidLanguageCode('zh-Hans')).toBe(true);
    expect(isValidLanguageCode('zh-Hant')).toBe(true);
  });

  it('validates full BCP 47 tags', () => {
    expect(isValidLanguageCode('en-GB-oxendict')).toBe(true);
  });

  it('rejects invalid codes', () => {
    expect(isValidLanguageCode('invalid!')).toBe(false);
    expect(isValidLanguageCode('e')).toBe(false);
    expect(isValidLanguageCode('')).toBe(false);
    expect(isValidLanguageCode('123')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isValidLanguageCode('EN')).toBe(true);
    expect(isValidLanguageCode('EN-us')).toBe(true);
    expect(isValidLanguageCode('En-US')).toBe(true);
  });
});

describe('normalizeLanguageCode', () => {
  it('converts to lowercase', () => {
    expect(normalizeLanguageCode('EN-US')).toBe('en-us');
    expect(normalizeLanguageCode('FR')).toBe('fr');
    expect(normalizeLanguageCode('Pt-BR')).toBe('pt-br');
  });

  it('handles already lowercase codes', () => {
    expect(normalizeLanguageCode('en')).toBe('en');
    expect(normalizeLanguageCode('en-us')).toBe('en-us');
  });
});

describe('interpolate', () => {
  it('interpolates variables in template strings', () => {
    const result = interpolate('Hello {{name}}!', { name: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('handles multiple variables', () => {
    const result = interpolate('{{greeting}} {{name}}, you have {{count}} messages', {
      greeting: 'Hello',
      name: 'Alice',
      count: 5,
    });
    expect(result).toBe('Hello Alice, you have 5 messages');
  });

  it('converts numbers to strings', () => {
    const result = interpolate('You have {{count}} items', { count: 42 });
    expect(result).toBe('You have 42 items');
  });

  it('leaves missing variables as-is', () => {
    const result = interpolate('Hello {{name}}!', {});
    expect(result).toBe('Hello {{name}}!');
  });

  it('throws TypeError for non-string templates', () => {
    expect(() => interpolate(null as any, {})).toThrow(TypeError);
    expect(() => interpolate(undefined as any, {})).toThrow(TypeError);
    expect(() => interpolate(123 as any, {})).toThrow(TypeError);
    expect(() => interpolate({} as any, {})).toThrow(TypeError);
  });

  it('handles missing variables object gracefully', () => {
    const result = interpolate('Hello {{name}}!', null as any);
    expect(result).toBe('Hello {{name}}!');
  });

  it('handles templates with no variables', () => {
    const result = interpolate('Plain text', { name: 'ignored' });
    expect(result).toBe('Plain text');
  });
});

describe('createKeyBuilder', () => {
  it('builds prefixed keys', () => {
    const buildKey = createKeyBuilder('auth');
    expect(buildKey('login.title')).toBe('auth.login.title');
    expect(buildKey('signup.button')).toBe('auth.signup.button');
  });

  it('handles empty prefix', () => {
    const buildKey = createKeyBuilder('');
    expect(buildKey('login.title')).toBe('login.title');
  });

  it('creates consistent builder functions', () => {
    const buildAuthKey = createKeyBuilder('auth');
    const buildCommonKey = createKeyBuilder('common');

    expect(buildAuthKey('login')).toBe('auth.login');
    expect(buildCommonKey('welcome')).toBe('common.welcome');
  });
});
