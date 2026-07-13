'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CurrencySwitcher from './CurrencySwitcher';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
 
  // Fetch active user profile from API to determine authentication and admin role status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        import('../lib/axios').then(({ api }) => {
          api.get('users/profile/')
            .then(res => {
              setUser(res.data);
            })
            .catch(() => {
              // Token invalid or expired, clear locally
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              setUser(null);
            });
        });
      } else {
        setUser(null);
      }
    }
    setIsNavOpen(false);
  }, [pathname]);
 
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      window.location.href = '/login';
    }
  };
 
  const getDashboardLink = () => {
    if (!user) return '/profile';
    if (user.role === 'ADMIN' || user.is_staff) return '/dashboard/admin';
    if (user.role === 'COMMERCIAL_FARMER' || user.role === 'SMALLHOLDER_FARMER') return '/dashboard/farmer';
    if (user.role === 'COMMERCIAL_BUYER' || user.role === 'RETAIL_BUYER') return '/dashboard/buyer';
    if (user.role === 'TRANSPORTER') return '/logistics';
    return '/profile';
  };
 
  const isLinkActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };
 
  const navLinks = [
    { name: 'Marketplace', path: '/marketplace' },
    { name: 'Market Prices', path: '/prices' },
    { name: 'Wholesale', path: '/wholesale' },
    { name: 'Contracts & RFQs', path: '/contracts' },
    { name: 'Logistics Pooling', path: '/logistics' },
    { name: 'Smart Weather', path: '/weather' },
  ];
 
  return (
    <nav 
      className="navbar navbar-expand-xl" 
      style={{
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(221, 208, 184, 0.7)',
        boxShadow: '0 4px 20px 0 rgba(44, 84, 16, 0.03)',
        zIndex: 1100,
        padding: '0.6rem 2rem',
        transition: 'all 0.3s ease',
      }}
    >
      <div className="container-fluid px-0 d-flex align-items-center justify-content-between">
        
        {/* Brand Logo */}
        <Link href="/" className="navbar-brand d-flex align-items-center gap-2 text-decoration-none m-0">
          <img 
            src="/agrimarket_logo.png" 
            alt="AgriMarket Logo" 
            style={{ height: '48px', width: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #DDD0B8' }} 
          />
          <span style={{ color: '#2C5410', fontWeight: 700, fontSize: '1.35rem', letterSpacing: '-0.5px' }}>
            AgriMarket <span style={{ color: '#3B6D11' }}>ZW</span>
          </span>
        </Link>
 
        {/* Mobile Toggle Button */}
        <button
          className="navbar-toggler border-0 p-1"
          type="button"
          onClick={() => setIsNavOpen(!isNavOpen)}
          aria-controls="floatingNavbarCollapse"
          aria-expanded={isNavOpen}
          aria-label="Toggle navigation"
          style={{ boxShadow: 'none' }}
        >
          <span className="navbar-toggler-icon" style={{ width: '1.25rem', height: '1.25rem' }}></span>
        </button>
 
        {/* Navbar Links & Actions */}
        <div className={`collapse navbar-collapse justify-content-between ${isNavOpen ? 'show' : ''}`} id="floatingNavbarCollapse">
          
          {/* Main Links */}
          <ul className="navbar-nav mx-auto gap-1 my-2 my-xl-0 align-items-xl-center">
            {navLinks.map((link) => {
              const active = isLinkActive(link.path);
              return (
                <li className="nav-item" key={link.path}>
                  <Link 
                    href={link.path}
                    className="nav-link px-2.5 py-1.5 transition-all"
                    style={{
                      color: active ? '#2C5410' : '#4E6A36',
                      fontWeight: active ? 600 : 500,
                      fontSize: '0.85rem',
                      borderRadius: '0.75rem',
                      backgroundColor: active ? '#EAF3DE' : 'transparent',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {link.name}
                  </Link>
                </li>
              );
            })}
          </ul>
 
          {/* User Controls & Currency Switcher */}
          <div className="d-flex align-items-center gap-2 justify-content-start justify-content-xl-end">
            <CurrencySwitcher />
            
            <div className="d-flex align-items-center gap-2">
              {user ? (
                <>
                  {(user.role === 'ADMIN' || user.is_staff) ? (
                    <div className="dropdown">
                        <button 
                            className="btn btn-sm px-2.5 py-1.5 transition-all shadow-sm btn-am-primary dropdown-toggle" 
                            type="button" 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            aria-expanded={isDropdownOpen}
                            style={{ borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 600 }}
                        >
                          👑 Admin & Testing
                        </button>
                        <ul className={`dropdown-menu dropdown-menu-end shadow-lg border-0 mt-1 ${isDropdownOpen ? 'show' : ''}`} style={{ borderRadius: '1rem', overflow: 'hidden', minWidth: '220px', position: 'absolute' }}>
                            <li><h6 className="dropdown-header text-uppercase text-hint" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>Command Center</h6></li>
                            <li><Link className="dropdown-item fw-600 py-2" href="/dashboard/admin" onClick={() => setIsDropdownOpen(false)}>🛡️ Main Admin Panel</Link></li>
                            <li><hr className="dropdown-divider opacity-10 mx-3" /></li>
                            <li><h6 className="dropdown-header text-uppercase text-hint" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>UI Simulators (Test Mode)</h6></li>
                            <li><Link className="dropdown-item py-2" href="/dashboard/farmer" onClick={() => setIsDropdownOpen(false)}>🚜 Farmer Dashboard</Link></li>
                            <li><Link className="dropdown-item py-2" href="/dashboard/buyer" onClick={() => setIsDropdownOpen(false)}>🛒 Buyer Dashboard</Link></li>
                            <li><Link className="dropdown-item py-2" href="/logistics" onClick={() => setIsDropdownOpen(false)}>🚚 Transporter Dashboard</Link></li>
                        </ul>
                    </div>
                  ) : (
                    <Link 
                      href={getDashboardLink()} 
                      className={`btn btn-sm px-2.5 py-1.5 transition-all shadow-sm ${isLinkActive('/dashboard') ? 'btn-am-primary' : 'btn-light border'}`}
                      style={{
                        borderRadius: '0.75rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: isLinkActive('/dashboard') ? '#FFFFFF' : '#1A3A08',
                      }}
                    >
                      Dashboard
                    </Link>
                  )}
                  
                  <Link 
                    href="/profile" 
                    className={`btn btn-sm px-2.5 py-1.5 transition-all ${isLinkActive('/profile') ? 'btn-am-primary' : 'btn-am-ghost'}`}
                    style={{
                      borderRadius: '0.75rem',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      backgroundColor: isLinkActive('/profile') ? '#3B6D11' : '#FAF3E8',
                      color: isLinkActive('/profile') ? '#FFFFFF' : '#2C5410',
                    }}
                  >
                    My Profile
                  </Link>
 
                  <button 
                    onClick={handleLogout}
                    className="btn btn-sm btn-am-outline px-2.5 py-1.5 transition-all"
                    style={{
                      borderRadius: '0.75rem',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    href="/login" 
                    className={`btn btn-sm px-2.5 py-1.5 btn-am-ghost transition-all ${isLinkActive('/login') ? 'btn-am-primary' : ''}`}
                    style={{
                      borderRadius: '0.75rem',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                    }}
                  >
                    Login
                  </Link>
 
                  <Link 
                    href="/register" 
                    className={`btn btn-sm px-2.5 py-1.5 btn-am-primary transition-all`}
                    style={{
                      borderRadius: '0.75rem',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      display: isLinkActive('/register') ? 'none' : 'block'
                    }}
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
 
        </div>
      </div>
    </nav>
  );
}
