export type PriceListItem = {
  id: string;
  deviceType: string;
  model: string;
  workName: string;
  partName: string;
  partCost: number;
  workCost: number;
};

export const priceListStorageKey = 'crm_price_list_ekb_2026_v1';

export const deviceTypes = ['phone', 'tablet', 'laptop', 'desktop', 'other'];

export const deviceTypeLabels: Record<string, string> = {
  phone: 'Телефон',
  tablet: 'Планшет',
  laptop: 'Ноутбук',
  desktop: 'Компьютер',
  other: 'Другое',
};

const deviceModelsByType: Record<string, string[]> = {
  phone: [
    'Apple iPhone 15 Pro Max', 'Apple iPhone 15 Pro', 'Apple iPhone 15', 'Apple iPhone 14 Pro Max', 'Apple iPhone 14 Pro', 'Apple iPhone 14',
    'Apple iPhone 13 Pro Max', 'Apple iPhone 13 Pro', 'Apple iPhone 13', 'Apple iPhone 12 Pro Max', 'Apple iPhone 12 Pro', 'Apple iPhone 12',
    'Apple iPhone 11 Pro Max', 'Apple iPhone 11 Pro', 'Apple iPhone 11', 'Apple iPhone SE',
    'Samsung Galaxy S24 Ultra', 'Samsung Galaxy S24+', 'Samsung Galaxy S24', 'Samsung Galaxy S23 Ultra', 'Samsung Galaxy S23+', 'Samsung Galaxy S23',
    'Samsung Galaxy A54', 'Samsung Galaxy A34', 'Samsung Galaxy A24', 'Samsung Galaxy Z Fold 5', 'Samsung Galaxy Z Flip 5',
    'Xiaomi Mi 14 Pro', 'Xiaomi Mi 14', 'Xiaomi Redmi Note 13 Pro', 'Xiaomi Redmi Note 13', 'Xiaomi Redmi 12', 'POCO X6 Pro', 'POCO F5',
    'Huawei P60 Pro', 'Huawei P60', 'Huawei Mate 60 Pro', 'Huawei nova 11', 'Huawei nova 10',
    'Honor Magic 5 Pro', 'Honor Magic 5', 'Honor 90 Pro', 'Honor 90', 'Honor X50',
    'Realme GT 5', 'Realme 11 Pro+', 'Realme 11 Pro', 'Realme C55',
    'Oppo Find X6 Pro', 'Oppo Reno 10 Pro', 'Oppo Reno 10', 'Oppo A78',
    'Vivo X90 Pro', 'Vivo V29', 'Vivo V27', 'Vivo Y36',
    'Google Pixel 8 Pro', 'Google Pixel 8', 'Google Pixel 7 Pro', 'Google Pixel 7',
    'Sony Xperia 1 V', 'Sony Xperia 5 V', 'OnePlus 12', 'OnePlus 11', 'Asus ROG Phone 7', 'Asus ZenFone 10',
  ],
  tablet: [
    'Apple iPad Pro', 'Apple iPad Air', 'Apple iPad', 'Apple iPad mini',
    'Samsung Galaxy Tab S9', 'Samsung Galaxy Tab A8',
    'Xiaomi Mi Pad 6', 'Huawei MatePad Pro', 'OnePlus Pad Go', 'Google Pixel Tablet', 'Lenovo Tab P11', 'Nokia T20',
  ],
  laptop: [
    'Apple MacBook Pro', 'Apple MacBook Air',
    'Asus VivoBook', 'Asus ROG Strix', 'Asus TUF Gaming',
    'Lenovo ThinkPad', 'Lenovo IdeaPad', 'Lenovo Yoga',
    'HP Pavilion', 'HP Envy', 'HP Spectre', 'HP EliteBook', 'HP ProBook',
    'Dell XPS 13', 'Dell XPS 15', 'Dell Inspiron', 'Dell Latitude', 'Dell Precision',
    'Acer Aspire', 'Acer Swift', 'Acer Nitro', 'Acer Predator',
    'MSI Stealth', 'MSI Raider', 'MSI Katana', 'MSI Sword', 'MSI Creator',
    'Razer Blade 15', 'Razer Blade 17', 'Razer Blade Stealth', 'Alienware m15', 'Alienware m17', 'Alienware x15', 'Alienware x17',
  ],
  desktop: [
    'Apple iMac', 'Apple Mac Studio', 'Apple Mac Pro',
    'Dell OptiPlex', 'Dell Precision', 'HP ProDesk', 'HP EliteDesk',
    'Lenovo ThinkCentre', 'Acer Predator Orion', 'MSI Trident', 'Alienware Aurora',
  ],
  other: [
    'Apple Watch', 'Samsung Galaxy Watch', 'Xiaomi Mi Watch', 'Huawei Watch GT 4',
    'Sony WH-1000XM5', 'Sony WF-1000XM5',
  ],
};

