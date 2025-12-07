/**
 * Pre-built Language Switcher component for React Native/Expo
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  ActivityIndicator,
} from 'react-native';
import { useLanguage } from '../hooks/use-language.js';

export type LanguageSwitcherVariant = 'buttons' | 'modal' | 'flatlist' | 'compact';

export interface LanguageSwitcherProps {
  /** Visual variant of the switcher */
  variant?: LanguageSwitcherVariant;
  /** Language display names (e.g., { en: 'English', da: 'Dansk' }) */
  languageNames?: Record<string, string>;
  /** Show loading indicator during language change */
  showLoading?: boolean;
  /** Container style */
  style?: ViewStyle;
  /** Button/item style */
  itemStyle?: ViewStyle;
  /** Text style */
  textStyle?: TextStyle;
  /** Selected item style */
  selectedItemStyle?: ViewStyle;
  /** Selected text style */
  selectedTextStyle?: TextStyle;
  /** Show checkmark on selected item */
  showCheckmark?: boolean;
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
 * Pre-built language switcher component with multiple variants
 *
 * @example
 * ```tsx
 * // Buttons variant
 * <LanguageSwitcher variant="buttons" />
 *
 * // Modal variant with custom labels
 * <LanguageSwitcher
 *   variant="modal"
 *   languageNames={{ en: 'English', da: 'Danish' }}
 * />
 *
 * // Compact button that opens modal
 * <LanguageSwitcher variant="compact" />
 * ```
 */
export function LanguageSwitcher({
  variant = 'buttons',
  languageNames = DEFAULT_LANGUAGE_NAMES,
  showLoading = true,
  style,
  itemStyle,
  textStyle,
  selectedItemStyle,
  selectedTextStyle,
  showCheckmark = true,
}: LanguageSwitcherProps) {
  const { language, availableLanguages, changeLanguage, isChanging } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);

  const getLanguageName = (code: string) => languageNames[code] || code.toUpperCase();

  const handleLanguageSelect = async (lang: string) => {
    try {
      await changeLanguage(lang);
      if (variant === 'modal' || variant === 'compact') {
        setModalVisible(false);
      }
    } catch (error) {
      console.error('[LangSync] Failed to change language:', error);
    }
  };

  const renderLanguageItem = (lang: string) => {
    const isSelected = lang === language;
    const disabled = isChanging && showLoading;

    return (
      <TouchableOpacity
        key={lang}
        onPress={() => handleLanguageSelect(lang)}
        disabled={disabled}
        style={[
          styles.item,
          itemStyle,
          isSelected && styles.selectedItem,
          isSelected && selectedItemStyle,
          disabled && styles.disabledItem,
        ]}
      >
        <Text
          style={[
            styles.itemText,
            textStyle,
            isSelected && styles.selectedText,
            isSelected && selectedTextStyle,
            disabled && styles.disabledText,
          ]}
        >
          {getLanguageName(lang)}
        </Text>
        {isSelected && showCheckmark && (
          <Text style={[styles.checkmark, selectedTextStyle]}>✓</Text>
        )}
      </TouchableOpacity>
    );
  };

  if (variant === 'modal' || variant === 'compact') {
    return (
      <View style={style}>
        {variant === 'compact' && (
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={[styles.compactButton, itemStyle]}
            disabled={isChanging && showLoading}
          >
            <Text style={[styles.compactButtonText, textStyle]}>
              {getLanguageName(language)}
            </Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
        )}

        <Modal
          visible={variant === 'modal' ? true : modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => {
            if (variant === 'compact') {
              setModalVisible(false);
            }
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Language</Text>
                {variant === 'compact' && (
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
              <FlatList
                data={availableLanguages}
                keyExtractor={(item) => item}
                renderItem={({ item }) => renderLanguageItem(item)}
                style={styles.modalList}
              />
              {isChanging && showLoading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (variant === 'flatlist') {
    return (
      <View style={[styles.flatlistContainer, style]}>
        <FlatList
          data={availableLanguages}
          keyExtractor={(item) => item}
          renderItem={({ item }) => renderLanguageItem(item)}
          contentContainerStyle={styles.flatlistContent}
        />
        {isChanging && showLoading && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color="#3b82f6" />
          </View>
        )}
      </View>
    );
  }

  // Default: buttons variant
  return (
    <View style={[styles.buttonsContainer, style]}>
      {availableLanguages.map((lang) => renderLanguageItem(lang))}
      {isChanging && showLoading && (
        <View style={styles.loadingIndicator}>
          <ActivityIndicator size="small" color="#3b82f6" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  buttonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  flatlistContainer: {
    maxHeight: 300,
  },
  flatlistContent: {
    gap: 4,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 100,
  },
  selectedItem: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f6',
  },
  disabledItem: {
    opacity: 0.6,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#374151',
  },
  selectedText: {
    fontWeight: '600',
    color: '#ffffff',
  },
  disabledText: {
    color: '#9ca3af',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#ffffff',
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  compactButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  dropdownIcon: {
    fontSize: 10,
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#6b7280',
    lineHeight: 32,
  },
  modalList: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  loadingIndicator: {
    marginLeft: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
