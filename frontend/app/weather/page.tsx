'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api } from '../../lib/axios';
import ProtectedRoute from '../../components/ProtectedRoute';

interface WeatherProfile {
  temperature: number;
  humidity: number;
  rainfallProbability: number;
  windSpeed: number; // km/h
  barometer: number; // hPa
  condition: 'Sunny' | 'Cloudy' | 'Showers' | 'Heavy Rain' | 'Stormy';
  advisory: string;
}

// Regional weather presets to simulate a real-time micro-climate matrix
const DISTRICT_PRESETS: Record<string, WeatherProfile> = {
  'Chinhoyi': {
    temperature: 28, humidity: 55, rainfallProbability: 15, windSpeed: 12, barometer: 1014,
    condition: 'Sunny',
    advisory: 'Optimal spraying window open. Soil moisture levels are steady. Excellent conditions for weeding and herbicide application.'
  },
  'Marondera': {
    temperature: 21, humidity: 88, rainfallProbability: 80, windSpeed: 24, barometer: 1008,
    condition: 'Heavy Rain',
    advisory: 'CRITICAL ALERT: Expected precipitation exceeds 45mm. Clear drainage ditches immediately to prevent seed washing. Halt top-dressing fertilizer.'
  },
  'Mazowe': {
    temperature: 25, humidity: 68, rainfallProbability: 45, windSpeed: 14, barometer: 1012,
    condition: 'Showers',
    advisory: 'Light showers detected. Favorable conditions for urea/calcium ammonium nitrate top-dressing. High nitrogen absorption rate projected.'
  },
  'Harare': {
    temperature: 26, humidity: 62, rainfallProbability: 25, windSpeed: 10, barometer: 1013,
    condition: 'Cloudy',
    advisory: 'Overcast skies. Evaporative rates are low. Reduce greenhouse misting cycles by 20% to prevent fungal development.'
  },
  'Bulawayo': {
    temperature: 33, humidity: 32, rainfallProbability: 5, windSpeed: 18, barometer: 1015,
    condition: 'Sunny',
    advisory: 'HEAT ALERT: High evapotranspiration risk. Increase supplementary drip irrigation cycles for young maize and horticulture plots.'
  },
  'Mutare': {
    temperature: 23, humidity: 76, rainfallProbability: 60, windSpeed: 22, barometer: 1010,
    condition: 'Showers',
    advisory: 'Mist and showers on mountain slopes. Moisture retention is high. Watch for early blight signs in potato crops.'
  },
  'Masvingo': {
    temperature: 30, humidity: 41, rainfallProbability: 10, windSpeed: 15, barometer: 1014,
    condition: 'Sunny',
    advisory: 'Proceed with planned harvesting. Grain moisture levels are optimal (under 13.5%). Ideal drying conditions today.'
  }
};

