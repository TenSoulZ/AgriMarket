'use client';

import React from 'react';

export type EscrowStatus =
  | 'AWAITING_PAYMENT'
  | 'ESCROW_HELD'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'RELEASED'
  | 'REFUNDED';

interface EscrowStatusBadgeProps {
  status: EscrowStatus;
}

export default function EscrowStatusBadge({ status }: EscrowStatusBadgeProps) {
  const getBadgeDetails = (status: EscrowStatus) => {
    switch (status) {
      case 'AWAITING_PAYMENT':
        return {
          label: 'Awaiting Payment',
          className: 'badge-warning-custom',
        };
      case 'ESCROW_HELD':
        return {
          label: 'Funds Held in Escrow',
          className: 'badge-escrow',
        };
      case 'IN_TRANSIT':
        return {
          label: 'In Transit',
          className: 'badge-seed',
        };
      case 'DELIVERED':
        return {
          label: 'Delivered',
          className: 'badge-harvest',
        };
      case 'RELEASED':
        return {
          label: 'Escrow Released',
          className: 'badge-verified',
        };
      case 'REFUNDED':
        return {
          label: 'Refunded / Cancelled',
          className: 'badge-danger-custom',
        };
      default:
        return {
          label: 'Unknown Status',
          className: 'badge-seed',
        };
    }
  };

  const details = getBadgeDetails(status);

  return (
    <span className={`badge ${details.className} px-2.5 py-1.5 fs-12`} style={{ fontWeight: 500 }}>
      {details.label}
    </span>
  );
}