const priceWorkNamesByType: Record<string, string[]> = {
  phone: [
    'Диагностика устройства',
    'Замена экрана оригинал',
    'Замена экрана копия',
    'Замена аккумулятора оригинал',
    'Замена аккумулятора копия',
    'Замена кнопки питания',
    'Замена кнопки громкости',
    'Замена динамика',
    'Замена микрофона',
    'Замена камеры',
    'Замена разъема зарядки',
    'Замена нижнего шлейфа',
    'Замена разъема наушников',
    'Замена корпуса',
    'Замена задней крышки',
    'Замена материнской платы',
    'Ремонт кнопки питания',
    'Ремонт кнопки громкости',
    'Ремонт динамика',
    'Ремонт микрофона',
    'Ремонт камеры',
    'Ремонт разъема зарядки',
    'Ремонт корпуса',
    'Прошивка устройства',
    'Восстановление системы',
    'Восстановление данных',
    'Ремонт после попадания воды',
    'Ремонт после падения',
    'Замена защитного стекла',
    'Установка защитного стекла',
    'Замена пленки',
    'Установка пленки',
    'Чистка устройства',
    'Полировка корпуса',
  ],
  tablet: [
    'Диагностика устройства',
    'Замена экрана оригинал',
    'Замена экрана копия',
    'Замена аккумулятора оригинал',
    'Замена аккумулятора копия',
    'Замена кнопки питания',
    'Замена кнопки громкости',
    'Замена динамика',
    'Замена микрофона',
    'Замена камеры',
    'Замена разъема зарядки',
    'Замена нижнего шлейфа',
    'Замена корпуса',
    'Замена материнской платы',
    'Ремонт разъема зарядки',
    'Ремонт корпуса',
    'Прошивка устройства',
    'Восстановление системы',
    'Восстановление данных',
    'Ремонт после попадания воды',
    'Ремонт после падения',
    'Замена защитного стекла',
    'Установка защитного стекла',
    'Замена пленки',
    'Установка пленки',
    'Чистка устройства',
  ],
  laptop: [
    'Диагностика устройства',
    'Замена экрана оригинал',
    'Замена экрана копия',
    'Замена аккумулятора оригинал',
    'Замена аккумулятора копия',
    'Замена клавиатуры',
    'Замена тачпада',
    'Замена веб-камеры',
    'Замена разъема зарядки',
    'Замена корпуса',
    'Замена материнской платы',
    'Замена процессора',
    'Замена оперативной памяти',
    'Замена накопителя',
    'Замена системы охлаждения',
    'Замена вентилятора',
    'Замена термопасты',
    'Ремонт корпуса',
    'Ремонт материнской платы',
    'Ремонт системы охлаждения',
    'Установка операционной системы',
    'Восстановление системы',
    'Восстановление данных',
    'Обновление программного обеспечения',
    'Настройка устройства',
    'Настройка сети',
    'Настройка Wi-Fi',
    'Оптимизация производительности',
    'Удаление вирусов',
    'Восстановление после вирусов',
    'Очистка от пыли',
    'Очистка системы охлаждения',
    'Чистка устройства',
    'Ремонт после попадания воды',
    'Ремонт после падения',
  ],
  desktop: [
    'Диагностика устройства',
    'Замена материнской платы',
    'Замена процессора',
    'Замена оперативной памяти',
    'Замена накопителя',
    'Замена системы охлаждения',
    'Замена вентилятора',
    'Замена термопасты',
    'Ремонт корпуса',
    'Ремонт материнской платы',
    'Ремонт системы охлаждения',
    'Установка операционной системы',
    'Восстановление системы',
    'Восстановление данных',
    'Обновление программного обеспечения',
    'Настройка устройства',
    'Настройка сети',
    'Настройка Wi-Fi',
    'Оптимизация производительности',
    'Удаление вирусов',
    'Восстановление после вирусов',
    'Очистка от пыли',
    'Очистка системы охлаждения',
    'Чистка устройства',
    'Ремонт после скачка напряжения',
    'Ремонт после механических повреждений',
  ],
  other: [
    'Диагностика устройства',
    'Настройка устройства',
    'Обновление программного обеспечения',
    'Восстановление данных',
    'Чистка устройства',
    'Полировка корпуса',
    'Ремонт после попадания воды',
    'Ремонт после падения',
    'Ремонт после механических повреждений',
  ],
};

