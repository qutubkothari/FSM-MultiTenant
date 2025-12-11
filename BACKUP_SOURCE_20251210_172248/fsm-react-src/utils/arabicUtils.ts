/**
 * Utility functions for handling Arabic text and numerals
 */

// Map of Arabic-Indic numerals to ASCII numerals
const arabicNumerals: { [key: string]: string } = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

/**
 * Convert Arabic-Indic numerals to ASCII numerals
 * @param text - Text containing Arabic numerals
 * @returns Text with ASCII numerals
 */
export const normalizeArabicNumerals = (text: string): string => {
  if (!text) return text;
  
  return text.split('').map(char => arabicNumerals[char] || char).join('');
};

/**
 * Check if text contains Arabic characters
 * @param text - Text to check
 * @returns True if text contains Arabic characters
 */
export const containsArabic = (text: string): boolean => {
  if (!text) return false;
  return /[\u0600-\u06FF]/.test(text);
};

/**
 * Validate bilingual input (requires at least one language to be filled)
 * @param english - English text
 * @param arabic - Arabic text
 * @returns True if at least one field is filled
 */
export const validateBilingualInput = (english: string, arabic: string): boolean => {
  return !!(english && english.trim().length > 0) || !!(arabic && arabic.trim().length > 0);
};

/**
 * Get display text based on language preference
 * @param english - English text
 * @param arabic - Arabic text (nullable/undefined)
 * @param preferArabic - Whether to prefer Arabic
 * @returns Display text
 */
export const getBilingualDisplay = (english: string, arabic: string | null | undefined, preferArabic: boolean = false): string => {
  // If Arabic is preferred but not available, return English as fallback
  if (preferArabic) {
    return arabic || english || '';
  }
  // For English preference, return English or Arabic as fallback
  return english || arabic || '';
};
