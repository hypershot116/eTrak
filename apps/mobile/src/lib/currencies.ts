export type Currency = { code: string; name: string; digits: number };

// digits = decimal places of the currency (JPY has 0)
export const currencies: Currency[] = [
  { code: 'USD', name: 'US Dollar', digits: 2 },
  { code: 'EUR', name: 'Euro', digits: 2 },
  { code: 'GBP', name: 'British Pound', digits: 2 },
  { code: 'BDT', name: 'Bangladeshi Taka', digits: 2 },
  { code: 'INR', name: 'Indian Rupee', digits: 2 },
  { code: 'JPY', name: 'Japanese Yen', digits: 0 },
  { code: 'AUD', name: 'Australian Dollar', digits: 2 },
  { code: 'CAD', name: 'Canadian Dollar', digits: 2 },
  { code: 'SGD', name: 'Singapore Dollar', digits: 2 },
  { code: 'AED', name: 'UAE Dirham', digits: 2 },
];

export function getCurrency(code: string): Currency {
  return currencies.find((c) => c.code === code) ?? { code, name: code, digits: 2 };
}
