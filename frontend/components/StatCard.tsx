'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  trendText?: string;
  trendDirection?: 'up' | 'down' | 'flat';
}

export default function StatCard({ title, value, trendText, trendDirection = 'flat' }: StatCardProps) {
  const getTrendStyle = (direction: 'up' | 'down' | 'flat') => {
    switch (direction) {
      case 'up':
        return { color: '#0F6E56', symbol: '↑' }; // Forest success green, dark text
      case 'down':
        return { color: '#A32D2D', symbol: '↓' }; // Danger red, dark text
      case 'flat':
      default:
        return { color: '#7A9460', symbol: '•' }; // Muted green, dark text
    }
  };

  const trend = getTrendStyle(trendDirection);

  return (
    <div className="am-stat-card d-flex flex-column justify-content-between h-100">
      <div>
        <span className="text-hint d-block mb-1" style={{ fontSize: '12.5px', color: '#4E6A36', fontWeight: 500 }}>
          {title}
        </span>
        <span className="d-block" style={{ color: '#1A3A08', fontSize: '24px', fontWeight: 700, lineHeight: 1.2 }}>
          {value}
        </span>
      </div>
      
      {trendText && (
        <div className="mt-2" style={{ color: trend.color, fontSize: '11.5px', fontWeight: 600 }}>
          {trend.symbol} {trendText}
        </div>
      )}
    </div>
  );
}
