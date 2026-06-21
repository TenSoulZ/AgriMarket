'use client';

import React from 'react';
import Link from 'next/link';
import { useCurrencyStore } from '../lib/currencyStore';

export interface WholesaleListing {
  id: number | string;
  farmer: number;
  farmer_detail?: {
    phone_number: string;
    subscription_tier: string;
    kyc_status: string;
    farm_profile?: {
      farm_name: string;
    };
  };
  commodity: number;
  commodity_name?: string;
  title: string;
  description: string;
  category: number;
  category_name?: string;
  price_per_tonne_usd_cents: number;
  quantity_available_tonnes: number | string;
  min_order_quantity_tonnes: number | string;
  quality_grade: string;
  moisture_content_pct: number | string;
  harvest_date: string;
  images?: Array<{ id: number; image: string }>;
  is_active: boolean;
}

interface WholesaleListingCardProps {
  listing: WholesaleListing;
}

export default function WholesaleListingCard({ listing }: WholesaleListingCardProps) {
  const { formatPrice, currency } = useCurrencyStore();

  // Map backend's 'A', 'B', 'C' to full grade string
  const getGradeDisplay = (gradeStr: string) => {
    const g = gradeStr?.toUpperCase();
    if (g === 'A') return 'Grade A';
    if (g === 'B') return 'Grade B';
    if (g === 'C') return 'Grade C';
    return g || 'Ungraded';
  };

  const sellerName = listing.farmer_detail?.farm_profile?.farm_name || listing.farmer_detail?.phone_number || 'Unknown Farm';
  const sellerTier = listing.farmer_detail?.subscription_tier || 'COMMERCIAL';
  
  // Default values for fields not yet in backend model to preserve UI design
  const contractType = 'Spot Wholesale';
  const escrowGuaranteed = true;
  const deliveryTerms = 'Ex-Farm';
  const displayLocation = 'Contact Seller';

  return (
    <div className="card am-card h-100 d-flex flex-column justify-content-between">
      <div>
        {/* Header containing contract type and escrow tag */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className="badge badge-enterprise" style={{ fontSize: '11px' }}>
            {contractType}
          </span>
          {escrowGuaranteed && (
            <span className="badge badge-escrow d-flex align-items-center gap-1" style={{ fontSize: '11px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Escrow Guaranteed
            </span>
          )}
        </div>

        {/* Title and GMB Grade */}
        <div className="d-flex justify-content-between align-items-start mb-2">
          <h5 className="card-title mb-0" style={{ color: '#1A3A08', fontSize: '16px', fontWeight: 600 }}>
            {listing.title}
          </h5>
          <span className="badge badge-seed fs-12 ms-2" style={{ whiteSpace: 'nowrap' }}>
            {getGradeDisplay(listing.quality_grade)}
          </span>
        </div>

        <span className="text-hint d-block mb-3" style={{ fontSize: '13px' }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="me-1 align-text-bottom"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {displayLocation} • <span className="text-dark fw-500">{sellerName}</span>
        </span>

        <p className="card-text text-hint mb-3" style={{ fontSize: '13px', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {listing.description}
        </p>

        {/* Specs Table */}
        <div className="p-2 mb-3 rounded" style={{ backgroundColor: '#FAF3E8', border: '0.5px solid #DDD0B8' }}>
          <div className="row g-0 text-center">
            <div className="col border-end" style={{ borderColor: '#DDD0B8' }}>
              <span className="text-hint d-block" style={{ fontSize: '10px' }}>Min Order</span>
              <strong style={{ color: '#1A3A08', fontSize: '13px' }}>{listing.min_order_quantity_tonnes} Tonnes</strong>
            </div>
            <div className="col">
              <span className="text-hint d-block" style={{ fontSize: '10px' }}>Available</span>
              <strong style={{ color: '#1A3A08', fontSize: '13px' }}>{listing.quantity_available_tonnes} Tonnes</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing & Footer Actions */}
      <div className="border-top pt-3" style={{ borderColor: '#EAF3DE' }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <span className="text-price d-block" style={{ fontSize: '18px', fontWeight: 600 }}>
              {formatPrice(listing.price_per_tonne_usd_cents)}
              <span className="text-hint fw-normal" style={{ fontSize: '12px' }}>
                {' '}/ Tonne
              </span>
            </span>
            <span className="text-hint" style={{ fontSize: '10px' }}>
              Inc. {deliveryTerms}
            </span>
          </div>
          <span className="badge badge-commercial">
            {sellerTier}
          </span>
        </div>

        <Link href={`/wholesale/${listing.id}`} className="btn btn-am-primary w-100 btn-sm text-center">
          Inquire / Negotiate
        </Link>
      </div>
    </div>
  );
}
