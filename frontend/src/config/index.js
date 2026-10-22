// Frontend Global Configuration
export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '/api'),
  awsRegion: import.meta.env.VITE_AWS_REGION || 'us-east-1',
  campusName: import.meta.env.VITE_CAMPUS_NAME || 'Metropolitan University',
  appName: import.meta.env.VITE_APP_NAME || 'CampusFind',
  tagline: import.meta.env.VITE_APP_TAGLINE || "Lost something? Let's find it.",
  maxImageSizeMb: Number(import.meta.env.VITE_MAX_IMAGE_SIZE_MB) || 5,
  cognito: {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
  },
};

export const CATEGORIES = [
  { id: 'electronics', label: 'Electronics', icon: 'Laptop', description: 'Laptops, phones, headphones, chargers, tablets' },
  { id: 'bags', label: 'Bags & Wallets', icon: 'Briefcase', description: 'Backpacks, purses, totes, wallets, pouches' },
  { id: 'id_cards', label: 'ID Cards & Passes', icon: 'CreditCard', description: 'Student IDs, driver licenses, transit passes, keys cards' },
  { id: 'books', label: 'Books & Stationery', icon: 'BookOpen', description: 'Textbooks, notebooks, binders, pencil cases, calculators' },
  { id: 'clothing', label: 'Clothing & Apparel', icon: 'Shirt', description: 'Jackets, hoodies, caps, scarves, umbrellas, glasses' },
  { id: 'keys', label: 'Keys', icon: 'Key', description: 'Dorm keys, car keys, bike lock keys, keychains' },
  { id: 'accessories', label: 'Accessories', icon: 'Watch', description: 'Watches, jewelry, water bottles, sports gear' },
  { id: 'other', label: 'Other Belongings', icon: 'HelpCircle', description: 'Miscellaneous campus items and supplies' },
];

export const STATUS_CONFIG = {
  active: {
    label: 'Active',
    bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
  under_review: {
    label: 'Under Review',
    bgClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  returned: {
    label: 'Returned / Recovered',
    bgClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  archived: {
    label: 'Archived',
    bgClass: 'bg-slate-100 text-slate-600 border-slate-200',
    dotClass: 'bg-slate-400',
  },
};
