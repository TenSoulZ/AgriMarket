'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/axios';
import { useCurrencyStore } from '../../lib/currencyStore';

interface Commodity {
  id: number;
  name: string;
  category: string;
  standard_unit: string;
}

interface PriceFeed {
  id: number;
  commodity: number; // ID reference
  commodity_name?: string;
  district: string;
  price_per_tonne_usd_cents: number;
  source: string;
  is_official: boolean;
  recorded_date: string;
}

export default function MarketPricesPage() {
  const router = useRouter();
  const { formatPrice } = useCurrencyStore();
  const [prices, setPrices] = useState<PriceFeed[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) setIsAuthenticated(true);

    const fetchData = async () => {
      setLoading(true);
      try {
        const [commoditiesRes, pricesRes] = await Promise.all([
          api.get('market-data/commodities/'),
          api.get('market-data/prices/')
        ]);
        
        const commoditiesData = commoditiesRes.data.results || commoditiesRes.data;
        const pricesData = pricesRes.data.results || pricesRes.data;
        
        setCommodities(commoditiesData);
        setPrices(pricesData);
      } catch (err) {
        console.error("Failed to fetch secure market data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Compute National Averages & Day-over-Day Trends
  const marketStats = useMemo(() => {
    if (prices.length === 0 || commodities.length === 0) return [];

    // Group feeds by commodity ID
    const grouped = prices.reduce((acc, curr) => {
      if (!acc[curr.commodity]) acc[curr.commodity] = [];
      acc[curr.commodity].push(curr);
      return acc;
    }, {} as Record<number, PriceFeed[]>);

    return Object.entries(grouped).map(([commodityId, feeds]) => {
      const details = commodities.find(c => c.id === parseInt(commodityId)) || { name: 'Unknown', category: 'General', standard_unit: 'Tonnes' };
      
      // Group feeds by Date (YYYY-MM-DD) to compare averages
      const feedsByDate = feeds.reduce((acc, feed) => {
          const dateStr = feed.recorded_date.split('T')[0];
          if (!acc[dateStr]) acc[dateStr] = [];
          acc[dateStr].push(feed);
          return acc;
      }, {} as Record<string, PriceFeed[]>);
      
      const sortedDates = Object.keys(feedsByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      let latestAvgCents = 0;
      let prevAvgCents = 0;
      let trendPercent = 0;
      let trendDirection = 'flat';
      
      if (sortedDates.length > 0) {
          const latestFeeds = feedsByDate[sortedDates[0]];
          latestAvgCents = latestFeeds.reduce((sum, f) => sum + f.price_per_tonne_usd_cents, 0) / latestFeeds.length;
      }
      
      if (sortedDates.length > 1) {
          const prevFeeds = feedsByDate[sortedDates[1]];
          prevAvgCents = prevFeeds.reduce((sum, f) => sum + f.price_per_tonne_usd_cents, 0) / prevFeeds.length;
          trendPercent = ((latestAvgCents - prevAvgCents) / prevAvgCents) * 100;
          trendDirection = trendPercent > 0.05 ? 'up' : trendPercent < -0.05 ? 'down' : 'flat';
      }

      return {
        id: commodityId,
        details,
        latestAvgCents,
        trendPercent,
        trendDirection,
        lastUpdated: sortedDates[0] || new Date().toISOString(),
        activeDistricts: sortedDates.length > 0 ? feedsByDate[sortedDates[0]].length : 0,
        latestFeeds: sortedDates.length > 0 ? feedsByDate[sortedDates[0]] : []
      };
    }).sort((a, b) => b.latestAvgCents - a.latestAvgCents); // Sort highest value crops first
  }, [prices, commodities]);

  // Filtering Logic for Master Grid
  const filteredStats = marketStats.filter(stat => {
      const matchesSearch = stat.details.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'ALL' || stat.details.category === categoryFilter;
      return matchesSearch && matchesCategory;
  });

  const handleRowDoubleClick = (id: string) => {
    if (expandedRowId === id) {
      setExpandedRowId(null);
    } else {
      setExpandedRowId(id);
    }
  };

  return (
    <div style={{ backgroundColor: '#F4F7F1', minHeight: '100vh', padding: '4rem 0 6rem', fontFamily: "'Inter', sans-serif" }}>
      <div className="container" style={{ maxWidth: '1200px' }}>
        
        {/* Institutional Header Section */}
        <div className="d-flex justify-content-between align-items-end flex-wrap gap-4 mb-5 border-bottom pb-4" style={{ borderColor: '#EAF3DE' }}>
          <div>
            <span className="badge mb-2 px-3 py-1.5 text-uppercase fw-700" style={{ backgroundColor: '#1A3A08', color: '#C5E1A5', letterSpacing: '1px', fontSize: '10px' }}>
              Terminal Live Feed
            </span>
            <h1 style={{ color: '#1A3A08', fontWeight: 800, fontSize: '38px', letterSpacing: '-1.5px', marginBottom: '8px' }}>
              Market Index Board
            </h1>
            <p className="text-hint mb-0" style={{ fontSize: '15px', maxWidth: '600px' }}>
              Cryptographically authenticated agricultural valuations. Day-over-Day (DoD) National Averages computed from verified escrow ledgers and regional authorities.
            </p>
          </div>
          <div className="text-end">
            <span className="d-block text-uppercase fw-800 text-hint fs-11 letter-spacing-1 mb-1">System Status</span>
            <span className="badge bg-success px-3 py-2 fs-12 d-flex align-items-center gap-2 shadow-sm border border-success border-opacity-25">
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fff', animation: 'pulse 2s infinite' }}></span>
              LIVE SYNC
            </span>
          </div>
        </div>

        {/* High-Conversion CTA Banner for Unauthenticated Visitors */}
        {!isAuthenticated && !loading && (
          <div className="card p-4 mb-5 shadow-sm d-flex flex-md-row justify-content-between align-items-center gap-4" style={{ border: 'none', borderRadius: '16px', background: 'linear-gradient(135deg, #1A3A08 0%, #2C5410 100%)', color: '#fff' }}>
            <div>
              <h5 style={{ fontWeight: 800, letterSpacing: '-0.5px', color: '#EAF3DE', marginBottom: '8px' }}>Trade at these exact rates.</h5>
              <p className="mb-0" style={{ fontSize: '14.5px', color: '#A9C48C', maxWidth: '600px' }}>
                Join AgriMarket to lock in wholesale forward contracts, pool automated freight logistics, and bypass intermediary margins.
              </p>
            </div>
            <Link href="/register" className="btn px-4 py-2.5 fw-700 shadow flex-shrink-0" style={{ backgroundColor: '#C5E1A5', color: '#1A3A08', borderRadius: '8px' }}>
              Open Free Account →
            </Link>
          </div>
        )}

        {loading ? (
          <div className="text-center py-5 my-5">
            <span className="spinner-border text-success mb-3" style={{ width: '3rem', height: '3rem' }}></span>
            <p className="text-hint fw-600 fs-14">Establishing Terminal Connection...</p>
          </div>
        ) : marketStats.length === 0 ? (
          <div className="card py-5 text-center shadow-sm border-0 mt-4" style={{ borderRadius: '16px', backgroundColor: '#fff' }}>
            <span style={{ fontSize: '42px', opacity: 0.3, marginBottom: '15px' }}>📉</span>
            <h5 className="mb-2" style={{ color: '#1A3A08', fontWeight: 700 }}>Index Awaiting Data</h5>
            <p className="text-hint mb-0 fs-14">Regional indices are currently being synchronized.</p>
          </div>
        ) : (
          <>
            {/* Top Market Highlights (Top 4 Commodities) */}
            <h6 className="fw-800 text-uppercase text-hint fs-12 letter-spacing-1 mb-3">Top Volume Movers</h6>
            <div className="row g-3 mb-5">
              {marketStats.slice(0, 4).map((stat, idx) => (
                <div className="col-md-6 col-lg-3 animate-fade-up" key={`highlight-${stat.id}`} style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="card p-4 h-100 shadow-sm transition-all hover-lift" style={{ border: '1px solid #EAF3DE', borderRadius: '12px', backgroundColor: '#FFFFFF' }}>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <span className="fw-700" style={{ color: '#1A3A08', fontSize: '15px', lineHeight: '1.2' }}>{stat.details.name}</span>
                      <span className={`badge ${stat.trendDirection === 'up' ? 'bg-success bg-opacity-10 text-success' : stat.trendDirection === 'down' ? 'bg-danger bg-opacity-10 text-danger' : 'bg-secondary bg-opacity-10 text-secondary'}`} style={{ fontSize: '11px' }}>
                        {stat.trendDirection === 'up' ? '▲' : stat.trendDirection === 'down' ? '▼' : '▬'} {Math.abs(stat.trendPercent).toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-auto">
                      <span className="text-hint fs-11 text-uppercase fw-600 letter-spacing-1 d-block mb-1">National Avg</span>
                      <div className="d-flex align-items-baseline gap-1">
                        <strong className="font-monospace" style={{ color: '#2C5410', fontSize: '24px', fontWeight: 700, letterSpacing: '-1px' }}>
                          {formatPrice(stat.latestAvgCents)}
                        </strong>
                        <span className="text-hint fs-12 fw-600 text-uppercase">/ {stat.details.standard_unit || 't'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Master Index Grid */}
            <div className="card shadow-sm overflow-hidden" style={{ border: '1px solid #EAF3DE', borderRadius: '16px', backgroundColor: '#FFFFFF' }}>
              
              {/* Grid Toolbar */}
              <div className="p-3 p-md-4 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-3" style={{ backgroundColor: '#FAF3E8', borderColor: '#EAF3DE' }}>
                <h6 className="fw-800 mb-0 text-uppercase text-hint fs-13 letter-spacing-1">Master Commodity Ledger</h6>
                <div className="d-flex gap-2 flex-wrap" style={{ minWidth: '300px' }}>
                  <input 
                      type="text" 
                      className="form-control form-control-sm border-0 shadow-sm" 
                      placeholder="🔍 Search index..." 
                      value={searchQuery} 
                      onChange={e => setSearchQuery(e.target.value)} 
                      style={{ flex: 1, minWidth: '150px' }}
                  />
                  <select 
                      className="form-select form-select-sm border-0 shadow-sm fw-500" 
                      value={categoryFilter} 
                      onChange={e => setCategoryFilter(e.target.value)}
                      style={{ width: 'auto', minWidth: '140px', color: '#1A3A08' }}
                  >
                      <option value="ALL">All Sectors</option>
                      <option value="GRAINS">Grains & Cereals</option>
                      <option value="LEGUMES">Legumes</option>
                      <option value="HORTICULTURE">Horticulture</option>
                      <option value="OTHER">Other Cash Crops</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className="table-responsive">
                <table className="table mb-0 align-middle table-hover">
                  <thead>
                    <tr>
                      <th className="py-3 px-4 border-0 text-hint fw-700 text-uppercase fs-11 letter-spacing-1 bg-white">Asset / Commodity</th>
                      <th className="py-3 px-4 border-0 text-hint fw-700 text-uppercase fs-11 letter-spacing-1 bg-white">Sector</th>
                      <th className="py-3 px-4 border-0 text-hint fw-700 text-uppercase fs-11 letter-spacing-1 bg-white text-end">Nat. Average (USD)</th>
                      <th className="py-3 px-4 border-0 text-hint fw-700 text-uppercase fs-11 letter-spacing-1 bg-white text-end">24h DoD %</th>
                      <th className="py-3 px-4 border-0 text-hint fw-700 text-uppercase fs-11 letter-spacing-1 bg-white text-center">Liquidity / Sources</th>
                      <th className="py-3 px-4 border-0 text-hint fw-700 text-uppercase fs-11 letter-spacing-1 bg-white text-end">Last Sync</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStats.map((stat) => (
                      <React.Fragment key={`grid-${stat.id}`}>
                        <tr 
                          onClick={() => router.push(`/prices/${stat.id}`)} 
                          style={{ cursor: 'pointer', animationDelay: `${0.2 + (Math.min(Number(stat.id), 10) * 0.05)}s` }} 
                          className="table-row-hover animate-fade-up"
                          title="Click to view full regional analytics"
                        >
                          <td className="py-3 px-4 border-bottom" style={{ borderColor: '#F4F7F1' }}>
                            <strong style={{ color: '#1A3A08', fontSize: '14.5px', fontWeight: 600 }}>{stat.details.name}</strong>
                          </td>
                          <td className="py-3 px-4 border-bottom" style={{ borderColor: '#F4F7F1' }}>
                            <span className="badge bg-secondary bg-opacity-10 text-secondary fs-10 text-uppercase letter-spacing-1 px-2 py-1">
                              {stat.details.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 border-bottom text-end" style={{ borderColor: '#F4F7F1' }}>
                            <strong className="font-monospace" style={{ color: '#2C5410', fontSize: '16px' }}>{formatPrice(stat.latestAvgCents)}</strong>
                            <span className="text-hint fs-11 text-uppercase fw-600 ms-1">/{stat.details.standard_unit || 't'}</span>
                          </td>
                          <td className="py-3 px-4 border-bottom text-end" style={{ borderColor: '#F4F7F1' }}>
                            <span className={`fw-700 fs-13 ${stat.trendDirection === 'up' ? 'text-success' : stat.trendDirection === 'down' ? 'text-danger' : 'text-muted'}`}>
                              {stat.trendDirection === 'up' ? '+' : stat.trendDirection === 'down' ? '' : ''}{stat.trendPercent.toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 border-bottom text-center" style={{ borderColor: '#F4F7F1' }}>
                            <span className="fs-13 fw-600" style={{ color: '#4E8A18' }}>{stat.activeDistricts} Regional Nodes</span>
                          </td>
                          <td className="py-3 px-4 border-bottom text-end fw-600" style={{ borderColor: '#F4F7F1' }}>
                            <span className="text-am-primary fs-13 d-flex align-items-center justify-content-end gap-2">
                              View Details <span>→</span>
                            </span>
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                    {filteredStats.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-5 text-hint fw-500">
                          No commodities found matching the filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Micro-Animation Engine CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(78, 138, 24, 0.6); }
          70% { box-shadow: 0 0 0 6px rgba(78, 138, 24, 0); }
          100% { box-shadow: 0 0 0 0 rgba(78, 138, 24, 0); }
        }
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
        .table-row-hover {
          transition: all 0.2s ease;
        }
        .table-row-hover:hover {
          background-color: #F4F7F1 !important;
          transform: translateX(4px);
        }
        .table-row-hover:hover td {
          border-color: transparent !important;
        }
      `}} />
    </div>
  );
}
