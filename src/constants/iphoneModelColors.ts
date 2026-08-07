/** Цвета iPhone по моделям (из PhoneDevLib). */
export const IPHONE_MODEL_COLORS: Record<string, string[]> = {
  "iPhone 5": [
    "Black",
    "White"
  ],
  "iPhone 5S": [
    "Space Gray",
    "Silver",
    "Gold"
  ],
  "iPhone SE (2016)": [
    "Space Gray",
    "Silver",
    "Gold",
    "Rose Gold"
  ],
  "iPhone 6": [
    "Space Gray",
    "Silver",
    "Gold"
  ],
  "iPhone 6 Plus": [
    "Space Gray",
    "Silver",
    "Gold"
  ],
  "iPhone 6S": [
    "Space Gray",
    "Silver",
    "Gold",
    "Rose Gold"
  ],
  "iPhone 6S Plus": [
    "Space Gray",
    "Silver",
    "Gold",
    "Rose Gold"
  ],
  "iPhone 7": [
    "Black",
    "Jet Black",
    "Gold",
    "Rose Gold",
    "Silver",
    "(PRODUCT)RED"
  ],
  "iPhone 7 Plus": [
    "Black",
    "Jet Black",
    "Gold",
    "Rose Gold",
    "Silver",
    "(PRODUCT)RED"
  ],
  "iPhone 8": [
    "Gold",
    "Silver",
    "Space Gray",
    "(PRODUCT)RED"
  ],
  "iPhone 8 Plus": [
    "Gold",
    "Silver",
    "Space Gray",
    "(PRODUCT)RED"
  ],
  "iPhone X": [
    "Silver",
    "Space Gray"
  ],
  "iPhone Xs": [
    "Silver",
    "Space Gray",
    "Gold"
  ],
  "iPhone Xs Max": [
    "Silver",
    "Space Gray",
    "Gold"
  ],
  "iPhone XR": [
    "Black",
    "White",
    "Blue",
    "Yellow",
    "Coral",
    "(PRODUCT)RED"
  ],
  "iPhone 11": [
    "Purple",
    "Green",
    "Yellow",
    "Black",
    "White",
    "(PRODUCT)RED"
  ],
  "iPhone 11 Pro": [
    "Silver",
    "Space Gray",
    "Gold",
    "Midnight Green"
  ],
  "iPhone 11 Pro Max": [
    "Silver",
    "Space Gray",
    "Gold",
    "Midnight Green"
  ],
  "iPhone 12 mini": [
    "Black",
    "White",
    "(PRODUCT)RED",
    "Green",
    "Blue",
    "Purple"
  ],
  "iPhone 12": [
    "Black",
    "White",
    "(PRODUCT)RED",
    "Green",
    "Blue",
    "Purple"
  ],
  "iPhone 12 Pro": [
    "Silver",
    "Graphite",
    "Gold",
    "Pacific Blue"
  ],
  "iPhone 12 Pro Max": [
    "Silver",
    "Graphite",
    "Gold",
    "Pacific Blue"
  ],
  "iPhone 13 mini": [
    "(PRODUCT)RED",
    "Starlight",
    "Midnight",
    "Blue",
    "Pink",
    "Green"
  ],
  "iPhone 13": [
    "(PRODUCT)RED",
    "Starlight",
    "Midnight",
    "Blue",
    "Pink",
    "Green"
  ],
  "iPhone 13 Pro": [
    "Graphite",
    "Gold",
    "Silver",
    "Sierra Blue",
    "Alpine Green"
  ],
  "iPhone 13 Pro Max": [
    "Graphite",
    "Gold",
    "Silver",
    "Sierra Blue",
    "Alpine Green"
  ],
  "iPhone 14": [
    "Midnight",
    "Starlight",
    "(PRODUCT)RED",
    "Blue",
    "Purple",
    "Yellow"
  ],
  "iPhone 14 Plus": [
    "Midnight",
    "Starlight",
    "(PRODUCT)RED",
    "Blue",
    "Purple",
    "Yellow"
  ],
  "iPhone 14 Pro": [
    "Silver",
    "Gold",
    "Space Black",
    "Deep Purple"
  ],
  "iPhone 14 Pro Max": [
    "Silver",
    "Gold",
    "Space Black",
    "Deep Purple"
  ],
  "iPhone 15": [
    "Black",
    "Blue",
    "Green",
    "Yellow",
    "Pink"
  ],
  "iPhone 15 Plus": [
    "Black",
    "Blue",
    "Green",
    "Yellow",
    "Pink"
  ],
  "iPhone 15 Pro": [
    "Black Titanium",
    "White Titanium",
    "Blue Titanium",
    "Natural Titanium"
  ],
  "iPhone 15 Pro Max": [
    "Black Titanium",
    "White Titanium",
    "Blue Titanium",
    "Natural Titanium"
  ],
  "iPhone 16e": [
    "Black",
    "White"
  ],
  "iPhone 16": [
    "Black",
    "White",
    "Pink",
    "Teal",
    "Ultramarine"
  ],
  "iPhone 16 Plus": [
    "Black",
    "White",
    "Pink",
    "Teal",
    "Ultramarine"
  ],
  "iPhone 16 Pro": [
    "Black Titanium",
    "White Titanium",
    "Natural Titanium",
    "Desert Titanium"
  ],
  "iPhone 16 Pro Max": [
    "Black Titanium",
    "White Titanium",
    "Natural Titanium",
    "Desert Titanium"
  ],
  "iPhone 17e": [
    "Black",
    "White",
    "Soft Pink"
  ],
  "iPhone 17": [
    "Black",
    "White",
    "Mist Blue",
    "Sage",
    "Lavender"
  ],
  "iPhone Air": [
    "Space Black",
    "Cloud White",
    "Light Gold",
    "Sky Blue"
  ],
  "iPhone 17 Pro": [
    "Silver",
    "Cosmic Orange",
    "Deep Blue"
  ],
  "iPhone 17 Pro Max": [
    "Silver",
    "Cosmic Orange",
    "Deep Blue"
  ]
};

const normalizeModelKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^apple\s+/i, '')
    .replace(/\s+/g, ' ');

/** Возвращает цвета для модели iPhone или пустой массив. */
export const getIphoneColorsForModel = (model?: string): string[] => {
  const raw = (model || '').trim();
  if (!raw) {
    return [];
  }

  const key = normalizeModelKey(raw);
  const entries = Object.entries(IPHONE_MODEL_COLORS).map(([name, colors]) => ({
    name,
    colors,
    n: normalizeModelKey(name),
  }));

  const exact = entries.find((item) => item.n === key);
  if (exact) {
    return exact.colors;
  }

  const partial = entries
    .filter((item) => key.includes(item.n) || item.n.includes(key))
    .sort((a, b) => b.n.length - a.n.length);

  return partial[0]?.colors || [];
};

export const IPHONE_MODEL_OPTIONS = Object.keys(IPHONE_MODEL_COLORS);
