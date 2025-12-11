import { Box, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { autoTranslateBilingual } from '../../services/translationService';

interface BilingualTextFieldProps {
  labelEn: string;
  labelAr: string;
  valueEn: string;
  valueAr: string;
  onChangeEn: (value: string) => void;
  onChangeAr: (value: string) => void;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  helperText?: string;
}

/**
 * Bilingual text field component for English and Arabic input
 */

export default function BilingualTextField({
  labelEn,
  labelAr,
  valueEn,
  valueAr,
  onChangeEn,
  onChangeAr,
  required = false,
  multiline = false,
  rows,
  disabled = false,
  helperText,
}: BilingualTextFieldProps) {
  const { t } = useTranslation();
  const [isEnManuallyEdited, setIsEnManuallyEdited] = useState(false);
  const [isArManuallyEdited, setIsArManuallyEdited] = useState(false);

  // Live translation when English changes - REMOVED auto-translation on change
  const handleEnChange = (val: string) => {
    onChangeEn(val);
    setIsEnManuallyEdited(true);
  };

  // Live translation when Arabic changes - REMOVED auto-translation on change
  const handleArChange = (val: string) => {
    onChangeAr(val);
    setIsArManuallyEdited(true);
  };

  // Translate on Tab key press
  const handleEnKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && !isArManuallyEdited && valueEn.trim()) {
      const result = await autoTranslateBilingual(valueEn);
      if (!isArManuallyEdited && result.arabic !== valueAr) {
        onChangeAr(result.arabic);
      }
    }
  };

  // Translate on Tab key press
  const handleArKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && !isEnManuallyEdited && valueAr.trim()) {
      const result = await autoTranslateBilingual(valueAr);
      if (!isEnManuallyEdited && result.english !== valueEn) {
        onChangeEn(result.english);
      }
    }
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" gutterBottom display="block">
        {t('bilingualInput')} {required && '*'}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1, fontStyle: 'italic' }}>
        💡 {t('pressTabToTranslate') || 'Press Tab to auto-translate to the other language'}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
        <TextField
          fullWidth
          label={`${labelEn} (${t('english')})`}
          value={valueEn}
          onChange={(e) => handleEnChange(e.target.value)}
          onKeyDown={handleEnKeyDown}
          required={required && !valueAr}
          multiline={multiline}
          rows={rows}
          disabled={disabled}
          helperText={required && !valueEn && !valueAr ? t('atLeastOneLanguageRequired') : helperText}
          error={required && !valueEn && !valueAr}
        />
        <TextField
          fullWidth
          label={`${labelAr} (${t('arabic')})`}
          value={valueAr}
          onChange={(e) => handleArChange(e.target.value)}
          onKeyDown={handleArKeyDown}
          required={required && !valueEn}
          multiline={multiline}
          rows={rows}
          disabled={disabled}
          inputProps={{
            dir: 'rtl',
            style: { textAlign: 'right' },
          }}
        />
      </Box>
    </Box>
  );
}
