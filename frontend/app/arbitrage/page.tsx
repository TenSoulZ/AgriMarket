'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute';
import { api } from '../../lib/axios';
import { useCurrencyStore } from '../../lib/currencyStore';

interface DistrictPrice {
  name: string;
  priceUsd: number; // in USD per Tonne
  status: 'SURPLUS' | 'DEFICIT' | 'NEUTRAL';
  lat: number; // For plotting
  lng: number;
  description: string;
}

// Fixed distance matrix between hubs in kilometers
const DISTANCE_MATRIX: Record<string, Record<string, number>> = {
  'Chinhoyi': { 'Harare': 115, 'Bulawayo': 430, 'Mutare': 375, 'Gweru': 275, 'Masvingo': 410, 'Marondera': 190 },
  'Marondera': { 'Harare': 75, 'Bulawayo': 515, 'Mutare': 185, 'Gweru': 350, 'Masvingo': 310, 'Chinhoyi': 190 },
  'Mazowe': { 'Harare': 40, 'Bulawayo': 480, 'Mutare': 300, 'Gweru': 315, 'Masvingo': 330, 'Chinhoyi': 120 },
  'Harare': { 'Chinhoyi': 115, 'Marondera': 75, 'Mazowe': 40, 'Bulawayo': 440, 'Mutare': 263, 'Gweru': 277, 'Masvingo': 292 },
  'Bulawayo': { 'Chinhoyi': 430, 'Marondera': 515, 'Harare': 440, 'Mutare': 703, 'Gweru': 163, 'Masvingo': 281 },
  'Mutare': { 'Chinhoyi': 375, 'Marondera': 185, 'Harare': 263, 'Bulawayo': 703, 'Gweru': 540, 'Masvingo': 360 },
  'Gweru': { 'Chinhoyi': 275, 'Marondera': 350, 'Harare': 277, 'Bulawayo': 163, 'Mutare': 540, 'Masvingo': 164 },
  'Masvingo': { 'Chinhoyi': 410, 'Marondera': 310, 'Harare': 292, 'Bulawayo': 281, 'Mutare': 360, 'Gweru': 164 }
};

