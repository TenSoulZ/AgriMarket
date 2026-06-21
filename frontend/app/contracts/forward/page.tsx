'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCurrencyStore } from '../../../lib/currencyStore';
import { api } from '../../../lib/axios';
import ProtectedRoute from '../../../components/ProtectedRoute';

interface Commodity {
  id: number;
  name: string;
}

interface ForwardContract {
  id: string;
  farmerName: string;
  buyerName: string;
  commodity: string;
  quantityTonnes: number;
  lockedPricePerTonneCents: number;
  deliveryDate: string;
  depositStatus: 'Paid' | 'Pending';
  status: 'Active' | 'Delivered' | 'Cancelled';
}

export default function ForwardContractsPage() {
  const { formatPrice, currency, conversionRate } = useCurrencyStore();
  const [contracts, setContracts] = useState<ForwardContract[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [commodityId, setCommodityId] = useState('');
  const [qty, setQty] = useState('');
  const [lockedPrice, setLockedPrice] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [depositPercent, setDepositPercent] = useState('10');
  const [formSuccess, setFormSuccess] = useState(false);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [comRes, fwdRes] = await Promise.all([
        api.get('market-data/commodities/'),
        api.get('contracts/forward/')
      ]);
      
      const fetchedCommodities = comRes.data.results || comRes.data;
      setCommodities(fetchedCommodities);
      if (fetchedCommodities.length > 0) {
        setCommodityId(fetchedCommodities[0].id.toString());
      }

      const fetchedFwds = fwdRes.data.results || fwdRes.data;
      const mappedFwds: ForwardContract[] = fetchedFwds.map((f: any) => {
        const commName = fetchedCommodities.find((c: any) => c.id === f.commodity)?.name || `Commodity #${f.commodity}`;
        
        let statusMap: 'Active' | 'Delivered' | 'Cancelled' = 'Active';
        if (f.status === 'COMPLETED') statusMap = 'Delivered';
        else if (f.status === 'CANCELLED') statusMap = 'Cancelled';

        return {
          id: `fwd-${f.id}`,
          farmerName: f.farmer_detail?.farm_profile?.farm_name || f.farmer_detail?.phone_number || 'Unknown Farmer',
          buyerName: f.buyer_detail?.commercial_buyer_profile?.company_name || f.buyer_detail?.phone_number || 'Awaiting Buyer',
          commodity: commName,
          quantityTonnes: parseFloat(f.qty_tonnes),
          lockedPricePerTonneCents: f.fixed_price_per_tonne_usd_cents,
          deliveryDate: f.delivery_date,
          depositStatus: (f.status === 'DEPOSIT_PAID' || f.status === 'COMPLETED') ? 'Paid' : 'Pending',
          status: statusMap,
        };
      });

      setContracts(mappedFwds);
    } catch (err) {
      console.error('Failed to load Forward Contracts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleCreateForward = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedQty = parseFloat(qty);
    const parsedPrice = parseFloat(lockedPrice);
    if (isNaN(parsedQty) || parsedQty <= 0 || isNaN(parsedPrice) || parsedPrice <= 0 || !commodityId) {
      alert('Please enter valid quantities, pricing, and ensure a commodity is selected.');
      return;
    }

    // Convert proposed price to cents
    let priceCents = 0;
    if (currency === 'USD') {
      priceCents = Math.round(parsedPrice * 100);
    } else {
      priceCents = Math.round((parsedPrice / conversionRate) * 100);
    }

    try {
      await api.post('contracts/forward/', {
        commodity: parseInt(commodityId),
        qty_tonnes: parsedQty,
        fixed_price_per_tonne_usd_cents: priceCents,
        delivery_date: deliveryDate,
        deposit_pct: parseFloat(depositPercent)
      });
      
      setFormSuccess(true);
      fetchInitialData(); // Refresh list

      // Clear form after delay
      setTimeout(() => {
        setFormSuccess(false);
        setQty('');
        setLockedPrice('');
        setDeliveryDate('');
      }, 2500);
    } catch (err: any) {
      alert(err.response?.data?.detail || err.response?.data?.[0] || 'Failed to publish Forward Contract. Please ensure you are a Verified Commercial Farmer.');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['COMMERCIAL_FARMER', 'SMALLHOLDER_FARMER', 'COMMERCIAL_BUYER', 'RETAIL_BUYER']}>
      <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '2rem 0 5rem' }}>
      <div className="container">

        {/* Back Link */}
        <div className="mb-3">
          <Link href="/contracts" className="text-decoration-none d-inline-flex align-items-center gap-1" style={{ color: '#3B6D11', fontWeight: 500 }}>
            ← Back to RFQ Board
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-4">
          <h1 style={{ color: '#1A3A08', fontWeight: 700, fontSize: '32px' }}>Forward Pricing Board</h1>
          <p className="lead" style={{ color: '#4E6A36', fontSize: '16px' }}>
            Mitigate crop price volatility by setting locked forward contracts between growers and processors prior to planting or harvest.
          </p>
        </div>

        <div className="row g-4">
          {/* Left Column: Form to create contract */}
          <div className="col-lg-5">
            <div className="card am-card p-4">
              <h4 className="mb-3" style={{ color: '#1A3A08', fontSize: '18px', fontWeight: 600 }}>Create Forward Agreement</h4>
              
              {formSuccess ? (
                <div className="p-3 mb-2 rounded badge-verified text-center" style={{ fontSize: '13px' }}>
                  <strong>Agreement Drafted!</strong> Deposit invoice has been queued. Terms will lock once deposit clears escrow.
                </div>
              ) : (
                <form onSubmit={handleCreateForward}>
                  
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>Crop Commodity</label>
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
                    <div className="col-6">
                      <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>Volume (Tonnes)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        placeholder="e.g. 15"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        required
                        style={{ borderColor: '#DDD0B8' }}
                      />
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>
                        Rate / Tonne ({currency})
                      </label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        placeholder={currency === 'USD' ? 'e.g. 350' : 'e.g. 8750'}
                        value={lockedPrice}
                        onChange={(e) => setLockedPrice(e.target.value)}
                        required
                        style={{ borderColor: '#DDD0B8' }}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>Delivery Date</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        required
                        style={{ borderColor: '#DDD0B8' }}
                      />
                    </div>
                  </div>

                  {/* Escrow Deposit Selection */}
                  <div className="p-3 rounded mb-3" style={{ backgroundColor: '#FAF3E8', border: '0.5px solid #DDD0B8' }}>
                    <label className="form-label text-hint mb-1" style={{ fontSize: '11.5px', fontWeight: 600 }}>
                      Secure Escrow Commitment Deposit
                    </label>
                    <select
                      className="form-select form-select-sm mb-2"
                      value={depositPercent}
                      onChange={(e) => setDepositPercent(e.target.value)}
                      style={{ borderColor: '#DDD0B8' }}
                    >
                      <option value="10">10% Deposit (Standard)</option>
                      <option value="20">20% Deposit (High Volume)</option>
                      <option value="50">50% Deposit</option>
                    </select>
                    
                    {qty && lockedPrice && (
                      <span className="text-hint d-block" style={{ fontSize: '11px', color: '#0F6E56' }}>
                        Required Escrow Deposit:{' '}
                        <strong>
                          {formatPrice(
                            Math.round(
                              ((parseFloat(qty) * parseFloat(lockedPrice) * (currency === 'USD' ? 1 : 1 / conversionRate)) *
                                (parseInt(depositPercent) / 100)) *
                                100
                            )
                          )}
                        </strong>
                      </span>
                    )}
                  </div>

                  <button type="submit" className="btn btn-am-primary btn-sm w-100">
                    Draft & Lock Agreement
                  </button>

                </form>
              )}
            </div>
          </div>

          {/* Right Column: Existing Locked Contracts list */}
          <div className="col-lg-7">
            <h4 className="mb-3" style={{ color: '#2C5410', fontSize: '18px', fontWeight: 600 }}>Locked Forward Contracts ({contracts.length})</h4>
            
            {loading ? (
              <div className="py-4 text-center">
                <span className="spinner-border text-success" role="status" aria-hidden="true" style={{ width: '2rem', height: '2rem' }}></span>
                <p className="mt-3 text-hint">Fetching Secure Contracts...</p>
              </div>
            ) : contracts.length === 0 ? (
              <div className="card am-card py-4 text-center text-hint">
                No active forward contracts available.
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {contracts.map((c) => {
                  const totalValueCents = c.lockedPricePerTonneCents * c.quantityTonnes;
                  return (
                    <div key={c.id} className="card am-card p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                        <div>
                          <span className="badge badge-commercial me-2">Forward Agreement</span>
                          <span className="text-hint" style={{ fontSize: '11px' }}>ID: {c.id}</span>
                        </div>
                        <span className={`badge ${c.depositStatus === 'Paid' ? 'badge-verified' : 'badge-warning-custom'}`}>
                          Deposit {c.depositStatus}
                        </span>
                      </div>

                      <h5 className="mb-2" style={{ color: '#1A3A08', fontSize: '16px', fontWeight: 600 }}>
                        {c.quantityTonnes} Tonnes of {c.commodity}
                      </h5>

                      <div className="row g-2 mb-3 text-hint" style={{ fontSize: '12.5px' }}>
                        <div className="col-sm-6">
                          <strong>Grower:</strong> {c.farmerName}
                        </div>
                        <div className="col-sm-6">
                          <strong>Buyer:</strong> {c.buyerName}
                        </div>
                        <div className="col-sm-6">
                          <strong>Locked Price:</strong> {formatPrice(c.lockedPricePerTonneCents)} / Tonne
                        </div>
                        <div className="col-sm-6">
                          <strong>Delivery Deadline:</strong>{' '}
                          {new Date(c.deliveryDate).toLocaleDateString('en-ZW', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      </div>

                      <div className="border-top pt-2 d-flex justify-content-between align-items-center" style={{ borderColor: '#EAF3DE' }}>
                        <span className="text-hint" style={{ fontSize: '12px' }}>Estimated Settlement Contract Valuation</span>
                        <strong style={{ color: '#3B6D11', fontSize: '14px' }}>
                          {formatPrice(totalValueCents)}
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
    </ProtectedRoute>
  );
}
