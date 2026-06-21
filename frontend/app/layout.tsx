import type { Metadata } from 'next';
import '../styles/globals.scss';
import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export const metadata: Metadata = {
  title: 'AgriMarket Zimbabwe — Connecting Farmers to Smarter Markets',
  description: 'Online agricultural marketplace connecting smallholder and commercial farmers with retail and wholesale buyers across Zimbabwe.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Nunito:wght@500;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Floating Navigation Bar */}
        <Navbar />

        {/* Main Content Area */}
        <main style={{ flex: 1, paddingTop: '95px' }}>
          {children}
        </main>
        
        <Footer />
      </body>
    </html>
  );
}
