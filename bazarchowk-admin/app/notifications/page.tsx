"use client";

import React, { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowkapi.veritasco.tech';

export default function NotificationsAdminPage() {
  const [targetAudience, setTargetAudience] = useState<'ALL' | 'CUSTOMER' | 'PARTNER' | 'RIDER'>('ALL');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      alert('Title and Message are required');
      return;
    }
    
    if (!confirm(`Are you sure you want to broadcast this to ${targetAudience}?`)) return;

    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : '';
      const res = await fetch(`${API_BASE}/notifications/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetAudience, title, message, imageUrl, linkUrl })
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Broadcast sent successfully to ${data.count} users!`);
        setTitle('');
        setMessage('');
        setImageUrl('');
        setLinkUrl('');
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to send broadcast');
      }
    } catch (e) {
      alert('An error occurred while broadcasting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Broadcast Center</h1>
          <p className="text-sm text-gray-500 mt-1">Send global or targeted push notifications directly to user devices.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <form onSubmit={handleBroadcast} className="space-y-6">
            
            {/* Target Audience */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Target Audience</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['ALL', 'CUSTOMER', 'PARTNER', 'RIDER'].map((target) => (
                  <button
                    key={target}
                    type="button"
                    onClick={() => setTargetAudience(target as any)}
                    className={`py-3 px-4 rounded-xl border text-sm font-bold transition-colors ${
                      targetAudience === target 
                        ? 'bg-blue-50 border-blue-600 text-blue-700' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {target === 'ALL' ? 'Everyone' : target + 'S'}
                  </button>
                ))}
              </div>
            </div>

            {/* Notification Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Notification Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. ðŸš€ Mega Sale is Live!"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Message Body *</label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Type your message here..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">Use <strong className="text-slate-700">{`{firstName}`}</strong>, <strong className="text-slate-700">{`{lastName}`}</strong>, or <strong className="text-slate-700">{`{name}`}</strong> to personalize the message. (e.g., "Hi {`{firstName}`}!")</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/banner.jpg"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">Provide a direct link to an image to attach a rich banner to the push notification.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Deep Link URL (Optional)</label>
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="e.g. /product/123 or https://external.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
                <p className="text-xs text-slate-500 mt-1">When tapped, the notification will navigate the user to this link.</p>
              </div>
            </div>

            {/* Action */}
            <div className="pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Broadcasting...' : 'Send Broadcast Now'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
