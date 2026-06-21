'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCurrencyStore } from '../../lib/currencyStore';
import EscrowTracker from '../../components/EscrowTracker';
import { EscrowStatus } from '../../components/EscrowStatusBadge';
import { api } from '../../lib/axios';
import ProtectedRoute from '../../components/ProtectedRoute';

interface Order {
  id: string;
  itemTitle: string;
  quantity: number;
  unit: string;
  pricePerUnitCents: number;
  buyerName: string;
  sellerName: string;
  status: EscrowStatus;
}

const mapOrder = (backendData: any): Order => {
  const isWholesale = !!backendData.wholesale_listing_detail;
  const isBulk = !!backendData.bulk_contract_detail;
  
  const itemTitle = backendData.listing_detail?.title || 
                    backendData.wholesale_listing_detail?.title || 
                    backendData.bulk_contract_detail?.title || 
                    'AgriMarket Order';
                    
  const unit = (isWholesale || isBulk) ? 'Tonnes' : 'kg';
  const quantity = Number(backendData.qty);
  
  const pricePerUnitCents = quantity > 0 
    ? Math.round(Number(backendData.total_price_usd_cents) / quantity) 
    : 0;
  
  const buyerName = backendData.buyer_detail?.farm_profile?.farm_name || backendData.buyer_detail?.phone_number || 'Unknown Buyer';
  const sellerName = backendData.seller_detail?.farm_profile?.farm_name || backendData.seller_detail?.phone_number || 'Unknown Seller';
  
  let status = 'PENDING';
  if (backendData.escrow_transactions && backendData.escrow_transactions.length > 0) {
    status = backendData.escrow_transactions[0].status;
  }
  
  return {
    id: `AM-${backendData.id}`,
    itemTitle,
    quantity,
    unit,
    pricePerUnitCents,
    buyerName,
    sellerName,
    status: status as EscrowStatus
  };
};

