'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../lib/axios';
import { useCurrencyStore } from '../../../lib/currencyStore';

interface PriceFeed {
  id: number;
  commodity: number;
  district: string;
  price_per_tonne_usd_cents: number;
  source: string;
  is_official: boolean;
  recorded_date: string;
}

export default function CommodityAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const { formatPrice } = useCurrencyStore();
  const [loading, setLoading] = useState(true);
  const [commodity, setCommodity] = useState<any>(null);
  const [feeds, setFeeds] = useState<PriceFeed[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [commoditiesRes, pricesRes] = await Promise.all([
          api.get(`market-data/commodities/`),
          api.get(`market-data/prices/`)
        ]);
        
        // Find the specific commodity locally
        const allCommodities = commoditiesRes.data.results || commoditiesRes.data;
        const targetCommodity = allCommodities.find((c: any) => c.id === parseInt(params.id as string));
        setCommodity(targetCommodity);
        
        // Filter prices locally
        const allPrices = pricesRes.data.results || pricesRes.data;
        const commodityFeeds = allPrices.filter((p: any) => p.commodity === parseInt(params.id as string));
        
        commodityFeeds.sort((a: any, b: any) => new Date(b.recorded_date).getTime() - new Date(a.recorded_date).getTime());
        setFeeds(commodityFeeds);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchAnalytics();
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ backgroundColor: '#F4F7F1', minHeight: '100vh', paddingTop: '10rem' }} className="text-center">
         <span className="spinner-border text-success" style={{ width: '3.5rem', height: '3.5rem', borderWidth: '4px' }}></span>
         <p className="mt-4 fw-600 text-hint fs-14 letter-spacing-1 text-uppercase">Connecting to Terminal...</p>
      </div>
    );
  }

  if (!commodity) {
    return (
      <div className="container py-5 mt-5 text-center">
         <h4>Commodity Not Found</h4>
         <button onClick={() => router.back()} className="btn btn-outline-success mt-3">Go Back</button>
      </div>
    );
  }

  // Group latest feeds by district so we don't show duplicate districts if there are multiple feeds on the same day
  const latestFeedsMap = new Map();
  feeds.forEach(feed => {
      if (!latestFeedsMap.has(feed.district)) {
          latestFeedsMap.set(feed.district, feed);
      }
  });
  const latestFeeds = Array.from(latestFeedsMap.values());

  return (
    <div style={{ backgroundColor: '#F4F7F1', minHeight: '100vh', padding: '3rem 0 6rem', fontFamily: "'Inter', sans-serif" }}>
      <div className="container" style={{ maxWidth: '1100px' }}>
        
        <button onClick={() => router.push('/prices')} className="btn btn-sm shadow-sm mb-4 fw-700 px-3 py-2 transition-all hover-opacity" style={{ borderRadius: '10px', backgroundColor: '#FFFFFF', color: '#1A3A08', border: '1px solid #EAF3DE' }}>
           ← Back to Main Index
        </button>

        {/* Institutional Commodity Header */}
        <div className="card border-0 shadow-sm mb-5 p-4 p-md-5 overflow-hidden position-relative" style={{ borderRadius: '20px', backgroundColor: '#FFFFFF' }}>
           {/* Decorative Background Graphic */}
           <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', backgroundColor: '#FAF3E8', opacity: 0.5, filter: 'blur(30px)' }}></div>
           
           <div className="position-relative z-1 d-flex justify-content-between align-items-center flex-wrap gap-4">
              <div>
                 <span className="badge text-uppercase letter-spacing-1 mb-3 px-3 py-1.5 fs-11 fw-700" style={{ backgroundColor: '#EAF3DE', color: '#2C5410', borderRadius: '6px' }}>
                    {commodity.category} Sector
                 </span>
                 <h1 style={{ color: '#1A3A08', fontWeight: 800, fontSize: '48px', letterSpacing: '-2px', marginBottom: 0 }}>
                    {commodity.name} Analytics
                 </h1>
                 <p className="text-hint mt-3 mb-0 fw-500 fs-16" style={{ maxWidth: '500px' }}>
                    Explore verified live feeds and decentralized regional price variations.
                 </p>
              </div>
           </div>
        </div>

        {/* Regional Dashboards */}
        <h5 className="fw-800 text-uppercase text-hint fs-13 letter-spacing-1 mb-4 d-flex align-items-center gap-2">
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4E8A18' }}></span>
            Active Regional Nodes
        </h5>
        
        {latestFeeds.length === 0 ? (
           <div className="card py-5 text-center border-0 shadow-sm" style={{ borderRadius: '16px' }}>
              <span className="text-hint fw-600">No active regional feeds available for this commodity.</span>
           </div>
        ) : (
           <div className="row g-4 mb-5">
             {latestFeeds.map((feed: any, idx: number) => (
                <div className="col-md-6 col-lg-4 animate-fade-up" key={feed.id} style={{ animationDelay: `${idx * 0.1}s` }}>
                   <div className="card p-4 h-100 shadow-sm transition-all hover-lift" style={{ border: '1px solid #EAF3DE', borderRadius: '18px', backgroundColor: '#FFFFFF' }}>
                      <div className="d-flex justify-content-between align-items-start mb-4">
                         <div className="d-flex align-items-center gap-2">
                            <span style={{ fontSize: '22px' }}>📍</span>
                            <strong style={{ color: '#1A3A08', fontSize: '19px', fontWeight: 800, letterSpacing: '-0.5px' }}>{feed.district}</strong>
                         </div>
                         {feed.is_official ? (
                           <span className="badge bg-success bg-opacity-10 text-success fs-10 text-uppercase fw-800 letter-spacing-1 px-2.5 py-1.5" style={{ borderRadius: '6px' }}>Verified</span>
                         ) : (
                           <span className="badge bg-secondary bg-opacity-10 text-secondary fs-10 text-uppercase fw-800 letter-spacing-1 px-2.5 py-1.5" style={{ borderRadius: '6px' }}>Market</span>
                         )}
                      </div>
                      
                      <div className="mt-auto">
                         <span className="text-hint fs-11 text-uppercase fw-700 letter-spacing-1 d-block mb-1">Terminal Rate</span>
                         <div className="d-flex align-items-baseline gap-1">
                           <strong className="font-monospace" style={{ color: '#2C5410', fontSize: '32px', fontWeight: 800, letterSpacing: '-1.5px' }}>
                             {formatPrice(feed.price_per_tonne_usd_cents)}
                           </strong>
                           <span className="text-hint fs-14 fw-600 text-uppercase">/{commodity.standard_unit || 't'}</span>
                         </div>
                         
                         <div className="mt-4 pt-3 d-flex justify-content-between align-items-center" style={{ borderTop: '2px dashed #F4F7F1' }}>
                            <div>
                                <span className="d-block text-hint fs-10 text-uppercase fw-700 letter-spacing-1 mb-1">Authority</span>
                                <span className="text-dark fs-12 fw-600">{feed.source}</span>
                            </div>
                            <div className="text-end">
                                <span className="d-block text-hint fs-10 text-uppercase fw-700 letter-spacing-1 mb-1">Last Sync</span>
                                <span className="text-dark fs-12 font-monospace fw-600">{new Date(feed.recorded_date).toLocaleDateString('en-ZW', { month: 'short', day: 'numeric' })}</span>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             ))}
           </div>
        )}

      </div>

      {/* Micro-Animation Engine CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up {
          animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
        }
        .hover-lift {
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
        }
        .hover-lift:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 24px rgba(26, 58, 8, 0.1) !important;
          border-color: #C5E1A5 !important;
        }
        .hover-opacity {
          transition: opacity 0.2s ease;
        }
        .hover-opacity:hover {
          opacity: 0.8;
        }
      `}} />
    </div>
  );
}
