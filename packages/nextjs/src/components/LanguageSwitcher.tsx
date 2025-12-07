/**
 * Pre-built Language Switcher component
 */

'use client';

import { useLanguage } from '../language-context.js';

export type LanguageSwitcherVariant = 'dropdown' | 'buttons' | 'select';

export interface LanguageSwitcherProps {
  /** Visual variant of the switcher */
  variant?: LanguageSwitcherVariant;
  /** Show language flags (requires flag emoji or custom implementation) */
  showFlags?: boolean;
  /** Custom class name for styling */
  className?: string;
  /** Language display names (e.g., { en: 'English', da: 'Dansk' }) */
  languageNames?: Record<string, string>;
  /** Show loading state */
  showLoading?: boolean;
}

const DEFAULT_LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  da: 'Dansk',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
  pl: 'Polski',
  ru: 'Русский',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
  ar: 'العربية',
  he: 'עברית',
  hi: 'हिन्दी',
  tr: 'Türkçe',
  sv: 'Svenska',
  no: 'Norsk',
  fi: 'Suomi',
};

/**
 * Pre-built language switcher component
 *
 * @example
 * ```tsx
 * <LanguageSwitcher variant="dropdown" showFlags={false} />
 * ```
 */
export function LanguageSwitcher({
  variant = 'buttons',
  showFlags = false,
  className = '',
  languageNames = DEFAULT_LANGUAGE_NAMES,
  showLoading = true,
}: LanguageSwitcherProps) {
  const { currentLanguage, switchLanguage, availableLanguages, loading } = useLanguage();

  const getLanguageName = (code: string) => languageNames[code] || code.toUpperCase();

  if (variant === 'select') {
    return (
      <div className={`langsync-language-switcher ${className}`}>
        <select
          value={currentLanguage}
          onChange={(e) => switchLanguage(e.target.value)}
          disabled={loading && showLoading}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: '1px solid #d1d5db',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          {availableLanguages.map((lang) => (
            <option key={lang} value={lang}>
              {getLanguageName(lang)}
            </option>
          ))}
        </select>
        {loading && showLoading && (
          <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
            Loading...
          </span>
        )}
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={`langsync-language-switcher langsync-dropdown ${className}`} style={{ position: 'relative' }}>
        <details style={{ position: 'relative' }}>
          <summary
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
              listStyle: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
            }}
          >
            {getLanguageName(currentLanguage)}
            <span style={{ marginLeft: 'auto' }}>▼</span>
          </summary>
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '0.25rem',
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              minWidth: '150px',
              zIndex: 10,
            }}
          >
            {availableLanguages.map((lang) => (
              <button
                key={lang}
                onClick={() => switchLanguage(lang)}
                disabled={loading && showLoading}
                style={{
                  width: '100%',
                  padding: '0.5rem 1rem',
                  textAlign: 'left',
                  border: 'none',
                  backgroundColor: lang === currentLanguage ? '#f3f4f6' : 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: lang === currentLanguage ? '600' : '400',
                }}
              >
                {getLanguageName(lang)}
              </button>
            ))}
          </div>
        </details>
        {loading && showLoading && (
          <span style={{ marginLeft: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
            Loading...
          </span>
        )}
      </div>
    );
  }

  // Default: buttons variant
  return (
    <div className={`langsync-language-switcher langsync-buttons ${className}`} style={{ display: 'flex', gap: '0.5rem' }}>
      {availableLanguages.map((lang) => (
        <button
          key={lang}
          onClick={() => switchLanguage(lang)}
          disabled={loading && showLoading}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: '1px solid',
            borderColor: lang === currentLanguage ? '#3b82f6' : '#d1d5db',
            backgroundColor: lang === currentLanguage ? '#3b82f6' : '#ffffff',
            color: lang === currentLanguage ? '#ffffff' : '#374151',
            cursor: loading && showLoading ? 'not-allowed' : 'pointer',
            fontWeight: lang === currentLanguage ? '600' : '400',
            fontSize: '0.875rem',
            transition: 'all 0.2s',
            opacity: loading && showLoading ? 0.6 : 1,
          }}
        >
          {getLanguageName(lang)}
        </button>
      ))}
      {loading && showLoading && (
        <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
          Loading...
        </span>
      )}
    </div>
  );
}
