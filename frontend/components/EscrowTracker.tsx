'use client';

import React, { useState, useEffect } from 'react';
import EscrowStatusBadge, { EscrowStatus } from './EscrowStatusBadge';
import { api } from '../lib/axios';

interface EscrowTrackerProps {
  initialStatus: EscrowStatus;
  orderId: string;
  buyerName: string;
  sellerName: string;
  amountFormatted: string;
  onStatusChange?: (newStatus: EscrowStatus) => void;
}

export default function EscrowTracker({
  initialStatus,
  orderId,
  buyerName,
  sellerName,
  amountFormatted,
  onStatusChange,
}: EscrowTrackerProps) {
  const [status, setStatus] = useState<EscrowStatus>(initialStatus);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  const handleStatusChange = (newStatus: EscrowStatus) => {
    setStatus(newStatus);
    if (onStatusChange) {
      onStatusChange(newStatus);
    }
  };

  const handleRealPayment = async () => {
    setProcessingPayment(true);
    try {
        const numericStr = amountFormatted.replace('$', '').replace(/,/g, '');
        const calculatedCents = Math.round(parseFloat(numericStr) * 100);
        const backendOrderId = parseInt(orderId.replace('AM-', ''), 10);

        const res = await api.post('payments/initiate/', {
            payment_type: 'ESCROW',
            order: backendOrderId,
            amount_cents: calculatedCents
        });
        
        if (res.data.redirect_url) {
            window.location.href = res.data.redirect_url;
        } else {
            alert("Payment initiated but no secure redirect URL received.");
        }
    } catch (err: any) {
        alert(err.response?.data?.error || "Failed to initialize Paynow gateway.");
    } finally {
        setProcessingPayment(false);
    }
  };

  // Define steps
  // 1: Paid/Escrow Held, 2: In Transit, 3: Delivered, 4: Released
  const getStepNumber = (currentStatus: EscrowStatus) => {
    switch (currentStatus) {
      case 'AWAITING_PAYMENT':
        return 0;
      case 'ESCROW_HELD':
        return 1;
      case 'IN_TRANSIT':
        return 2;
      case 'DELIVERED':
        return 3;
      case 'RELEASED':
        return 4;
      case 'REFUNDED':
        return -1;
      default:
        return 0;
    }
  };

  const currentStep = getStepNumber(status);

  return (
    <div className="card am-card mb-4">
      {/* Header Info */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4 pb-3 border-bottom" style={{ borderColor: '#EAF3DE' }}>
        <div>
          <span className="text-hint d-block" style={{ fontSize: '11px' }}>Order Identifier</span>
          <strong style={{ color: '#1A3A08', fontSize: '16px' }}>{orderId}</strong>
        </div>
        <div>
          <span className="text-hint d-block text-end" style={{ fontSize: '11px' }}>Total Escrow Value</span>
          <strong style={{ color: '#3B6D11', fontSize: '18px', fontWeight: 600 }}>{amountFormatted}</strong>
        </div>
        <div>
          <EscrowStatusBadge status={status} />
        </div>
      </div>

      {/* Visual Timeline Tracker */}
      <div className="position-relative py-4 px-2 mb-4">
        {/* Horizontal Background Line */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '40px',
            right: '40px',
            height: '3px',
            backgroundColor: '#DDD0B8',
            transform: 'translateY(-50%)',
            zIndex: 1,
          }}
        ></div>

        {/* Dynamic Progress Fill Line */}
        {currentStep > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '40px',
              width: `${Math.min(((currentStep - 1) / 3) * 100, 100)}%`,
              height: '3px',
              backgroundColor: '#4E8A18',
              transform: 'translateY(-50%)',
              zIndex: 1,
              transition: 'width 0.4s ease',
            }}
          ></div>
        )}

        {/* Timeline Steps */}
        <div className="d-flex justify-content-between position-relative" style={{ zIndex: 2 }}>
          {/* Step 1: Paid / Secured */}
          <div className="text-center" style={{ width: '80px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: currentStep >= 1 ? '#3B6D11' : '#FFFFFF',
                border: currentStep >= 1 ? 'none' : '2px solid #DDD0B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                color: currentStep >= 1 ? '#FFFFFF' : '#1A3A08',
                fontWeight: 600,
                fontSize: '13px',
                transition: 'all 0.3s ease',
              }}
            >
              {currentStep >= 1 ? '✓' : '1'}
            </div>
            <span className="d-block" style={{ fontSize: '12px', fontWeight: currentStep >= 1 ? 600 : 400, color: '#1A3A08' }}>
              Funds Secured
            </span>
          </div>

          {/* Step 2: Escrow Held */}
          <div className="text-center" style={{ width: '80px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: currentStep >= 2 ? '#3B6D11' : currentStep === 1 ? '#FFFFFF' : '#FFFFFF',
                border: currentStep >= 2 ? 'none' : currentStep === 1 ? '2px solid #4E8A18' : '2px solid #DDD0B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                color: currentStep >= 2 ? '#FFFFFF' : '#1A3A08',
                fontWeight: 600,
                fontSize: '13px',
                transition: 'all 0.3s ease',
              }}
            >
              {currentStep >= 2 ? '✓' : '2'}
            </div>
            <span className="d-block" style={{ fontSize: '12px', fontWeight: currentStep === 1 ? 600 : 400, color: '#1A3A08' }}>
              Escrow Held
            </span>
          </div>

          {/* Step 3: In Transit */}
          <div className="text-center" style={{ width: '80px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: currentStep >= 3 ? '#3B6D11' : currentStep === 2 ? '#FFFFFF' : '#FFFFFF',
                border: currentStep >= 3 ? 'none' : currentStep === 2 ? '2px solid #4E8A18' : '2px solid #DDD0B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                color: currentStep >= 3 ? '#FFFFFF' : '#1A3A08',
                fontWeight: 600,
                fontSize: '13px',
                transition: 'all 0.3s ease',
              }}
            >
              {currentStep >= 3 ? '✓' : '3'}
            </div>
            <span className="d-block" style={{ fontSize: '12px', fontWeight: currentStep === 2 ? 600 : 400, color: '#1A3A08' }}>
              In Transit
            </span>
          </div>

          {/* Step 4: Released */}
          <div className="text-center" style={{ width: '80px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: currentStep >= 4 ? '#3B6D11' : currentStep === 3 ? '#FFFFFF' : '#FFFFFF',
                border: currentStep >= 4 ? 'none' : currentStep === 3 ? '2px solid #4E8A18' : '2px solid #DDD0B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                color: currentStep >= 4 ? '#FFFFFF' : '#1A3A08',
                fontWeight: 600,
                fontSize: '13px',
                transition: 'all 0.3s ease',
              }}
            >
              {currentStep >= 4 ? '✓' : '4'}
            </div>
            <span className="d-block text-nowrap" style={{ fontSize: '12px', fontWeight: currentStep === 4 ? 600 : 400, color: '#1A3A08' }}>
              Funds Released
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Actions Based on Status */}
      <div className="p-3 rounded mb-3" style={{ backgroundColor: '#FAF3E8', border: '0.5px solid #DDD0B8' }}>
        <h6 className="mb-2" style={{ color: '#2C5410', fontWeight: 600, fontSize: '14px' }}>
          Escrow Details & Participant Actions
        </h6>
        <div className="row g-2 mb-3 text-hint" style={{ fontSize: '12px' }}>
          <div className="col-sm-6">
            <strong>Buyer:</strong> {buyerName}
          </div>
          <div className="col-sm-6">
            <strong>Seller:</strong> {sellerName}
          </div>
        </div>

        {status === 'AWAITING_PAYMENT' && (
          <div className="d-flex flex-wrap gap-2">
            <button className="btn btn-am-primary btn-sm px-4 fw-600 shadow-sm" onClick={handleRealPayment} disabled={processingPayment}>
              {processingPayment ? 'Connecting to Paynow Gateway...' : '🔒 Secure Escrow via Paynow'}
            </button>
            <span className="text-hint ms-2" style={{ fontSize: '11.5px', alignSelf: 'center' }}>Redirects to official EcoCash / OneMoney portal.</span>
          </div>
        )}

        {status === 'ESCROW_HELD' && (
          <div>
            <p className="text-hint mb-3" style={{ fontSize: '12.5px' }}>
              Funds have been locked in AgriMarket's secure trust account. <strong>Seller ({sellerName})</strong> must ship the products and mark the order as in transit.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <button className="btn btn-am-primary btn-sm" onClick={() => handleStatusChange('IN_TRANSIT')}>
                Mark as Shipped (Seller Action)
              </button>
              <button className="btn btn-am-danger btn-sm" onClick={() => handleStatusChange('REFUNDED')}>
                Cancel & Refund Buyer
              </button>
            </div>
          </div>
        )}

        {status === 'IN_TRANSIT' && (
          <div>
            <p className="text-hint mb-3" style={{ fontSize: '12.5px' }}>
              The load is currently in transit to {buyerName}'s destination. If you are the buyer and have received and inspected the cargo, please release the funds.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <button className="btn btn-am-ghost btn-sm" onClick={() => handleStatusChange('DELIVERED')}>
                Confirm Arrival / Mark as Delivered
              </button>
              <button className="btn btn-am-primary btn-sm" onClick={() => handleStatusChange('RELEASED')}>
                Confirm Inspection & Release Funds (Buyer Action)
              </button>
            </div>
          </div>
        )}

        {status === 'DELIVERED' && (
          <div>
            <p className="text-hint mb-3" style={{ fontSize: '12.5px' }}>
              Cargo has arrived! <strong>Buyer ({buyerName})</strong> has 48 hours to inspect the crop grade. Please click release to complete the payment to the seller.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <button className="btn btn-am-primary btn-sm" onClick={() => handleStatusChange('RELEASED')}>
                Release Funds to Seller
              </button>
              <button className="btn btn-am-danger btn-sm" onClick={() => handleStatusChange('REFUNDED')}>
                File Dispute / Request Arbitration
              </button>
            </div>
          </div>
        )}

        {status === 'RELEASED' && (
          <div className="d-flex flex-column gap-1">
            <p className="text-hint mb-1" style={{ fontSize: '12.5px', color: '#0F6E56' }}>
              ✓ <strong>Transaction complete.</strong> Funds have been successfully released.
            </p>
            <span style={{ fontSize: '11px', color: '#4E6A36' }}>
              Outbound payout initiated via Paynow Zimbabwe API. Status: Disbursed to seller's mobile money/bank account.
            </span>
          </div>
        )}

        {status === 'REFUNDED' && (
          <div className="d-flex flex-column gap-1">
            <p className="text-hint mb-1" style={{ fontSize: '12.5px', color: '#A32D2D' }}>
              ✖ <strong>Transaction Cancelled.</strong> Funds have been refunded.
            </p>
            <span style={{ fontSize: '11px', color: '#8A3232' }}>
              Outbound refund dispatch initiated via Paynow Zimbabwe API. Status: Returned to buyer's mobile money wallet.
            </span>
          </div>
        )}
      </div>

      {/* Safety Notice */}
      <span className="text-hint" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        AgriMarket Dual-Signature Escrow protects against crop rejection. Disputes are mediated by Agricultural Marketing Authority (AMA) certified arbitrators.
      </span>
    </div>
  );
}
