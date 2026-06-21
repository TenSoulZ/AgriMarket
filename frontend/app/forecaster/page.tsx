'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api } from '../../lib/axios';
import { useCurrencyStore } from '../../lib/currencyStore';
import ProtectedRoute from '../../components/ProtectedRoute';

// Import Recharts components
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ReferenceLine
} from 'recharts';

interface ForecastData {
  estimated_yield_tonnes: number;
  yield_per_hectare: number;
  confidence_score_percentage: number;
  recommendations: string[];
}

export default function ForecasterPage() {
  const { formatPrice } = useCurrencyStore();
  const [cropType, setCropType] = useState('Maize');
  const [acreage, setAcreage] = useState<number>(15.0); // Hectares
  const [soilType, setSoilType] = useState('Loam');
  const [fertilizerRate, setFertilizerRate] = useState<number>(220); // kg per hectare
  const [weatherOutlook, setWeatherOutlook] = useState('Normal'); // Drought, Normal, Heavy Rain

  const [isMounted, setIsMounted] = useState(false);
  
  // Exporter modal states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStep, setExportStep] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const baseYields: Record<string, number> = {
    'Maize': 5.5,
    'Soyabeans': 3.0,
    'Wheat': 6.0,
    'Sugar Beans': 2.2
  };

  const soilMultipliers: Record<string, number> = {
    'Loam': 1.1,
    'Clay': 0.95,
    'Sandy': 0.7,
    'Silt': 1.05
  };

  const weatherMultipliers: Record<string, number> = {
    'Drought': 0.6,
    'Normal': 1.0,
    'Heavy Rain': 0.85
  };

  // Mathematical Yield Response Curve model
  // f(r) = 0.55 + 1.0 * r - 0.45 * r^2 where r = rate/250. Peak is at rate=250.
  const calculateYieldForRate = (rate: number, crop: string, soil: string, weather: string) => {
    const base = baseYields[crop] || 5.0;
    const soilMult = soilMultipliers[soil] || 1.0;
    const weatherMult = weatherMultipliers[weather] || 1.0;
    
    const r = rate / 250;
    const factor = 0.55 + 1.0 * r - 0.45 * Math.pow(r, 2);
    
    const y = base * soilMult * weatherMult * factor;
    return Math.max(0.1, parseFloat(y.toFixed(2)));
  };

  // Generate chart points dynamically
  const chartData = useMemo(() => {
    const points = [];
    for (let r = 0; r <= 500; r += 20) {
      points.push({
        fertilizerRate: r,
        Yield: calculateYieldForRate(r, cropType, soilType, weatherOutlook)
      });
    }
    return points;
  }, [cropType, soilType, weatherOutlook]);

  // Current calculations based on state
  const currentYieldPerHa = useMemo(() => {
    return calculateYieldForRate(fertilizerRate, cropType, soilType, weatherOutlook);
  }, [fertilizerRate, cropType, soilType, weatherOutlook]);

  const totalYieldTonnes = useMemo(() => {
    return parseFloat((currentYieldPerHa * acreage).toFixed(1));
  }, [currentYieldPerHa, acreage]);

  // Estimate price per tonne based on general market conditions
  const cropMarketPrices: Record<string, number> = {
    'Maize': 320,
    'Soyabeans': 580,
    'Wheat': 440,
    'Sugar Beans': 650
  };

  const estimatedGrossRevenue = useMemo(() => {
    const rate = cropMarketPrices[cropType] || 300;
    return totalYieldTonnes * rate;
  }, [cropType, totalYieldTonnes]);

  // Dynamic recommendations
  const recommendations = useMemo(() => {
    const list = [];
    
    // Fertilizer analysis
    if (fertilizerRate < 120) {
      list.push(`Sub-optimal nourishment: Your rate of ${fertilizerRate} kg/ha is too low. Boosting to 250 kg/ha could increase yields by up to ${((calculateYieldForRate(250, cropType, soilType, weatherOutlook) - currentYieldPerHa) / currentYieldPerHa * 100).toFixed(0)}%.`);
    } else if (fertilizerRate > 350) {
      list.push(`Toxicity alert: ${fertilizerRate} kg/ha leads to acidic soil burnout. Lowering to 250 kg/ha will actually INCREASE your yield while saving input costs.`);
    } else {
      list.push(`Optimal nutrition: Your application rate is within the mathematically optimal sweet spot for ${cropType}.`);
    }

    // Soil diagnostic recommendations
    if (soilType === 'Sandy') {
      list.push("Sandy soil leaching: Highly porous soil. Apply nitrogen in three split applications rather than one, to prevent nutrient leaching.");
    } else if (soilType === 'Clay') {
      list.push("Clay retention: Excellent mineral binding but poor drainage. Ensure raised beds or proper drainage to avoid root rot under heavy rainfall.");
    }

    // Weather mitigation
    if (weatherOutlook === 'Drought') {
      list.push("Drought conditions: Projected rainfall is low. Prioritize drip irrigation and apply straw mulching to conserve topsoil moisture.");
    } else if (weatherOutlook === 'Heavy Rain') {
      list.push("Heavy rainfall (La Niña): Runoff risk is high. Avoid top-dressing fertilizer immediately before heavy downpours.");
    }

    return list;
  }, [fertilizerRate, cropType, soilType, weatherOutlook, currentYieldPerHa]);

  // Soil details
  const soilMetrics = useMemo(() => {
    switch (soilType) {
      case 'Loam':
        return { drainage: 'Balanced', retention: 'Excellent', nutritionIndex: 92, status: 'OPTIMAL' };
      case 'Clay':
        return { drainage: 'Very Low', retention: 'Critical', nutritionIndex: 85, status: 'WARNING' };
      case 'Sandy':
        return { drainage: 'Extreme', retention: 'Poor', nutritionIndex: 48, status: 'DANGER' };
      default:
        return { drainage: 'Moderate', retention: 'Good', nutritionIndex: 80, status: 'OPTIMAL' };
    }
  }, [soilType]);

  // Exporter simulation
  const handleExportPDF = () => {
    setShowExportModal(true);
    setExportComplete(false);
    setExportStep(0);
    
    const steps = [
      "Gathering soil details...",
      "Analyzing seasonal rainfall...",
      "Calculating crop responses...",
      "Writing recommendations...",
      "Creating advisory report file...",
      "Finalizing document download..."
    ];


    let current = 0;
    const interval = setInterval(() => {
      if (current < steps.length - 1) {
        current++;
        setExportStep(current);
      } else {
        clearInterval(interval);
        setExportComplete(true);
        // Trigger dummy file download
        const reportText = `
AGRIMARKET ZIMBABWE — YIELD SIMULATION ADVISORY
Generated: ${new Date().toLocaleDateString()}
==============================================
Crop: ${cropType}
Land Size: ${acreage} Hectares
Soil Type: ${soilType}
Precipitation Outlook: ${weatherOutlook}
Planned Fertilizer Rate: ${fertilizerRate} kg/ha
----------------------------------------------
Estimated Yield per Hectare: ${currentYieldPerHa} t/ha
Total Projected Harvest: ${totalYieldTonnes} Tonnes
Estimated Gross Market Valuation: $${estimatedGrossRevenue.toLocaleString()}

ADVISORY RECOMMENDATIONS:
${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
==============================================
Disclaimer: Simulations represent mathematical probability models.
        `;
        const blob = new Blob([reportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `yield_advisory_${cropType.toLowerCase()}_report.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }, 600);
  };

  return (
    <ProtectedRoute allowedRoles={['COMMERCIAL_FARMER', 'SMALLHOLDER_FARMER', 'ADMIN']}>
      <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '2rem 0 5rem' }}>
        <div className="container" style={{ maxWidth: '1200px' }}>
          
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge badge-verified py-1 px-3">Agronomy Lab v3.0</span>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4E8A18' }} className="btn-pulse"></div>
              </div>
              <h1 style={{ color: '#1A3A08', fontWeight: 800, fontSize: '32px', letterSpacing: '-0.5px' }}>
                AI Yield Simulator & Soil Diagnostic Lab
              </h1>
              <p className="text-hint mb-0 fs-15">
                Simulate agronomic inputs against crop response curves, diagnose soil profile hazards, and download custom advisories.
              </p>
            </div>
            <Link href="/dashboard/farmer" className="btn btn-sm btn-am-outline px-4 shadow-sm">
              ← Farmer Dashboard
            </Link>
          </div>

          <div className="row g-4">
            
            {/* Left Column: Interactive Input Controls */}
            <div className="col-lg-4">
              <div className="card am-card p-4 shadow-sm border-0 d-flex flex-column gap-4">
                
                <div>
                  <h5 className="mb-3 fw-800 text-dark">🌱 Crop Selection & Land</h5>
                  
                  <div className="mb-3">
                    <label className="text-hint fw-700 text-uppercase d-block mb-1.5 fs-11">Target Crop</label>
                    <select 
                      className="form-select fw-700 text-success" 
                      value={cropType} 
                      onChange={e => setCropType(e.target.value)}
                    >
                      <option value="Maize">🌾 White Maize (Chibage / Umbila)</option>
                      <option value="Wheat">🥖 Winter Wheat (Gorosi)</option>
                      <option value="Soyabeans">🌱 Soybeans (Soya)</option>
                      <option value="Sugar Beans">🥜 Sugar Beans (Nyemba)</option>
                    </select>
                  </div>

                  <div>
                    <div className="d-flex justify-content-between text-hint fw-700 text-uppercase fs-11 mb-1.5">
                      <span>Cultivated Area</span>
                      <strong className="text-dark fw-800 fs-13">{acreage} Hectares</strong>
                    </div>
                    <input 
                      type="range" 
                      className="form-range" 
                      min="1" 
                      max="150" 
                      step="0.5" 
                      value={acreage} 
                      onChange={e => setAcreage(parseFloat(e.target.value))}
                    />
                    <div className="d-flex justify-content-between text-hint fs-10 mt-1">
                      <span>1 ha</span>
                      <span>150 ha</span>
                    </div>
                  </div>
                </div>

                <hr className="my-0" style={{ borderColor: '#EAF3DE' }} />

                {/* Soil & Weather Settings */}
                <div>
                  <h5 className="mb-3 fw-800 text-dark">🧪 Environmental Diagnostics</h5>
                  
                  <div className="mb-3">
                    <label className="text-hint fw-700 text-uppercase d-block mb-1.5 fs-11">Soil Classification</label>
                    <select 
                      className="form-select fw-700 text-dark" 
                      value={soilType} 
                      onChange={e => setSoilType(e.target.value)}
                    >
                      <option value="Loam">Loam (Optimal Organic Silt)</option>
                      <option value="Clay">Clay (High Water Retention)</option>
                      <option value="Sandy">Sandy (High Permeability/Leaching)</option>
                      <option value="Silt">Silt (Fine River Deposit)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-hint fw-700 text-uppercase d-block mb-1.5 fs-11">Precipitation Outlook</label>
                    <div className="btn-group w-100 btn-group-sm">
                      {['Drought', 'Normal', 'Heavy Rain'].map(outlook => (
                        <button
                          key={outlook}
                          type="button"
                          className={`btn ${weatherOutlook === outlook ? 'btn-success fw-700' : 'btn-outline-success'}`}
                          onClick={() => setWeatherOutlook(outlook)}
                        >
                          {outlook}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <hr className="my-0" style={{ borderColor: '#EAF3DE' }} />

                {/* Fertilizer Sliders */}
                <div>
                  <h5 className="mb-3 fw-800 text-dark">🧪 Planned Fertilizer Input</h5>
                  
                  <div>
                    <div className="d-flex justify-content-between text-hint fw-700 text-uppercase fs-11 mb-1.5">
                      <span>Fertilizer Rate</span>
                      <strong className="text-dark fw-800 fs-13">{fertilizerRate} kg/Hectare</strong>
                    </div>
                    <input 
                      type="range" 
                      className="form-range" 
                      min="0" 
                      max="500" 
                      step="10" 
                      value={fertilizerRate} 
                      onChange={e => setFertilizerRate(parseInt(e.target.value))}
                    />
                    <div className="d-flex justify-content-between text-hint fs-10 mt-1">
                      <span>0 kg/ha</span>
                      <span className="fw-700 text-success">250 kg/ha (Peak)</span>
                      <span>500 kg/ha</span>
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 rounded text-center" style={{ backgroundColor: '#F4F7F1', border: '1px solid #EAF3DE' }}>
                    <span className="text-hint fs-11 d-block mb-1">Total inputs required:</span>
                    <strong className="text-dark font-monospace fs-14">
                      {(fertilizerRate * acreage).toLocaleString()} kg
                    </strong>
                  </div>
                </div>

                {/* Exporter Button */}
                <button 
                  onClick={handleExportPDF}
                  className="btn btn-am-primary py-3 fw-700 shadow-sm"
                >
                  📥 Export Simulated Advisory
                </button>

              </div>
            </div>

            {/* Right Column: Visual Charts & Diagnostics */}
            <div className="col-lg-8 d-flex flex-column gap-4">
              
              {/* Dynamic Headline KPI Card */}
              <div className="card am-card p-0 shadow-sm border-0 overflow-hidden">
                <div className="row g-0">
                  <div className="col-md-7 p-4 border-end" style={{ borderColor: '#EAF3DE' }}>
                    <span className="text-hint d-block mb-1 fs-12 fw-700 text-uppercase letter-spacing-1">Estimated Total Harvest</span>
                    <h2 style={{ color: '#1A3A08', fontWeight: 800, fontSize: '42px', marginBottom: 0, letterSpacing: '-1.5px' }} className="d-flex align-items-baseline gap-2">
                      {totalYieldTonnes.toLocaleString()} <span style={{ fontSize: '18px', fontWeight: 600, color: '#4E6A36' }}>Tonnes</span>
                    </h2>
                    <span className="text-hint fs-11 mt-1 d-block">
                      Yield Density: <strong className="text-dark">{currentYieldPerHa} tonnes/Hectare</strong>
                    </span>
                  </div>

                  <div className="col-md-5 p-4 d-flex flex-column justify-content-center" style={{ backgroundColor: '#F4F7F1' }}>
                    <span className="text-hint d-block mb-1 fs-12 fw-700 text-uppercase letter-spacing-1">Estimated Gross Revenue</span>
                    <h3 style={{ color: '#2C5410', fontWeight: 900, fontSize: '28px', marginBottom: 0, letterSpacing: '-0.5px' }} className="font-monospace text-success">
                      {formatPrice(estimatedGrossRevenue * 100)}
                    </h3>
                    <span className="text-hint fs-11 mt-1 d-block">
                      Based on average price of <strong className="text-dark">${cropMarketPrices[cropType]}/T</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Recharts Curve Visualizer */}
              <div className="card am-card p-4 shadow-sm border-0">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div>
                    <h5 className="mb-0 fw-800 text-dark">📊 Crop Yield Guide</h5>
                    <span className="text-hint fs-12">See how fertilizer levels affect your final crop harvest.</span>
                  </div>
                  <span className="badge badge-seed py-1 px-2.5">Yield Model</span>
                </div>


                {isMounted ? (
                  <div style={{ width: '100%', height: '260px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="yieldColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4E8A18" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#4E8A18" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EAF3DE" />
                        <XAxis 
                          dataKey="fertilizerRate" 
                          stroke="#7A9460" 
                          style={{ fontSize: '11px' }} 
                          label={{ value: 'Fertilizer Input (kg/ha)', position: 'insideBottom', offset: -5, style: { fontSize: '10px', fill: '#7A9460' } }}
                        />
                        <YAxis 
                          stroke="#7A9460" 
                          style={{ fontSize: '11px' }} 
                          label={{ value: 't/ha', angle: -90, position: 'insideLeft', style: { fontSize: '10px', fill: '#7A9460' } }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#FAF3E8',
                            borderColor: '#DDD0B8',
                            borderRadius: '8px',
                            color: '#1A3A08',
                            fontSize: '12px',
                          }}
                          formatter={(value) => [`${value} t/ha`, 'Yield']}
                          labelFormatter={(label) => `Rate: ${label} kg/ha`}
                        />
                        
                        {/* Reference Line showing the Peak Optimal Point (250 kg/ha) */}
                        <ReferenceLine x={250} stroke="#3B6D11" strokeDasharray="3 3" label={{ value: 'Peak', position: 'top', fill: '#3B6D11', fontSize: 10 }} />

                        <Area 
                          type="monotone" 
                          dataKey="Yield" 
                          stroke="#4E8A18" 
                          strokeWidth={2.5} 
                          fillOpacity={1} 
                          fill="url(#yieldColor)" 
                        />
                        
                        {/* Dot showing the User's Current input level */}
                        <ReferenceDot 
                          x={fertilizerRate} 
                          y={currentYieldPerHa} 
                          r={7} 
                          fill="#A32D2D" 
                          stroke="#FFFFFF" 
                          strokeWidth={2} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="d-flex align-items-center justify-content-center" style={{ height: '260px' }}>
                    <span className="text-hint">Loading simulation matrix...</span>
                  </div>
                )}
                
                <div className="d-flex justify-content-center gap-4 mt-3" style={{ fontSize: '11.5px' }}>
                  <div className="d-flex align-items-center gap-1.5">
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#4E8A18' }}></div>
                    <span className="text-hint">Yield Response Curve</span>
                  </div>
                  <div className="d-flex align-items-center gap-1.5">
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#A32D2D' }}></div>
                    <span className="text-hint">Your Current Choice (<strong>{fertilizerRate} kg/ha</strong>)</span>
                  </div>
                </div>

                <div className="mt-3 p-3 rounded text-center text-hint fs-12.5" style={{ backgroundColor: '#FAF3E8', border: '1px dashed #DDD0B8', lineHeight: '1.5' }}>
                  💡 <strong>Farming Tip:</strong> The green curve shows how much crop you will harvest. The red dot represents your planned fertilizer input. Try to adjust your sliders so the red dot sits on the peak of the curve to get the highest yield without wasting fertilizer!
                </div>
              </div>


              <div className="row g-4">
                
                {/* Soil Diagnostic Lab Widgets */}
                <div className="col-md-6">
                  <div className="card am-card p-4 shadow-sm border-0 h-100">
                    <h5 className="mb-3 fw-800 text-dark">🧪 Soil Diagnostic Profile</h5>
                    
                    <div className="d-flex flex-column gap-3 fs-13">
                      <div className="d-flex justify-content-between align-items-center border-bottom pb-2" style={{ borderColor: '#EAF3DE' }}>
                        <span className="text-hint">Water Drainage:</span>
                        <strong className="text-dark">{soilMetrics.drainage}</strong>
                      </div>
                      <div className="d-flex justify-content-between align-items-center border-bottom pb-2" style={{ borderColor: '#EAF3DE' }}>
                        <span className="text-hint">Leaching Hazard:</span>
                        <strong className={soilMetrics.status === 'DANGER' ? 'text-danger fw-700' : 'text-dark'}>{soilMetrics.retention}</strong>
                      </div>
                      <div className="d-flex justify-content-between align-items-center border-bottom pb-2" style={{ borderColor: '#EAF3DE' }}>
                        <span className="text-hint">Clay/Sand Composition:</span>
                        <strong className="text-dark">{soilType} Profile</strong>
                      </div>
                      
                      <div className="mt-2">
                        <div className="d-flex justify-content-between align-items-center mb-1.5 text-hint font-monospace fs-11">
                          <span>Organic Retention score</span>
                          <strong className="text-success">{soilMetrics.nutritionIndex}/100</strong>
                        </div>
                        <div className="progress" style={{ height: '6px', backgroundColor: '#FAF3E8', border: '1px solid #EAF3DE' }}>
                          <div 
                            className={`progress-bar ${soilMetrics.status === 'DANGER' ? 'bg-danger' : 'bg-success'}`}
                            role="progressbar" 
                            style={{ width: `${soilMetrics.nutritionIndex}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Agronomic Recommendations */}
                <div className="col-md-6">
                  <div className="card am-card p-4 shadow-sm border-0 h-100" style={{ backgroundColor: '#F4F7F1' }}>
                    <h5 className="mb-3 fw-800 text-dark">💡 Agronomist Suggestions</h5>
                    
                    <ul className="list-unstyled mb-0 d-flex flex-column gap-2" style={{ fontSize: '13px', lineHeight: '1.5', color: '#2C5410' }}>
                      {recommendations.map((rec, i) => (
                        <li key={i} className="d-flex gap-2 align-items-start">
                          <span>•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>

        {/* Dynamic Premium Exporter Modal */}
        {showExportModal && (
          <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(26, 58, 8, 0.4)', backdropFilter: 'blur(8px)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '450px' }}>
              <div className="modal-content border-0 rounded-4 shadow-lg" style={{ backgroundColor: '#FAF3E8', border: '2px solid #EAF3DE' }}>
                <div className="modal-body text-center p-4">
                  {!exportComplete ? (
                    <div className="py-4">
                      <div className="spinner-border text-success mb-4" style={{ width: '3.5rem', height: '3.5rem', borderWidth: '5px' }}></div>
                      <h5 className="fw-800 text-dark mb-2">Creating Crop & Soil Report</h5>
                      <span className="text-hint font-monospace fs-12 d-block py-1 bg-white border rounded mx-3 mb-3 shadow-inner">
                        🔄 {exportStep === 0 ? "Gathering soil details..." : exportStep === 1 ? "Analyzing seasonal rainfall..." : exportStep === 2 ? "Calculating crop responses..." : exportStep === 3 ? "Writing recommendations..." : exportStep === 4 ? "Creating advisory report file..." : "Finalizing document download..."}
                      </span>
                      <p className="text-muted fs-13 mb-0">We are processing your inputs to build a custom, easy-to-read farming guide.</p>
                    </div>

                  ) : (
                    <div className="py-4">
                      <div className="fs-1 mb-3">✅</div>
                      <h4 className="fw-800 text-success mb-2">Simulated PDF Downloaded!</h4>
                      <p className="text-muted fs-13.5 mb-4">
                        The advisory sheet has been signed and successfully downloaded to your device as: <br/>
                        <strong className="text-dark">yield_advisory_{cropType.toLowerCase()}_report.txt</strong>
                      </p>
                      <button 
                        onClick={() => setShowExportModal(false)}
                        className="btn btn-am-primary px-5 fw-700 rounded-pill"
                      >
                        Dismiss
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
