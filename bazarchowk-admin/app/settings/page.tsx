"use client";
import React, { useState, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowkapi.veritasco.tech';

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCities();
  }, []);

  const fetchCities = async () => {
    try {
      const token = localStorage.getItem('admin_token');
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

  const handleSelectCity = (city: any) => {
    setSelectedCityId(city.id);
    setDefaultFee(city.defaultDeliveryFee || 20);
    if (city.distanceFeeTiers && Array.isArray(city.distanceFeeTiers)) {
      setTiers(city.distanceFeeTiers);
    } else {
      // Setup some defaults if empty
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
    // Keep it sorted by uptoKm
    newTiers.sort((a, b) => a.uptoKm - b.uptoKm);
    setTiers(newTiers);
  };

  const handleSave = async () => {
    if (!selectedCityId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/cities/admin/${selectedCityId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          defaultDeliveryFee: defaultFee,
          distanceFeeTiers: tiers
        }),
      });
      
      if (res.ok) {
        alert('Distance fees updated successfully!');
        fetchCities(); // Refresh
      } else {
        const error = await res.json();
        alert('Failed: ' + error.message);
      }
    } catch (e) {
      alert('Network Error');
    }
    setLoading(false);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-extrabold text-gray-900">Rider Delivery Fee Configuration</h1>
      <p className="text-sm text-gray-500 mt-1">Configure dynamic rider charges based on exact delivery radius.</p>
      
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Distance-Based Rider Fees</h3>
            <p className="text-xs text-gray-500 mb-6">These rules evaluate from top to bottom. If distance is greater than all tiers, the default fee applies.</p>
            
            <div className="space-y-4">
              {tiers.map((tier, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Up to (KM)</label>
                    <input 
                      type="number" 
                      value={tier.uptoKm} 
                      onChange={(e) => updateTier(idx, 'uptoKm', parseFloat(e.target.value))}
                      className="w-full mt-1 bg-white border border-slate-200 px-3 py-2 rounded-lg font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Customer Fee (₹)</label>
                    <input 
                      type="number" 
                      value={tier.fee} 
                      onChange={(e) => updateTier(idx, 'fee', parseFloat(e.target.value))}
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

          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 h-fit">
            <h3 className="text-md font-bold text-gray-900 mb-2">Default Base Fee</h3>
            <p className="text-xs text-gray-500 mb-4">Fallback delivery charge if distance exceeds all configured tiers.</p>
            <div className="flex items-center">
              <span className="text-gray-500 font-bold mr-2">₹</span>
              <input 
                type="number" 
                value={defaultFee} 
                onChange={(e) => setDefaultFee(parseFloat(e.target.value))}
                className="w-full bg-white border border-slate-200 px-4 py-3 rounded-lg font-bold text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="mt-8">
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