export default function ArbitrageRadarPage() {
  const { formatPrice } = useCurrencyStore();
  const [selectedCommodity, setSelectedCommodity] = useState<string>('Maize');
  const [commodities, setCommodities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculator inputs
  const [sourceDistrict, setSourceDistrict] = useState<string>('Chinhoyi');
  const [destDistrict, setDestDistrict] = useState<string>('Harare');
  const [quantity, setQuantity] = useState<number>(30); // Tonnes
  const [transportRate, setTransportRate] = useState<number>(0.12); // USD per tonne-km
  const [fixedFee, setFixedFee] = useState<number>(150); // Handling & platform escrow fee
  
  // Ticker simulated alerts
  const [tickerIndex, setTickerIndex] = useState(0);
  const tickerAlerts = [
    "⚡ MAIZE (Chibage) ALERT: Price gap between Chinhoyi and Harare GMB depots widened to $35/Tonne",
    "🚚 LOGISTICS NOTE: Average transport rates from Marondera route fell by 4.5% this morning",
    "🌾 WHEAT (Gorosi) DEFICIT: Bulawayo millers report 12-day supply remaining, pricing index trending UP",
    "💰 ARBITRAGE SIGNAL: Soybeans (Soya) Mazowe -> Gweru margin shows 22.4% ROI capability",
    "🔒 SECURE DEAL: 250T Maize (Chibage) contract settled via platform escrow between Harare Buyer & Mazowe Farmer Syndicate"
  ];

  // Base pricing configurations for various commodities per district
  const commodityPricingBase: Record<string, Record<string, { price: number; status: 'SURPLUS' | 'DEFICIT' | 'NEUTRAL'; desc: string }>> = {
    'Maize': {
      'Chinhoyi': { price: 285, status: 'SURPLUS', desc: 'High surplus harvest, silos at 94% capacity' },
      'Marondera': { price: 295, status: 'SURPLUS', desc: 'Healthy yields, active farmer syndicates' },
      'Mazowe': { price: 290, status: 'SURPLUS', desc: 'Irrigated maize abundance' },
      'Harare': { price: 335, status: 'DEFICIT', desc: 'Millers demand high, low regional supply' },
      'Bulawayo': { price: 350, status: 'DEFICIT', desc: 'Industrial demand spike, long logistics routes' },
      'Mutare': { price: 320, status: 'NEUTRAL', desc: 'Stable supply matching border trade demand' },
      'Gweru': { price: 325, status: 'NEUTRAL', desc: 'Balanced local grain processing activity' },
      'Masvingo': { price: 340, status: 'DEFICIT', desc: 'Dry regional yields, grain supply deficit' }
    },
    'Wheat': {
      'Chinhoyi': { price: 390, status: 'SURPLUS', desc: 'Winter cropping yields exceed estimates' },
      'Marondera': { price: 410, status: 'NEUTRAL', desc: 'Average storage volumes' },
      'Mazowe': { price: 395, status: 'SURPLUS', desc: 'Major commercial farms clearing storages' },
      'Harare': { price: 460, status: 'DEFICIT', desc: 'High demand from commercial bakeries' },
      'Bulawayo': { price: 480, status: 'DEFICIT', desc: 'Critical wheat deficit, milling plants hungry' },
      'Mutare': { price: 440, status: 'NEUTRAL', desc: 'Balanced local demand' },
      'Gweru': { price: 445, status: 'NEUTRAL', desc: 'Moderate baker supply contracts active' },
      'Masvingo': { price: 465, status: 'DEFICIT', desc: 'Minimal regional production, highly import dependent' }
    },
    'Soybeans': {
      'Chinhoyi': { price: 510, status: 'SURPLUS', desc: 'Oilseed harvest complete, storage surplus' },
      'Marondera': { price: 530, status: 'NEUTRAL', desc: 'Steady trading volumes' },
      'Mazowe': { price: 505, status: 'SURPLUS', desc: 'High commercial soybean harvest surplus' },
      'Harare': { price: 590, status: 'DEFICIT', desc: 'Refinery oil production processing demand peak' },
      'Bulawayo': { price: 610, status: 'DEFICIT', desc: 'Feed mill demand critical' },
      'Mutare': { price: 560, status: 'NEUTRAL', desc: 'Normal processing demand' },
      'Gweru': { price: 575, status: 'NEUTRAL', desc: 'Stable commercial demand' },
      'Masvingo': { price: 595, status: 'DEFICIT', desc: 'Drought-prone area, oilseeds scarce' }
    },
    'Sorghum': {
      'Chinhoyi': { price: 240, status: 'NEUTRAL', desc: 'Moderate smallholder trade' },
      'Marondera': { price: 230, status: 'SURPLUS', desc: 'Grain reserve surplus' },
      'Mazowe': { price: 235, status: 'SURPLUS', desc: 'Active processing reserves' },
      'Harare': { price: 280, status: 'DEFICIT', desc: 'Brewery demand elevated' },
      'Bulawayo': { price: 290, status: 'DEFICIT', desc: 'Sorghum milling shortage' },
      'Mutare': { price: 260, status: 'NEUTRAL', desc: 'Stable supply' },
      'Gweru': { price: 250, status: 'NEUTRAL', desc: 'Balanced commercial demand' },
      'Masvingo': { price: 220, status: 'SURPLUS', desc: 'Drought-resistant crop success' }
    }
  };

  useEffect(() => {
    // Fetch live commodities from backend to stay in sync with database categories
    api.get('market-data/commodities/')
      .then(res => {
        const results = res.data.results || res.data || [];
        setCommodities(results);
      })
      .catch(err => {
        console.error("Failed to fetch commodities, using fallbacks:", err);
      })
      .finally(() => setLoading(false));

    // Rotate ticker alerts
    const timer = setInterval(() => {
      setTickerIndex(prev => (prev + 1) % tickerAlerts.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Compute live price grid for selected commodity
  const priceGrid = useMemo<DistrictPrice[]>(() => {
    const base = commodityPricingBase[selectedCommodity] || commodityPricingBase['Maize'];
    return [
      { name: 'Chinhoyi', priceUsd: base['Chinhoyi'].price, status: base['Chinhoyi'].status, lat: 28, lng: 42, description: base['Chinhoyi'].desc },
      { name: 'Marondera', priceUsd: base['Marondera'].price, status: base['Marondera'].status, lat: 41, lng: 64, description: base['Marondera'].desc },
      { name: 'Mazowe', priceUsd: base['Mazowe'].price, status: base['Mazowe'].status, lat: 31, lng: 52, description: base['Mazowe'].desc },
      { name: 'Harare', priceUsd: base['Harare'].price, status: base['Harare'].status, lat: 36, lng: 55, description: base['Harare'].desc },
      { name: 'Bulawayo', priceUsd: base['Bulawayo'].price, status: base['Bulawayo'].status, lat: 72, lng: 22, description: base['Bulawayo'].desc },
      { name: 'Mutare', priceUsd: base['Mutare'].price, status: base['Mutare'].status, lat: 55, lng: 82, description: base['Mutare'].desc },
      { name: 'Gweru', priceUsd: base['Gweru'].price, status: base['Gweru'].status, lat: 58, lng: 38, description: base['Gweru'].desc },
      { name: 'Masvingo', priceUsd: base['Masvingo'].price, status: base['Masvingo'].status, lat: 70, lng: 52, description: base['Masvingo'].desc }
    ];
  }, [selectedCommodity]);

  // Scan for best arbitrage routes based on the current priceGrid
  const scanResults = useMemo(() => {
    const list: Array<{
      source: string;
      dest: string;
      sourcePrice: number;
      destPrice: number;
      grossGap: number;
      distance: number;
      estFreight: number;
      netMargin: number;
      roi: number;
    }> = [];

    // Evaluate all combinations of source and destination
    priceGrid.forEach(src => {
      priceGrid.forEach(dst => {
        if (src.name === dst.name) return;
        
        // Sourcing from Surplus/Neutral -> Deficit/Neutral is ideal
        if (src.priceUsd >= dst.priceUsd) return;

        const distance = DISTANCE_MATRIX[src.name]?.[dst.name] || 250;
        const estFreight = distance * transportRate; // USD per Tonne
        const grossGap = dst.priceUsd - src.priceUsd;
        const netMargin = grossGap - estFreight;
        const roi = (netMargin / src.priceUsd) * 100;

        if (netMargin > 0) {
          list.push({
            source: src.name,
            dest: dst.name,
            sourcePrice: src.priceUsd,
            destPrice: dst.priceUsd,
            grossGap,
            distance,
            estFreight,
            netMargin,
            roi
          });
        }
      });
    });

    // Sort by net margin descending and return top 4 opportunities
    return list.sort((a, b) => b.netMargin - a.netMargin).slice(0, 4);
  }, [priceGrid, transportRate]);

  // Calculations for current selected source -> dest
  const calcDetails = useMemo(() => {
    const srcObj = priceGrid.find(p => p.name === sourceDistrict);
    const destObj = priceGrid.find(p => p.name === destDistrict);

    const srcPrice = srcObj ? srcObj.priceUsd : 0;
    const destPrice = destObj ? destObj.priceUsd : 0;
    const distance = DISTANCE_MATRIX[sourceDistrict]?.[destDistrict] || 0;

    const purchaseCost = srcPrice * quantity;
    const freightCostPerTonne = distance * transportRate;
    const totalFreight = freightCostPerTonne * quantity;
    const landedCost = purchaseCost + totalFreight + fixedFee;
    const grossRevenue = destPrice * quantity;
    const netProfit = grossRevenue - landedCost;
    const roiPercent = purchaseCost > 0 ? (netProfit / landedCost) * 100 : 0;

    return {
      srcPrice,
      destPrice,
      distance,
      purchaseCost,
      freightCostPerTonne,
      totalFreight,
      landedCost,
      grossRevenue,
      netProfit,
      roiPercent
    };
  }, [sourceDistrict, destDistrict, quantity, transportRate, fixedFee, priceGrid]);

  const selectOpportunity = (src: string, dst: string) => {
    setSourceDistrict(src);
    setDestDistrict(dst);
  };

  return (
    <ProtectedRoute allowedRoles={['COMMERCIAL_BUYER', 'RETAIL_BUYER']}>
      <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', paddingBottom: '4rem' }}>
        
        {/* Ticker Bar */}
        <div style={{ backgroundColor: '#1A3A08', color: '#EAF3DE', padding: '10px 20px', fontSize: '13.5px', borderBottom: '2px solid #3B6D11' }} className="shadow-sm">
          <div className="container d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-am-primary btn-pulse" style={{ backgroundColor: '#3B6D11', fontSize: '10px' }}>PRICE RADAR</span>
              <span className="text-truncate fw-500 transition-all duration-500" style={{ letterSpacing: '0.5px' }}>
                {tickerAlerts[tickerIndex]}
              </span>
            </div>
            <Link href="/dashboard/buyer" className="text-white text-decoration-none fw-700 fs-12 hover-glow" style={{ borderBottom: '1px dotted #EAF3DE' }}>
              ← Return to Dashboard
            </Link>
          </div>
        </div>

        <div className="container mt-4">
          {/* Header */}
          <div className="row align-items-center mb-4">
            <div className="col-md-7">
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge badge-enterprise py-1 px-3">Corporate Sourcing</span>
                <span className="badge badge-verified py-1 px-3">Arbitrage AI v2.4</span>
              </div>
              <h1 className="fw-800 text-dark mb-1" style={{ fontSize: '32px', letterSpacing: '-0.5px' }}>
                Arbitrage Intelligence Radar
              </h1>
              <p className="text-hint mb-0" style={{ fontSize: '15px' }}>
                Scan regional price differentials, simulate true landed transportation costs, and execute low-risk direct-sourcing trades.
              </p>
            </div>
            <div className="col-md-5 mt-3 mt-md-0 text-md-end">
              <div className="d-inline-flex align-items-center gap-3 bg-white p-2 rounded shadow-sm border" style={{ borderColor: '#EAF3DE' }}>
                <span className="fw-700 text-dark fs-14 ps-2">Select Commodity:</span>
                <select 
                  className="form-select border-0 fw-800 text-success" 
                  value={selectedCommodity} 
                  onChange={(e) => setSelectedCommodity(e.target.value)}
                  style={{ width: '220px', cursor: 'pointer', outline: 'none', boxShadow: 'none', fontSize: '15px' }}
                >
                  <option value="Maize">🌾 White Maize (Chibage / Umbila)</option>
                  <option value="Wheat">🥖 Winter Wheat (Gorosi)</option>
                  <option value="Soybeans">🌱 Soybeans (Soya)</option>
                  <option value="Sorghum">🌾 Sorghum (Mapfunde / Amabele)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="row g-4">
            
            {/* Left Column: Interactive Heatmap Grid & Map */}
            <div className="col-lg-7">
              <div className="card am-card p-4 h-100 shadow-sm border-0 position-relative overflow-hidden">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-800 text-dark mb-0 d-flex align-items-center gap-2">
                    🗺️ District Price Matrix & Heatmap
                  </h5>
                  <span className="text-hint font-monospace fs-11">8 Hubs Connected</span>
                </div>

                {/* SVG Visual Heatmap Representation */}
                <div 
                  className="rounded position-relative mb-4 border d-flex justify-content-center align-items-center"
                  style={{ 
                    height: '240px', 
                    background: 'radial-gradient(circle, #FAF6EE 0%, #FAF3E8 100%)', 
                    borderColor: '#EAF3DE',
                    overflow: 'hidden'
                  }}
                >
                  {/* Grid overlay for tech look */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(#EAF3DE 1.5px, transparent 1.5px), linear-gradient(90deg, #EAF3DE 1.5px, transparent 1.5px)', backgroundSize: '30px 30px', opacity: 0.35 }}></div>

                  {/* Stylized Zimbabwe Shape Outline */}
                  <svg 
                    viewBox="0 0 100 80" 
                    style={{ width: '85%', height: '85%', zIndex: 1, filter: 'drop-shadow(0px 8px 16px rgba(44, 84, 16, 0.05))' }}
                  >
                    {/* SVG map polygon approximation of Zimbabwe */}
                    <polygon 
                      points="38,15 52,14 65,16 75,20 85,28 92,38 88,48 80,56 70,68 60,75 48,76 34,70 20,62 10,50 8,36 18,28 28,22" 
                      fill="none" 
                      stroke="#DDD0B8" 
                      strokeWidth="0.8" 
                      strokeDasharray="2,2"
                    />
                    
                    <polygon 
                      points="38,15 52,14 65,16 75,20 85,28 92,38 88,48 80,56 70,68 60,75 48,76 34,70 20,62 10,50 8,36 18,28 28,22" 
                      fill="#FFFFFF" 
                      opacity="0.65"
                    />

                    {/* Regional surplus green shading */}
                    <circle cx="34" cy="32" r="18" fill="#4E8A18" opacity="0.1" />
                    <circle cx="70" cy="50" r="16" fill="#A32D2D" opacity="0.06" />
                  </svg>

                  {/* Interactive District Blips overlayed */}
                  {priceGrid.map((dist, idx) => {
                    const isSrc = sourceDistrict === dist.name;
                    const isDst = destDistrict === dist.name;
                    const color = dist.status === 'SURPLUS' ? '#4E8A18' : dist.status === 'DEFICIT' ? '#BA7517' : '#2C5410';

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          // Toggle source / destination selection on click
                          if (sourceDistrict !== dist.name) {
                            setSourceDistrict(dist.name);
                          } else {
                            setDestDistrict(dist.name);
                          }
                        }}
                        className="position-absolute border-0 bg-transparent p-0 transition-all"
                        style={{
                          top: `${dist.lat}%`,
                          left: `${dist.lng}%`,
                          zIndex: 10,
                          transform: 'translate(-50%, -50%)',
                          outline: 'none'
                        }}
                        title={`${dist.name} ($${dist.priceUsd}/T) - Click to Sourcing Select`}
                      >
                        <div 
                          className={`rounded-circle d-flex align-items-center justify-content-center transition-all ${isSrc ? 'btn-pulse border border-white border-2' : isDst ? 'btn-pulse border border-white border-2' : ''}`}
                          style={{
                            width: isSrc || isDst ? '32px' : '22px',
                            height: isSrc || isDst ? '32px' : '22px',
                            backgroundColor: isSrc ? '#4E8A18' : isDst ? '#BA7517' : color,
                            color: '#FFFFFF',
                            fontSize: isSrc || isDst ? '11px' : '0px',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                            cursor: 'pointer'
                          }}
                        >
                          {isSrc ? 'SRC' : isDst ? 'DST' : ''}
                        </div>
                        <span 
                          className="position-absolute rounded shadow-sm px-2 py-0.5"
                          style={{
                            top: '28px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: 'rgba(255,255,255,0.92)',
                            color: '#1A3A08',
                            fontSize: '9.5px',
                            fontWeight: 800,
                            whiteSpace: 'nowrap',
                            border: isSrc ? '1.5px solid #4E8A18' : isDst ? '1.5px solid #BA7517' : '1px solid #DDD0B8'
                          }}
                        >
                          {dist.name}: ${dist.priceUsd}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* User Friendly Map Guide Tip */}
                <div className="p-2.5 rounded text-center text-hint fs-12 mb-3" style={{ backgroundColor: '#FAF3E8', border: '1px dashed #DDD0B8', lineHeight: '1.4' }}>
                  💡 <strong>Quick Guide:</strong> Click any district circle on the map to set it as either your <strong>Source (SRC)</strong> or <strong>Destination (DST)</strong>. The cost calculator on the right will instantly calculate your true profit margins after transport!
                </div>

                {/* Grid Table */}
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ borderCollapse: 'separate', borderSpacing: '0 6px' }}>
                    <thead>
                      <tr className="text-hint border-0 fs-11 text-uppercase letter-spacing-1">
                        <th className="border-0 pb-2">District / Hub</th>
                        <th className="border-0 pb-2">Current Price</th>
                        <th className="border-0 pb-2">Sourcing Grade</th>
                        <th className="border-0 pb-2 text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceGrid.map((dist, idx) => {
                        const isSelectedSource = sourceDistrict === dist.name;
                        const isSelectedDest = destDistrict === dist.name;

                        return (
                          <tr 
                            key={idx} 
                            style={{ 
                              backgroundColor: isSelectedSource ? '#EAF3DE' : isSelectedDest ? '#FAEEDA' : '#FFFFFF',
                              borderRadius: '8px',
                              transition: 'all 0.15s ease'
                            }}
                            className="shadow-sm"
                          >
                            <td className="ps-3 py-2" style={{ borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}>
                              <strong className="text-dark d-block fs-14">{dist.name}</strong>
                              <span className="text-hint d-block" style={{ fontSize: '10.5px', maxWidth: '210px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {dist.description}
                              </span>
                            </td>
                            <td className="py-2">
                              <strong className="font-monospace text-price fs-15">
                                {formatPrice(dist.priceUsd * 100)}
                              </strong>
                              <span className="text-hint d-block">per Tonne</span>
                            </td>
                            <td className="py-2">
                              <span className={`badge ${
                                dist.status === 'SURPLUS' ? 'badge-verified' : dist.status === 'DEFICIT' ? 'badge-enterprise' : 'badge-seed'
                              } px-2.5 py-1 text-uppercase`} style={{ fontSize: '10px', fontWeight: 800 }}>
                                {dist.status === 'SURPLUS' ? '🟢 Surplus Sourcing' : dist.status === 'DEFICIT' ? '🔴 Deficit Demand' : '🟡 Balanced Supply'}
                              </span>
                            </td>
                            <td className="pe-3 py-2 text-end" style={{ borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}>
                              <div className="btn-group btn-group-sm">
                                <button 
                                  className={`btn ${isSelectedSource ? 'btn-success' : 'btn-outline-success'} fs-11 fw-700`}
                                  onClick={() => setSourceDistrict(dist.name)}
                                >
                                  Source
                                </button>
                                <button 
                                  className={`btn ${isSelectedDest ? 'btn-warning text-dark' : 'btn-outline-warning text-dark'} fs-11 fw-700`}
                                  onClick={() => setDestDistrict(dist.name)}
                                >
                                  Dest
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>

            {/* Right Column: Scan Signals & Cost Calculator */}
            <div className="col-lg-5 d-flex flex-column gap-4">
              
              {/* Scan Signals Panel */}
              <div className="card am-card p-4 shadow-sm border-0 glass-panel">
                <h5 className="fw-800 text-dark mb-3 d-flex align-items-center gap-2">
                  📡 Live Arbitrage Opportunities
                </h5>
                <p className="text-hint fs-12 mb-3">
                  Autonomous scanner identifies highest-yielding price differentials factoring in distance-based transit freight.
                </p>

                <div className="d-flex flex-column gap-2">
                  {scanResults.length === 0 ? (
                    <div className="text-center py-4 bg-white border rounded text-hint fs-13">
                      No positive-yield arbitrage opportunities found for {selectedCommodity} currently.
                    </div>
                  ) : (
                    scanResults.map((op, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => selectOpportunity(op.source, op.dest)}
                        className="p-3 bg-white rounded border hover-glow position-relative cursor-pointer d-flex align-items-center justify-content-between"
                        style={{ 
                          borderColor: sourceDistrict === op.source && destDistrict === op.dest ? '#4E8A18' : '#EAF3DE',
                          borderLeft: '4px solid #4E8A18'
                        }}
                      >
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <strong className="fs-13 text-dark">{op.source}</strong> 
                            <span className="text-muted text-xs">➔</span> 
                            <strong className="fs-13 text-dark">{op.dest}</strong>
                          </div>
                          <span className="text-hint fs-11 d-block">
                            Gap: <span className="text-dark fw-600">${op.grossGap}/T</span> | Distance: <span className="text-dark fw-600">{op.distance}km</span>
                          </span>
                        </div>
                        <div className="text-end">
                          <span className="badge badge-escrow d-block mb-1 font-monospace" style={{ fontSize: '12px' }}>
                            +${op.netMargin.toFixed(0)}/T Net
                          </span>
                          <span className="text-hint font-monospace fs-10" style={{ color: '#0F6E56', fontWeight: 800 }}>
                            {op.roi.toFixed(1)}% ROI
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Dynamic Sourcing Cost Calculator */}
              <div className="card am-card p-4 shadow-sm border-0" style={{ backgroundColor: '#FFFFFF' }}>
                <h5 className="fw-800 text-dark mb-3 d-flex align-items-center gap-2">
                  🧮 Cost-to-Land Calculator
                </h5>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="text-hint fw-700 text-uppercase d-block mb-1.5 fs-11">Source District</label>
                    <select 
                      className="form-select fs-13 fw-700 text-dark" 
                      value={sourceDistrict}
                      onChange={(e) => setSourceDistrict(e.target.value)}
                    >
                      {priceGrid.map((d, i) => <option key={i} value={d.name}>{d.name} (${d.priceUsd}/T)</option>)}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="text-hint fw-700 text-uppercase d-block mb-1.5 fs-11">Destination Market</label>
                    <select 
                      className="form-select fs-13 fw-700 text-dark" 
                      value={destDistrict}
                      onChange={(e) => setDestDistrict(e.target.value)}
                    >
                      {priceGrid.map((d, i) => <option key={i} value={d.name}>{d.name} (${d.priceUsd}/T)</option>)}
                    </select>
                  </div>
                </div>

                {/* Sourcing Parameters */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between text-hint fw-700 text-uppercase fs-11 mb-1.5">
                    <span>Sourcing Volume</span>
                    <span className="text-dark fw-800 fs-13">{quantity} Tonnes</span>
                  </div>
                  <input 
                    type="range" 
                    className="form-range" 
                    min="10" 
                    max="150" 
                    step="5" 
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                  />
                  <div className="d-flex justify-content-between text-hint fs-10 mt-1">
                    <span>Min: 10T</span>
                    <span>Max: 150T</span>
                  </div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="text-hint fw-700 text-uppercase d-block mb-1.5 fs-11">Freight Rate ($/Tonne-km)</label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text">$</span>
                      <input 
                        type="number" 
                        className="form-control fw-700 font-monospace" 
                        value={transportRate} 
                        step="0.01" 
                        min="0.05"
                        onChange={(e) => setTransportRate(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="col-6">
                    <label className="text-hint fw-700 text-uppercase d-block mb-1.5 fs-11">Escrow & Fees ($ Flat)</label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text">$</span>
                      <input 
                        type="number" 
                        className="form-control fw-700 font-monospace" 
                        value={fixedFee} 
                        onChange={(e) => setFixedFee(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Ledger Display */}
                <div className="p-3 rounded mb-4 shadow-inner" style={{ backgroundColor: '#FAF3E8', border: '1px solid #EAF3DE' }}>
                  <div className="d-flex justify-content-between fs-12 mb-2">
                    <span className="text-hint">Sourcing Cost ({sourceDistrict}):</span>
                    <strong className="text-dark font-monospace">{formatPrice(calcDetails.purchaseCost * 100)}</strong>
                  </div>
                  <div className="d-flex justify-content-between fs-12 mb-2">
                    <span className="text-hint">Est. Transport ({calcDetails.distance} km):</span>
                    <strong className="text-dark font-monospace">{formatPrice(calcDetails.totalFreight * 100)}</strong>
                  </div>
                  <div className="d-flex justify-content-between fs-12 mb-2">
                    <span className="text-hint">Escrow & Platform Commission:</span>
                    <strong className="text-dark font-monospace">{formatPrice(fixedFee * 100)}</strong>
                  </div>
                  <hr className="my-2" style={{ borderTop: '1px dashed #DDD0B8' }} />
                  
                  <div className="d-flex justify-content-between fs-12 mb-2">
                    <span className="text-dark fw-700">Total Landed Sourcing Cost:</span>
                    <strong className="text-dark font-monospace fw-800">{formatPrice(calcDetails.landedCost * 100)}</strong>
                  </div>
                  <div className="d-flex justify-content-between fs-12 mb-2">
                    <span className="text-hint">Projected Destination Revenue:</span>
                    <strong className="text-success font-monospace">{formatPrice(calcDetails.grossRevenue * 100)}</strong>
                  </div>
                  <hr className="my-2" style={{ borderTop: '1px dashed #DDD0B8' }} />

                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-dark fw-800 fs-13">Net Arbitrage Margin:</span>
                    <div className="text-end">
                      <strong className={`fs-18 font-monospace fw-900 d-block ${calcDetails.netProfit > 0 ? 'text-success' : 'text-danger'}`}>
                        {calcDetails.netProfit > 0 ? '+' : ''}{formatPrice(calcDetails.netProfit * 100)}
                      </strong>
                      <span className={`badge ${calcDetails.netProfit > 0 ? 'badge-escrow' : 'badge-danger-custom'} fs-10 font-monospace px-2 py-0.5`}>
                        ROI: {calcDetails.roiPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Escrow CTA */}
                <button 
                  className={`btn w-100 py-2.5 fw-700 fs-14 btn-pulse hover-glow ${
                    calcDetails.netProfit > 0 ? 'btn-am-primary' : 'btn-secondary text-white'
                  }`}
                  disabled={calcDetails.netProfit <= 0}
                  onClick={() => alert(`Escrow locked! Sourced ${quantity}T ${selectedCommodity} from ${sourceDistrict} for delivery to ${destDistrict}. Platform logistics notified.`)}
                >
                  {calcDetails.netProfit > 0 ? '🔒 Lock Sourcing Route & Secure Escrow' : '⚠️ Route Has Negative Arbitrage ROI'}
                </button>

              </div>
            </div>

          </div>

        </div>

      </div>
    </ProtectedRoute>
  );
}
