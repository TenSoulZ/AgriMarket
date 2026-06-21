'use client';

import React from 'react';
import { useCurrencyStore } from '../lib/currencyStore';

export default function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrencyStore();

  return (
    <div className="btn-group border rounded" role="group" style={{ borderColor: '#DDD0B8' }}>
      <button
        type="button"
        className={`btn btn-sm py-1 px-3 ${currency === 'USD' ? 'btn-am-primary' : 'btn-am-ghost'}`}
        style={{ border: 'none', borderRadius: '0.375rem 0 0 0.375rem' }}
        onClick={() => setCurrency('USD')}
      >
        USD
      </button>
      <button
        type="button"
        className={`btn btn-sm py-1 px-3 ${currency === 'ZiG' ? 'btn-am-primary' : 'btn-am-ghost'}`}
        style={{ border: 'none', borderRadius: '0 0.375rem 0.375rem 0' }}
        onClick={() => setCurrency('ZiG')}
      >
        ZiG
      </button>
    </div>
  );
}
