// App Constants
export const APP_CONFIG = {
  APP_NAME: 'FSM Mobile App',
  VERSION: '1.0.0',
  DEFAULT_LOCALE: 'en',
};

// Meeting Types
export const MEETING_TYPES = [
  'Introduction',
  'Enquiry',
  'Order',
  'Payment',
  'Follow-up',
] as const;

// Next Action Types
export const NEXT_ACTION_TYPES = [
  'Meeting',
  'Send Sample',
  'Visit Again with Management',
  'Invite to Factory',
] as const;

// Potential Levels
export const POTENTIAL_LEVELS = ['High', 'Medium', 'Low'] as const;

// Database Tables
export const TABLES = {
  SALESMEN: 'salesmen',
  CUSTOMERS: 'customers',
  PRODUCTS: 'products',
  VISITS: 'visits',
  COMPETITORS: 'competitors',
};

// Offline Sync Configuration
export const SYNC_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000, // 5 seconds
  BATCH_SIZE: 10,
  AUTO_SYNC_INTERVAL: 300000, // 5 minutes
};

// Location Configuration
export const LOCATION_CONFIG = {
  ACCURACY: 'high' as const,
  TIMEOUT: 15000,
  MAX_AGE: 10000,
};

// Notification Configuration
export const NOTIFICATION_CONFIG = {
  REMINDER_CHANNEL_ID: 'visit-reminders',
  REMINDER_CHANNEL_NAME: 'Visit Reminders',
  DEFAULT_REMINDER_TIME: '09:00', // 9 AM
};

// AI Configuration
export const AI_CONFIG = {
  MODEL: 'gpt-4-turbo-preview',
  MAX_TOKENS: 500,
  TEMPERATURE: 0.7,
  AUTOCOMPLETE_DEBOUNCE: 500, // milliseconds
};
