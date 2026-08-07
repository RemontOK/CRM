/** Производители устройств для выбора при создании заказа. */
export const DEVICE_BRAND_OPTIONS = [
  'Apple',
  'Samsung',
  'Xiaomi',
  'Huawei',
  'Honor',
  'Google',
  'OnePlus',
  'Oppo',
  'Realme',
  'Vivo',
  'Sony',
  'Asus',
  'Tecno',
  'Infinix',
  'Nokia',
  'Motorola',
  'Nothing',
  'Lenovo',
  'HP',
  'Dell',
  'Acer',
  'MSI',
  'Razer',
  'Alienware',
] as const;

const normalizeBrandKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Убирает префикс производителя из названия модели (Apple iPhone 15 → iPhone 15). */
export const stripBrandPrefixFromModel = (model: string, brand?: string): string => {
  const raw = (model || '').trim();
  const brandRaw = (brand || '').trim();
  if (!raw || !brandRaw) {
    return raw;
  }

  return raw.replace(new RegExp(`^${escapeRegExp(brandRaw)}\\s+`, 'i'), '').trim() || raw;
};

/** Определяет бренд по названию модели. */
export const inferDeviceBrandFromModel = (model?: string): string => {
  const raw = (model || '').trim();
  if (!raw) {
    return '';
  }

  const key = normalizeBrandKey(raw);

  if (
    key.includes('iphone') ||
    key.includes('ipad') ||
    key.includes('macbook') ||
    key.includes('imac') ||
    key.includes('mac studio') ||
    key.includes('mac pro') ||
    key.includes('apple watch') ||
    key.startsWith('apple ')
  ) {
    return 'Apple';
  }

  if (key.startsWith('poco') || key.includes(' redmi') || key.startsWith('redmi')) {
    return 'Xiaomi';
  }

  const brands = [...DEVICE_BRAND_OPTIONS].sort((a, b) => b.length - a.length);
  for (const brand of brands) {
    const brandKey = normalizeBrandKey(brand);
    if (key === brandKey || key.startsWith(`${brandKey} `) || key.includes(` ${brandKey} `)) {
      return brand;
    }
  }

  return '';
};

/** Фильтр моделей по выбранному производителю. */
export const filterModelsByBrand = (models: string[], brand?: string): string[] => {
  const brandKey = normalizeBrandKey(brand || '');
  if (!brandKey) {
    return models;
  }

  const filtered = models.filter((model) => {
    const key = normalizeBrandKey(model);
    if (brandKey === 'apple') {
      return (
        key.includes('apple') ||
        key.includes('iphone') ||
        key.includes('ipad') ||
        key.includes('macbook') ||
        key.includes('imac') ||
        key.includes('mac studio') ||
        key.includes('mac pro')
      );
    }
    if (brandKey === 'xiaomi') {
      return key.includes('xiaomi') || key.includes('redmi') || key.includes('poco');
    }
    return key === brandKey || key.startsWith(`${brandKey} `) || key.includes(` ${brandKey} `);
  });

  const stripped = filtered.map((model) => stripBrandPrefixFromModel(model, brand));
  const seen = new Set<string>();
  return stripped.filter((model) => {
    const key = normalizeBrandKey(model);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

/** Проверяет, относится ли модель к бренду. */
export const modelMatchesBrand = (model: string, brand: string): boolean => {
  if (!brand.trim()) {
    return true;
  }
  return filterModelsByBrand([model], brand).length > 0;
};
