export interface DeviceModel {
  brand: string;
  model: string;
  type: 'phone' | 'tablet' | 'laptop' | 'desktop' | 'other';
  category: string;
  year?: number;
  popular: boolean;
}

export const deviceDatabase: DeviceModel[] = [
  // iPhone
  { brand: 'Apple', model: 'iPhone 15 Pro Max', type: 'phone', category: 'iPhone', year: 2023, popular: true },
  { brand: 'Apple', model: 'iPhone 15 Pro', type: 'phone', category: 'iPhone', year: 2023, popular: true },
  { brand: 'Apple', model: 'iPhone 15', type: 'phone', category: 'iPhone', year: 2023, popular: true },
  { brand: 'Apple', model: 'iPhone 14 Pro Max', type: 'phone', category: 'iPhone', year: 2022, popular: true },
  { brand: 'Apple', model: 'iPhone 14 Pro', type: 'phone', category: 'iPhone', year: 2022, popular: true },
  { brand: 'Apple', model: 'iPhone 14', type: 'phone', category: 'iPhone', year: 2022, popular: true },
  { brand: 'Apple', model: 'iPhone 13 Pro Max', type: 'phone', category: 'iPhone', year: 2021, popular: true },
  { brand: 'Apple', model: 'iPhone 13 Pro', type: 'phone', category: 'iPhone', year: 2021, popular: true },
  { brand: 'Apple', model: 'iPhone 13', type: 'phone', category: 'iPhone', year: 2021, popular: true },
  { brand: 'Apple', model: 'iPhone 12 Pro Max', type: 'phone', category: 'iPhone', year: 2020, popular: true },
  { brand: 'Apple', model: 'iPhone 12 Pro', type: 'phone', category: 'iPhone', year: 2020, popular: true },
  { brand: 'Apple', model: 'iPhone 12', type: 'phone', category: 'iPhone', year: 2020, popular: true },
  { brand: 'Apple', model: 'iPhone 11 Pro Max', type: 'phone', category: 'iPhone', year: 2019, popular: true },
  { brand: 'Apple', model: 'iPhone 11 Pro', type: 'phone', category: 'iPhone', year: 2019, popular: true },
  { brand: 'Apple', model: 'iPhone 11', type: 'phone', category: 'iPhone', year: 2019, popular: true },
  { brand: 'Apple', model: 'iPhone XS Max', type: 'phone', category: 'iPhone', year: 2018, popular: false },
  { brand: 'Apple', model: 'iPhone XS', type: 'phone', category: 'iPhone', year: 2018, popular: false },
  { brand: 'Apple', model: 'iPhone XR', type: 'phone', category: 'iPhone', year: 2018, popular: false },

  // Samsung Galaxy
  { brand: 'Samsung', model: 'Galaxy S24 Ultra', type: 'phone', category: 'Galaxy S', year: 2024, popular: true },
  { brand: 'Samsung', model: 'Galaxy S24+', type: 'phone', category: 'Galaxy S', year: 2024, popular: true },
  { brand: 'Samsung', model: 'Galaxy S24', type: 'phone', category: 'Galaxy S', year: 2024, popular: true },
  { brand: 'Samsung', model: 'Galaxy S23 Ultra', type: 'phone', category: 'Galaxy S', year: 2023, popular: true },
  { brand: 'Samsung', model: 'Galaxy S23+', type: 'phone', category: 'Galaxy S', year: 2023, popular: true },
  { brand: 'Samsung', model: 'Galaxy S23', type: 'phone', category: 'Galaxy S', year: 2023, popular: true },
  { brand: 'Samsung', model: 'Galaxy S22 Ultra', type: 'phone', category: 'Galaxy S', year: 2022, popular: true },
  { brand: 'Samsung', model: 'Galaxy S22+', type: 'phone', category: 'Galaxy S', year: 2022, popular: true },
  { brand: 'Samsung', model: 'Galaxy S22', type: 'phone', category: 'Galaxy S', year: 2022, popular: true },
  { brand: 'Samsung', model: 'Galaxy S21 Ultra', type: 'phone', category: 'Galaxy S', year: 2021, popular: true },
  { brand: 'Samsung', model: 'Galaxy S21+', type: 'phone', category: 'Galaxy S', year: 2021, popular: true },
  { brand: 'Samsung', model: 'Galaxy S21', type: 'phone', category: 'Galaxy S', year: 2021, popular: true },

  // Samsung Galaxy Note
  { brand: 'Samsung', model: 'Galaxy Note 20 Ultra', type: 'phone', category: 'Galaxy Note', year: 2020, popular: true },
  { brand: 'Samsung', model: 'Galaxy Note 20', type: 'phone', category: 'Galaxy Note', year: 2020, popular: true },
  { brand: 'Samsung', model: 'Galaxy Note 10+', type: 'phone', category: 'Galaxy Note', year: 2019, popular: false },
  { brand: 'Samsung', model: 'Galaxy Note 10', type: 'phone', category: 'Galaxy Note', year: 2019, popular: false },

  // Samsung Galaxy A
  { brand: 'Samsung', model: 'Galaxy A54', type: 'phone', category: 'Galaxy A', year: 2023, popular: true },
  { brand: 'Samsung', model: 'Galaxy A34', type: 'phone', category: 'Galaxy A', year: 2023, popular: true },
  { brand: 'Samsung', model: 'Galaxy A24', type: 'phone', category: 'Galaxy A', year: 2023, popular: true },
  { brand: 'Samsung', model: 'Galaxy A53', type: 'phone', category: 'Galaxy A', year: 2022, popular: true },
  { brand: 'Samsung', model: 'Galaxy A33', type: 'phone', category: 'Galaxy A', year: 2022, popular: true },
  { brand: 'Samsung', model: 'Galaxy A52', type: 'phone', category: 'Galaxy A', year: 2021, popular: true },

  // Xiaomi
  { brand: 'Xiaomi', model: '13 Ultra', type: 'phone', category: 'Mi', year: 2023, popular: true },
  { brand: 'Xiaomi', model: '13 Pro', type: 'phone', category: 'Mi', year: 2023, popular: true },
  { brand: 'Xiaomi', model: '13', type: 'phone', category: 'Mi', year: 2023, popular: true },
  { brand: 'Xiaomi', model: '12 Ultra', type: 'phone', category: 'Mi', year: 2022, popular: true },
  { brand: 'Xiaomi', model: '12 Pro', type: 'phone', category: 'Mi', year: 2022, popular: true },
  { brand: 'Xiaomi', model: '12', type: 'phone', category: 'Mi', year: 2022, popular: true },
  { brand: 'Xiaomi', model: '11 Ultra', type: 'phone', category: 'Mi', year: 2021, popular: true },
  { brand: 'Xiaomi', model: '11 Pro', type: 'phone', category: 'Mi', year: 2021, popular: true },
  { brand: 'Xiaomi', model: '11', type: 'phone', category: 'Mi', year: 2021, popular: true },

  // Redmi
  { brand: 'Xiaomi', model: 'Redmi Note 12 Pro', type: 'phone', category: 'Redmi Note', year: 2023, popular: true },
  { brand: 'Xiaomi', model: 'Redmi Note 12', type: 'phone', category: 'Redmi Note', year: 2023, popular: true },
  { brand: 'Xiaomi', model: 'Redmi Note 11 Pro', type: 'phone', category: 'Redmi Note', year: 2022, popular: true },
  { brand: 'Xiaomi', model: 'Redmi Note 11', type: 'phone', category: 'Redmi Note', year: 2022, popular: true },
  { brand: 'Xiaomi', model: 'Redmi Note 10 Pro', type: 'phone', category: 'Redmi Note', year: 2021, popular: true },
  { brand: 'Xiaomi', model: 'Redmi Note 10', type: 'phone', category: 'Redmi Note', year: 2021, popular: true },

  // iPad
  { brand: 'Apple', model: 'iPad Pro 12.9" (6th gen)', type: 'tablet', category: 'iPad Pro', year: 2022, popular: true },
  { brand: 'Apple', model: 'iPad Pro 11" (4th gen)', type: 'tablet', category: 'iPad Pro', year: 2022, popular: true },
  { brand: 'Apple', model: 'iPad Pro 12.9" (5th gen)', type: 'tablet', category: 'iPad Pro', year: 2021, popular: true },
  { brand: 'Apple', model: 'iPad Pro 11" (3rd gen)', type: 'tablet', category: 'iPad Pro', year: 2021, popular: true },
  { brand: 'Apple', model: 'iPad Air (5th gen)', type: 'tablet', category: 'iPad Air', year: 2022, popular: true },
  { brand: 'Apple', model: 'iPad Air (4th gen)', type: 'tablet', category: 'iPad Air', year: 2020, popular: true },
  { brand: 'Apple', model: 'iPad (10th gen)', type: 'tablet', category: 'iPad', year: 2022, popular: true },
  { brand: 'Apple', model: 'iPad (9th gen)', type: 'tablet', category: 'iPad', year: 2021, popular: true },
  { brand: 'Apple', model: 'iPad mini (6th gen)', type: 'tablet', category: 'iPad mini', year: 2021, popular: true },

  // MacBook
  { brand: 'Apple', model: 'MacBook Pro 16" (M3 Max)', type: 'laptop', category: 'MacBook Pro', year: 2023, popular: true },
  { brand: 'Apple', model: 'MacBook Pro 14" (M3 Max)', type: 'laptop', category: 'MacBook Pro', year: 2023, popular: true },
  { brand: 'Apple', model: 'MacBook Pro 16" (M2 Max)', type: 'laptop', category: 'MacBook Pro', year: 2023, popular: true },
  { brand: 'Apple', model: 'MacBook Pro 14" (M2 Max)', type: 'laptop', category: 'MacBook Pro', year: 2023, popular: true },
  { brand: 'Apple', model: 'MacBook Pro 16" (M1 Max)', type: 'laptop', category: 'MacBook Pro', year: 2021, popular: true },
  { brand: 'Apple', model: 'MacBook Pro 14" (M1 Max)', type: 'laptop', category: 'MacBook Pro', year: 2021, popular: true },
  { brand: 'Apple', model: 'MacBook Air 15" (M2)', type: 'laptop', category: 'MacBook Air', year: 2023, popular: true },
  { brand: 'Apple', model: 'MacBook Air 13" (M2)', type: 'laptop', category: 'MacBook Air', year: 2022, popular: true },
  { brand: 'Apple', model: 'MacBook Air 13" (M1)', type: 'laptop', category: 'MacBook Air', year: 2020, popular: true },

  // Mac Studio & Mac Pro
  { brand: 'Apple', model: 'Mac Studio (M2 Ultra)', type: 'desktop', category: 'Mac Studio', year: 2023, popular: true },
  { brand: 'Apple', model: 'Mac Studio (M1 Ultra)', type: 'desktop', category: 'Mac Studio', year: 2022, popular: true },
  { brand: 'Apple', model: 'Mac Pro (M2 Ultra)', type: 'desktop', category: 'Mac Pro', year: 2023, popular: true },

  // iMac
  { brand: 'Apple', model: 'iMac 24" (M1)', type: 'desktop', category: 'iMac', year: 2021, popular: true },
  { brand: 'Apple', model: 'iMac 21.5" (Intel)', type: 'desktop', category: 'iMac', year: 2020, popular: false },

  // Lenovo ThinkPad
  { brand: 'Lenovo', model: 'ThinkPad X1 Carbon Gen 11', type: 'laptop', category: 'ThinkPad X1', year: 2023, popular: true },
  { brand: 'Lenovo', model: 'ThinkPad X1 Carbon Gen 10', type: 'laptop', category: 'ThinkPad X1', year: 2022, popular: true },
  { brand: 'Lenovo', model: 'ThinkPad X1 Yoga Gen 8', type: 'laptop', category: 'ThinkPad X1', year: 2023, popular: true },
  { brand: 'Lenovo', model: 'ThinkPad T16 Gen 2', type: 'laptop', category: 'ThinkPad T', year: 2023, popular: true },
  { brand: 'Lenovo', model: 'ThinkPad T14 Gen 4', type: 'laptop', category: 'ThinkPad T', year: 2023, popular: true },

  // Dell
  { brand: 'Dell', model: 'XPS 13 Plus', type: 'laptop', category: 'XPS', year: 2023, popular: true },
  { brand: 'Dell', model: 'XPS 15', type: 'laptop', category: 'XPS', year: 2023, popular: true },
  { brand: 'Dell', model: 'XPS 17', type: 'laptop', category: 'XPS', year: 2023, popular: true },
  { brand: 'Dell', model: 'Inspiron 15 3000', type: 'laptop', category: 'Inspiron', year: 2023, popular: true },
  { brand: 'Dell', model: 'Inspiron 14 5000', type: 'laptop', category: 'Inspiron', year: 2023, popular: true },

  // HP
  { brand: 'HP', model: 'Spectre x360 14', type: 'laptop', category: 'Spectre', year: 2023, popular: true },
  { brand: 'HP', model: 'Envy 13', type: 'laptop', category: 'Envy', year: 2023, popular: true },
  { brand: 'HP', model: 'Pavilion 15', type: 'laptop', category: 'Pavilion', year: 2023, popular: true },
  { brand: 'HP', model: 'EliteBook 850 G10', type: 'laptop', category: 'EliteBook', year: 2023, popular: true },

  // ASUS
  { brand: 'ASUS', model: 'ROG Zephyrus G14', type: 'laptop', category: 'ROG', year: 2023, popular: true },
  { brand: 'ASUS', model: 'VivoBook S15', type: 'laptop', category: 'VivoBook', year: 2023, popular: true },
  { brand: 'ASUS', model: 'ZenBook 14', type: 'laptop', category: 'ZenBook', year: 2023, popular: true },

  // MSI
  { brand: 'MSI', model: 'Stealth 16 Studio', type: 'laptop', category: 'Stealth', year: 2023, popular: true },
  { brand: 'MSI', model: 'Creator Z16', type: 'laptop', category: 'Creator', year: 2023, popular: true },
  { brand: 'MSI', model: 'Prestige 14', type: 'laptop', category: 'Prestige', year: 2023, popular: true },
];

