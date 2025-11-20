import { IconButton, Menu, MenuItem, Box, Typography } from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    handleClose();
  };

  const currentLanguage = i18n.language;

  return (
    <Box>
      <IconButton
        color="inherit"
        onClick={handleClick}
        sx={{
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 2,
        }}
      >
        <LanguageIcon />
        <Typography variant="body2" sx={{ ml: 1, fontWeight: 600 }}>
          {currentLanguage === 'ar' ? 'عربي' : 'EN'}
        </Typography>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem 
          onClick={() => changeLanguage('en')}
          selected={currentLanguage === 'en'}
          sx={{ minWidth: 150 }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <span>🇬🇧</span>
            <Typography>English</Typography>
          </Box>
        </MenuItem>
        <MenuItem 
          onClick={() => changeLanguage('ar')}
          selected={currentLanguage === 'ar'}
          sx={{ minWidth: 150 }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <span>🇸🇦</span>
            <Typography>العربية</Typography>
          </Box>
        </MenuItem>
      </Menu>
    </Box>
  );
}
