/**
 * Language preference storage utilities
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = '@langsync:language';

/**
 * Saves the user's language preference to AsyncStorage
 */
export async function saveLanguagePreference(language: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    if (__DEV__) {
      console.error('[LangSync] Failed to save language preference:', error);
    }
    throw error;
  }
}

/**
 * Retrieves the user's saved language preference
 * Returns null if no preference is saved
 */
export async function getLanguagePreference(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch (error) {
    if (__DEV__) {
      console.error('[LangSync] Failed to get language preference:', error);
    }
    return null;
  }
}

/**
 * Clears the saved language preference
 */
export async function clearLanguagePreference(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LANGUAGE_KEY);
  } catch (error) {
    if (__DEV__) {
      console.error('[LangSync] Failed to clear language preference:', error);
    }
    throw error;
  }
}

/**
 * Checks if a language preference is saved
 */
export async function hasLanguagePreference(): Promise<boolean> {
  const preference = await getLanguagePreference();
  return preference !== null;
}