export const getDeviceSuggestions = (query: string): DeviceModel[] => {
  if (!query || query.length < 2) {
    return deviceDatabase.filter(device => device.popular).slice(0, 10);
  }

  const lowerQuery = query.toLowerCase();
  return deviceDatabase
    .filter(device => 
      device.brand.toLowerCase().includes(lowerQuery) ||
      device.model.toLowerCase().includes(lowerQuery) ||
      device.category.toLowerCase().includes(lowerQuery)
    )
    .sort((a, b) => {
      // Популярные модели сначала
      if (a.popular && !b.popular) return -1;
      if (!a.popular && b.popular) return 1;
      
      // Новые модели сначала
      if (a.year && b.year) return b.year - a.year;
      
      // По алфавиту
      return a.model.localeCompare(b.model);
    })
    .slice(0, 20);
};

export const getBrands = (): string[] => {
  return [...new Set(deviceDatabase.map(device => device.brand))].sort();
};

export const getModelsByBrand = (brand: string): DeviceModel[] => {
  return deviceDatabase
    .filter(device => device.brand.toLowerCase() === brand.toLowerCase())
    .sort((a, b) => {
      if (a.popular && !b.popular) return -1;
      if (!a.popular && b.popular) return 1;
      if (a.year && b.year) return b.year - a.year;
      return a.model.localeCompare(b.model);
    });
};


