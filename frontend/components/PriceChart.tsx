'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useCurrencyStore } from '../lib/currencyStore';

interface HistoricDataPoint {
  month: string;
  maizeCents: number;
  beansCents: number;
  soyCents: number;
}

const HISTORIC_DATA: HistoricDataPoint[] = [
  { month: 'Jan', maizeCents: 29000, beansCents: 15500, soyCents: 41000 },
  { month: 'Feb', maizeCents: 30000, beansCents: 16000, soyCents: 41500 },
  { month: 'Mar', maizeCents: 31000, beansCents: 17200, soyCents: 42000 },
  { month: 'Apr', maizeCents: 30500, beansCents: 17800, soyCents: 40500 },
  { month: 'May', maizeCents: 31500, beansCents: 18000, soyCents: 43000 },
  { month: 'Jun', maizeCents: 32000, beansCents: 18200, soyCents: 44000 },
];

export default function PriceChart() {
  const { currency, conversionRate } = useCurrencyStore();
  const [isMounted, setIsMounted] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<'all' | 'maize' | 'beans' | 'soy'>('all');

  // Hydration safety
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div
        className="card am-card d-flex align-items-center justify-content-center"
        style={{ height: '350px', backgroundColor: '#FFFFFF' }}
      >
        <span className="text-hint">Loading analytics data...</span>
      </div>
    );
  }

  // Convert prices based on active currency
  const getConvertedVal = (cents: number) => {
    const dollars = cents / 100;
    if (currency === 'USD') {
      return parseFloat(dollars.toFixed(2));
    } else {
      return parseFloat((dollars * conversionRate).toFixed(2));
    }
  };

  const chartData = HISTORIC_DATA.map((d) => ({
    month: d.month,
    Maize: getConvertedVal(d.maizeCents),
    Beans: getConvertedVal(d.beansCents),
    Soybeans: getConvertedVal(d.soyCents),
  }));

  const customTooltipFormatter = (value: any) => {
    if (currency === 'USD') {
      return [`$${Number(value).toFixed(2)}`, ''];
    } else {
      return [`ZW$ ${Number(value).toFixed(2)}`, ''];
    }
  };

  return (
    <div className="card am-card" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4 pb-2 border-bottom" style={{ borderColor: '#EAF3DE' }}>
        <div>
          <h5 className="mb-1" style={{ color: '#1A3A08', fontSize: '16px', fontWeight: 600 }}>
            Market Index Trends (Mbare Musika)
          </h5>
          <span className="text-hint" style={{ fontSize: '12px' }}>
            Historical average prices over the last 6 months in {currency}
          </span>
        </div>

        {/* Filter Dropdown */}
        <select
          className="form-select form-select-sm"
          style={{ width: '150px', borderColor: '#DDD0B8', fontSize: '12px' }}
          value={selectedCrop}
          onChange={(e: any) => setSelectedCrop(e.target.value)}
        >
          <option value="all">All Commodities</option>
          <option value="maize">Maize / Tonne</option>
          <option value="beans">Sugar Beans / kg</option>
          <option value="soy">Soybeans / Tonne</option>
        </select>
      </div>

      <div style={{ width: '100%', height: '280px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D0" />
            <XAxis dataKey="month" stroke="#7A9460" style={{ fontSize: '11px' }} />
            <YAxis stroke="#7A9460" style={{ fontSize: '11px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FAF3E8',
                borderColor: '#DDD0B8',
                borderRadius: '8px',
                color: '#1A3A08',
                fontSize: '12px',
              }}
              formatter={customTooltipFormatter}
            />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#1A3A08' }} />
            {(selectedCrop === 'all' || selectedCrop === 'maize') && (
              <Line
                type="monotone"
                dataKey="Maize"
                stroke="#3B6D11"
                strokeWidth={2.5}
                activeDot={{ r: 6 }}
                name={`White Maize (${currency === 'USD' ? '$/tonne' : 'ZW$/tonne'})`}
              />
            )}
            {(selectedCrop === 'all' || selectedCrop === 'beans') && (
              <Line
                type="monotone"
                dataKey="Beans"
                stroke="#BA7517"
                strokeWidth={2}
                activeDot={{ r: 6 }}
                name={`Sugar Beans (${currency === 'USD' ? '$/kg' : 'ZW$/kg'})`}
              />
            )}
            {(selectedCrop === 'all' || selectedCrop === 'soy') && (
              <Line
                type="monotone"
                dataKey="Soybeans"
                stroke="#0F6E56"
                strokeWidth={2}
                activeDot={{ r: 6 }}
                name={`Soybeans (${currency === 'USD' ? '$/tonne' : 'ZW$/tonne'})`}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
