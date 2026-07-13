'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ProtectedRoute from '../../components/ProtectedRoute';
import { api } from '../../lib/axios';

function formatMessageText(text: string) {
  const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} style={{ fontWeight: 700, color: '#1A3A08' }}>{part}</strong>;
    }
    
    const lines = part.split('\n');
    return lines.map((line, lineIdx) => {
      if (line.trim().startsWith('*') || line.trim().startsWith('-') || line.trim().startsWith('•')) {
        const cleanText = line.trim().replace(/^[\*\-\•]\s*/, '');
        return (
          <div key={lineIdx} className="d-flex align-items-start gap-2 my-1" style={{ paddingLeft: '12px' }}>
            <span style={{ color: '#3B6D11', fontSize: '1.2rem', lineHeight: '1', marginTop: '-2px' }}>•</span>
            <span style={{ fontSize: '14.5px' }}>{cleanText}</span>
          </div>
        );
      }
      
      if (!line.trim()) {
        return <div key={lineIdx} style={{ height: '8px' }} />;
      }
      
      return (
        <span key={lineIdx} style={{ display: 'block', marginBottom: '4px', fontSize: '14.5px' }}>
          {line}
        </span>
      );
    });
  });
}

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
      <div style={{ backgroundColor: '#FAF3E8', height: 'calc(100vh - 95px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Navbar Strip */}
        <div className="py-3 px-4 bg-white border-bottom shadow-sm d-flex justify-content-between align-items-center" style={{ zIndex: 100 }}>
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
        <div className="container py-3 flex-grow-1 d-flex flex-column" style={{ maxWidth: '800px', overflow: 'hidden' }}>
          
          {/* Messages Area */}
          <div className="glass-panel rounded p-4 mb-3 d-flex flex-column" style={{ flex: 1, overflowY: 'auto', gap: '1.2rem' }}>
            
            {messages.map((message, index) => {
              const isUser = message.role === 'user';
              return (
                <div 
                  key={index} 
                  className={`d-flex flex-column ${isUser ? 'align-self-end' : 'align-self-start'}`}
                  style={{ maxWidth: '85%' }}
                >
                  <span 
                    style={{ 
                      fontSize: '11px', 
                      fontWeight: 600, 
                      color: isUser ? '#4E6A36' : '#2C5410', 
                      marginBottom: '4px',
                      paddingLeft: '4px',
                      alignSelf: isUser ? 'end' : 'start'
                    }}
                  >
                    {isUser ? '👤 You' : '🌱 AI Agronomist'}
                  </span>
                  <div 
                    className="p-3 rounded-4 transition-all"
                    style={{ 
                      boxShadow: isUser ? '0 4px 12px rgba(59, 109, 17, 0.12)' : '0 4px 12px rgba(0, 0, 0, 0.02)',
                      backgroundColor: isUser ? '#3B6D11' : '#FFFFFF',
                      color: isUser ? '#FFFFFF' : '#1A3A08',
                      border: isUser ? 'none' : '1px solid rgba(221, 208, 184, 0.6)',
                      borderRadius: isUser ? '1.25rem 1.25rem 0.25rem 1.25rem' : '1.25rem 1.25rem 1.25rem 0.25rem',
                      lineHeight: '1.6',
                    }}
                  >
                    {isUser ? (
                      <span style={{ fontSize: '14.5px', whiteSpace: 'pre-wrap' }}>{message.text}</span>
                    ) : (
                      formatMessageText(message.text)
                    )}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="d-flex flex-column align-self-start" style={{ maxWidth: '85%' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#2C5410', marginBottom: '4px', paddingLeft: '4px' }}>
                  🌱 AI Agronomist
                </span>
                <div 
                  className="p-3 bg-white border rounded-4 d-flex align-items-center gap-2"
                  style={{ 
                    borderRadius: '1.25rem 1.25rem 1.25rem 0.25rem',
                    border: '1px solid rgba(221, 208, 184, 0.6)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)'
                  }}
                >
                  <span className="spinner-grow spinner-grow-sm text-success" role="status"></span>
                  <span className="text-hint font-monospace fs-11" style={{ letterSpacing: '1px' }}>AI THINKING...</span>
                </div>
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
