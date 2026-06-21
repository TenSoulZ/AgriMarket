'use client';

import React, { useState } from 'react';
import { useCurrencyStore } from '../lib/currencyStore';

export interface LoadPool {
  id: string;
  departurePoint: string;
  destination: string;
  departureDate: string;
  commodityType: string;
  maxCapacityKg: number;
  currentWeightKg: number;
  costPerKgCents: number;
  status: 'Forming' | 'Locked' | 'In Transit' | 'Completed';
  memberCount: number;
}

interface LoadPoolCardProps {
  pool: LoadPool;
  onJoinPool?: (poolId: string, addedWeightKg: number) => void;
}

export default function LoadPoolCard({ pool: initialPool, onJoinPool }: LoadPoolCardProps) {
  const { formatPrice } = useCurrencyStore();
  const [pool, setPool] = useState<LoadPool>(initialPool);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [joined, setJoined] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight <= 0) {
      alert('Please enter a valid weight');
      return;
    }

    if (pool.currentWeightKg + weight > pool.maxCapacityKg) {
      alert(`Error: Adding ${weight} kg exceeds the pool's remaining capacity of ${pool.maxCapacityKg - pool.currentWeightKg} kg.`);
      return;
    }

    const updatedWeight = pool.currentWeightKg + weight;
    const updatedPool = {
      ...pool,
      currentWeightKg: updatedWeight,
      memberCount: pool.memberCount + 1,
      status: updatedWeight >= pool.maxCapacityKg ? 'Locked' as const : pool.status,
    };

    setPool(updatedPool);
    setJoined(true);
    setShowJoinForm(false);

    if (onJoinPool) {
      onJoinPool(pool.id, weight);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Forming':
        return 'badge-warning-custom';
      case 'Locked':
        return 'badge-escrow';
      case 'In Transit':
        return 'badge-seed';
      case 'Completed':
        return 'badge-verified';
      default:
        return 'badge-seed';
    }
  };

  const remainingCapacity = pool.maxCapacityKg - pool.currentWeightKg;
  const capacityPercentage = Math.min(Math.round((pool.currentWeightKg / pool.maxCapacityKg) * 100), 100);

  return (
    <div className="card am-card h-100 d-flex flex-column justify-content-between">
      <div>
        {/* Header containing status and commodity */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className={`badge ${getStatusBadgeClass(pool.status)}`}>
            Pool {pool.status}
          </span>
          <span className="text-hint" style={{ fontSize: '12px', fontWeight: 500 }}>
            {pool.commodityType}
          </span>
        </div>

        {/* Route (Departure -> Destination) */}
        <h5 className="mb-2" style={{ color: '#1A3A08', fontSize: '16px', fontWeight: 600 }}>
          {pool.departurePoint} <span style={{ color: '#7A9460' }}>→</span> {pool.destination}
        </h5>

        <div className="text-hint mb-3" style={{ fontSize: '13px' }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="me-1 align-text-bottom"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Leaves: <strong>{new Date(pool.departureDate).toLocaleDateString('en-ZW', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
        </div>

        {/* Progress & Capacity */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: '12px' }}>
            <span className="text-hint">Pooled Capacity</span>
            <strong style={{ color: '#2C5410' }}>
              {pool.currentWeightKg.toLocaleString()} / {pool.maxCapacityKg.toLocaleString()} kg
            </strong>
          </div>
          
          <div
            className="progress"
            style={{
              height: '8px',
              backgroundColor: '#F0E6D0',
              borderRadius: '10px',
            }}
          >
            <div
              className="progress-bar"
              role="progressbar"
              style={{
                width: `${capacityPercentage}%`,
                backgroundColor: '#4E8A18',
                borderRadius: '10px',
                transition: 'width 0.4s ease',
              }}
              aria-valuenow={capacityPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            ></div>
          </div>
          
          <div className="d-flex justify-content-between align-items-center mt-2" style={{ fontSize: '11px' }}>
            <span className="text-hint">{pool.memberCount} Farmers Pooled</span>
            <span className="text-hint fw-500" style={{ color: '#633806' }}>
              {capacityPercentage}% Capacity • {remainingCapacity.toLocaleString()} kg left
            </span>
          </div>
        </div>
      </div>

      {/* Pricing and Action Footer */}
      <div className="border-top pt-3" style={{ borderColor: '#EAF3DE' }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <span className="text-hint d-block" style={{ fontSize: '11px' }}>Shared Freight Rate</span>
            <span className="text-price" style={{ fontSize: '16px', fontWeight: 600 }}>
              {formatPrice(pool.costPerKgCents)} <span className="text-hint fw-normal" style={{ fontSize: '12px' }}>/ kg</span>
            </span>
          </div>
          <div className="text-end">
            <span className="text-hint d-block" style={{ fontSize: '11px' }}>Est. Total Saving</span>
            <span className="badge badge-verified" style={{ fontSize: '11px' }}>~ 40% Cheaper</span>
          </div>
        </div>

        {joined ? (
          <div className="p-2.5 rounded badge-verified text-center mb-0" style={{ fontSize: '12px' }}>
            ✓ Joined successfully! Estimated load savings applied.
          </div>
        ) : (
          <>
            {pool.status === 'Forming' && !showJoinForm && (
              <button className="btn btn-am-outline w-100 btn-sm" onClick={() => setShowJoinForm(true)}>
                Join Load Pool
              </button>
            )}

            {pool.status !== 'Forming' && (
              <button className="btn btn-am-ghost w-100 btn-sm" disabled style={{ opacity: 0.6 }}>
                Pool Locked / Full
              </button>
            )}

            {showJoinForm && (
              <form onSubmit={handleJoin} className="mt-3 border-top pt-3" style={{ borderColor: '#EAF3DE' }}>
                <div className="mb-2">
                  <label className="form-label text-hint mb-1" style={{ fontSize: '11px' }}>
                    Your Cargo Weight (kg)
                  </label>
                  <div className="input-group input-group-sm">
                    <input
                      type="number"
                      max={remainingCapacity}
                      className="form-control"
                      placeholder="e.g. 500"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      required
                      style={{ borderColor: '#DDD0B8' }}
                    />
                    <span className="input-group-text" style={{ backgroundColor: '#FAF3E8', borderColor: '#DDD0B8' }}>kg</span>
                  </div>
                  <span className="text-hint d-block mt-1" style={{ fontSize: '10px' }}>
                    Estimated shipping cost: <strong>{formatPrice(Math.round((parseFloat(weightInput) || 0) * pool.costPerKgCents))}</strong>
                  </span>
                </div>
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-am-primary btn-sm w-50">
                    Confirm Join
                  </button>
                  <button type="button" className="btn btn-am-ghost btn-sm w-50" onClick={() => setShowJoinForm(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
