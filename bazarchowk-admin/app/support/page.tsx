"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';
const tok = () => typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  RESOLVED: 'bg-green-50 text-green-700 border-green-200',
  CLOSED: 'bg-gray-100 text-gray-500 border-gray-200',
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Fetch all tickets
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API}/support/admin/tickets?${params}`, {
        headers: { Authorization: `Bearer ${tok()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.data || data || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // Socket connection
  useEffect(() => {
    const s = io(`${API}/realtime`, {
      auth: { token: tok() },
      transports: ['websocket']
    });
    s.on('connect', () => console.log('Support socket connected'));
    s.on('new_ticket_message', (data: any) => {
      setMessages(prev => {
        // Prevent duplicates if we just sent it optimistically
        if (prev.some(m => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    setSocket(s);
    return () => { s.disconnect(); };
  }, []);

  // Load messages for selected ticket
  const selectTicket = async (ticket: any) => {
    setActiveTicket(ticket);
    setMsgLoading(true);
    setMessages([]);
    try {
      const res = await fetch(`${API}/support/admin/tickets/${ticket.id}`, {
        headers: { Authorization: `Bearer ${tok()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) { console.error(e); }
    finally { setMsgLoading(false); }
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeTicket) return;
    const text = input.trim();
    setInput('');
    // Optimistic UI
    const tempMsg = { id: Date.now().toString(), content: text, senderType: 'ADMIN', createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    try {
      await fetch(`${API}/support/admin/tickets/${activeTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ content: text })
      });
    } catch (e) { console.error(e); }
  };

  const updateStatus = async (ticketId: string, status: string) => {
    try {
      const res = await fetch(`${API}/support/admin/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchTickets();
        if (activeTicket?.id === ticketId) setActiveTicket((prev: any) => ({ ...prev, status }));
      }
    } catch (e) { alert('Failed to update status'); }
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setBroadcasting(true);
    try {
      const res = await fetch(`${API}/notifications/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` },
        body: JSON.stringify({ title: 'Message from Admin', body: broadcastMsg, type: 'SYSTEM' })
      });
      if (res.ok) { alert('Broadcast sent successfully!'); setBroadcastMsg(''); setShowBroadcast(false); }
      else alert('Broadcast failed. Check backend.');
    } catch { alert('Network error'); }
    finally { setBroadcasting(false); }
  };

  const filtered = tickets.filter(t =>
    !search ||
    t.subject?.toLowerCase().includes(search.toLowerCase()) ||
    t.user?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    t.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
    t.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 h-[calc(100vh-130px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Support & Messaging</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage support tickets and broadcast messages to all users.</p>
        </div>
        <button
          onClick={() => setShowBroadcast(true)}
          className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
          Broadcast to All Users
        </button>
      </div>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-1">Broadcast Message</h2>
            <p className="text-sm text-gray-500 mb-4">This will send a push notification to ALL users on the platform.</p>
            <textarea
              rows={4}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              placeholder="Type your broadcast message…"
              value={broadcastMsg}
              onChange={e => setBroadcastMsg(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowBroadcast(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-slate-50">Cancel</button>
              <button onClick={sendBroadcast} disabled={broadcasting || !broadcastMsg.trim()}
                className="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
                {broadcasting ? 'Sending…' : 'Send Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Panel */}
      <div className="flex flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-0">

        {/* Ticket List */}
        <div className="w-80 flex-shrink-0 border-r border-slate-200 flex flex-col">
          <div className="p-3 border-b border-slate-100 space-y-2">
            <input
              type="text"
              placeholder="Search tickets…"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); }}
            >
              <option value="">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="p-4 border-b border-slate-100 animate-pulse">
                  <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">
                <p className="font-medium">No tickets found</p>
                <p className="text-xs mt-1">Try a different filter</p>
              </div>
            ) : filtered.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => selectTicket(ticket)}
                className={`p-4 border-b border-slate-100 cursor-pointer transition-colors ${activeTicket?.id === ticket.id ? 'bg-orange-50 border-l-4 border-l-orange-500' : 'hover:bg-slate-50'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-gray-900 text-sm truncate flex-1 mr-2">{ticket.subject}</span>
                  <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[ticket.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {ticket.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {ticket.user?.firstName} {ticket.user?.lastName} · {ticket.category}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('en-IN') : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeTicket ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <svg className="w-16 h-16 mb-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="font-medium">Select a ticket to start replying</p>
              <p className="text-xs mt-1">All conversations are real-time via Socket.IO</p>
            </div>
          ) : (
            <>
              {/* Ticket Header */}
              <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-start flex-shrink-0">
                <div>
                  <h3 className="font-bold text-gray-900">{activeTicket.subject}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activeTicket.user?.firstName} {activeTicket.user?.lastName} · {activeTicket.user?.email} · {activeTicket.category}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <select
                    value={activeTicket.status}
                    onChange={e => updateStatus(activeTicket.id, e.target.value)}
                    className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {msgLoading ? (
                  <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No messages yet. Start the conversation.</div>
                ) : messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.senderType === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.senderType === 'ADMIN'
                        ? 'bg-orange-500 text-white rounded-br-none'
                        : msg.senderType === 'AI'
                        ? 'bg-purple-100 text-purple-800 rounded-bl-none'
                        : 'bg-white border border-slate-200 text-gray-800 rounded-bl-none shadow-sm'
                    }`}>
                      {msg.senderType !== 'ADMIN' && (
                        <p className="text-[10px] font-bold mb-1 opacity-60">{msg.senderType === 'AI' ? 'AI Assistant' : 'Customer'}</p>
                      )}
                      <p>{msg.content}</p>
                      <p className="text-[10px] opacity-50 mt-1">{new Date(msg.createdAt).toLocaleTimeString('en-IN')}</p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              {/* Input */}
              <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 flex-shrink-0">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your reply to the customer…"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-full h-10 w-10 flex items-center justify-center transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
