'use client';

import React from 'react';
import Link from 'next/link';
import { useCurrencyStore } from '../lib/currencyStore';

export interface Listing {
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
  title: string;
  description: string;
  category: number;
  category_name?: string;
  price_per_kg_usd_cents: number;
  quantity_available_kg: number | string;
  location_province: string;
  location_district: string;
  images?: Array<{ id: number; image: string }>;
  is_active: boolean;
}

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const { formatPrice, currency } = useCurrencyStore();

  const getTierBadgeClass = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case 'SEED':
        return 'badge-seed';
      case 'HARVEST':
        return 'badge-harvest';
      case 'COMMERCIAL':
        return 'badge-commercial';
      case 'ENTERPRISE':
        return 'badge-enterprise';
      default:
        return 'badge-seed';
    }
  };

  const sellerTier = listing.farmer_detail?.subscription_tier || 'SEED';
  const isVerified = listing.farmer_detail?.kyc_status === 'VERIFIED';
  const imageUrl = listing.images && listing.images.length > 0 ? listing.images[0].image : undefined;
  const displayLocation = `${listing.location_district}, ${listing.location_province}`.replace('_', ' ');

  return (
    <div className="card am-card h-100 d-flex flex-column justify-content-between">
      <div>
        {/* Card Header / Image placeholder */}
        <div
          style={{
            height: '160px',
            backgroundColor: '#EAF3DE',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4E8A18',
            position: 'relative',
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={listing.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.5rem' }}
            />
          ) : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          )}

          {/* Verification Badge */}
          {isVerified && (
            <span
              className="badge badge-verified position-absolute"
              style={{ top: '10px', right: '10px', fontSize: '0.75rem', fontWeight: 500 }}
            >
              Verified
            </span>
          )}
        </div>

        {/* Card Body */}
        <div className="pt-3">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <span className="text-hint font-weight-bold" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {listing.category_name || 'Produce'}
            </span>
            <span className={`badge ${getTierBadgeClass(sellerTier)}`}>
              {sellerTier} Seller
            </span>
          </div>

          <h5 className="card-title mb-1" style={{ color: '#1A3A08', fontSize: '16px', fontWeight: 600 }}>
            {listing.title}
          </h5>

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
            {displayLocation}
          </span>

          <p className="card-text text-hint mb-3" style={{ fontSize: '13px', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {listing.description}
          </p>
        </div>
      </div>

      {/* Card Footer */}
      <div className="border-top pt-3" style={{ borderColor: '#EAF3DE' }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <span className="text-price d-block" style={{ fontSize: '18px', fontWeight: 600 }}>
              {formatPrice(listing.price_per_kg_usd_cents)}
              <span className="text-hint fw-normal" style={{ fontSize: '12px' }}>
                {' '}/ kg
              </span>
            </span>
          </div>
          <div className="text-end">
            <span className="text-hint d-block" style={{ fontSize: '11px' }}>
              Min. Order: <strong>1 kg</strong>
            </span>
            <span className="text-hint d-block" style={{ fontSize: '11px' }}>
              Available: <strong>{listing.quantity_available_kg} kg</strong>
            </span>
          </div>
        </div>

        <Link href={`/marketplace/${listing.id}`} className="btn btn-am-outline w-100 btn-sm text-center">
          View Details
        </Link>
      </div>
    </div>
  );
}
