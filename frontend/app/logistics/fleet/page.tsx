'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../../components/ProtectedRoute';

export default function FleetTrackingPage() {
  const [trucks, setTrucks] = useState([
    { id: 'ZIM-HT-142', location: 'Harare Depot', status: 'Loading', lat: 20, lng: 30 },
    { id: 'ZIM-FX-899', location: 'Mutare Route', status: 'In Transit', lat: 60, lng: 70 },
    { id: 'ZIM-BR-412', location: 'Bulawayo Route', status: 'In Transit', lat: 40, lng: 20 }
  ]);

  // Simulate trucks moving slightly
  useEffect(() => {
    const interval = setInterval(() => {
      setTrucks(prev => prev.map(truck => {
        if (truck.status === 'In Transit') {
          return {
            ...truck,
            lat: truck.lat + (Math.random() > 0.5 ? 1 : -1),
            lng: truck.lng + (Math.random() > 0.5 ? 1 : -1)
          };
        }
        return truck;
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ProtectedRoute allowedRoles={['TRANSPORTER']}>
      <div style={{ backgroundColor: '#111827', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#E5E7EB' }}>
      
      {/* Dark Theme Navbar Strip */}
      <div className="py-3 px-4 border-bottom d-flex justify-content-between align-items-center" style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: '#1F2937', borderColor: '#374151' }}>
        <div className="d-flex align-items-center gap-3">
          <Link href="/logistics" className="btn btn-sm btn-outline-secondary text-white border-secondary">← Dashboard</Link>
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#10B981' }} className="btn-pulse"></div>
            <strong style={{ color: '#F3F4F6' }}>Live Truck Tracking Map</strong>
          </div>
        </div>
        <div className="d-flex gap-3 text-sm" style={{ fontSize: '13px' }}>
          <span>Active Trucks: <strong className="text-success">3</strong></span>
          <span>Escrow Protected: <strong className="text-warning">100%</strong></span>
        </div>
      </div>

      <div className="container-fluid p-4 flex-grow-1 d-flex flex-column" style={{ maxWidth: '1400px' }}>
        <div className="row flex-grow-1 g-4">
          
          {/* Radar Map Column */}
          <div className="col-lg-8 d-flex flex-column">
            <div className="glass-panel flex-grow-1 rounded position-relative overflow-hidden" style={{ background: '#1F2937', border: '1px solid #374151', minHeight: '500px' }}>
              
              {/* Radar Grid Lines */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(#374151 1px, transparent 1px), linear-gradient(90deg, #374151 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.2 }}></div>
              
              {/* Radar Sweeper */}
              <div 
                className="radar-sweep" 
                style={{ 
                  position: 'absolute', 
                  top: '50%', left: '50%', 
                  width: '100%', height: '100%', 
                  background: 'conic-gradient(from 0deg, rgba(16, 185, 129, 0) 0deg, rgba(16, 185, 129, 0) 270deg, rgba(16, 185, 129, 0.4) 360deg)', 
                  transformOrigin: '0% 0%'
                }}
              ></div>
              
              {/* Central Hub Blip */}
              <div className="btn-pulse" style={{ position: 'absolute', top: '50%', left: '50%', width: 16, height: 16, backgroundColor: '#10B981', borderRadius: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}></div>
              <span style={{ position: 'absolute', top: '52%', left: '52%', fontSize: '12px', color: '#10B981', fontWeight: 'bold' }}>HQ</span>

              {/* Truck Blips */}
              {trucks.map((truck, idx) => (
                <div key={idx} style={{ position: 'absolute', top: `${truck.lat}%`, left: `${truck.lng}%`, zIndex: 10, transition: 'all 3s linear' }}>
                  <div className={truck.status === 'In Transit' ? 'btn-pulse' : ''} style={{ width: 12, height: 12, backgroundColor: truck.status === 'In Transit' ? '#F59E0B' : '#6B7280', borderRadius: '50%' }}></div>
                  <div style={{ position: 'absolute', top: '15px', left: '-10px', whiteSpace: 'nowrap', fontSize: '11px', color: '#D1D5DB', backgroundColor: 'rgba(31, 41, 55, 0.8)', padding: '2px 6px', borderRadius: '4px', border: '1px solid #4B5563' }}>
                    {truck.id}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Telemetry Log Column */}
          <div className="col-lg-4 d-flex flex-column">
            <div className="glass-panel p-4 rounded h-100" style={{ background: '#1F2937', border: '1px solid #374151' }}>
              <h5 className="mb-4 text-white" style={{ fontSize: '15px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Live Truck Details</h5>
              
              <div className="d-flex flex-column gap-3">
                {trucks.map((truck, idx) => (
                  <div key={idx} className="p-3 rounded hover-glow" style={{ backgroundColor: '#111827', border: '1px solid #374151', cursor: 'pointer' }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <strong className="text-white" style={{ fontSize: '14px' }}>{truck.id}</strong>
                      <span className="badge" style={{ backgroundColor: truck.status === 'In Transit' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(107, 114, 128, 0.2)', color: truck.status === 'In Transit' ? '#FCD34D' : '#9CA3AF' }}>{truck.status}</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: '12px' }}>
                      Sector: {truck.location} <br/>
                      Cargo: Secure
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded text-center text-hint fs-11 mt-3 mb-3" style={{ backgroundColor: '#111827', border: '1px dashed #374151', color: '#9CA3AF', lineHeight: '1.4' }}>
                💡 <strong>Transporter Tip:</strong> The radar sweep on the left shows active trucks moving. Yellow blips indicate trucks traveling, and gray blips indicate loading states.
              </div>

              <button className="btn w-100 mt-auto" style={{ backgroundColor: '#10B981', color: '#064E3B', fontWeight: 600 }}>
                Dispatch Additional Truck
              </button>
            </div>
          </div>

        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}