export const isAllowedPriceListItem = (item: PriceListItem) => {
  const normalizedWorkName = item.workName.trim().toLowerCase();
  if (normalizedWorkName.includes('диагност')) {
    return normalizedWorkName === 'диагностика устройства' || normalizedWorkName === 'диагностика';
  }

  if (item.id.startsWith('custom_')) {
    return true;
  }

  const allowedWorks = priceWorkNamesByType[item.deviceType] || priceWorkNamesByType.other;
  return allowedWorks.some((workName) => workName.toLowerCase() === normalizedWorkName);
};

const roundPrice = (value: number, step = 100) => Math.max(0, Math.round(value / step) * step);

const getIphoneGeneration = (model: string) => {
  const match = model.match(/iphone\s*(\d+)/i);
  return match ? Number(match[1]) : 0;
};

const getModelPriceProfile = (deviceType: string, model: string) => {
  const lowerModel = model.toLowerCase();
  const isApple = lowerModel.includes('apple') || lowerModel.includes('iphone') || lowerModel.includes('ipad') || lowerModel.includes('mac');
  const isProMax = /pro max|ultra|fold|xps 17|mac pro|m3 max/i.test(model);
  const isPro = / pro|plus|\+|max|ultra|fold|flip|xps|spectre|elitebook|thinkpad|rog|raider|predator|alienware/i.test(model);
  const isBudget = /se|redmi|poco|galaxy a|tab a|c55|a78|y36|inspiron|ideapad|pavilion|aspire/i.test(model);
  const generation = getIphoneGeneration(model);

  let classFactor = 1;
  if (isProMax) {
    classFactor = 1.28;
  } else if (isPro) {
    classFactor = 1.14;
  } else if (isBudget) {
    classFactor = 0.78;
  }

  if (deviceType === 'tablet') {
    classFactor *= 1.18;
  }
  if (deviceType === 'laptop') {
    classFactor *= 1.75;
  }
  if (deviceType === 'desktop') {
    classFactor *= 1.55;
  }

  let ageFactor = 1;
  if (generation >= 15) {
    ageFactor = 1.18;
  } else if (generation === 14) {
    ageFactor = 1.06;
  } else if (generation === 13) {
    ageFactor = 0.96;
  } else if (generation === 12) {
    ageFactor = 0.86;
  } else if (generation > 0 && generation <= 11) {
    ageFactor = 0.72;
  }

  const brandFactor = isApple ? 1.2 : lowerModel.includes('samsung') ? 1.08 : 0.92;
  return {
    partFactor: classFactor * ageFactor * brandFactor,
    workFactor: Math.max(0.85, Math.min(1.45, classFactor * (deviceType === 'phone' ? 1 : 1.08))),
  };
};

const getPhoneScreenBase = (model: string, isOriginal: boolean) => {
  const generation = getIphoneGeneration(model);
  const lowerModel = model.toLowerCase();
  if (generation >= 15) return isOriginal ? 31900 : 17900;
  if (generation === 14) return isOriginal ? 27900 : 15900;
  if (generation === 13) return isOriginal ? 23900 : 13900;
  if (generation === 12) return isOriginal ? 19900 : 10900;
  if (generation > 0) return isOriginal ? 13900 : 7900;
  if (lowerModel.includes('fold')) return isOriginal ? 34900 : 22900;
  if (lowerModel.includes('flip')) return isOriginal ? 24900 : 16900;
  if (lowerModel.includes('ultra')) return isOriginal ? 22900 : 13900;
  return isOriginal ? 15900 : 8900;
};

