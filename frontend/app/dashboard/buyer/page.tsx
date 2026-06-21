'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StatCard from '../../../components/StatCard';
import PriceChart from '../../../components/PriceChart';
import { useCurrencyStore } from '../../../lib/currencyStore';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { api } from '../../../lib/axios';

export default function BuyerDashboard() {
  const { formatPrice } = useCurrencyStore();
  const [myRfqs, setMyRfqs] = useState<any[]>([]);
  const [loadingRfqs, setLoadingRfqs] = useState(true);
  const [activeEscrowStep, setActiveEscrowStep] = useState<number>(2); // Simulated "In Transit"

  useEffect(() => {
    // Fetch live Request For Quotations (RFQs)
    api.get('contracts/rfqs/')
      .then(res => {
        setMyRfqs(res.data.results || res.data || []);
      })
      .catch(err => console.error("Failed to fetch RFQs:", err))
      .finally(() => setLoadingRfqs(false));
  }, []);

  const ESCROW_STEPS = [
    { step: 1, label: 'Escrow Locked', icon: '🔒', detail: 'Funds secured in trust account.' },
    { step: 2, label: 'In Transit', icon: '🚚', detail: 'Live GPS: 140km from Depot.' },
    { step: 3, label: 'QA Inspection', icon: '🔎', detail: 'Awaiting grain moisture grading.' },
    { step: 4, label: 'Funds Released', icon: '✅', detail: 'Payment transferred to farmer.' }
  ];

  return (
    <ProtectedRoute allowedRoles={['COMMERCIAL_BUYER', 'RETAIL_BUYER']}>
      <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '2rem 0 5rem' }}>
        <div className="container">

          {/* Page Header */}
          <div className="row align-items-center mb-4 g-3">
            <div className="col-md-8">
              <h1 style={{ color: '#1A3A08', fontWeight: 700, fontSize: '32px' }}>Buyer Sourcing Dashboard</h1>
              <p className="lead mb-0" style={{ color: '#4E6A36', fontSize: '16px' }}>
                Monitor corporate purchases, track incoming escrow shipments, manage RFQ bids, and analyze historic crop indexes.
              </p>
            </div>
            <div className="col-md-4 text-md-end">
              <Link href="/arbitrage" className="btn btn-am-primary btn-pulse hover-glow d-inline-flex align-items-center gap-2 py-2.5 px-4 shadow-sm w-100 w-md-auto justify-content-center">
                <span>📡 Launch Arbitrage Radar</span>
                <span className="badge bg-white text-success font-monospace py-0.5 px-1.5" style={{ fontSize: '10px' }}>LIVE</span>
              </Link>
            </div>
          </div>

        {/* KPIs row using StatCard */}
        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-md-3">
            <StatCard
              title="Escrow Balance Secured"
              value={formatPrice(425000)} // $4250.00
              trendText="3 orders in transit"
              trendDirection="up"
            />
          </div>
          <div className="col-sm-6 col-md-3">
            <StatCard
              title="Total Procurement Spend"
              value={formatPrice(1890000)} // $18,900.00
              trendText="Volume sourcing optimized"
              trendDirection="up"
            />
          </div>
          <div className="col-sm-6 col-md-3">
            <StatCard
              title="Active Sourcing requests"
              value="3 RFQ Posts"
              trendText="13 bid proposals received"
              trendDirection="up"
            />
          </div>
          <div className="col-sm-6 col-md-3">
            <StatCard
              title="Average Price Savings"
              value="~ 18.5%"
              trendText="Via direct farmer sourcing"
              trendDirection="up"
            />
          </div>
        </div>

        {/* Analytics & RFQ sourcing list */}
        <div className="row g-4">
          
          {/* Escrow Tracker and Analytics */}
          <div className="col-lg-8">
            <div className="card am-card p-4 h-100 shadow-sm border-0 position-relative overflow-hidden">
               <h5 className="mb-4" style={{ color: '#1A3A08', fontWeight: 700, fontSize: '18px' }}>Active Procurement Tracker</h5>
               
               {/* Current Order Summary */}
               <div className="d-flex align-items-center gap-3 p-3 rounded mb-4" style={{ backgroundColor: '#FAF3E8', border: '1px solid #EAF3DE' }}>
                  <div className="bg-white p-2 rounded shadow-sm fs-4">🌾</div>
                  <div>
                     <span className="badge bg-am-primary bg-opacity-10 text-am-primary fs-10 text-uppercase letter-spacing-1 mb-1">Order #ORD-8992</span>
                     <h6 className="mb-0 fw-700 text-dark">50 Tonnes - Yellow Maize (Aflatoxin Free)</h6>
                     <span className="text-hint fs-12">Supplier: Mashonaland West Syndicate</span>
                  </div>
                  <div className="ms-auto text-end">
                     <span className="text-hint fs-12 d-block">Secured Value</span>
                     <strong className="font-monospace text-success fs-15 fw-800">$17,000.00</strong>
                  </div>
               </div>

               {/* Interactive Timeline Tracker */}
               <div className="d-flex justify-content-between position-relative mt-5 mb-4">
                  {/* Background Progress Line */}
                  <div className="position-absolute" style={{ top: '24px', left: '10%', right: '10%', height: '4px', backgroundColor: '#EAF3DE', zIndex: 0 }}></div>
                  <div className="position-absolute transition-all" style={{ top: '24px', left: '10%', width: `${(activeEscrowStep - 1) * 33}%`, height: '4px', backgroundColor: '#4E8A18', zIndex: 1, transitionDuration: '0.4s' }}></div>

                  {ESCROW_STEPS.map((stepNode) => {
                     const isCompleted = stepNode.step <= activeEscrowStep;
                     const isActive = stepNode.step === activeEscrowStep;
                     return (
                        <div 
                          key={stepNode.step} 
                          className="d-flex flex-column align-items-center position-relative z-2 hover-lift"
                          style={{ cursor: 'pointer', width: '25%' }}
                          onClick={() => setActiveEscrowStep(stepNode.step)}
                        >
                           <div 
                             className={`rounded-circle d-flex align-items-center justify-content-center transition-all shadow-sm ${isActive ? 'pulse-node' : ''}`}
                             style={{ 
                                width: isActive ? '54px' : '48px', 
                                height: isActive ? '54px' : '48px',
                                backgroundColor: isCompleted ? '#4E8A18' : '#FFFFFF',
                                border: isCompleted ? 'none' : '2px solid #EAF3DE',
                                color: isCompleted ? '#FFFFFF' : '#A0B28E',
                                fontSize: '20px',
                                zIndex: 2
                             }}
                           >
                              {stepNode.icon}
                           </div>
                           <strong className="mt-3 fs-13 text-center" style={{ color: isActive ? '#1A3A08' : '#8A997A', fontWeight: isActive ? 800 : 600 }}>
                              {stepNode.label}
                           </strong>
                           <span className="text-center text-hint fs-11 mt-1" style={{ maxWidth: '120px', opacity: isActive ? 1 : 0.5 }}>
                              {stepNode.detail}
                           </span>
                        </div>
                     );
                  })}
               </div>

            </div>
          </div>

          {/* Active Sourcing RFQs */}
          <div className="col-lg-4">
            <div className="card am-card p-4 h-100 shadow-sm border-0">
               <h5 className="mb-4" style={{ color: '#1A3A08', fontWeight: 700, fontSize: '18px' }}>Active Sourcing RFQs</h5>
               
               <div className="d-flex flex-column gap-3 mb-4">
                  {loadingRfqs ? (
                     <div className="text-center py-4">
                        <span className="spinner-border text-success"></span>
                     </div>
                  ) : myRfqs.length === 0 ? (
                     <div className="text-center py-4 text-hint fs-13">
                        You have no active RFQs in the system.
                     </div>
                  ) : (
                     myRfqs.map(rfq => (
                        <div key={rfq.id} className="p-3 rounded border transition-all hover-lift" style={{ backgroundColor: '#FFFFFF', borderColor: '#EAF3DE' }}>
                           <div className="d-flex justify-content-between align-items-center mb-2">
                              <strong className="fs-14" style={{ color: '#1A3A08' }}>{rfq.crop || rfq.commodity_name || `RFQ #${rfq.id}`}</strong>
                              <span className={`badge ${rfq.status === 'Open' ? 'bg-success' : rfq.status === 'In Escrow' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                                 {rfq.status || 'Active'}
                              </span>
                           </div>
                           <div className="d-flex justify-content-between fs-12 text-hint">
                              <span>Volume: <strong className="text-dark">{rfq.qty || rfq.quantity || '0'} {rfq.unit || 'Tonnes'}</strong></span>
                              <span>Bids: <strong className="text-am-primary">{rfq.bidsCount || rfq.bids_count || 0}</strong></span>
                           </div>
                           <div className="mt-2 pt-2 border-top fs-11 text-muted d-flex justify-content-between" style={{ borderColor: '#F5F5F5' }}>
                              <span>Deadline: {rfq.deadline || new Date(rfq.delivery_deadline).toLocaleDateString() || 'N/A'}</span>
                              <a href="#" className="text-decoration-none fw-600" style={{ color: '#4E8A18' }}>View Bids →</a>
                           </div>
                        </div>
                     ))
                  )}
               </div>

               <button className="btn btn-am-primary w-100 fw-600 shadow-sm mt-auto" style={{ padding: '12px' }}>
                  + Issue New RFQ
               </button>
            </div>
          </div>

        </div>

      </div>
      
      {/* CSS For Pulsing Node */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulseNode {
          0% { box-shadow: 0 0 0 0 rgba(78, 138, 24, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(78, 138, 24, 0); }
          100% { box-shadow: 0 0 0 0 rgba(78, 138, 24, 0); }
        }
        .pulse-node {
          animation: pulseNode 2s infinite;
        }
        .hover-lift {
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .hover-lift:hover {
          transform: translateY(-4px);
        }
      `}} />

      </div>
    </ProtectedRoute>
  );
}
