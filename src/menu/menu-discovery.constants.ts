/** Food discovery category keywords — keep in sync with Ethics-app menuDiscoveryCategories.js */
export type DiscoveryCategory = {
  key: string;
  label: string;
  keywords: string[];
};

export const DISCOVERY_MENU_CATEGORIES: DiscoveryCategory[] = [
  { key: 'bread', label: 'Bread', keywords: ['bread', 'naan', 'roti', 'paratha', 'pita', 'baguette', 'loaf'] },
  { key: 'bangladeshi', label: 'Bangla Food', keywords: ['bangla', 'bangladeshi', 'bengali', 'bangla food'] },
  { key: 'burger', label: 'Burger', keywords: ['burger', 'hamburger', 'cheeseburger', 'smash burger'] },
  { key: 'biryani', label: 'Biryani', keywords: ['biryani', 'biriyani', 'pulao', 'pilaf', 'kacchi'] },
  { key: 'chicken', label: 'Chicken', keywords: ['chicken', 'wings', 'drumstick', 'tandoori chicken', 'fried chicken', 'roast chicken'] },
  { key: 'pizza', label: 'Pizza', keywords: ['pizza', 'calzone', 'margherita', 'pepperoni'] },
  {
    key: 'indian',
    label: 'Indian Food',
    keywords: ['indian', 'indian food', 'curry', 'masala', 'samosa', 'bhaji', 'korma', 'vindaloo', 'balti', 'dosa'],
  },
  { key: 'wok', label: 'Wok Food', keywords: ['wok', 'wok food', 'stir fry', 'stir-fry', 'stir fried', 'wok fried', 'wok noodles', 'wok rice'] },
  { key: 'thai', label: 'Thai', keywords: ['thai', 'pad thai', 'tom yum', 'green curry', 'basil'] },
  { key: 'chinese', label: 'Chinese', keywords: ['chinese', 'chinese food', 'noodle', 'dim sum', 'fried rice', 'chow mein', 'dumpling'] },
  { key: 'breakfast', label: 'Breakfast', keywords: ['breakfast', 'pancake', 'waffle', 'omelette', 'omelet', 'egg', 'croissant', 'porridge', 'cereal'] },
  { key: 'pasta', label: 'Pasta', keywords: ['pasta', 'spaghetti', 'lasagna', 'lasagne', 'penne', 'carbonara'] },
  {
    key: 'italian',
    label: 'Italian food',
    keywords: ['italian', 'italian food', 'pasta', 'spaghetti', 'lasagna', 'lasagne', 'penne', 'carbonara', 'risotto', 'gnocchi', 'margherita'],
  },
  {
    key: 'chef_specialties',
    label: 'Chef specialties',
    keywords: ['chef', 'specialty', 'specialties', 'special', 'signature', 'house special', 'chef special', 'chef specialty'],
  },
  {
    key: 'starters',
    label: 'Starters',
    keywords: ['starter', 'starters', 'appetizer', 'appetiser', 'appetizers', 'nibbles', 'side dish', 'small plate'],
  },
  {
    key: 'mains',
    label: 'Mains',
    keywords: ['main', 'mains', 'main course', 'maincourse', 'main dish', 'dinner', 'lunch special'],
  },
  {
    key: 'desserts',
    label: 'Desserts',
    keywords: ['dessert', 'desserts', 'sweet', 'sweets', 'cake', 'ice cream', 'kulfi', 'gulab jamun', 'pudding', 'mithai', 'brownie', 'cheesecake'],
  },
  {
    key: 'rice_or_naan',
    label: 'Rice or nan',
    keywords: ['rice', 'naan', 'nan', 'biryani', 'biriyani', 'pilaf', 'pulao', 'roti', 'paratha', 'jeera rice', 'fried rice', 'plain rice', 'garlic naan'],
  },
  { key: 'tandoori', label: 'Tandoori', keywords: ['tandoori', 'tandoor', 'tandoori chicken', 'tandoori lamb'] },
  { key: 'tikka', label: 'Tikka', keywords: ['tikka', 'chicken tikka', 'paneer tikka', 'lamb tikka', 'fish tikka', 'tikka masala'] },
  { key: 'cakes', label: 'Cakes', keywords: ['cake', 'cupcake', 'pastry', 'brownie', 'cheesecake', 'dessert', 'muffin', 'donut', 'doughnut'] },
  { key: 'seafood', label: 'Seafood', keywords: ['seafood', 'fish', 'prawn', 'shrimp', 'salmon', 'tuna', 'crab'] },
  { key: 'bbq', label: 'BBQ', keywords: ['bbq', 'barbecue', 'grill', 'kebab', 'skewer'] },
  { key: 'coffee', label: 'Coffee', keywords: ['coffee', 'latte', 'cappuccino', 'espresso', 'cafe'] },
  { key: 'healthy', label: 'Healthy', keywords: ['salad', 'vegan', 'vegetarian', 'healthy', 'bowl', 'smoothie'] },
];

export function normalizeDiscoveryText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

const DISCOVERY_CATEGORY_ALIASES: Record<string, string> = {
  'bangla food': 'bangladeshi',
  bangla: 'bangladeshi',
  bengali: 'bangladeshi',
  'bengali food': 'bangladeshi',
  bangladeshi: 'bangladeshi',
  'indian food': 'indian',
  indian: 'indian',
  'chinese food': 'chinese',
  chinese: 'chinese',
  'italian food': 'italian',
  italian: 'italian',
  'chef specialties': 'chef_specialties',
  'chef specialty': 'chef_specialties',
  chef_specialties: 'chef_specialties',
  starter: 'starters',
  starters: 'starters',
  main: 'mains',
  mains: 'mains',
  dessert: 'desserts',
  desserts: 'desserts',
  'rice or nan': 'rice_or_naan',
  'rice or naan': 'rice_or_naan',
  rice_or_naan: 'rice_or_naan',
  tandoori: 'tandoori',
  tikka: 'tikka',
  'wok food': 'wok',
  wok: 'wok',
};

export function resolveDiscoveryCategory(filter: string): DiscoveryCategory | null {
  const k = normalizeDiscoveryText(filter);
  if (!k) return null;
  const mappedKey = DISCOVERY_CATEGORY_ALIASES[k] || k;
  return (
    DISCOVERY_MENU_CATEGORIES.find((c) => c.key === mappedKey) ||
    DISCOVERY_MENU_CATEGORIES.find((c) => c.key === k) ||
    DISCOVERY_MENU_CATEGORIES.find((c) => normalizeDiscoveryText(c.label) === k) ||
    null
  );
}

export function menuItemBlob(item: {
  itemName?: string | null;
  description?: string | null;
  category?: { name?: string | null } | null;
}): string {
  const parts = [item.itemName, item.description, item.category?.name].filter(Boolean);
  return normalizeDiscoveryText(parts.join(' '));
}

export function menuItemMatchesCategory(
  item: {
    itemName?: string | null;
    description?: string | null;
    category?: { name?: string | null } | null;
  },
  filter: string,
): boolean {
  const key = normalizeDiscoveryText(filter);
  if (!key) return true;

  const discovery = resolveDiscoveryCategory(key);
  const blob = menuItemBlob(item);
  if (!blob) return false;

  if (discovery) {
    return discovery.keywords.some((kw) => blob.includes(normalizeDiscoveryText(kw)));
  }

  const catName = normalizeDiscoveryText(item.category?.name);
  if (catName && (catName === key || catName.includes(key) || key.includes(catName))) {
    return true;
  }
  return blob.includes(key);
}