const splitTotalPrice = (total: number, workCost: number) => ({
  partCost: Math.max(0, roundPrice(total - workCost)),
  workCost: roundPrice(workCost),
});

const getDefaultPriceByWork = (workName: string, deviceType: string, model: string) => {
  const normalized = workName.toLowerCase();
  const profile = getModelPriceProfile(deviceType, model);

  if ((normalized.includes('экран') || normalized.includes('дисплей')) && normalized.includes('оригинал')) {
    const total = deviceType === 'phone'
      ? getPhoneScreenBase(model, true)
      : roundPrice(16500 * profile.partFactor);
    return splitTotalPrice(total, 3500 * profile.workFactor);
  }
  if ((normalized.includes('экран') || normalized.includes('дисплей')) && normalized.includes('копия')) {
    const total = deviceType === 'phone'
      ? getPhoneScreenBase(model, false)
      : roundPrice(9800 * profile.partFactor);
    return splitTotalPrice(total, 3200 * profile.workFactor);
  }
  if ((normalized.includes('батар') || normalized.includes('аккумулятор')) && normalized.includes('оригинал')) {
    const total = roundPrice((deviceType === 'laptop' ? 10500 : deviceType === 'tablet' ? 7900 : 6900) * profile.partFactor);
    return splitTotalPrice(total, 1900 * profile.workFactor);
  }
  if ((normalized.includes('батар') || normalized.includes('аккумулятор')) && normalized.includes('копия')) {
    const total = roundPrice((deviceType === 'laptop' ? 7600 : deviceType === 'tablet' ? 5900 : 5200) * profile.partFactor);
    return splitTotalPrice(total, 1700 * profile.workFactor);
  }
  if (normalized.includes('экран') || normalized.includes('дисплей')) {
    return splitTotalPrice(roundPrice(11900 * profile.partFactor), 3200 * profile.workFactor);
  }
  if (normalized.includes('батар') || normalized.includes('аккумулятор')) {
    return splitTotalPrice(roundPrice(4900 * profile.partFactor), 1700 * profile.workFactor);
  }
  if (normalized.includes('разъема зарядки') || normalized.includes('нижнего шлейфа')) {
    return { partCost: roundPrice(1800 * profile.partFactor), workCost: roundPrice(2300 * profile.workFactor) };
  }
  if (normalized.includes('камер')) {
    return { partCost: roundPrice(3500 * profile.partFactor), workCost: roundPrice(2400 * profile.workFactor) };
  }
  if (normalized.includes('динамик') || normalized.includes('микрофон')) {
    return { partCost: roundPrice(1400 * profile.partFactor), workCost: roundPrice(1900 * profile.workFactor) };
  }
  if (normalized.includes('кнопк')) {
    return { partCost: roundPrice(1300 * profile.partFactor), workCost: roundPrice(2100 * profile.workFactor) };
  }
  if (normalized.includes('материнск') || normalized.includes('плат')) {
    return { partCost: roundPrice(8500 * profile.partFactor), workCost: roundPrice(5500 * profile.workFactor) };
  }
  if (normalized.includes('корпус') || normalized.includes('крышк')) {
    return { partCost: roundPrice(4200 * profile.partFactor), workCost: roundPrice(3500 * profile.workFactor) };
  }
  if (normalized.includes('чист')) return { partCost: 0, workCost: roundPrice(1200 * profile.workFactor) };
  if (normalized.includes('стекл') || normalized.includes('пленк')) {
    return { partCost: roundPrice(900 * profile.partFactor), workCost: roundPrice(900 * profile.workFactor) };
  }
  if (normalized.includes('прошив') || normalized.includes('систем') || normalized.includes('настрой')) {
    return { partCost: 0, workCost: roundPrice(1800 * profile.workFactor) };
  }
  if (normalized.includes('данн')) return { partCost: 0, workCost: roundPrice(3500 * profile.workFactor) };
  if (normalized.includes('вод') || normalized.includes('паден') || normalized.includes('механическ')) {
    return { partCost: roundPrice(2500 * profile.partFactor), workCost: roundPrice(4500 * profile.workFactor) };
  }
  if (normalized.includes('диагност')) return { partCost: 0, workCost: 0 };

  return { partCost: 0, workCost: roundPrice(1800 * profile.workFactor) };
};

