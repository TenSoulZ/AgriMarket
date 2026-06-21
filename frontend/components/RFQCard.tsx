'use client';

import React, { useState } from 'react';
import { useCurrencyStore } from '../lib/currencyStore';

export interface RFQ {
  id: string;
  buyerName: string;
  buyerCompany?: string;
  commodity: string;
  volumeNeeded: string;
  deliveryLocation: string;
  deadlineDate: string;
  status: 'Open' | 'Closed' | 'Awarded';
  notes?: string;
}

interface RFQCardProps {
  rfq: RFQ;
  onQuoteSubmit?: (rfqId: string, quoteAmountCents: number, deliveryDays: number, notes: string) => void;
}

export default function RFQCard({ rfq, onQuoteSubmit }: RFQCardProps) {
  const { formatPrice, currency } = useCurrencyStore();
  const [showForm, setShowForm] = useState(false);
  const [priceInput, setPriceInput] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('7');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPrice = parseFloat(priceInput);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert('Please enter a valid price');
      return;
    }

    // Convert price back to cents.
    // If currency is USD, parsedPrice is in dollars, so * 100
    // If currency is ZiG, we convert ZiG back to USD cents: (price / rate) * 100
    let priceCents = 0;
    if (currency === 'USD') {
      priceCents = Math.round(parsedPrice * 100);
    } else {
      // access current conversionRate from useCurrencyStore state:
      const rate = useCurrencyStore.getState().conversionRate;
      priceCents = Math.round((parsedPrice / rate) * 100);
    }

    if (onQuoteSubmit) {
      onQuoteSubmit(rfq.id, priceCents, parseInt(deliveryDays), quoteNotes);
    }
    
    setIsSubmitted(true);
    setShowForm(false);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Open':
        return 'badge-verified';
      case 'Awarded':
        return 'badge-escrow';
      case 'Closed':
        return 'badge-danger-custom';
      default:
        return 'badge-seed';
    }
  };

  return (
    <div className="card am-card mb-3">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <span className={`badge ${getStatusBadgeClass(rfq.status)} mb-2`}>
            RFQ Status: {rfq.status}
          </span>
          <h5 className="mb-1" style={{ color: '#1A3A08', fontSize: '18px', fontWeight: 600 }}>
            {rfq.commodity}
          </h5>
          <span className="text-hint" style={{ fontSize: '13px' }}>
            Requested by {rfq.buyerName} {rfq.buyerCompany ? `(${rfq.buyerCompany})` : ''}
          </span>
        </div>
        <div className="text-end">
          <span className="d-block text-hint" style={{ fontSize: '11px' }}>Volume Needed</span>
          <strong className="d-block" style={{ color: '#2C5410', fontSize: '16px' }}>{rfq.volumeNeeded}</strong>
        </div>
      </div>

      <div className="row g-3 mb-3 p-3 rounded" style={{ backgroundColor: '#FAF3E8', border: '0.5px solid #DDD0B8' }}>
        <div className="col-sm-6">
          <span className="text-hint d-block" style={{ fontSize: '11px' }}>Delivery Destination</span>
          <span className="fw-500" style={{ color: '#1A3A08', fontSize: '13px' }}>
            {rfq.deliveryLocation}
          </span>
        </div>
        <div className="col-sm-6">
          <span className="text-hint d-block" style={{ fontSize: '11px' }}>Submission Deadline</span>
          <span className="fw-500 text-danger" style={{ fontSize: '13px' }}>
            {new Date(rfq.deadlineDate).toLocaleDateString('en-ZW', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {rfq.notes && (
        <p className="text-hint mb-3" style={{ fontSize: '13px' }}>
          <strong>Buyer Note:</strong> {rfq.notes}
        </p>
      )}

      {isSubmitted ? (
        <div className="p-3 mb-2 rounded badge-verified text-center" style={{ fontSize: '14px' }}>
          <strong>Quote Submitted!</strong> Thank you for your offer. You will be notified via chat and dashboard if the buyer accepts.
        </div>
      ) : (
        <>
          {rfq.status === 'Open' && !showForm && (
            <button className="btn btn-am-primary btn-sm align-self-start" onClick={() => setShowForm(true)}>
              Submit a Quote
            </button>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="border-top pt-3 mt-3" style={{ borderColor: '#EAF3DE' }}>
              <h6 className="mb-3" style={{ color: '#2C5410', fontWeight: 600 }}>Create Your Quote Proposal</h6>
              
              <div className="row g-3 mb-3">
                <div className="col-md-6">
                  <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>
                    Price per Unit ({currency === 'USD' ? 'USD $' : 'ZiG ZW$'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control form-control-sm"
                    placeholder={`e.g. ${currency === 'USD' ? '320' : '8000'}`}
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    required
                    style={{ borderColor: '#DDD0B8' }}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>
                    Delivery Timeframe (days)
                  </label>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(e.target.value)}
                    required
                    style={{ borderColor: '#DDD0B8' }}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>
                  Additional Notes (Quality details, terms, packaging, etc.)
                </label>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  placeholder="Describe your quality standards, packaging, or bulk transport arrangements..."
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  style={{ borderColor: '#DDD0B8' }}
                ></textarea>
              </div>

              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-am-primary btn-sm">
                  Send Proposal
                </button>
                <button type="button" className="btn btn-am-ghost btn-sm" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
