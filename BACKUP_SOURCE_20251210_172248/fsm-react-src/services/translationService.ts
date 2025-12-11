/**
 * Translation service using Google Cloud Translation API
 * Automatically translates text between Arabic and English
 */

const GOOGLE_TRANSLATE_API_KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY || 'AIzaSyDXKb4Z9X8xQZ5YvJ6mK3lN2pQ7rS9tU1V';
const TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';

export interface TranslationResult {
  translatedText: string;
  detectedSourceLanguage: string;
}

/**
 * Detect if text is primarily Arabic
 */
export const isArabicText = (text: string): boolean => {
  if (!text) return false;
  const arabicChars = text.match(/[\u0600-\u06FF]/g);
  return arabicChars ? arabicChars.length > text.length * 0.3 : false;
};

/**
 * Translate text using Google Cloud Translation API
 * @param text - Text to translate
 * @param targetLang - Target language code ('en' or 'ar')
 * @param sourceLang - Source language code (optional, auto-detect if not provided)
 */
export const translateText = async (
  text: string,
  targetLang: 'en' | 'ar' | 'ar-EG',
  sourceLang?: string
): Promise<TranslationResult> => {
  if (!text || text.trim().length === 0) {
    return {
      translatedText: '',
      detectedSourceLanguage: sourceLang || 'unknown',
    };
  }

  try {
    const params = new URLSearchParams({
      q: text,
      target: targetLang === 'ar' ? 'ar-EG' : targetLang,
      key: GOOGLE_TRANSLATE_API_KEY,
      format: 'text',
    });

    if (sourceLang) {
      params.append('source', sourceLang);
    }

    const response = await fetch(`${TRANSLATE_API_URL}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data.translations || data.data.translations.length === 0) {
      throw new Error('Invalid translation response');
    }

    const translation = data.data.translations[0];
    
    return {
      translatedText: translation.translatedText,
      detectedSourceLanguage: translation.detectedSourceLanguage || sourceLang || 'unknown',
    };
  } catch (error) {
    console.error('Translation error:', error);
    // Return original text if translation fails
    return {
      translatedText: text,
      detectedSourceLanguage: sourceLang || 'unknown',
    };
  }
};

/**
 * Auto-translate text to both English and Arabic
 * Detects source language and translates to the other
 */
export const autoTranslateBilingual = async (
  text: string
): Promise<{ english: string; arabic: string }> => {
  if (!text || text.trim().length === 0) {
    return { english: '', arabic: '' };
  }

  const isArabic = isArabicText(text);

  try {
    if (isArabic) {
      // Text is Arabic, translate to English
      const result = await translateText(text, 'en', 'ar-EG');
      return {
        english: result.translatedText,
        arabic: text, // Original Arabic
      };
    } else {
      // Text is English, translate to Egyptian Arabic
      const result = await translateText(text, 'ar-EG', 'en');
      return {
        english: text, // Original English
        arabic: result.translatedText,
      };
    }
  } catch (error) {
    console.error('Auto-translation error:', error);
    // If translation fails, store in appropriate field based on detection
    return isArabic 
      ? { english: text, arabic: text }
      : { english: text, arabic: '' };
  }
};

/**
 * Batch translate multiple texts
 * More efficient for multiple fields
 */
export const batchTranslate = async (
  texts: string[],
  targetLang: 'en' | 'ar'
): Promise<TranslationResult[]> => {
  if (!texts || texts.length === 0) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      target: targetLang,
      key: GOOGLE_TRANSLATE_API_KEY,
      format: 'text',
    });

    // Add all texts as separate 'q' parameters
    texts.forEach(text => {
      if (text && text.trim()) {
        params.append('q', text);
      }
    });

    const response = await fetch(`${TRANSLATE_API_URL}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Batch translation API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data.translations) {
      throw new Error('Invalid batch translation response');
    }

    return data.data.translations.map((translation: any) => ({
      translatedText: translation.translatedText,
      detectedSourceLanguage: translation.detectedSourceLanguage || 'unknown',
    }));
  } catch (error) {
    console.error('Batch translation error:', error);
    // Return original texts if translation fails
    return texts.map(text => ({
      translatedText: text,
      detectedSourceLanguage: 'unknown',
    }));
  }
};
