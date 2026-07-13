'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute';
import { api } from '../../lib/axios';

export default function AgronomistPage() {
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: "Hello! I am your AI Agronomist. I've analyzed your 25.5 Hectares in Marondera. How can I help optimize your yield today?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await api.post('market-data/agronomy-chat/', {
        message: userMessage
      });
      setMessages(prev => [...prev, { role: 'ai', text: res.data.response }]);
    } catch (err: any) {
      console.error('Agronomy AI Chat Error:', err);
      const errMsg = err.response?.data?.error || 'Unable to establish a secure link to the Google AI Engine. Please try again.';
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: `Error: ${errMsg}`
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['COMMERCIAL_FARMER', 'SMALLHOLDER_FARMER']}>
      <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Navbar Strip */}
        <div className="py-3 px-4 bg-white border-bottom shadow-sm d-flex justify-content-between align-items-center" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
          <div className="d-flex align-items-center gap-3">
            <Link href="/dashboard/farmer" className="btn btn-sm btn-am-ghost">← Dashboard</Link>
            <div className="d-flex align-items-center gap-2">
              <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#4E8A18' }} className="btn-pulse"></div>
              <strong style={{ color: '#1A3A08' }}>Agri-Intelligence Engine (Online)</strong>
            </div>
          </div>
          <span className="badge badge-enterprise py-2 px-3">Enterprise Feature</span>
        </div>

        {/* Chat Container */}
        <div className="container py-4 flex-grow-1 d-flex flex-column" style={{ maxWidth: '800px' }}>
          
          {/* Messages Area */}
          <div className="glass-panel rounded p-4 mb-4 flex-grow-1 overflow-auto" style={{ maxHeight: '70vh', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-4 max-w-75 ${message.role === 'user' ? 'bg-success text-white align-self-end' : 'bg-white text-dark align-self-start border'}`}
                style={{ 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  maxWidth: '75%',
                  lineHeight: '1.5',
                  fontSize: '14.5px'
                }}
              >
                {message.text}
              </div>
            ))}

            {isTyping && (
              <div className="p-3 bg-white text-dark align-self-start border rounded-4 d-flex align-items-center gap-2" style={{ maxWidth: '75%' }}>
                <span className="spinner-grow spinner-grow-sm text-success" role="status"></span>
                <span className="text-hint font-monospace fs-11" style={{ letterSpacing: '1px' }}>AI THINKING...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Form Area */}
          <form onSubmit={handleSubmit} className="mt-auto position-relative">
            <input 
              type="text" 
              className="form-control hover-glow" 
              placeholder="Ask about crop diseases, yield projections, or soil treatments..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
              style={{ 
                padding: '16px 20px', 
                paddingRight: '120px', 
                borderRadius: '30px', 
                border: '2px solid #EAF3DE',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }}
            />
            <button 
              type="submit" 
              className="btn btn-am-primary position-absolute rounded-pill" 
              style={{ right: '8px', top: '8px', bottom: '8px', padding: '0 24px' }}
              disabled={isTyping || !input.trim()}
            >
              {isTyping ? 'Computing...' : 'Send'}
            </button>
          </form>

        </div>
      </div>
    </ProtectedRoute>
  );
}
