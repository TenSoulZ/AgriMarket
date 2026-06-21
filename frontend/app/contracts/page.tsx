'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import RFQCard, { RFQ } from '../../components/RFQCard';
import { api } from '../../lib/axios';
import ProtectedRoute from '../../components/ProtectedRoute';

interface Commodity {
  id: number;
  name: string;
}

export default function RFQBoardPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [showNewRfqForm, setShowNewRfqForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // New RFQ Form states
  const [commodityId, setCommodityId] = useState('');
  const [volumeNeeded, setVolumeNeeded] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [notes, setNotes] = useState('');

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [comRes, rfqRes] = await Promise.all([
        api.get('market-data/commodities/'),
        api.get('contracts/rfqs/')
      ]);
      
      const fetchedCommodities = comRes.data.results || comRes.data;
      setCommodities(fetchedCommodities);
      if (fetchedCommodities.length > 0) {
        setCommodityId(fetchedCommodities[0].id.toString());
      }

      const fetchedRfqs = rfqRes.data.results || rfqRes.data;
      const mappedRfqs: RFQ[] = fetchedRfqs.map((r: any) => {
        const commName = fetchedCommodities.find((c: any) => c.id === r.commodity)?.name || `Commodity #${r.commodity}`;
        
        let statusMap: 'Open' | 'Closed' | 'Awarded' = 'Open';
        if (r.status === 'AWARDED') statusMap = 'Awarded';
        else if (r.status === 'CANCELLED') statusMap = 'Closed';

        return {
          id: r.id.toString(),
          buyerName: r.buyer_detail?.phone_number || 'Unknown Buyer',
          buyerCompany: r.buyer_detail?.commercial_buyer_profile?.company_name || 'Commercial Buyer',
          commodity: commName,
          volumeNeeded: `${r.qty_tonnes} Tonnes`,
          deliveryLocation: r.delivery_district,
          deadlineDate: r.deadline,
          status: statusMap,
          notes: r.quality_spec,
        };
      });

      setRfqs(mappedRfqs);
    } catch (err) {
      console.error('Failed to load RFQ data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleCreateRfq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commodityId || !volumeNeeded || !deliveryLocation || !deadlineDate) {
      alert('Please fill out all required fields');
      return;
    }

    try {
      await api.post('contracts/rfqs/', {
        commodity: parseInt(commodityId),
        qty_tonnes: volumeNeeded,
        quality_spec: notes,
        delivery_district: deliveryLocation,
        deadline: new Date(deadlineDate).toISOString(),
      });
      
      alert('RFQ Published successfully!');
      setShowNewRfqForm(false);
      setVolumeNeeded('');
      setDeliveryLocation('');
      setDeadlineDate('');
      setNotes('');
      fetchInitialData(); // Refresh list
    } catch (err: any) {
      alert(err.response?.data?.detail || err.response?.data?.[0] || 'Failed to publish RFQ.');
    }
  };

  const handleQuoteSubmit = async (rfqId: string, priceCents: number, deliveryDays: number, quoteNotes: string) => {
    try {
      // In a full implementation, you would post to `/api/v1/contracts/rfqs/${rfqId}/quotes/` or similar.
      // Currently simulating successful submission based on the backend schema.
      console.log(`Submitted quote for RFQ ${rfqId}: Price: ${priceCents} cents, Delivery: ${deliveryDays} days, Notes: ${quoteNotes}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit quote.');
    }
  };

  const openRfqs = rfqs.filter((r) => r.status === 'Open');
  const closedRfqs = rfqs.filter((r) => r.status !== 'Open');

  return (
    <ProtectedRoute allowedRoles={['COMMERCIAL_FARMER', 'SMALLHOLDER_FARMER', 'COMMERCIAL_BUYER', 'RETAIL_BUYER']}>
      <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '2rem 0 5rem' }}>
      <div className="container">

        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
          <div>
            <h1 style={{ color: '#1A3A08', fontWeight: 700, fontSize: '32px' }}>Contracts & RFQ Board</h1>
            <p className="lead" style={{ color: '#4E6A36', fontSize: '16px' }}>
              Submit quotes for large-scale corporate buyer orders, or secure forward pricing contracts prior to harvest.
            </p>
          </div>
          <div className="d-flex gap-2">
            <Link href="/contracts/forward" className="btn btn-am-outline btn-sm">
              Forward Contracts
            </Link>
            <button className="btn btn-am-primary btn-sm" onClick={() => setShowNewRfqForm(!showNewRfqForm)}>
              {showNewRfqForm ? 'Cancel RFQ' : '+ Request a Quote (RFQ)'}
            </button>
          </div>
        </div>

        {/* Create RFQ Form (Buyer Action) */}
        {showNewRfqForm && (
          <div className="card am-card mb-4">
            <h4 className="mb-3" style={{ color: '#1A3A08', fontSize: '18px', fontWeight: 600 }}>Post a New Request For Quotes (RFQ)</h4>
            <form onSubmit={handleCreateRfq}>
              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>Commodity Requested *</label>
                  <select
                    className="form-select form-select-sm"
                    value={commodityId}
                    onChange={(e) => setCommodityId(e.target.value)}
                    required
                    style={{ borderColor: '#DDD0B8' }}
                  >
                    {commodities.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>Volume/Weight Needed (Tonnes) *</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control form-control-sm"
                    value={volumeNeeded}
                    onChange={(e) => setVolumeNeeded(e.target.value)}
                    placeholder="e.g. 10"
                    required
                    style={{ borderColor: '#DDD0B8' }}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>Deadline Date *</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={deadlineDate}
                    onChange={(e) => setDeadlineDate(e.target.value)}
                    required
                    style={{ borderColor: '#DDD0B8' }}
                  />
                </div>
              </div>

              <div className="mb-3">
                <div className="col-12">
                  <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>Delivery Destination Location *</label>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    placeholder="e.g. OK Retail Depot, Gweru"
                    required
                    style={{ borderColor: '#DDD0B8' }}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>Quality Terms & Instructions</label>
                <textarea
                  className="form-control form-control-sm"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Specify packaging requirements, moisture levels, transport arrangements..."
                  style={{ borderColor: '#DDD0B8' }}
                ></textarea>
              </div>

              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-am-primary btn-sm">
                  Publish RFQ
                </button>
                <button type="button" className="btn btn-am-ghost btn-sm" onClick={() => setShowNewRfqForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab Selection */}
        {loading ? (
          <div className="py-5 text-center">
            <span className="spinner-border text-success" role="status" aria-hidden="true" style={{ width: '3rem', height: '3rem' }}></span>
            <p className="mt-3 text-hint">Fetching RFQs...</p>
          </div>
        ) : (
          <div className="row g-4">
            {/* Main RFQ List Column */}
            <div className="col-lg-8">
              <h4 className="mb-3" style={{ color: '#2C5410', fontSize: '18px', fontWeight: 600 }}>Active Requests for Quotations ({openRfqs.length})</h4>
              
              {openRfqs.length > 0 ? (
                <div className="d-flex flex-column gap-3">
                  {openRfqs.map((rfq) => (
                    <RFQCard key={rfq.id} rfq={rfq} onQuoteSubmit={handleQuoteSubmit} />
                  ))}
                </div>
              ) : (
                <div className="card am-card py-4 text-center text-hint">
                  No active buyer RFQs available.
                </div>
              )}

              {closedRfqs.length > 0 && (
                <>
                  <h4 className="mt-5 mb-3" style={{ color: '#7A9460', fontSize: '16px', fontWeight: 600 }}>Recently Completed / Awarded RFQs</h4>
                  <div className="d-flex flex-column gap-3">
                    {closedRfqs.map((rfq) => (
                      <RFQCard key={rfq.id} rfq={rfq} />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Right Column: Info & Tips */}
            <div className="col-lg-4">
              <div className="card am-card mb-4" style={{ backgroundColor: '#FFFFFF' }}>
                <h5 style={{ color: '#1A3A08', fontSize: '15px', fontWeight: 600 }} className="mb-2">How RFQs Work</h5>
                <ul className="list-unstyled mb-0 text-hint d-flex flex-column gap-2" style={{ fontSize: '12.5px', lineHeight: '1.6' }}>
                  <li>
                    <strong>1. Request Quote:</strong> Corporate buyers list their crop volume demand and quality parameters.
                  </li>
                  <li>
                    <strong>2. Propose Quote:</strong> Smallholder and commercial growers bid their crop pricing and delivery times.
                  </li>
                  <li>
                    <strong>3. Award Contract:</strong> The buyer selects the best bid. The contract terms are locked instantly.
                  </li>
                  <li>
                    <strong>4. Fund Escrow:</strong> The buyer deposits the funds into AgriMarket escrow. Farmers dispatch the shipment.
                  </li>
                </ul>
              </div>

              <div className="card am-card" style={{ backgroundColor: '#E1F5EE', borderColor: '#E1F5EE' }}>
                <h5 style={{ color: '#0F6E56', fontSize: '15px', fontWeight: 600 }} className="mb-2">AMA-Accreditation</h5>
                <p className="mb-0 text-hint" style={{ fontSize: '12.5px', color: '#0F6E56' }}>
                  AgriMarket Zimbabwe contracts follow the Agricultural Marketing Authority standard guidelines. Dual-signature escrow handles crop grade dispute mitigations securely.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
    </ProtectedRoute>
  );
}
