import { create } from 'zustand';

export type Currency = 'USD' | 'ZiG';

interface CurrencyState {
  currency: Currency;
  conversionRate: number;
  setCurrency: (currency: Currency) => void;
  setConversionRate: (rate: number) => void;
  formatPrice: (usdCents: number) => string;
  convertPrice: (usdCents: number) => { amount: number; symbol: string };
}

export const useCurrencyStore = create<CurrencyState>((set, get) => ({
  currency: 'USD',
  conversionRate: 25.0,
  setCurrency: (currency) => set({ currency }),
  setConversionRate: (conversionRate) => set({ conversionRate }),
  formatPrice: (usdCents: number) => {
    const { currency, conversionRate } = get();
    const usdAmount = usdCents / 100;
    if (currency === 'USD') {
      return `$${usdAmount.toFixed(2)}`;
    } else {
      return `ZiG ${(usdAmount * conversionRate).toFixed(2)}`;
    }
  },
  convertPrice: (usdCents: number) => {
    const { currency, conversionRate } = get();
    const usdAmount = usdCents / 100;
    if (currency === 'USD') {
      return { amount: usdAmount, symbol: '$' };
    } else {
      return { amount: usdAmount * conversionRate, symbol: 'ZiG' };
    }
  },
}));
