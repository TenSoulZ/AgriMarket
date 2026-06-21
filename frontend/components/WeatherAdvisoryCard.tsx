'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/axios';

interface WeatherData {
  current: {
    temperature: number;
    humidity: number;
    rainfall_probability: number;
    condition: string;
    district: string;
  };
  forecast: Array<{
    day: string;
    temp: number;
    condition: string;
  }>;
  advisory: string;
}

export default function WeatherAdvisoryCard() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('market-data/weather/')
      .then(res => {
        setData(res.data);
      })
      .catch(err => {
        console.error('Failed to load weather data', err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card am-card p-4 d-flex align-items-center justify-content-center mb-4" style={{ minHeight: '200px' }}>
        <div className="text-center">
          <span className="spinner-border spinner-border-sm text-success d-block mx-auto mb-2" role="status"></span>
          <span className="text-hint fs-13">Loading hyper-local agronomic advisory...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const getWeatherIcon = (condition: string) => {
    switch(condition) {
      case 'Sunny': return '☀️';
      case 'Cloudy': return '☁️';
      case 'Showers': return '🌦️';
      case 'Heavy Rain': return '🌧️';
      default: return '🌤️';
    }
  };

  return (
    <div className="card am-card mb-4 p-0 overflow-hidden" style={{ borderLeft: '4px solid #4E8A18' }}>
      <div className="row g-0 h-100">
        
        {/* Left Side: Current Conditions */}
        <div className="col-md-4 p-4" style={{ backgroundColor: '#F4F7F1' }}>
          <div className="d-flex justify-content-between align-items-start mb-2">
            <span className="text-hint fw-600" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {data.current.district} Weather
            </span>
            <span style={{ fontSize: '20px' }}>{getWeatherIcon(data.current.condition)}</span>
          </div>
          
          <div className="d-flex align-items-end gap-2 mb-3">
            <h2 className="mb-0" style={{ color: '#1A3A08', fontSize: '38px', fontWeight: 700, lineHeight: '1' }}>
              {data.current.temperature}°<span style={{ fontSize: '20px', fontWeight: 500 }}>C</span>
            </h2>
            <span className="text-hint mb-1" style={{ fontSize: '14px', fontWeight: 500 }}>{data.current.condition}</span>
          </div>

          <div className="d-flex gap-3 text-hint mt-4" style={{ fontSize: '12px' }}>
            <div>
              <span className="d-block mb-1 opacity-75">Humidity</span>
              <strong style={{ color: '#2C5410' }}>{data.current.humidity}%</strong>
            </div>
            <div>
              <span className="d-block mb-1 opacity-75">Precipitation</span>
              <strong style={{ color: '#2C5410' }}>{data.current.rainfall_probability}%</strong>
            </div>
          </div>
        </div>

        {/* Right Side: AI Advisory & Forecast */}
        <div className="col-md-8 p-4 bg-white d-flex flex-column justify-content-between">
          <div>
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="badge badge-seed px-2 py-1" style={{ fontSize: '10px', textTransform: 'uppercase' }}>AI Agronomic Advisory</span>
            </div>
            <p style={{ color: '#4E6A36', fontSize: '14px', lineHeight: '1.6', fontWeight: 500 }} className="mb-3 pe-md-4">
              "{data.advisory}"
            </p>
          </div>
          
          {/* 3-Day Forecast */}
          <div className="d-flex gap-4 pt-3 border-top mt-auto" style={{ borderColor: '#EAF3DE' }}>
            {data.forecast.map((day, idx) => (
              <div key={idx} className="flex-grow-1">
                <span className="text-hint d-block mb-1" style={{ fontSize: '11px' }}>{day.day}</span>
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: '14px' }}>{getWeatherIcon(day.condition)}</span>
                  <span style={{ color: '#1A3A08', fontSize: '13px', fontWeight: 600 }}>{day.temp}°C</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
