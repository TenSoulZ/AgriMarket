'use client';

import React, { useState, useEffect } from 'react';
import ListingCard, { Listing } from '../../components/ListingCard';
import { api } from '../../lib/axios';

const PROVINCE_CHOICES = [
  { value: 'All', label: 'All Provinces' },
  { value: 'HARARE', label: 'Harare' },
  { value: 'BULAWAYO', label: 'Bulawayo' },
  { value: 'MANICALAND', label: 'Manicaland' },
  { value: 'MASHONALAND_CENTRAL', label: 'Mashonaland Central' },
  { value: 'MASHONALAND_EAST', label: 'Mashonaland East' },
  { value: 'MASHONALAND_WEST', label: 'Mashonaland West' },
  { value: 'MASVINGO', label: 'Masvingo' },
  { value: 'MATABELELAND_NORTH', label: 'Matabeleland North' },
  { value: 'MATABELELAND_SOUTH', label: 'Matabeleland South' },
  { value: 'MIDLANDS', label: 'Midlands' },
];

export default function MarketplacePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<{id: number, name: string}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [listingsRes, categoriesRes] = await Promise.all([
          api.get('listings/'),
          api.get('listings/categories/')
        ]);
        // Support paginated and non-paginated responses gracefully
        const listingsData = listingsRes.data.results || listingsRes.data;
        const categoriesData = categoriesRes.data.results || categoriesRes.data;
        
        setListings(Array.isArray(listingsData) ? listingsData : []);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      } catch (error) {
        console.error("Failed to fetch marketplace data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter listings client-side
  const filteredListings = listings.filter((item) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      item.title?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower) ||
      item.farmer_detail?.farm_profile?.farm_name?.toLowerCase().includes(searchLower) ||
      item.farmer_detail?.phone_number?.includes(searchLower);

    const matchesCategory = category === 'All' || item.category_name === category;
    
    const matchesLocation =
      locationFilter === 'All' || item.location_province === locationFilter;

    return matchesSearch && matchesCategory && matchesLocation;
  });

  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '2rem 0 5rem' }}>
      <div className="container">
        
        {/* Page Header */}
        <div className="mb-4">
          <h1 style={{ color: '#1A3A08', fontWeight: 700, fontSize: '32px' }}>Marketplace</h1>
          <p className="lead" style={{ color: '#4E6A36', fontSize: '16px' }}>
            Browse and buy fresh, verified produce from smallholder and commercial farmers across Zimbabwe.
          </p>
        </div>

        {/* Filter Controls Row */}
        <div className="card am-card mb-4">
          <div className="row g-3">
            {/* Search Input */}
            <div className="col-md-5">
              <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>Search Listings</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search sugar beans, sweet potatoes, seller name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ borderColor: '#DDD0B8' }}
              />
            </div>
            
            {/* Category Filter */}
            <div className="col-md-3">
              <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>Category</label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ borderColor: '#DDD0B8' }}
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div className="col-md-4">
              <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>Province/Region</label>
              <select
                className="form-select"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                style={{ borderColor: '#DDD0B8' }}
              >
                {PROVINCE_CHOICES.map((loc) => (
                  <option key={loc.value} value={loc.value}>{loc.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Listings Counter and Info */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <span className="text-hint" style={{ fontSize: '14px' }}>
            Showing <strong>{filteredListings.length}</strong> active listings
          </span>
          <a href="/dashboard/farmer" className="btn btn-sm btn-am-primary">
            + Sell Your Produce
          </a>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="py-5 text-center">
            <span className="spinner-border text-success" role="status" aria-hidden="true" style={{ width: '3rem', height: '3rem' }}></span>
            <p className="mt-3 text-hint">Fetching live marketplace data...</p>
          </div>
        ) : filteredListings.length > 0 ? (
          <div className="row g-4">
            {filteredListings.map((listing) => (
              <div key={listing.id} className="col-md-6 col-lg-4">
                <ListingCard listing={listing} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card am-card py-5 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7A9460" strokeWidth="1.5" className="mx-auto mb-3">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <h5 className="mb-2" style={{ color: '#1A3A08' }}>No listings found</h5>
            <p className="text-hint mb-0" style={{ maxWidth: '400px', margin: '0 auto' }}>
              We couldn't find any listings matching your search parameters. Try adjusting your search queries or filters.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
