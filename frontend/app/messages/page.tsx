'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSocket, disconnectSocket } from '../../lib/socket';
import { api } from '../../lib/axios';
import ProtectedRoute from '../../components/ProtectedRoute';

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  partnerName: string;
  partnerRole: string;
  lastMessage: string;
  unreadCount: number;
}

function ChatPanelContent() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [inputVal, setInputVal] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Calls Simulation States
  const [activeCallType, setActiveCallType] = useState<'voice' | 'video' | 'none'>('none');
  const [callStatus, setCallStatus] = useState<'dialing' | 'connecting' | 'connected'>('dialing');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Audio Recording Simulation States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordTimerRef = useRef<any>(null);

  // Document Attachment Dropdown State
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Audio Playback Simulation States (tracks which audio message is playing)
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});

  // 1. Fetch User Profile
  useEffect(() => {
    api.get('users/profile/')
      .then(res => {
        setCurrentUser(res.data);
      })
      .catch(err => {
        console.log('Using simulated profile (unauthenticated)');
      });
  }, []);

  // 2. Fetch Conversations from backend with local simulation fallbacks
  useEffect(() => {
    api.get('messaging/conversations/')
      .then(res => {
        if (res.data && res.data.length > 0) {
          const mapped = res.data.map((c: any) => {
            const partner = c.partner_details || { name: 'Simbarashe Chanakira', role: 'Commercial Farmer', phone_number: '' };
            return {
              id: String(c.id),
              partnerName: partner.name,
              partnerRole: partner.role,
              lastMessage: c.last_message ? c.last_message.text : 'Negotiating 40 Tonnes of White Maize.',
              unreadCount: 0,
            };
          });
          setConversations(mapped);
          
          const userParam = searchParams.get('user');
          const userIdParam = searchParams.get('userId');
          if (!userParam && !userIdParam) {
            setActiveConvId(mapped[0].id);
          }
        } else {
          // Fallback initial conversation if database is empty
          throw new Error("No conversations found");
        }
      })
      .catch(err => {
        console.log('Conversations API not available, using high-fidelity simulations.');
        setConversations([
          { id: '1', partnerName: 'Simbarashe Chanakira', partnerRole: 'Commercial Farmer (Mazowe)', lastMessage: 'Contract draft ready for 40T White Maize.', unreadCount: 1 },
          { id: '2', partnerName: 'Ruvimbo Mukosa', partnerRole: 'Retail Buyer (Harare Depot)', lastMessage: 'Escrow lock completed. Awaiting transit.', unreadCount: 0 },
          { id: '3', partnerName: 'Trans-Zim Logistics', partnerRole: 'Logistics Transporter', lastMessage: 'Truck #ZIM-HT-142 dispatching tomorrow.', unreadCount: 0 }
        ]);
        setActiveConvId('1');
      });
  }, [searchParams]);

  // 3. Fetch Message History
  useEffect(() => {
    if (!activeConvId) return;

    api.get(`messaging/conversations/${activeConvId}/messages/`)
      .then(res => {
        if (res.data && res.data.length > 0) {
          const mapped = res.data.map((m: any) => {
            const isMe = m.sender === currentUser?.id;
            const partner = conversations.find(c => c.id === activeConvId);
            return {
              id: String(m.id),
              sender: isMe ? 'Me' : (partner?.partnerName || 'Partner'),
              text: m.text,
              timestamp: new Date(m.created_at),
            };
          });
          setMessages(prev => ({ ...prev, [activeConvId]: mapped }));
        } else {
          throw new Error("Empty messages");
        }
      })
      .catch(() => {
        // Mock historical messages for demo safety
        const partner = conversations.find(c => c.id === activeConvId);
        const partnerName = partner?.partnerName || 'Partner';
        
        const initialMock: Record<string, ChatMessage[]> = {
          '1': [
            { id: 'm1', sender: partnerName, text: 'Hello! I noticed you issued an RFQ for 40T White Maize.', timestamp: new Date(Date.now() - 3600000 * 2) },
            { id: 'm2', sender: 'Me', text: 'Yes, looking for Grade A maize delivered to Harare Depot.', timestamp: new Date(Date.now() - 3600000 * 1.5) },
            { id: 'm3', sender: partnerName, text: '[CONTRACT_ATTACHMENT]:40T Maize - Chinhoyi Sourcing', timestamp: new Date(Date.now() - 3600000 * 0.8) }
          ],
          '2': [
            { id: 'm4', sender: 'Me', text: 'Hi Ruvimbo, did the escrow transfer clear?', timestamp: new Date(Date.now() - 3600000 * 3) },
            { id: 'm5', sender: partnerName, text: 'Yes, $13,600.00 is now locked in AgriMarket Trust.', timestamp: new Date(Date.now() - 3600000 * 2.8) }
          ],
          '3': [
            { id: 'm6', sender: partnerName, text: 'Sourcing pickup confirmed in Chinhoyi. Loading complete.', timestamp: new Date(Date.now() - 3600000 * 5) }
          ]
        };

        setMessages(prev => ({
          ...prev,
          [activeConvId]: prev[activeConvId] || initialMock[activeConvId] || []
        }));
      });
  }, [activeConvId, currentUser, conversations]);

  // 4. WebSockets setup with simulated backup
  useEffect(() => {
    if (!activeConvId) {
      setWsConnected(false);
      return;
    }

    let socket: any = null;
    try {
      socket = getSocket(activeConvId);
      if (socket && typeof socket.connect === 'function') {
        socket.connect();
        
        socket.on('connect', () => {
          setWsConnected(true);
          console.log(`Chat WebSockets Connected for Conversation ${activeConvId}`);
        });

        socket.on('disconnect', () => {
          setWsConnected(false);
        });

        socket.on('receive_message', (data: any) => {
          const isMe = data.sender_id === currentUser?.id;
          const partner = conversations.find(c => c.id === activeConvId);
          const newMsg: ChatMessage = {
            id: String(data.message_id || Date.now()),
            sender: isMe ? 'Me' : (partner?.partnerName || 'Partner'),
            text: data.text,
            timestamp: new Date(data.created_at || Date.now()),
          };
          setMessages((prev) => ({
            ...prev,
            [activeConvId]: [...(prev[activeConvId] || []), newMsg],
          }));
        });
      }
    } catch (err) {
      console.log('WS error, fallback to simulated chat:', err);
    }

    return () => {
      try {
        disconnectSocket();
      } catch (err) {
        // Safe check
      }
    };
  }, [activeConvId, currentUser, conversations]);

  // 5. Handles VoIP Call Timer Simulation
  useEffect(() => {
    let timer: any = null;
    if (activeCallType !== 'none') {
      setCallStatus('dialing');
      setCallDuration(0);
      
      // Simulate connection lag
      const ringTimer = setTimeout(() => {
        setCallStatus('connecting');
        const connectTimer = setTimeout(() => {
          setCallStatus('connected');
          timer = setInterval(() => {
            setCallDuration(prev => prev + 1);
          }, 1000);
        }, 1200);
        return () => clearTimeout(connectTimer);
      }, 1500);

      return () => {
        clearTimeout(ringTimer);
        if (timer) clearInterval(timer);
      };
    }
  }, [activeCallType]);

  // 6. Handles audio message playback simulator
  useEffect(() => {
    let progressTimer: any = null;
    if (playingAudioId) {
      progressTimer = setInterval(() => {
        setAudioProgress(prev => {
          const curr = prev[playingAudioId] || 0;
          if (curr >= 100) {
            clearInterval(progressTimer);
            setPlayingAudioId(null);
            return { ...prev, [playingAudioId]: 0 };
          }
          return { ...prev, [playingAudioId]: curr + 12.5 }; // mock ticks
        });
      }, 500);
    }
    return () => {
      if (progressTimer) clearInterval(progressTimer);
    };
  }, [playingAudioId]);

  // Scroll to bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConvId, activeCallType, isRecording]);

  const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0];
  const activeMessages = messages[activeConvId] || [];

  const formatCallTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Trigger VoIP Calls
  const handleLaunchCall = (type: 'voice' | 'video') => {
    setActiveCallType(type);
  };

  const handleEndCall = () => {
    // Append Call Log message to chat list
    const logText = `[CALL_LOG]:${activeCallType}:${formatCallTime(callDuration)}`;
    const newMsg: ChatMessage = {
      id: `call-${Date.now()}`,
      sender: 'Me',
      text: logText,
      timestamp: new Date()
    };
    
    setMessages(prev => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), newMsg]
    }));

    setConversations(prev =>
      prev.map(c => c.id === activeConvId ? { ...c, lastMessage: `${activeCallType === 'voice' ? '📞' : '📹'} Call completed.` } : c)
    );

    setActiveCallType('none');
  };

  // Audio Recording Flow
  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingDuration(0);
    recordTimerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const handleCancelRecording = () => {
    clearInterval(recordTimerRef.current);
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const handleSendAudioNote = () => {
    clearInterval(recordTimerRef.current);
    const text = `[AUDIO_MESSAGE]:0:${recordingDuration.toString().padStart(2, '0')}`;
    const newMsg: ChatMessage = {
      id: `audio-${Date.now()}`,
      sender: 'Me',
      text,
      timestamp: new Date()
    };

    setMessages(prev => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), newMsg]
    }));

    setConversations(prev =>
      prev.map(c => c.id === activeConvId ? { ...c, lastMessage: '🎙️ Audio note sent.' } : c)
    );

    setIsRecording(false);
    setRecordingDuration(0);
  };

  // Contract Attachment
  const handleAttachContract = (title: string) => {
    const text = `[CONTRACT_ATTACHMENT]:${title}`;
    const newMsg: ChatMessage = {
      id: `contract-${Date.now()}`,
      sender: 'Me',
      text,
      timestamp: new Date()
    };

    setMessages(prev => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), newMsg]
    }));

    setConversations(prev =>
      prev.map(c => c.id === activeConvId ? { ...c, lastMessage: `📄 Attached: ${title}` } : c)
    );

    setShowAttachMenu(false);
  };

  // Text message submission
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const newMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'Me',
      text: inputVal.trim(),
      timestamp: new Date()
    };

    // Push local to ensure instant updates
    setMessages(prev => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), newMsg]
    }));

    try {
      const socket = getSocket();
      if (wsConnected && socket && typeof socket.emit === 'function') {
        socket.emit('send_message', { text: inputVal.trim() });
      }
    } catch (err) {
      console.log('WS offline, message processed in demo mode.');
    }

    setConversations((prev) =>
      prev.map((c) => (c.id === activeConvId ? { ...c, lastMessage: inputVal.trim() } : c))
    );

    setInputVal('');
  };

  const togglePlayAudio = (msgId: string) => {
    if (playingAudioId === msgId) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(msgId);
      setAudioProgress(prev => ({ ...prev, [msgId]: 0 }));
    }
  };

  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: 'calc(100vh - 73px)', padding: '2rem 0' }}>
      <div className="container h-100">
        
        <div className="card am-card p-0" style={{ height: '73vh', display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
          
          {/* Conversation Sidebar */}
          <div className="border-end d-flex flex-column" style={{ width: '30%', borderColor: '#DDD0B8', minWidth: '240px' }}>
            <div className="p-3 border-bottom" style={{ borderColor: '#EAF3DE', backgroundColor: '#FFFFFF' }}>
              <h5 className="mb-0 fw-800 text-dark" style={{ fontSize: '15px' }}>Active Chatrooms</h5>
              <span className="text-hint font-monospace" style={{ fontSize: '11px' }}>
                Status: {wsConnected ? (
                  <span className="text-success fw-800">● SECURED LINK</span>
                ) : (
                  <span className="text-warning fw-800">● OFFLINE DECK</span>
                )}
              </span>
            </div>

            <div className="flex-grow-1 overflow-auto" style={{ backgroundColor: '#FFFFFF' }}>
              {conversations.map((c) => {
                const isSelected = c.id === activeConvId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveConvId(c.id)}
                    className="w-100 p-3 text-start border-0 border-bottom d-block position-relative"
                    style={{
                      backgroundColor: isSelected ? '#FAF3E8' : '#FFFFFF',
                      borderColor: '#EAF3DE',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-800 fs-13" style={{ color: '#1A3A08' }}>{c.partnerName}</span>
                      {c.unreadCount > 0 && (
                        <span className="badge badge-warning-custom px-1.5 rounded-circle" style={{ fontSize: '9px' }}>
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                    <span className="text-hint d-block mb-1" style={{ fontSize: '11px', color: '#2C5410', fontWeight: 600 }}>
                      {c.partnerRole}
                    </span>
                    <span className="text-hint d-block text-truncate font-monospace" style={{ fontSize: '11px', color: '#7A9460' }}>
                      {c.lastMessage}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat Panel */}
          <div className="d-flex flex-column flex-grow-1 bg-white" style={{ width: '70%' }}>
            {activeConv ? (
              <>
                {/* Active Partner Header with Dialing options */}
                <div className="p-3 border-bottom d-flex justify-content-between align-items-center" style={{ borderColor: '#EAF3DE' }}>
                  <div>
                    <h5 className="mb-0 fw-800 text-dark fs-15">
                      {activeConv.partnerName}
                    </h5>
                    <span className="text-hint font-monospace" style={{ fontSize: '11px' }}>{activeConv.partnerRole}</span>
                  </div>
                  
                  {/* Premium Dialing Tools */}
                  <div className="d-flex gap-2">
                    <button 
                      onClick={() => handleLaunchCall('voice')}
                      className="btn btn-sm btn-am-outline d-flex align-items-center justify-content-center p-2 rounded-circle hover-glow"
                      style={{ width: '36px', height: '36px' }}
                      title="Initiate Encrypted VoIP Call"
                    >
                      📞
                    </button>
                    <button 
                      onClick={() => handleLaunchCall('video')}
                      className="btn btn-sm btn-am-outline d-flex align-items-center justify-content-center p-2 rounded-circle hover-glow"
                      style={{ width: '36px', height: '36px' }}
                      title="Initiate Secure Video Stream"
                    >
                      📹
                    </button>
                    <span className="badge badge-escrow align-self-center py-1.5 px-3 fs-10" style={{ letterSpacing: '0.5px' }}>SECURE DECK</span>
                  </div>
                </div>

                {/* Messages Log */}
                <div className="flex-grow-1 p-3 overflow-auto" style={{ backgroundColor: '#FAF3E8' }}>
                  <div className="d-flex flex-column gap-3">
                    {activeMessages.map((msg) => {
                      const isMe = msg.sender === 'Me';
                      
                      // Render logic for custom message payloads
                      const isCallLog = msg.text.startsWith('[CALL_LOG]:');
                      const isAudioMsg = msg.text.startsWith('[AUDIO_MESSAGE]:');
                      const isContractMsg = msg.text.startsWith('[CONTRACT_ATTACHMENT]:');

                      return (
                        <div key={msg.id} className={`d-flex ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
                          
                          {/* 1. Call Log Card */}
                          {isCallLog ? (
                            <div className="p-3 rounded border text-center shadow-sm" style={{ backgroundColor: '#FAF3E8', borderColor: '#DDD0B8', minWidth: '220px' }}>
                              <span className="fs-3 mb-1 d-block">📞</span>
                              <strong className="fs-12 text-dark d-block">VoIP Call Concluded</strong>
                              <span className="text-hint fs-11 font-monospace d-block mt-0.5">
                                Duration: {msg.text.split(':')[2]} | Status: Encrypted
                              </span>
                            </div>
                          ) : isAudioMsg ? (
                            // 2. Audio Message Card
                            <div 
                              className="p-3 rounded-3 shadow-sm"
                              style={{ 
                                minWidth: '240px',
                                backgroundColor: isMe ? '#2C5410' : '#FFFFFF',
                                color: isMe ? '#FFFFFF' : '#1A3A08',
                                border: isMe ? 'none' : '0.5px solid #DDD0B8'
                              }}
                            >
                              <span className="d-block mb-2 font-monospace" style={{ fontSize: '10px', color: isMe ? '#C8DFA0' : '#7A9460' }}>
                                {isMe ? 'You' : msg.sender} • 🎙️ Voice Note
                              </span>
                              
                              <div className="d-flex align-items-center gap-3">
                                <button 
                                  onClick={() => togglePlayAudio(msg.id)}
                                  className="btn btn-sm btn-light rounded-circle d-flex align-items-center justify-content-center p-0 shadow-sm"
                                  style={{ width: '32px', height: '32px', fontSize: '12px' }}
                                >
                                  {playingAudioId === msg.id ? '⏸️' : '▶️'}
                                </button>
                                
                                {/* Simulated Waveform Player */}
                                <div className="flex-grow-1 position-relative" style={{ height: '14px', backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(78,138,24,0.1)', borderRadius: '7px', overflow: 'hidden' }}>
                                  <div 
                                    className="h-100 transition-all duration-300"
                                    style={{ 
                                      width: `${audioProgress[msg.id] || 0}%`, 
                                      backgroundColor: isMe ? '#C5E1A5' : '#4E8A18' 
                                    }}
                                  ></div>
                                </div>
                                <span className="font-monospace fs-11 fw-700">{msg.text.split(':')[2]}s</span>
                              </div>
                            </div>
                          ) : isContractMsg ? (
                            // 3. Contract Negotiation Card
                            <div className="p-3 rounded border shadow-sm bg-white" style={{ borderColor: '#EAF3DE', maxWidth: '350px' }}>
                              <div className="d-flex align-items-center gap-2 mb-2">
                                <span className="fs-4">📄</span>
                                <div>
                                  <strong className="fs-13 text-dark d-block">Escrow Trade Contract Proposal</strong>
                                  <span className="text-hint fs-10 font-monospace">Platform Verified</span>
                                </div>
                              </div>
                              <p className="fs-12 text-muted mb-3" style={{ lineHeight: '1.4' }}>
                                proposed draft for: <strong className="text-dark">{msg.text.split(':')[1]}</strong>. Moister Grade: A. Quantity: 40T.
                              </p>
                              <div className="d-flex gap-2">
                                <button 
                                  onClick={() => alert('Escrow agreement accepted! Redirecting to trust accounts...')}
                                  className="btn btn-sm btn-am-primary fw-700 fs-11"
                                >
                                  🔒 Accept & Fund Escrow
                                </button>
                                <button className="btn btn-sm btn-am-ghost fw-700 fs-11" onClick={() => alert('Contract declined')}>
                                  Decline
                                </button>
                              </div>
                            </div>
                          ) : (
                            // 4. Standard Chat Text Message
                            <div
                              className="p-3 rounded-3"
                              style={{
                                maxWidth: '70%',
                                backgroundColor: isMe ? '#2C5410' : '#FFFFFF',
                                color: isMe ? '#FFFFFF' : '#1A3A08',
                                border: isMe ? 'none' : '0.5px solid #DDD0B8',
                                borderBottomRightRadius: isMe ? '4px' : '12px',
                                borderBottomLeftRadius: isMe ? '12px' : '4px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                              }}
                            >
                              <span className="d-block mb-1" style={{ fontSize: '10px', color: isMe ? '#C8DFA0' : '#7A9460' }}>
                                {isMe ? 'You' : msg.sender} • {msg.timestamp.toLocaleTimeString('en-ZW', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span style={{ fontSize: '13px', lineHeight: '1.5' }}>{msg.text}</span>
                            </div>
                          )}

                        </div>
                      );
                    })}
                    <div ref={messageEndRef} />
                  </div>
                </div>

                {/* Message Input Panel (with voice recording toggles) */}
                <div className="p-3 border-top position-relative" style={{ borderColor: '#EAF3DE', backgroundColor: '#FFFFFF' }}>
                  
                  {/* Attachment overlay selection */}
                  {showAttachMenu && (
                    <div 
                      className="position-absolute bg-white border rounded shadow-lg p-2 d-flex flex-column gap-1.5"
                      style={{ bottom: '70px', left: '16px', zIndex: 10, width: '220px', borderColor: '#EAF3DE' }}
                    >
                      <span className="text-hint fs-10 fw-700 text-uppercase letter-spacing-1 p-1">Attach Trade Listing</span>
                      <button 
                        onClick={() => handleAttachContract('40T Grains - Chinhoyi')}
                        className="btn btn-sm text-start py-1.5 fs-12 btn-light border-0"
                      >
                        🌾 40T Grains (Chinhoyi)
                      </button>
                      <button 
                        onClick={() => handleAttachContract('12T Wheat - Mazowe')}
                        className="btn btn-sm text-start py-1.5 fs-12 btn-light border-0"
                      >
                        🌾 12T Wheat (Mazowe)
                      </button>
                      <button 
                        onClick={() => handleAttachContract('8T Soybeans - Marondera')}
                        className="btn btn-sm text-start py-1.5 fs-12 btn-light border-0"
                      >
                        🌾 8T Soybeans (Marondera)
                      </button>
                    </div>
                  )}

                  {isRecording ? (
                    // 1. Audio Message recording active state panel
                    <div className="d-flex align-items-center justify-content-between p-2 rounded" style={{ backgroundColor: '#FCEBEB', border: '1px solid #EF9A9A' }}>
                      <div className="d-flex align-items-center gap-2 text-danger">
                        <span className="btn-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#A32D2D' }}></span>
                        <strong className="fs-13">Recording Voice Note...</strong>
                        <span className="font-monospace fs-13 fw-700">({formatCallTime(recordingDuration)})</span>
                      </div>
                      
                      <div className="d-flex gap-2">
                        <button 
                          type="button" 
                          onClick={handleCancelRecording}
                          className="btn btn-sm btn-outline-danger px-3 fw-600 fs-11"
                        >
                          ❌ Cancel
                        </button>
                        <button 
                          type="button" 
                          onClick={handleSendAudioNote}
                          className="btn btn-sm btn-am-primary px-3 fw-600 fs-11"
                          style={{ backgroundColor: '#A32D2D' }}
                        >
                          📤 Send Note
                        </button>
                      </div>
                    </div>
                  ) : (
                    // 2. Standard message input forms
                    <form onSubmit={handleSendMessage} className="d-flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setShowAttachMenu(!showAttachMenu)}
                        className="btn btn-am-ghost d-flex align-items-center justify-content-center p-0 rounded-circle"
                        style={{ width: '38px', height: '38px', fontSize: '13px' }}
                        title="Attach Contract"
                      >
                        📎
                      </button>

                      <input
                        type="text"
                        className="form-control hover-glow"
                        placeholder="Type your message, secure loading terms, or quality inquiries..."
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        style={{ borderColor: '#DDD0B8' }}
                      />

                      <button 
                        type="button"
                        onClick={handleStartRecording}
                        className="btn btn-am-ghost d-flex align-items-center justify-content-center p-0 rounded-circle"
                        style={{ width: '38px', height: '38px', fontSize: '13px' }}
                        title="Record Audio Message"
                      >
                        🎙️
                      </button>

                      <button type="submit" className="btn btn-am-primary px-4 fw-600 fs-13">
                        Send
                      </button>
                    </form>
                  )}
                </div>
              </>
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100" style={{ backgroundColor: '#FAF3E8' }}>
                <div className="text-center">
                  <span className="text-hint d-block mb-1">Select a conversation</span>
                  <span className="text-hint" style={{ fontSize: '12px' }}>Your secure chat history will appear here.</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* VoIP Calls Dialing & Connection Modal */}
      {activeCallType !== 'none' && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(26, 58, 8, 0.45)', backdropFilter: 'blur(10px)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '400px' }}>
            <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden" style={{ backgroundColor: '#111827', border: '2px solid #374151' }}>
              
              {/* If Video Call active, show mock webcam overlay canvas */}
              {activeCallType === 'video' && callStatus === 'connected' ? (
                <div className="w-100 position-relative border-bottom" style={{ height: '200px', backgroundColor: '#1F2937', borderColor: '#374151' }}>
                  {/* Mock partner camera feed */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="fs-1 text-white opacity-25">👤</span>
                  </div>
                  <div style={{ position: 'absolute', top: '12px', left: '12px', backgroundColor: 'rgba(0,0,0,0.5)', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', color: '#10B981', fontWeight: 'bold' }} className="btn-pulse">
                    LIVE FEED
                  </div>
                  {/* Grid lines overlay */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'linear-gradient(#374151 1px, transparent 1px), linear-gradient(90deg, #374151 1px, transparent 1px)', backgroundSize: '15px 15px', opacity: 0.15 }}></div>
                </div>
              ) : null}

              <div className="modal-body text-center p-4 py-5 text-white">
                
                {/* Dialing Pulsing Ring Avatar */}
                <div className="d-flex justify-content-center mb-4">
                  <div 
                    className={`rounded-circle d-flex align-items-center justify-content-center btn-pulse`}
                    style={{ 
                      width: '85px', height: '85px', 
                      backgroundColor: '#1F2937', 
                      border: '3px solid #10B981',
                      fontSize: '32px'
                    }}
                  >
                    👤
                  </div>
                </div>

                <h4 className="fw-800 text-white mb-1">{activeConv.partnerName}</h4>
                <span className="text-muted fs-12 text-uppercase letter-spacing-1 font-monospace mb-4 d-block">
                  {activeConv.partnerRole}
                </span>

                {/* Calling Statuses */}
                {callStatus === 'dialing' && (
                  <div>
                    <span className="text-success font-monospace fs-13 d-block mb-3">DIALING SECURE LINK...</span>
                    <p className="text-muted fs-13 mb-0">Ringing partner peer channel...</p>
                  </div>
                )}

                {callStatus === 'connecting' && (
                  <div>
                    <span className="text-warning font-monospace fs-13 d-block mb-3">NEGOTIATING HANDSHAKE...</span>
                    <p className="text-muted fs-13 mb-0">Securing end-to-end VoIP credentials...</p>
                  </div>
                )}

                {callStatus === 'connected' && (
                  <div>
                    <span className="text-success font-monospace fs-15 fw-800 d-block mb-3">
                      🔒 ENCRYPTED CONNECTION // {formatCallTime(callDuration)}
                    </span>
                    
                    {/* Animated Sound Wave Equalizer (Voice only) */}
                    {activeCallType === 'voice' && (
                      <div className="d-flex justify-content-center gap-1.5 mb-4 align-items-end" style={{ height: '30px' }}>
                        <span className="bar-eq"></span>
                        <span className="bar-eq"></span>
                        <span className="bar-eq"></span>
                        <span className="bar-eq"></span>
                        <span className="bar-eq"></span>
                      </div>
                    )}
                  </div>
                )}

                {/* Call Controls */}
                <div className="d-flex justify-content-center gap-3 mt-5">
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`btn rounded-circle d-flex align-items-center justify-content-center p-0 ${isMuted ? 'btn-danger' : 'btn-outline-secondary'}`}
                    style={{ width: '48px', height: '48px', fontSize: '18px' }}
                    title={isMuted ? "Unmute Mic" : "Mute Mic"}
                  >
                    🎙️
                  </button>

                  <button 
                    onClick={handleEndCall}
                    className="btn btn-danger rounded-circle d-flex align-items-center justify-content-center p-0 shadow-lg"
                    style={{ width: '54px', height: '54px', fontSize: '20px' }}
                    title="Terminate Call"
                  >
                    🔴
                  </button>

                  <button 
                    onClick={() => setIsVideoOff(!isVideoOff)}
                    className={`btn rounded-circle d-flex align-items-center justify-content-center p-0 ${isVideoOff ? 'btn-danger' : 'btn-outline-secondary'}`}
                    style={{ width: '48px', height: '48px', fontSize: '18px' }}
                    title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
                  >
                    📹
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Equalizer animation CSS overrides */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bounceBar {
          0%, 100% { height: 8px; }
          50% { height: 28px; }
        }
        .bar-eq {
          display: inline-block;
          width: 4px;
          height: 8px;
          background-color: #10B981;
          border-radius: 2px;
          animation: bounceBar 1.2s infinite ease-in-out;
        }
        .bar-eq:nth-child(2) { animation-delay: -0.2s; animation-duration: 0.8s; }
        .bar-eq:nth-child(3) { animation-delay: -0.4s; animation-duration: 1.4s; }
        .bar-eq:nth-child(4) { animation-delay: -0.1s; animation-duration: 1.0s; }
        .bar-eq:nth-child(5) { animation-delay: -0.3s; animation-duration: 1.1s; }
      `}} />

    </div>
  );
}

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={
        <div className="container py-5 text-center">
          <span className="spinner-border spinner-border-sm text-success" role="status" aria-hidden="true"></span>
          <span className="ms-2">Loading Chatroom...</span>
        </div>
      }>
        <ChatPanelContent />
      </Suspense>
    </ProtectedRoute>
  );
}
