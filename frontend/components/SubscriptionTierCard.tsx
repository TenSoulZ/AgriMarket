'use client';

import React from 'react';
import { useCurrencyStore } from '../lib/currencyStore';

export interface SubscriptionTier {
  id: string;
  name: 'Seed' | 'Harvest' | 'Commercial' | 'Enterprise';
  priceMonthlyCents: number; // 0 for seed, custom for enterprise
  isCustomPrice: boolean;
  description: string;
  features: string[];
  isPopular?: boolean;
}

interface SubscriptionTierCardProps {
  tier: SubscriptionTier;
  currentTierId?: string;
  onSelectTier?: (tierId: string) => void;
}

export default function SubscriptionTierCard({
  tier,
  currentTierId,
  onSelectTier,
}: SubscriptionTierCardProps) {
  const { formatPrice } = useCurrencyStore();

  const isCurrentPlan = currentTierId === tier.id;
  const isCommercial = tier.name === 'Commercial';

  const getTierBadgeClass = (name: string) => {
    switch (name) {
      case 'Seed':
        return 'badge-seed';
      case 'Harvest':
        return 'badge-harvest';
      case 'Commercial':
        return 'badge-commercial';
      case 'Enterprise':
        return 'badge-enterprise';
      default:
        return 'badge-seed';
    }
  };

  // Styles depending on commercial inversion
  const cardStyles: React.CSSProperties = isCommercial
    ? {
        backgroundColor: '#2C5410',
        borderColor: '#2C5410',
        color: '#EAF3DE',
      }
    : {
        backgroundColor: '#FFFFFF',
        borderColor: '#DDD0B8',
        color: '#1A3A08',
      };

  const titleColor = isCommercial ? '#EAF3DE' : '#1A3A08';
  const priceColor = isCommercial ? '#FFFFFF' : '#1A3A08';
  const descColor = isCommercial ? '#C8DFA0' : '#7A9460';
  const checkColor = isCommercial ? '#C8DFA0' : '#4E8A18';
  const featureColor = isCommercial ? '#EAF3DE' : '#1A3A08';

  return (
    <div className="card am-card h-100 d-flex flex-column justify-content-between" style={cardStyles}>
      <div>
        {/* Tier Badge / Popular Indicator */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <span className={`badge ${getTierBadgeClass(tier.name)}`}>
            {tier.name} Tier {tier.name === 'Seed' ? '(Free)' : ''}
          </span>
          {tier.isPopular && !isCommercial && (
            <span className="text-hint text-uppercase font-weight-bold" style={{ fontSize: '10px', color: '#4E8A18', fontWeight: 600 }}>
              Most Popular
            </span>
          )}
          {tier.isPopular && isCommercial && (
            <span className="text-uppercase font-weight-bold" style={{ fontSize: '10px', color: '#C8DFA0', fontWeight: 600 }}>
              Highly Recommended
            </span>
          )}
        </div>

        {/* Price & Billing Cycle */}
        <div className="mb-3">
          {tier.isCustomPrice ? (
            <h3 className="mb-0" style={{ color: priceColor, fontSize: '24px', fontWeight: 700 }}>
              Custom Pricing
            </h3>
          ) : (
            <h3 className="mb-0" style={{ color: priceColor, fontSize: '28px', fontWeight: 700 }}>
              {formatPrice(tier.priceMonthlyCents)}
              <span style={{ fontSize: '14px', fontWeight: 400, color: descColor }}> / month</span>
            </h3>
          )}
        </div>

        {/* Description */}
        <p className="mb-4" style={{ fontSize: '13px', color: descColor, minHeight: '40px' }}>
          {tier.description}
        </p>

        {/* Feature List */}
        <ul className="list-unstyled mb-4 d-flex flex-column gap-2.5" style={{ fontSize: '13px' }}>
          {tier.features.map((feature, idx) => (
            <li key={idx} className="d-flex align-items-start gap-2" style={{ color: featureColor }}>
              <span style={{ color: checkColor, fontWeight: 'bold', fontSize: '14px', lineHeight: '1' }}>
                ✓
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Button */}
      <div className="pt-3 border-top" style={{ borderColor: isCommercial ? '#4E6A36' : '#EAF3DE' }}>
        {isCurrentPlan ? (
          <button className="btn btn-sm w-100 btn-am-ghost" disabled style={{ opacity: 0.8 }}>
            Current Active Plan
          </button>
        ) : isCommercial ? (
          <button
            className="btn btn-sm w-100"
            style={{ backgroundColor: '#EAF3DE', color: '#2C5410', fontWeight: 600, border: 'none' }}
            onClick={() => onSelectTier?.(tier.id)}
          >
            Upgrade to Commercial
          </button>
        ) : (
          <button
            className={`btn btn-sm w-100 ${tier.isPopular ? 'btn-am-primary' : 'btn-am-outline'}`}
            onClick={() => onSelectTier?.(tier.id)}
          >
            Select Plan
          </button>
        )}
      </div>
    </div>
  );
}