function OrdersDashboardContent() {
  const searchParams = useSearchParams();
  const { formatPrice, currency } = useCurrencyStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await api.get('orders/');
        const data = res.data.results || res.data;
        const mappedOrders = Array.isArray(data) ? data.map(mapOrder) : [];
        setOrders(mappedOrders);
        
        // Handle highlight/redirect
        const newIdParam = searchParams.get('new_id');
        if (newIdParam && mappedOrders.length > 0) {
          const mappedNewId = `AM-${newIdParam}`;
          if (mappedOrders.some(o => o.id === mappedNewId)) {
            setSelectedOrderId(mappedNewId);
          } else {
            setSelectedOrderId(mappedOrders[0].id);
          }
        } else if (mappedOrders.length > 0) {
          setSelectedOrderId(mappedOrders[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [searchParams]);

  const handleEscrowStatusChange = (newStatus: EscrowStatus) => {
    // In a real implementation this would issue a PATCH request to /api/v1/orders/[id]/escrow/
    setOrders((prev) =>
      prev.map((o) => (o.id === selectedOrderId ? { ...o, status: newStatus } : o))
    );
  };

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '2rem 0 5rem' }}>
      <div className="container">

        {/* Page Header */}
        <div className="mb-4">
          <h1 style={{ color: '#1A3A08', fontWeight: 700, fontSize: '32px' }}>Order Tracking & Escrow</h1>
          <p className="lead" style={{ color: '#4E6A36', fontSize: '16px' }}>
            Monitor shipment transits, inspect agricultural grades, and manage dual-signature escrow payouts.
          </p>
        </div>

        {loading ? (
          <div className="py-5 text-center">
            <span className="spinner-border text-success" role="status" aria-hidden="true" style={{ width: '3rem', height: '3rem' }}></span>
            <p className="mt-3 text-hint">Fetching your secure orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="card am-card py-5 text-center">
            <h5 className="mb-2" style={{ color: '#1A3A08' }}>No active orders found</h5>
            <p className="text-hint mb-4">You have not placed or received any orders yet.</p>
            <div>
              <Link href="/marketplace" className="btn btn-am-primary">
                Browse Marketplace
              </Link>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            
            {/* Left Column: Orders List */}
            <div className="col-lg-4">
              <h4 className="mb-3" style={{ color: '#2C5410', fontSize: '18px', fontWeight: 600 }}>Purchase Orders</h4>
              
              <div className="d-flex flex-column gap-3">
                {orders.map((order) => {
                  const isActive = order.id === selectedOrderId;
                  const orderTotalCents = order.pricePerUnitCents * order.quantity;
                  return (
                    <button
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className="card am-card p-3 text-start w-100 border-0"
                      style={{
                        backgroundColor: isActive ? '#EAF3DE' : '#FFFFFF',
                        border: isActive ? '1.5px solid #3B6D11' : '0.5px solid #DDD0B8',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-600" style={{ color: '#1A3A08', fontSize: '14.5px' }}>{order.id}</span>
                        <span className="text-hint" style={{ fontSize: '11px' }}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>

                      <h6 className="mb-1" style={{ color: '#2C5410', fontWeight: 600, fontSize: '14px' }}>
                        {order.itemTitle}
                      </h6>
                      <div className="d-flex justify-content-between align-items-center text-hint" style={{ fontSize: '12px' }}>
                        <span>Qty: {order.quantity} {order.unit}</span>
                        <strong>{formatPrice(orderTotalCents)}</strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Escrow Milestone Tracker Details */}
            {selectedOrder && (
              <div className="col-lg-8">
                <h4 className="mb-3" style={{ color: '#2C5410', fontSize: '18px', fontWeight: 600 }}>
                  Escrow Milestone Tracker
                </h4>

                {/* Render EscrowTracker component */}
                <EscrowTracker
                  initialStatus={selectedOrder.status}
                  orderId={selectedOrder.id}
                  buyerName={selectedOrder.buyerName}
                  sellerName={selectedOrder.sellerName}
                  amountFormatted={formatPrice(selectedOrder.pricePerUnitCents * selectedOrder.quantity)}
                  onStatusChange={handleEscrowStatusChange}
                />

                {/* Order Invoice Details summary */}
                <div className="card am-card p-4">
                  <h5 className="mb-3" style={{ color: '#1A3A08', fontSize: '15px', fontWeight: 600 }}>Order Financial Invoice</h5>
                  
                  <div className="d-flex justify-content-between mb-2 text-hint" style={{ fontSize: '13px' }}>
                    <span>Item: {selectedOrder.itemTitle}</span>
                    <span>{selectedOrder.quantity} {selectedOrder.unit} x {formatPrice(selectedOrder.pricePerUnitCents)}</span>
                  </div>
                  
                  <div className="d-flex justify-content-between mb-2 text-hint" style={{ fontSize: '13px' }}>
                    <span>Platform Escrow Service Fee (2.5%)</span>
                    <span>{formatPrice(Math.round((selectedOrder.pricePerUnitCents * selectedOrder.quantity) * 0.025))}</span>
                  </div>

                  <div className="d-flex justify-content-between mb-2 text-hint" style={{ fontSize: '13px' }}>
                    <span>ZIMRA VAT on Service Fee (15%)</span>
                    <span>{formatPrice(Math.round((selectedOrder.pricePerUnitCents * selectedOrder.quantity) * 0.025 * 0.15))}</span>
                  </div>

                  <div className="d-flex justify-content-between mb-3 text-hint" style={{ fontSize: '13px' }}>
                    <span>Simulated Delivery / Freight Fee</span>
                    <span className="text-success fw-500">Free / Pooled</span>
                  </div>

                  <div className="border-top pt-2 d-flex justify-content-between align-items-center">
                    <span style={{ fontWeight: 600, color: '#1A3A08' }}>Final Escrow Hold</span>
                    <strong className="text-price" style={{ fontSize: '18px' }}>
                      {formatPrice(
                        (selectedOrder.pricePerUnitCents * selectedOrder.quantity) +
                        Math.round((selectedOrder.pricePerUnitCents * selectedOrder.quantity) * 0.025) +
                        Math.round((selectedOrder.pricePerUnitCents * selectedOrder.quantity) * 0.025 * 0.15)
                      )}
                    </strong>
                  </div>

                  {/* Platform actions */}
                  <div className="mt-4 pt-3 border-top d-flex gap-2 align-items-center flex-wrap" style={{ borderColor: '#EAF3DE' }}>
                    {selectedOrder.status === 'RELEASED' && (
                      <Link 
                        href={`/invoice/${selectedOrder.id.replace('AM-', '')}`} 
                        target="_blank" 
                        className="btn btn-sm px-3 fw-600 shadow-sm" 
                        style={{ backgroundColor: '#1A3A08', color: '#FFFFFF' }}
                      >
                        📥 Download Official Invoice
                      </Link>
                    )}
                    <Link href={`/messages?user=${selectedOrder.sellerName}`} className="btn btn-sm btn-am-outline px-3">
                      Contact Counterparty
                    </Link>
                    <Link href="/marketplace" className="btn btn-sm btn-am-ghost px-3">
                      Continue Shopping
                    </Link>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="container py-5 text-center">
          <span className="spinner-border spinner-border-sm text-success" role="status" aria-hidden="true"></span>
          <span className="ms-2">Loading Orders Tracker...</span>
        </div>
      }>
        <OrdersDashboardContent />
      </Suspense>
    </ProtectedRoute>
  );
}
