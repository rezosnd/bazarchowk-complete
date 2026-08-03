"use client";
import React, { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

interface FeeTier {
  uptoKm: number;
  fee: number;
}

export default function SettingsPage() {
  const [cities, setCities] = useState<any[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  
  // Fee state
  const [tiers, setTiers] = useState<FeeTier[]>([]);
  const [defaultFee, setDefaultFee] = useState<number>(20);
  const [taxPercent, setTaxPercent] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchCities();
  }, []);

  const getToken = () => {
    if (typeof document !== 'undefined') {
      const cookie = document.cookie.split(';').find(c => c.trim().startsWith('admin_token='));
      if (cookie) return cookie.split('=')[1];
    }
    return localStorage.getItem('admin_token') || '';
  };

  const fetchCities = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/cities/admin/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCities(data);
        if (data.length > 0) handleSelectCity(data[0]);
      }
    } catch (e) {
      console.error('Failed to fetch cities');
    }
  };

  useEffect(() => {
    if (cities.length > 0 && selectedCityId) {
      const city = cities.find(c => c.id === selectedCityId);
      if (city) handleSelectCity(city);
    } else if (cities.length > 0 && !selectedCityId) {
      handleSelectCity(cities[0]);
    }
  }, [cities]);

  const handleSelectCity = (city: any) => {
    setSelectedCityId(city.id);
    setDefaultFee(city.defaultDeliveryFee || 20);
    setTaxPercent(city.taxPercent || 5);
    if (city.distanceFeeTiers && Array.isArray(city.distanceFeeTiers)) {
      setTiers(city.distanceFeeTiers);
    } else {
      setTiers([
        { uptoKm: 1, fee: 20 },
        { uptoKm: 2, fee: 30 },
        { uptoKm: 5, fee: 50 },
      ]);
    }
  };

  const onCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const city = cities.find(c => c.id === id);
    if (city) handleSelectCity(city);
  };

  const addTier = () => {
    setTiers([...tiers, { uptoKm: tiers.length > 0 ? tiers[tiers.length-1].uptoKm + 1 : 1, fee: defaultFee }]);
  };

  const removeTier = (idx: number) => {
    setTiers(tiers.filter((_, i) => i !== idx));
  };

  const updateTier = (idx: number, field: keyof FeeTier, value: number) => {
    const newTiers = [...tiers];
    newTiers[idx][field] = value;
    setTiers(newTiers);
  };

  const handleSave = async () => {
    if (!selectedCityId) return;
    setLoading(true);
    setStatusMsg(null);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/cities/admin/${selectedCityId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          defaultDeliveryFee: defaultFee,
          taxPercent: taxPercent,
          distanceFeeTiers: [...tiers].sort((a, b) => a.uptoKm - b.uptoKm)
        }),
      });
      
      if (res.ok) {
        setStatusMsg({ type: 'success', text: '✅ Configuration saved successfully!' });
        fetchCities(); // Refresh
      } else {
        const error = await res.json();
        setStatusMsg({ type: 'error', text: '❌ Failed: ' + (error.message || 'Unknown error') });
      }
    } catch (e) {
      setStatusMsg({ type: 'error', text: '❌ Network error. Please try again.' });
    }
    setLoading(false);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-extrabold text-gray-900">Delivery & Tax Configuration</h1>
      <p className="text-sm text-gray-500 mt-1">Configure dynamic delivery fees and tax rates per city. Changes apply immediately to all orders.</p>
      
      {statusMsg && (
        <div className={`mt-4 px-4 py-3 rounded-lg text-sm font-medium ${
          statusMsg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {statusMsg.text}
        </div>
      )}

      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-4xl">
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Region / City</label>
          <select 
            value={selectedCityId}
            onChange={onCityChange}
            className="w-full max-w-sm px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            {cities.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.state})</option>
            ))}
          </select>
          {cities.length === 0 && <p className="text-sm text-amber-600 mt-2">⚠️ No cities configured. Please add cities from the Super Admin panel.</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Distance-Based Delivery Fees</h3>
            <p className="text-xs text-gray-500 mb-6">Rules evaluate top-to-bottom. If distance exceeds all tiers, the default fee applies.</p>
            
            <div className="space-y-4">
              {tiers.map((tier, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Up to (KM)</label>
                    <input 
                      type="number" 
                      value={tier.uptoKm === 0 ? '' : tier.uptoKm} 
                      onChange={(e) => updateTier(idx, 'uptoKm', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                      className="w-full mt-1 bg-white border border-slate-200 px-3 py-2 rounded-lg font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Customer Fee (₹)</label>
                    <input 
                      type="number" 
                      value={tier.fee === 0 ? '' : tier.fee} 
                      onChange={(e) => updateTier(idx, 'fee', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                      className="w-full mt-1 bg-white border border-slate-200 px-3 py-2 rounded-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button onClick={() => removeTier(idx)} className="mt-5 p-2 text-red-500 hover:bg-red-50 rounded-lg transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>

            <button onClick={addTier} className="mt-4 flex items-center text-indigo-600 font-semibold text-sm hover:text-indigo-800 transition">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add KM Tier
            </button>
          </div>

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 h-fit space-y-6">
            <div>
              <h3 className="text-md font-bold text-gray-900 mb-2">Default Base Fee</h3>
              <p className="text-xs text-gray-500 mb-3">Fallback fee when distance exceeds all configured tiers.</p>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-bold">₹</span>
                <input 
                  type="number" 
                  value={defaultFee === 0 ? '' : defaultFee} 
                  onChange={(e) => setDefaultFee(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                  className="w-full bg-white border border-slate-200 px-4 py-3 rounded-lg font-bold text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <h3 className="text-md font-bold text-gray-900 mb-2">Tax Rate (GST %)</h3>
              <p className="text-xs text-gray-500 mb-3">Applied as a percentage on top of item total.</p>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  min={0} max={28}
                  value={taxPercent === 0 ? '' : taxPercent} 
                  onChange={(e) => setTaxPercent(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                  className="w-full bg-white border border-slate-200 px-4 py-3 rounded-lg font-bold text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-gray-500 font-bold">%</span>
              </div>
            </div>

            <div>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 px-4 rounded-xl shadow-sm transition"
              >
                {loading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
