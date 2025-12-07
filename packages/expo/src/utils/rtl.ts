/**
 * RTL (Right-to-Left) language support utilities
 */

import { I18nManager, Platform } from 'react-native';
import { RTL_LANGUAGES } from '../constants.js';

/**
 * Checks if a language uses RTL text direction
 */
export function isRTLLanguage(language: string): boolean {
  // Extract base language code (e.g., 'ar-SA' -> 'ar')
  const baseLanguage = language.split('-')[0].toLowerCase();
  return (RTL_LANGUAGES as readonly string[]).includes(baseLanguage);
}

/**
 * Gets the current text direction of the app
 */
export function getCurrentDirection(): 'ltr' | 'rtl' {
  return I18nManager.isRTL ? 'rtl' : 'ltr';
}

/**
 * Checks if the app direction matches the language direction
 */
export function isDirectionMatching(language: string): boolean {
  const shouldBeRTL = isRTLLanguage(language);
  const currentlyRTL = I18nManager.isRTL;
  return shouldBeRTL === currentlyRTL;
}

/**
 * Determines if RTL needs to be forced for the language
 */
export function shouldForceRTL(language: string): boolean {
  return !isDirectionMatching(language);
}

/**
 * Applies RTL direction if needed for the language
 * Returns true if app restart is required
 *
 * @param language - Target language code
 * @param onNeedRestart - Callback when restart is needed
 * @returns Promise<boolean> - true if restart required
 */
export async function applyRTLIfNeeded(
  language: string,
  onNeedRestart?: () => void
): Promise<boolean> {
  if (isDirectionMatching(language)) {
    return false; // No change needed
  }

  const isRTL = isRTLLanguage(language);

  try {
    // Force RTL layout direction
    I18nManager.forceRTL(isRTL);

    if (__DEV__) {
      console.log(
        `[LangSync] RTL direction changed to: ${isRTL ? 'RTL' : 'LTR'} for language: ${language}`
      );
    }

    // On Android, I18nManager changes require app restart
    // On iOS, the app automatically restarts when language changes
    if (Platform.OS === 'android') {
      onNeedRestart?.();
      return true;
    }

    return false;
  } catch (error) {
    console.error('[LangSync] Failed to apply RTL direction:', error);
    return false;
  }
}

/**
 * Resets RTL to LTR (Left-to-Right)
 * Useful for reverting to default direction
 */
export function resetToLTR(): void {
  if (I18nManager.isRTL) {
    I18nManager.forceRTL(false);
  }
}

/**
 * Checks if RTL is allowed on the current platform
 * Some platforms may not fully support RTL
 */
export function isRTLSupported(): boolean {
  return I18nManager.isRTL !== undefined;
}
