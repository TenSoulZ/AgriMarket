import React from 'react';
import Link from 'next/link';

export default function HowItWorksPage() {
  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '4rem 0 6rem' }}>
      <div className="container" style={{ maxWidth: '900px' }}>
        
        {/* Header Section */}
        <div className="text-center mb-5">
          <span className="badge badge-seed mb-3 px-3 py-2 text-uppercase" style={{ letterSpacing: '1.5px', fontSize: '12px' }}>
            Platform Walkthrough
          </span>
          <h1 style={{ color: '#1A3A08', fontWeight: 800, fontSize: '48px', letterSpacing: '-1.5px' }}>
            From Field to Final Payout.
          </h1>
          <p className="text-hint mx-auto mt-3" style={{ maxWidth: '650px', fontSize: '18px', lineHeight: '1.6' }}>
            AgriMarket ZW is not just a listing board. It is an end-to-end agricultural operating system engineered to secure your logistics, grade your crops, and guarantee your payments.
          </p>
        </div>

        {/* Timeline Flow */}
        <div className="position-relative mt-5 pt-4">
          
          {/* Vertical Line */}
          <div style={{ position: 'absolute', left: '50%', top: '0', bottom: '0', width: '4px', backgroundColor: '#EAF3DE', transform: 'translateX(-50%)', borderRadius: '4px' }}></div>

          {/* Step 1 */}
          <div className="row align-items-center mb-5 position-relative">
            <div className="col-md-5 text-end pe-md-5">
              <h3 style={{ color: '#1A3A08', fontWeight: 700 }}>1. List or Contract</h3>
              <p className="text-hint">
                Farmers can list harvested retail inventory or post Forward Contracts for upcoming yields. Buyers can post Wholesale RFQs (Requests for Quotation) to source bulk commodities.
              </p>
            </div>
            <div className="col-md-2 text-center position-relative">
              <div style={{ width: '60px', height: '60px', backgroundColor: '#3B6D11', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px', fontWeight: 800, zIndex: 2, position: 'relative', boxShadow: '0 4px 10px rgba(59, 109, 17, 0.3)' }}>
                📝
              </div>
            </div>
            <div className="col-md-5 ps-md-5">
              <div className="card am-card p-4 border-0 shadow-sm">
                <span className="badge bg-light text-dark mb-2 border w-auto d-inline-block">AI Integration</span>
                <p className="mb-0 fs-14 fw-500">Our Machine Learning engine automatically suggests optimal pricing based on live Zimbabwean market trends.</p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="row align-items-center mb-5 position-relative flex-row-reverse">
            <div className="col-md-5 text-start ps-md-5">
              <h3 style={{ color: '#1A3A08', fontWeight: 700 }}>2. Secure the Escrow</h3>
              <p className="text-hint">
                Once a deal is agreed upon, the Buyer pays into the secure AgriMarket Paynow vault (EcoCash/OneMoney). Funds are locked. The Seller is notified that it's safe to ship.
              </p>
            </div>
            <div className="col-md-2 text-center position-relative">
              <div style={{ width: '60px', height: '60px', backgroundColor: '#3B6D11', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px', fontWeight: 800, zIndex: 2, position: 'relative', boxShadow: '0 4px 10px rgba(59, 109, 17, 0.3)' }}>
                🔒
              </div>
            </div>
            <div className="col-md-5 pe-md-5 text-end">
              <div className="card am-card p-4 border-0 shadow-sm" style={{ backgroundColor: '#1A3A08', color: '#fff' }}>
                <span className="badge mb-2 border border-light border-opacity-25 w-auto d-inline-block" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>Security Guarantee</span>
                <p className="mb-0 fs-14 fw-500 text-white-50">Sellers never ship without guaranteed funds. Buyers never pay for rejected crop grades.</p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="row align-items-center mb-5 position-relative">
            <div className="col-md-5 text-end pe-md-5">
              <h3 style={{ color: '#1A3A08', fontWeight: 700 }}>3. Logistics & Transit</h3>
              <p className="text-hint">
                Commercial sellers dispatch their own trucks, or utilize our <strong>Logistics Pooling</strong> feature to share freight space with neighboring farms heading to the same city.
              </p>
            </div>
            <div className="col-md-2 text-center position-relative">
              <div style={{ width: '60px', height: '60px', backgroundColor: '#3B6D11', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px', fontWeight: 800, zIndex: 2, position: 'relative', boxShadow: '0 4px 10px rgba(59, 109, 17, 0.3)' }}>
                🚚
              </div>
            </div>
            <div className="col-md-5 ps-md-5">
              <div className="card am-card p-4 border-0 shadow-sm" style={{ backgroundColor: '#F4F7F1' }}>
                 <p className="mb-0 fs-14 fw-500 text-success">Save up to 40% on transport costs by pooling cargo with verified platform merchants.</p>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="row align-items-center mb-5 position-relative flex-row-reverse">
            <div className="col-md-5 text-start ps-md-5">
              <h3 style={{ color: '#1A3A08', fontWeight: 700 }}>4. Inspect & Release</h3>
              <p className="text-hint">
                The cargo arrives. The buyer inspects the grade. If it matches the contract, they click "Release". The funds are instantly disbursed to the Seller's mobile wallet!
              </p>
            </div>
            <div className="col-md-2 text-center position-relative">
              <div style={{ width: '60px', height: '60px', backgroundColor: '#3B6D11', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '24px', fontWeight: 800, zIndex: 2, position: 'relative', boxShadow: '0 4px 10px rgba(59, 109, 17, 0.3)' }}>
                🤝
              </div>
            </div>
            <div className="col-md-5 pe-md-5 text-end">
              <div className="card am-card p-4 border-0 shadow-sm border-start border-4" style={{ borderLeftColor: '#C5E1A5' }}>
                <p className="mb-0 fs-14 fw-500">Official PDF Invoices are automatically generated and stamped by the platform for your accounting records.</p>
              </div>
            </div>
          </div>

        </div>

        {/* CTA */}
        <div className="text-center mt-5 pt-5 border-top" style={{ borderColor: '#EAF3DE' }}>
          <h3 style={{ color: '#1A3A08', fontWeight: 700, marginBottom: '20px' }}>Ready to professionalize your agricultural trade?</h3>
          <div className="d-flex justify-content-center gap-3">
            <Link href="/register" className="btn btn-am-primary px-5 py-3 fw-700 fs-16 shadow-sm">
              Create Free Account
            </Link>
            <Link href="/trust" className="btn btn-am-outline px-5 py-3 fw-700 fs-16">
              Learn about our Escrow
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
