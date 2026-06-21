'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import LoadPoolCard, { LoadPool } from '../../components/LoadPoolCard';
import { api } from '../../lib/axios';
import ProtectedRoute from '../../components/ProtectedRoute';

// Dynamically import Leaflet Map component with no SSR
const LeafletMap = dynamic(() => import('../../components/LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="d-flex align-items-center justify-content-center h-100" style={{ backgroundColor: '#F0E6D0' }}>
      <div className="text-center text-hint">
        <span className="spinner-border spinner-border-sm text-success d-block mx-auto mb-2" role="status"></span>
        Loading Transit Hub Map...
      </div>
    </div>
  ),
});

interface CommodityOption {
  id: number;
  name: string;
}

export default function LogisticsPage() {
  const [pools, setPools] = useState<LoadPool[]>([]);
  const [commodities, setCommodities] = useState<CommodityOption[]>([]);
  const [showPostForm, setShowPostForm] = useState(false);
  const [loadingPools, setLoadingPools] = useState(true);

  // Form states
  const [departure, setDeparture] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [capacity, setCapacity] = useState('');

  // Route Calculator State
  const [fuelPrice, setFuelPrice] = useState<number | ''>(1.65); // $1.65 / L
  const [efficiency, setEfficiency] = useState<number | ''>(4.5); // 4.5 km / L
  const [routeDistance, setRouteDistance] = useState<number | ''>(320); // 320km route
  const [loadRevenue, setLoadRevenue] = useState<number | ''>(450); // $450 payout
  
  const fuelCost = ((Number(routeDistance) || 0) / (Number(efficiency) || 1)) * (Number(fuelPrice) || 0);
  const netMargin = (Number(loadRevenue) || 0) - fuelCost;
  const isProfitable = netMargin > 0;

  // 1. Load active pools
  const fetchPools = async () => {
    setLoadingPools(true);
    try {
      const res = await api.get('logistics/pools/');
      const mapped = res.data.map((p: any) => ({
        id: String(p.id),
        departurePoint: p.origin_district,
        destination: p.destination_district,
        departureDate: p.departure_date,
        commodityType: p.commodity_type,
        maxCapacityKg: p.max_capacity_kg,
        currentWeightKg: p.current_weight_kg,
        costPerKgCents: p.cost_per_kg_cents,
        status: p.status === 'OPEN' ? 'Forming' : p.status === 'BOOKED' ? 'Locked' : p.status === 'DELIVERED' ? 'Completed' : 'Forming',
        memberCount: p.member_count,
      }));
      setPools(mapped);
    } catch (err) {
      console.error('Error fetching pools:', err);
    } finally {
      setLoadingPools(false);
    }
  };

  useEffect(() => {
    fetchPools();
  }, []);

  // 2. Load commodities dropdown
  useEffect(() => {
    api.get('market-data/commodities/')
      .then(res => {
        setCommodities(res.data);
        if (res.data.length > 0) {
          setSelectedCommodity(String(res.data[0].id));
        }
      })
      .catch(err => {
        console.error('Error fetching commodities:', err);
      });
  }, []);

  // 3. Create a new load post
  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    const capVal = parseInt(capacity);

    if (isNaN(capVal) || capVal <= 0 || !selectedCommodity) {
      alert('Please enter a valid crop weight and selection.');
      return;
    }

    try {
      await api.post('logistics/load-posts/', {
        commodity: parseInt(selectedCommodity),
        weight_kg: capVal,
        origin_district: departure,
        destination_district: destination,
        target_pickup_date: date,
      });

      // Refresh list (backend synchronously runs pooling calculation!)
      await fetchPools();
      setShowPostForm(false);

      // Reset Form
      setDeparture('');
      setDestination('');
      setDate('');
      setCapacity('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit load post for pooling.');
    }
  };

  // 4. Handle joining a pool
  const handleJoinPool = async (poolId: string, addedWeightKg: number) => {
    const pool = pools.find(p => p.id === poolId);
    if (!pool) return;

    // Resolve matching commodity ID by checking pool crop type
    const matchingComm = commodities.find(c => pool.commodityType.toLowerCase().includes(c.name.toLowerCase())) || commodities[0];
    if (!matchingComm) {
      alert('No allowed commodities available in the database.');
      return;
    }

    try {
      await api.post('logistics/load-posts/', {
        commodity: matchingComm.id,
        weight_kg: addedWeightKg,
        origin_district: pool.departurePoint,
        destination_district: pool.destination,
        target_pickup_date: pool.departureDate,
      });
      
      // Refresh list
      await fetchPools();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to register load in pool.');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['TRANSPORTER']}>
      <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '2rem 0 5rem' }}>
        <div className="container">

          {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
          <div>
            <h1 style={{ color: '#1A3A08', fontWeight: 700, fontSize: '32px' }}>Shared Logistics Pooling</h1>
            <p className="lead mb-0" style={{ color: '#4E6A36', fontSize: '16px' }}>
              Co-coordinate load sharing with nearby smallholder farmers to lower shipping fees and logistics dispatch costs.
            </p>
          </div>
          <div className="d-flex gap-2">
            <a href="/logistics/fleet" className="btn btn-am-outline hover-glow d-flex align-items-center gap-2" style={{ padding: '8px 16px', borderRadius: '30px' }}>
              <span className="btn-pulse" style={{ width: 8, height: 8, backgroundColor: '#4E8A18', borderRadius: '50%', display: 'inline-block' }}></span>
              Live Fleet Tracking
            </a>
            <button className="btn btn-am-primary hover-glow" onClick={() => setShowPostForm(!showPostForm)} style={{ padding: '8px 16px', borderRadius: '30px' }}>
              {showPostForm ? 'Close Form' : '+ Share Vehicle Load'}
            </button>
          </div>
        </div>

        {/* Post Load Pool Form */}
        {showPostForm && (
          <div className="card am-card mb-4">
            <h4 className="mb-3" style={{ color: '#1A3A08', fontSize: '18px', fontWeight: 600 }}>Post Load for Transport Pooling</h4>
            <form onSubmit={handleCreatePool}>
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>Departure District / Location *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. Gokwe South"
                    value={departure}
                    onChange={(e) => setDeparture(e.target.value)}
                    required
                    style={{ borderColor: '#DDD0B8' }}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>Destination Depot / Market *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="e.g. Bulawayo Depot"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                    style={{ borderColor: '#DDD0B8' }}
                  />
                </div>
              </div>

              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>Dispatch Date *</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    style={{ borderColor: '#DDD0B8' }}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>Crop Type *</label>
                  <select
                    className="form-select form-select-sm"
                    value={selectedCommodity}
                    onChange={(e) => setSelectedCommodity(e.target.value)}
                    required
                    style={{ borderColor: '#DDD0B8' }}
                  >
                    {commodities.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>Crop Weight (kg) *</label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="e.g. 1500"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    required
                    style={{ borderColor: '#DDD0B8' }}
                  />
                </div>
              </div>

              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-am-primary btn-sm">
                  Publish Shared Route
                </button>
                <button type="button" className="btn btn-am-ghost btn-sm" onClick={() => setShowPostForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="row g-4">
          
          {/* Left Column: Shared Pools list */}
          <div className="col-lg-7">
            <h4 className="mb-3" style={{ color: '#2C5410', fontSize: '18px', fontWeight: 600 }}>Active Freight Pools ({pools.length})</h4>
            
            {loadingPools ? (
              <div className="text-center py-5">
                <span className="spinner-border spinner-border-sm text-success" role="status" aria-hidden="true"></span>
                <span className="ms-2">Loading active freight routes...</span>
              </div>
            ) : pools.length === 0 ? (
              <div className="card am-card p-5 text-center">
                <span className="text-hint mb-2">No active logistics pools yet.</span>
                <p className="fs-13 text-hint mb-0">Be the first to post a delivery load to initiate a shared transport pooling channel!</p>
              </div>
            ) : (
              <div className="row g-3">
                {pools.map((pool) => (
                  <div key={pool.id} className="col-md-12">
                    <LoadPoolCard pool={pool} onJoinPool={handleJoinPool} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Transit Map & Pooling Guide */}
          <div className="col-lg-5">
            <h4 className="mb-3" style={{ color: '#2C5410', fontSize: '18px', fontWeight: 600 }}>Active Zimbabwe Transit Hubs</h4>
            
            {/* Map Container */}
            <div className="card am-card p-0 mb-4" style={{ height: '350px', position: 'relative' }}>
              <LeafletMap />
            </div>

            {/* Route Margin Calculator Widget */}
            <div className="card am-card p-4 shadow-sm mb-4 border-0 position-relative overflow-hidden" style={{ backgroundColor: '#1A3A08' }}>
               <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '150px', height: '150px', borderRadius: '50%', backgroundColor: '#4E8A18', opacity: 0.3, filter: 'blur(20px)' }}></div>
               
               <h5 className="mb-3 position-relative z-1 d-flex align-items-center gap-2" style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '16px' }}>
                  ⛽ Live Route Profitability Calculator
               </h5>
               <p className="text-white-50 fs-13 mb-4 position-relative z-1" style={{ lineHeight: '1.4' }}>
                  Simulate your dispatch margin. Calculate exact net profits after deducting fuel expenses.
               </p>

               <div className="row g-3 position-relative z-1 mb-4">
                  <div className="col-6">
                     <label className="text-white-50 fs-10 text-uppercase fw-700 letter-spacing-1 mb-2">Fuel Price ($/L)</label>
                     <input 
                       type="number" 
                       className="form-control form-control-sm border-0 shadow-none fw-600" 
                       value={fuelPrice}
                       onChange={(e) => setFuelPrice(e.target.value ? Number(e.target.value) : '')}
                       style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                     />
                  </div>
                  <div className="col-6">
                     <label className="text-white-50 fs-10 text-uppercase fw-700 letter-spacing-1 mb-2">Truck (km/L)</label>
                     <input 
                       type="number" 
                       className="form-control form-control-sm border-0 shadow-none fw-600" 
                       value={efficiency}
                       onChange={(e) => setEfficiency(e.target.value ? Number(e.target.value) : '')}
                       style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                     />
                  </div>
                  <div className="col-6">
                     <label className="text-white-50 fs-10 text-uppercase fw-700 letter-spacing-1 mb-2">Distance (km)</label>
                     <input 
                       type="number" 
                       className="form-control form-control-sm border-0 shadow-none fw-600" 
                       value={routeDistance}
                       onChange={(e) => setRouteDistance(e.target.value ? Number(e.target.value) : '')}
                       style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                     />
                  </div>
                  <div className="col-6">
                     <label className="text-white-50 fs-10 text-uppercase fw-700 letter-spacing-1 mb-2">Payout ($)</label>
                     <input 
                       type="number" 
                       className="form-control form-control-sm border-0 shadow-none fw-600" 
                       value={loadRevenue}
                       onChange={(e) => setLoadRevenue(e.target.value ? Number(e.target.value) : '')}
                       style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                     />
                  </div>
               </div>

               <div className="position-relative z-1 p-3 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                     <span className="text-white-50 fs-12 fw-600">Est. Fuel Cost:</span>
                     <strong className="text-danger fs-14 font-monospace">-${fuelCost.toFixed(2)}</strong>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                     <span className="text-white-50 fs-12 fw-600">Net Profit Margin:</span>
                     <strong className={`fs-18 font-monospace fw-800 ${isProfitable ? 'text-success' : 'text-danger'}`}>
                        {isProfitable ? '+' : ''}${netMargin.toFixed(2)}
                     </strong>
                  </div>
               </div>
            </div>

            {/* Informational Panel */}
            <div className="card am-card" style={{ backgroundColor: '#FFFFFF' }}>
              <h5 style={{ color: '#1A3A08', fontSize: '15px', fontWeight: 600 }} className="mb-2">Logistics Pool Rules</h5>
              <ul className="list-unstyled mb-0 text-hint d-flex flex-column gap-2" style={{ fontSize: '12.5px', lineHeight: '1.6' }}>
                <li>
                  • <strong>Route Verification:</strong> Drivers must upload license, vehicle fitness certifications, and insurance.
                </li>
                <li>
                  • <strong>Cost Distribution:</strong> Rates automatically adjust downwards as the vehicle reaches capacity.
                </li>
                <li>
                  • <strong>Loading Checks:</strong> Farmers must weigh and bag crops properly before delivery dispatch.
                </li>
              </ul>
            </div>

          </div>

        </div>

      </div>
      </div>
    </ProtectedRoute>
  );
}