export const createDefaultPriceList = (): PriceListItem[] =>
  Object.entries(deviceModelsByType).flatMap(([deviceType, models]) =>
    models.flatMap((model) =>
      (priceWorkNamesByType[deviceType] || priceWorkNamesByType.other).map((workName) => {
        const defaultPrice = getDefaultPriceByWork(workName, deviceType, model);
        return {
          id: `${deviceType}_${model}_${workName}`.replace(/\s+/g, '_').toLowerCase(),
          deviceType,
          model,
          workName,
          partName: defaultPrice.partCost > 0 ? workName : '',
          partCost: defaultPrice.partCost,
          workCost: defaultPrice.workCost,
        };
      })
    )
  );

export const getSavedPriceList = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(priceListStorageKey) || '[]');
    if (!Array.isArray(saved) || saved.length === 0) {
      return createDefaultPriceList();
    }

    const savedAllowed = (saved as PriceListItem[]).filter(isAllowedPriceListItem);
    const savedKeys = new Set(
      savedAllowed.map((item) => `${item.deviceType}|${item.model}|${item.workName}`.toLowerCase())
    );
    const missingDefaults = createDefaultPriceList().filter(
      (item) => !savedKeys.has(`${item.deviceType}|${item.model}|${item.workName}`.toLowerCase())
    );

    return [...savedAllowed, ...missingDefaults];
  } catch {
    return createDefaultPriceList();
  }
};

export const getPriceBrand = (model: string) => model.trim().split(/\s+/)[0] || 'Без бренда';

const normalizePriceSearchText = (value: string) =>
  value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim();

const priceSearchAliases: Record<string, string[]> = {
  акб: ['акб', 'аккумулятор', 'батарея', 'батареи', 'батар'],
  аккум: ['аккумулятор', 'батарея', 'батареи', 'батар'],
  аккумулятор: ['аккумулятор', 'батарея', 'батареи', 'батар'],
  батарея: ['аккумулятор', 'батарея', 'батареи', 'батар'],
  батареи: ['аккумулятор', 'батарея', 'батареи', 'батар'],
  раз: ['раз', 'разъем', 'разъема', 'разьем', 'разьема', 'нижний', 'шлейф', 'заряд', 'зарядки'],
  разъем: ['разъем', 'разъема', 'разьем', 'разьема', 'нижний', 'шлейф', 'заряд', 'зарядки'],
  разьем: ['разъем', 'разъема', 'разьем', 'разьема', 'нижний', 'шлейф', 'заряд', 'зарядки'],
  зарядка: ['разъем', 'разъема', 'разьем', 'разьема', 'заряд', 'зарядки'],
  зарядки: ['разъем', 'разъема', 'разьем', 'разьема', 'заряд', 'зарядки'],
  шлейф: ['шлейф', 'нижний', 'разъем', 'разъема', 'заряд', 'зарядки'],
  экран: ['экран', 'дисп', 'дисплей', 'модуль'],
  дисп: ['экран', 'дисп', 'дисплей', 'модуль'],
  дисплей: ['экран', 'дисп', 'дисплей', 'модуль'],
  стекло: ['стекло', 'защитное', 'пленка'],
  пленка: ['стекло', 'защитное', 'пленка'],
};

const getPriceSearchGroups = (query: string) =>
  normalizePriceSearchText(query)
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => priceSearchAliases[token] || [token]);

export const matchesPriceSearch = (item: PriceListItem, query: string) => {
  const groups = getPriceSearchGroups(query);
  if (groups.length === 0) {
    return true;
  }

  const haystack = normalizePriceSearchText(
    [
      deviceTypeLabels[item.deviceType] || item.deviceType,
      getPriceBrand(item.model),
      item.model,
      item.workName,
      item.partName,
    ].join(' ')
  );

  return groups.every((group) =>
    group.some((term) => haystack.includes(normalizePriceSearchText(term)))
  );
};