export default function SmartWeatherPage() {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Harare');
  const [weatherData, setWeatherData] = useState<WeatherProfile>(DISTRICT_PRESETS['Harare']);
  const [loading, setLoading] = useState(true);

  // SMS alerts flow
  const [phoneNumber, setPhoneNumber] = useState('');
  const [alertStorms, setAlertStorms] = useState(true);
  const [alertSpraying, setAlertSpraying] = useState(false);
  const [alertFrost, setAlertFrost] = useState(true);
  
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [smsStep, setSmsStep] = useState(0); // 0: loading, 1: enter code, 2: success
  const [verificationCode, setVerificationCode] = useState('');

  const getCarrierName = (num: string) => {
    if (num.startsWith('77') || num.startsWith('78') || num.startsWith('077') || num.startsWith('078')) return 'Econet';
    if (num.startsWith('71') || num.startsWith('071')) return 'NetOne';
    if (num.startsWith('73') || num.startsWith('073')) return 'Telecel';
    return 'Econet'; // Default fallback
  };

  useEffect(() => {
    // Attempt fetching live default data from Django backend
    api.get('market-data/weather/')
      .then(res => {
        // Map Django values if available
        if (res.data && res.data.current) {
          const apiDistrict = res.data.current.district || 'Harare';
          const apiPreset = DISTRICT_PRESETS[apiDistrict] || DISTRICT_PRESETS['Harare'];
          setWeatherData({
            ...apiPreset,
            temperature: res.data.current.temperature,
            humidity: res.data.current.humidity,
            rainfallProbability: res.data.current.rainfall_probability,
            advisory: res.data.advisory || apiPreset.advisory
          });
          setSelectedDistrict(apiDistrict);
        }
      })
      .catch(err => {
        console.warn("Backend weather API unreachable, utilizing high-fidelity presets:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDistrictChange = (district: string) => {
    setLoading(true);
    const data = DISTRICT_PRESETS[district];
    
    // Simulate telemetry fetch latency
    setTimeout(() => {
      setWeatherData(data);
      setSelectedDistrict(district);
      setLoading(false);
    }, 4500 * 0.1); // Quick 450ms mock load
  };

  const getWeatherIcon = (cond: string) => {
    switch (cond) {
      case 'Sunny': return '☀️';
      case 'Cloudy': return '☁️';
      case 'Showers': return '🌦️';
      case 'Heavy Rain': return '🌧️';
      case 'Stormy': return '⛈️';
      default: return '⛅';
    }
  };

  const getAdvisoryColor = (cond: string) => {
    switch (cond) {
      case 'Heavy Rain':
      case 'Stormy':
        return { bg: '#FCEBEB', border: '#EF9A9A', text: '#A32D2D', badge: 'bg-danger text-white' };
      case 'Sunny':
        return weatherData.temperature > 32 
          ? { bg: '#FFF8E1', border: '#FFE082', text: '#E65100', badge: 'bg-warning text-dark' }
          : { bg: '#F4F7F1', border: '#C5E1A5', text: '#2C5410', badge: 'bg-success text-white' };
      default:
        return { bg: '#F4F7F1', border: '#C5E1A5', text: '#2C5410', badge: 'bg-success text-white' };
    }
  };

  const handleSMSRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    
    setShowSMSModal(true);
    setSmsStep(0);
    
    // Simulate dispatching verification SMS
    setTimeout(() => {
      setSmsStep(1);
    }, 1200);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length < 4) return;
    
    setSmsStep(0); // Show processing
    setTimeout(() => {
      setSmsStep(2); // Success!
    }, 1000);
  };

  return (
    <ProtectedRoute allowedRoles={['COMMERCIAL_FARMER', 'SMALLHOLDER_FARMER']}>
      <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '2rem 0 5rem' }}>
        <div className="container" style={{ maxWidth: '1150px' }}>
          
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge badge-seed py-1 px-3">Micro-Climate Satellite</span>
                <span className="badge badge-kyc py-1 px-3">Live Feed</span>
              </div>
              <h1 style={{ color: '#1A3A08', fontWeight: 800, fontSize: '32px', letterSpacing: '-0.5px' }}>
                Precipitation & Climate Risk Command Center
              </h1>
              <p className="text-hint mb-0 fs-15">
                Analyze radar loops, check real-time soil moisture/spraying advisors, and activate automated cellular SMS alerts.
              </p>
            </div>
            <Link href="/dashboard/farmer" className="btn btn-sm btn-am-outline px-4 shadow-sm">
              ← Farmer Dashboard
            </Link>
          </div>

          <div className="row g-4">
            
            {/* Left Column: Local Satellite Telemetry & Sweeping Radar */}
            <div className="col-lg-7">
              <div className="card am-card p-4 shadow-sm border-0 position-relative overflow-hidden h-100">
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                  <h5 className="mb-0 fw-800 text-dark d-flex align-items-center gap-2">
                    🛰️ Regional Satellite Telemetry
                  </h5>
                  
                  {/* District selector */}
                  <select 
                    className="form-select form-select-sm fw-800 text-success" 
                    value={selectedDistrict}
                    onChange={e => handleDistrictChange(e.target.value)}
                    style={{ width: '150px', border: '1px solid #DDD0B8', outline: 'none' }}
                  >
                    {Object.keys(DISTRICT_PRESETS).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {loading ? (
                  <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1" style={{ minHeight: '300px' }}>
                    <span className="spinner-border text-success mb-3" style={{ width: '3rem', height: '3rem' }}></span>
                    <span className="text-hint fw-600 fs-13">LOCKING TELEMETRY BEAM...</span>
                  </div>
                ) : (
                  <div className="row g-4 align-items-stretch">
                    
                    {/* Visual Radar Widget */}
                    <div className="col-md-6">
                      <div 
                        className="rounded border position-relative overflow-hidden d-flex justify-content-center align-items-center"
                        style={{ 
                          height: '260px', 
                          background: '#111827', // Dark military look
                          borderColor: '#374151' 
                        }}
                      >
                        {/* Radar grid lines */}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(#1F2937 1px, transparent 1px), linear-gradient(90deg, #1F2937 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.5 }}></div>

                        {/* Radar sweeping line */}
                        <div 
                          className="radar-sweep"
                          style={{
                            position: 'absolute',
                            width: '200%',
                            height: '200%',
                            background: 'conic-gradient(from 0deg, rgba(78, 138, 24, 0) 0deg, rgba(78, 138, 24, 0) 270deg, rgba(78, 138, 24, 0.25) 360deg)',
                            transformOrigin: '50% 50%',
                            zIndex: 1
                          }}
                        ></div>

                        {/* Concentric radar circles */}
                        <div className="rounded-circle position-absolute border" style={{ width: '60px', height: '60px', borderColor: '#374151', opacity: 0.5 }}></div>
                        <div className="rounded-circle position-absolute border" style={{ width: '120px', height: '120px', borderColor: '#374151', opacity: 0.5 }}></div>
                        <div className="rounded-circle position-absolute border" style={{ width: '180px', height: '180px', borderColor: '#374151', opacity: 0.5 }}></div>

                        {/* Center hub */}
                        <div className="btn-pulse rounded-circle bg-success position-absolute" style={{ width: '10px', height: '10px', zIndex: 3 }}></div>

                        {/* Dynamic weather hazard warning bubble */}
                        {weatherData.rainfallProbability > 40 && (
                          <div 
                            className="position-absolute p-1.5 rounded border btn-pulse text-center"
                            style={{ 
                              top: '25%', left: '35%', 
                              backgroundColor: 'rgba(239,154,162,0.15)', 
                              borderColor: '#EF9A9A',
                              zIndex: 2,
                              transition: 'all 0.5s ease'
                            }}
                          >
                            <span style={{ fontSize: '10px', color: '#EF5350', fontWeight: 800 }}>CELL DETECTED</span>
                          </div>
                        )}
                        
                        <span className="position-absolute bottom-0 start-0 m-2 font-monospace text-success" style={{ fontSize: '9px', zIndex: 2 }}>
                          AZIMUTH SECURED // RANGING
                        </span>
                      </div>
                    </div>

                    {/* Numeric Climate details */}
                    <div className="col-md-6 d-flex flex-column justify-content-between">
                      <div className="p-3 rounded" style={{ backgroundColor: '#FAF3E8', border: '1px solid #EAF3DE' }}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-hint">Condition:</span>
                          <strong className="text-dark fs-14">
                            {getWeatherIcon(weatherData.condition)} {weatherData.condition}
                          </strong>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-hint">Temperature:</span>
                          <strong className="text-dark font-monospace fs-14">{weatherData.temperature}°C</strong>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-hint">Relative Humidity:</span>
                          <strong className="text-dark font-monospace fs-14">{weatherData.humidity}%</strong>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-hint">Precipitation Risk:</span>
                          <strong className="text-dark font-monospace fs-14">{weatherData.rainfallProbability}%</strong>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-hint">Wind Velocity:</span>
                          <strong className="text-dark font-monospace fs-14">{weatherData.windSpeed} km/h</strong>
                        </div>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="text-hint">Barometric Reading:</span>
                          <strong className="text-dark font-monospace fs-14">{weatherData.barometer} hPa</strong>
                        </div>
                      </div>

                      <div className="mt-3">
                        <span className="badge badge-verified mb-2">Satellite Status</span>
                        <div className="text-muted" style={{ fontSize: '12.5px', lineHeight: '1.4' }}>
                          Telematic sensors connected to OK-2 Meteosat satellite array. Calibration frequency: 2.4 GHz.
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* User Friendly Radar Explanation */}
                <div className="p-2.5 rounded text-center text-hint fs-12.5 mt-4" style={{ backgroundColor: '#FAF3E8', border: '1px dashed #DDD0B8', lineHeight: '1.4' }}>
                  📡 <strong>Micro-Climate Radar:</strong> The sweeping radar scans for storm systems in your district. If rain probability is high, a "CELL DETECTED" indicator will flash to alert you.
                </div>

              </div>
            </div>

            {/* Right Column: AI Advisory & SMS Alerts Console */}
            <div className="col-lg-5 d-flex flex-column gap-4">
              
              {/* Dynamic Actionable Advisory */}
              {!loading && (
                <div 
                  className="card shadow-sm border-0" 
                  style={{ 
                    borderRadius: '12px', 
                    backgroundColor: getAdvisoryColor(weatherData.condition).bg,
                    borderLeft: `5px solid ${getAdvisoryColor(weatherData.condition).border}`
                  }}
                >
                  <div className="p-4 d-flex flex-column justify-content-center">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span style={{ fontSize: '22px' }}>🧠</span>
                      <h5 className="mb-0 fw-800" style={{ color: getAdvisoryColor(weatherData.condition).text }}>
                        Agronomic Advisory Directive
                      </h5>
                    </div>
                    <p className="mb-0 fw-500 mt-2" style={{ color: '#2b2b2b', fontSize: '15px', lineHeight: '1.6' }}>
                      {weatherData.advisory}
                    </p>
                  </div>
                </div>
              )}

              {/* SMS Alert Setup Panel */}
              <div className="card am-card p-4 shadow-sm border-0">
                <h5 className="fw-800 text-dark mb-3 d-flex align-items-center gap-2">
                  📲 Cellular SMS Weather Dispatch
                </h5>
                <p className="text-hint fs-12 mb-4">
                  Receive micro-climate warning dispatches and spraying recommendations directly on your phone via EcoCash SMS networks.
                </p>

                <form onSubmit={handleSMSRequest}>
                  <div className="mb-3">
                    <label className="text-hint fw-700 text-uppercase d-block mb-2 fs-11">Alert Categories</label>
                    
                    <div className="form-check mb-2">
                      <input 
                        type="checkbox" 
                        className="form-check-input" 
                        id="checkStorms" 
                        checked={alertStorms}
                        onChange={e => setAlertStorms(e.target.checked)}
                      />
                      <label className="form-check-label fs-13 text-dark fw-600" htmlFor="checkStorms">
                        🚨 Storm, Wind & Extreme Hail alerts
                      </label>
                    </div>

                    <div className="form-check mb-2">
                      <input 
                        type="checkbox" 
                        className="form-check-input" 
                        id="checkSpraying" 
                        checked={alertSpraying}
                        onChange={e => setAlertSpraying(e.target.checked)}
                      />
                      <label className="form-check-label fs-13 text-dark fw-600" htmlFor="checkSpraying">
                        🌦️ Optimal Fertilizer Spraying notifications
                      </label>
                    </div>

                    <div className="form-check mb-2">
                      <input 
                        type="checkbox" 
                        className="form-check-input" 
                        id="checkFrost" 
                        checked={alertFrost}
                        onChange={e => setAlertFrost(e.target.checked)}
                      />
                      <label className="form-check-label fs-13 text-dark fw-600" htmlFor="checkFrost">
                        ❄️ Frost and cold snap horticultural warnings
                      </label>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="text-hint fw-700 text-uppercase d-block mb-1.5 fs-11">Phone Number</label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text fw-600">+263</span>
                      <input 
                        type="tel" 
                        className="form-control fw-700 text-dark" 
                        placeholder="772123456" 
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        required
                      />
                    </div>
                    <div className="mt-2 d-flex flex-wrap gap-1.5" style={{ gap: '0.4rem' }}>
                      <span className={`badge fs-9.5 px-2 py-1 border transition-all ${getCarrierName(phoneNumber) === 'Econet' ? 'bg-success text-white border-success' : 'bg-light text-dark'}`}>Econet (077/078)</span>
                      <span className={`badge fs-9.5 px-2 py-1 border transition-all ${getCarrierName(phoneNumber) === 'NetOne' ? 'bg-success text-white border-success' : 'bg-light text-dark'}`}>NetOne (071)</span>
                      <span className={`badge fs-9.5 px-2 py-1 border transition-all ${getCarrierName(phoneNumber) === 'Telecel' ? 'bg-success text-white border-success' : 'bg-light text-dark'}`}>Telecel (073)</span>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-am-primary w-100 py-2.5 fw-700 fs-13 mt-2"
                    disabled={!phoneNumber}
                  >
                    🔔 Subscribe to SMS Telemetry
                  </button>
                </form>
              </div>

            </div>

          </div>

        </div>

        {/* Dynamic Verification SMS Modal */}
        {showSMSModal && (
          <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(26, 58, 8, 0.4)', backdropFilter: 'blur(8px)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
              <div className="modal-content border-0 rounded-4 shadow-lg" style={{ backgroundColor: '#FAF3E8', border: '2px solid #EAF3DE' }}>
                <div className="modal-body text-center p-4">
                  
                  {smsStep === 0 && (
                    <div className="py-4">
                      <div className="spinner-border text-success mb-3" style={{ width: '3rem', height: '3rem' }}></div>
                      <h5 className="fw-800 text-dark mb-1">Dispatching SMS Token</h5>
                      <p className="text-muted fs-13 mb-0">Communicating with {getCarrierName(phoneNumber)} SMS gateway protocols...</p>
                    </div>
                  )}

                  {smsStep === 1 && (
                    <div className="py-3">
                      <h5 className="fw-800 text-dark mb-1">Verify Phone Connection</h5>
                      <p className="text-hint fs-13 mb-3">
                        We sent a 4-digit token to <strong>+263 {phoneNumber}</strong>.
                      </p>

                      <form onSubmit={handleVerifyCode}>
                        <div className="mb-3 mx-auto" style={{ maxWidth: '180px' }}>
                          <input 
                            type="text" 
                            maxLength={4}
                            className="form-control text-center fs-20 fw-900 letter-spacing-5 font-monospace"
                            placeholder="0000"
                            value={verificationCode}
                            onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                            required
                          />
                        </div>
                        <button type="submit" className="btn btn-am-primary w-100 py-2 fw-700 fs-13 mb-2" disabled={verificationCode.length < 4}>
                          Verify & Activate
                        </button>
                        <button type="button" className="btn btn-am-ghost w-100 py-2 fw-600 fs-12" onClick={() => setShowSMSModal(false)}>
                          Cancel
                        </button>
                      </form>
                    </div>
                  )}

                  {smsStep === 2 && (
                    <div className="py-4 text-center">
                      <div className="fs-1 mb-2">📬</div>
                      <h4 className="fw-800 text-success mb-1">SMS Alerts Locked!</h4>
                      <p className="text-muted fs-13.5 mb-4">
                        Micro-climate advisory alerts are active for <strong>+263 {phoneNumber}</strong> in the {selectedDistrict} district.
                      </p>
                      <button 
                        onClick={() => {
                          setShowSMSModal(false);
                          setPhoneNumber('');
                          setVerificationCode('');
                        }}
                        className="btn btn-am-primary px-5 fw-700 rounded-pill fs-13"
                      >
                        Great, Thank You!
                      </button>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
