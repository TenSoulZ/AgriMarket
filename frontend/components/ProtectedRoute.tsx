'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '../lib/axios';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // e.g., ['COMMERCIAL_FARMER', 'SMALLHOLDER_FARMER']
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const verifyAccess = async () => {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        // Unauthenticated users are immediately kicked to the login screen
        router.push('/login');
        return;
      }

      try {
        // Query the active user profile to determine their exact role
        const res = await api.get('users/profile/');
        const user = res.data;
        
        // Admins have God Mode and bypass all role restrictions
        if (user.is_staff || user.role === 'ADMIN') {
          setIsAuthorized(true);
          return;
        }

        // If specific roles are required, ensure the user matches
        if (allowedRoles && allowedRoles.length > 0) {
          if (!allowedRoles.includes(user.role)) {
            // Unauthorized role. Bounce them to their correct designated dashboard.
            if (user.role.includes('FARMER')) {
              router.push('/dashboard/farmer');
            } else if (user.role.includes('BUYER')) {
              router.push('/dashboard/buyer');
            } else if (user.role === 'TRANSPORTER') {
              router.push('/logistics');
            } else {
              router.push('/');
            }
            return;
          }
        }

        // Access Granted!
        setIsAuthorized(true);
      } catch (error) {
        console.error("Session expired or invalid token:", error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        router.push('/login');
      }
    };

    verifyAccess();
  }, [pathname, allowedRoles, router]);

  if (!isAuthorized) {
    // Render a secure holding screen while authorization is calculated
    return (
      <div className="d-flex flex-column align-items-center justify-content-center vh-100" style={{ backgroundColor: '#FAF3E8' }}>
         <span className="spinner-border text-success mb-3" style={{ width: '3rem', height: '3rem', borderWidth: '4px' }} role="status"></span>
         <span className="text-hint fw-600 text-uppercase letter-spacing-1 fs-12">Verifying Credentials...</span>
      </div>
    );
  }

  // Inject the actual Dashboard UI if cleared
  return <>{children}</>;
}
