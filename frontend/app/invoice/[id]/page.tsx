'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/axios';
import ProtectedRoute from '../../../components/ProtectedRoute';

interface InvoiceData {
  invoice_number: string;
  issue_date: string;
  status: string;
  platform: {
    name: string;
    vat_number: string;
    bp_number: string;
    address: string;
    compliance_act: string;
  };
  buyer: {
    name: string;
    company_name?: string;
    registration_number?: string;
    phone: string;
    role: string;
    bp_number?: string;
  };
  seller: {
    name: string;
    farm_name?: string;
    phone: string;
    role: string;
    bp_number?: string;
  };
  line_items: Array<{ description: string; amount: number }>;
  total_amount_usd: number;
}

function InvoiceContent({ params }: { params: { id: string } }) {
  const [data, setData] = useState<InvoiceData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Inject custom print CSS logic safely into the document
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body { background-color: #FFFFFF !important; }
        .d-print-none { display: none !important; }
        .container { box-shadow: none !important; border: none !important; max-width: 100% !important; margin: 0 !important; padding: 10px !important; }
      }
    `;
    document.head.appendChild(style);

    api.get(`orders/${params.id}/invoice/`)
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || 'Failed to load official ZIMRA compliant invoice.'))
      .finally(() => {
         return () => document.head.removeChild(style);
      });
  }, [params.id]);

  if (error) {
    return <div className="p-5 text-center text-danger fw-600">{error}</div>;
  }

  if (!data) {
    return (
      <div className="p-5 text-center">
        <span className="spinner-border text-success mb-3 d-block mx-auto"></span>
        <span className="text-hint">Retrieving ZIMRA Compliant Escrow Receipt...</span>
      </div>
    );
  }

  const formatPrice = (val: number) => `$${val.toFixed(2)}`;

  return (
    <div className="bg-white" style={{ minHeight: '100vh', padding: '40px' }}>
      <div className="container" style={{ maxWidth: '850px', margin: '0 auto', border: '1px solid #EAEAEA', padding: '50px', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
        
        {/* Header */}
        <div className="row border-bottom pb-4 mb-4">
          <div className="col-7">
            <h1 style={{ color: '#1A3A08', fontWeight: 800, margin: 0, letterSpacing: '-0.5px', fontSize: '26px' }}>
              {data.platform.name}
            </h1>
            <span className="text-muted d-block mt-1" style={{ fontSize: '12.5px', fontWeight: 500 }}>
              {data.platform.address}
            </span>
            <span className="text-success d-block font-monospace mt-1.5" style={{ fontSize: '11px', fontWeight: 700 }}>
              VAT NO: {data.platform.vat_number} | BP NO: {data.platform.bp_number}
            </span>
          </div>
          <div className="col-5 text-end">
            <h3 style={{ color: '#A32D2D', margin: 0, fontWeight: 900, letterSpacing: '1px' }}>TAX INVOICE</h3>
            <span className="d-block mt-1.5 text-dark font-monospace" style={{ fontSize: '13.5px', fontWeight: 800 }}>{data.invoice_number}</span>
            <span className="d-block text-muted mt-1" style={{ fontSize: '12px' }}>Date: {data.issue_date}</span>
            <span className="badge mt-2 px-3 py-2 font-monospace" style={{ backgroundColor: data.status === 'PAID' ? '#4E8A18' : '#C4A15A', fontSize: '10.5px' }}>
              {data.status}
            </span>
          </div>
        </div>

        {/* Act Citation Banner */}
        <div className="p-2.5 rounded mb-4 text-center fs-11 fw-700 text-uppercase" style={{ backgroundColor: '#FAF6EE', border: '1px solid #EAF3DE', color: '#4E6A36', letterSpacing: '0.5px' }}>
          ⚖️ {data.platform.compliance_act}
        </div>

        {/* Parties */}
        <div className="row mb-4">
          <div className="col-6" style={{ borderRight: '1px solid #EEE' }}>
            <h6 style={{ color: '#4E6A36', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Issued To (Buyer)</h6>
            <div style={{ fontSize: '13.5px', lineHeight: '1.6', color: '#333' }}>
              {data.buyer.company_name ? (
                <>
                  <strong style={{ color: '#1A3A08', fontSize: '15px' }}>{data.buyer.company_name}</strong><br/>
                  <span className="text-muted fs-12">Contact Person: {data.buyer.name}</span><br/>
                </>
              ) : (
                <>
                  <strong style={{ color: '#1A3A08', fontSize: '15px' }}>{data.buyer.name}</strong><br/>
                </>
              )}
              <span>Phone: {data.buyer.phone}</span><br/>
              <span className="text-muted">Account Type: {data.buyer.role.replace('_', ' ')}</span>
              {data.buyer.bp_number && (
                <div className="font-monospace text-success mt-1 fw-700" style={{ fontSize: '11px' }}>
                  BP NO: {data.buyer.bp_number}
                </div>
              )}
              {data.buyer.registration_number && (
                <div className="font-monospace text-muted mt-0.5" style={{ fontSize: '11px' }}>
                  REG NO: {data.buyer.registration_number}
                </div>
              )}
            </div>
          </div>
          <div className="col-6 text-end">
            <h6 style={{ color: '#4E6A36', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Remitted To (Seller)</h6>
            <div style={{ fontSize: '13.5px', lineHeight: '1.6', color: '#333' }}>
              {data.seller.farm_name ? (
                <>
                  <strong style={{ color: '#1A3A08', fontSize: '15px' }}>{data.seller.farm_name}</strong><br/>
                  <span className="text-muted fs-12">Operator: {data.seller.name}</span><br/>
                </>
              ) : (
                <>
                  <strong style={{ color: '#1A3A08', fontSize: '15px' }}>{data.seller.name}</strong><br/>
                </>
              )}
              <span>Phone: {data.seller.phone}</span><br/>
              <span className="text-muted">Account Type: {data.seller.role.replace('_', ' ')}</span>
              {data.seller.bp_number && (
                <div className="font-monospace text-success mt-1 fw-700" style={{ fontSize: '11px' }}>
                  BP NO: {data.seller.bp_number}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line Items */}
        <table className="table mb-4" style={{ fontSize: '13.5px' }}>
          <thead>
            <tr style={{ backgroundColor: '#F4F7F1', borderBottom: '2px solid #4E8A18' }}>
              <th className="py-2.5 px-3 border-0 text-start" style={{ color: '#1A3A08', fontWeight: 700 }}>Description of Goods / Services</th>
              <th className="py-2.5 px-3 border-0 text-end" style={{ color: '#1A3A08', fontWeight: 700 }}>Amount (USD)</th>
            </tr>
          </thead>
          <tbody>
            {data.line_items.map((item, idx) => (
              <tr key={idx}>
                <td className="py-2.5 px-3 border-bottom" style={{ borderColor: '#EAF3DE' }}>{item.description}</td>
                <td className="py-2.5 px-3 border-bottom text-end fw-600 font-monospace" style={{ borderColor: '#EAF3DE', color: '#1A3A08' }}>{formatPrice(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals & Tax breakdown */}
        <div className="row pt-2 align-items-start border-top" style={{ borderColor: '#1A3A08' }}>
          <div className="col-md-7 text-muted" style={{ fontSize: '11.5px', lineHeight: '1.5' }}>
            <div className="p-3 rounded" style={{ backgroundColor: '#F4F7F1', border: '1px solid #EAF3DE' }}>
              <strong className="text-dark d-block mb-1">VAT & Duty Exemption Notice:</strong>
              Under the Second Schedule of the Zimbabwe VAT Act [Chapter 23:12], raw/unprocessed agricultural grain and oilseeds (Maize, Wheat, Soya) are exempt or zero-rated. VAT is calculated and charged at 15.0% standard rate exclusively on platform commission fees.
            </div>
          </div>
          <div className="col-md-5">
            <div className="p-3 rounded shadow-inner" style={{ backgroundColor: '#FAF3E8', border: '1px solid #DDD0B8' }}>
              <div className="d-flex justify-content-between mb-1.5" style={{ fontSize: '12px' }}>
                <span className="text-hint">Zero-Rated Trade:</span>
                <strong className="text-dark font-monospace">{formatPrice(data.line_items[0].amount)}</strong>
              </div>
              <div className="d-flex justify-content-between mb-1.5" style={{ fontSize: '12px' }}>
                <span className="text-hint">Platform Escrow Fee (Net):</span>
                <strong className="text-dark font-monospace">{formatPrice(data.line_items[1].amount)}</strong>
              </div>
              <div className="d-flex justify-content-between mb-2" style={{ fontSize: '12px' }}>
                <span className="text-hint">VAT (15% on Service Fee):</span>
                <strong className="text-dark font-monospace">{formatPrice(data.line_items[2].amount)}</strong>
              </div>
              <hr className="my-2" style={{ borderTop: '1px dashed #DDD0B8' }} />
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-800 text-dark fs-12">Total Settled (USD)</span>
                <strong style={{ color: '#1A3A08', fontSize: '20px' }} className="font-monospace fw-900">{formatPrice(data.total_amount_usd)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ZIMRA Declarations Footer */}
        <div className="text-center mt-5 pt-4 text-muted border-top" style={{ fontSize: '11px', borderColor: '#EAEAEA' }}>
          <p className="mb-1 fw-700 text-uppercase letter-spacing-1">Official ZIMRA Electronic Tax Invoice</p>
          <p className="mb-1 fw-500">This invoice has been compiled in accordance with Section 20 of the Value Added Tax Act of Zimbabwe.</p>
          <p className="mb-0">AgriMarket Trading Platform • Escrow & Compliance Division • Harare, Zimbabwe</p>
        </div>
        
        {/* Print Button (hidden when printing) */}
        <div className="text-center mt-4 d-print-none">
          <button className="btn btn-am-primary px-5 py-2.5 shadow-sm fw-700" onClick={() => window.print()}>
            <span className="me-2">🖨️</span> Print & Save compliance PDF
          </button>
          <p className="text-hint mt-2 fs-12">Clicking print formats this document on a clean A4 standard page for tax storage.</p>
        </div>

      </div>
    </div>
  );
}

export default function InvoicePage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <InvoiceContent params={params} />
    </ProtectedRoute>
  );
}
