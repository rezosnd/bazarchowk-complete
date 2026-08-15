"use client";
import React, { useState, useEffect } from 'react';
import { AdminContext } from '../auth-guard';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://bazarchowk-complete.vercel.app';

export default function MarketsPage() {
  const adminContext = React.useContext(AdminContext);
  const profile = adminContext?.profile;
  const role = profile?.role?.name;
  
  const [marketName, setMarketName] = useState('');
  const [villageId, setVillageId] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [selectedMarketId, setSelectedMarketId] = useState('');

  const [markets, setMarkets] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Geo Bootstrap State
  const [geoCountry, setGeoCountry] = useState('India');
  const [geoState, setGeoState] = useState('Bihar');
  const [geoDistrict, setGeoDistrict] = useState('Vaishali');
  const [geoCity, setGeoCity] = useState('Desari');
  const [geoVillage, setGeoVillage] = useState('Desari Main');
  const [geoPincode, setGeoPincode] = useState('844504');

  // Global Staff State
  const [staffRole, setStaffRole] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffPassword, setStaffPassword] = useState('');

  // Market Admin Settings State
  const [gstPercentage, setGstPercentage] = useState('18');
  const [platformFee, setPlatformFee] = useState('0');
  const [deliveryBase, setDeliveryBase] = useState('20');
  const [myMarket, setMyMarket] = useState<any>(null);
  // Rider earning config
  const [riderBase, setRiderBase] = useState('30');
  const [riderBonusPerKm, setRiderBonusPerKm] = useState('5');
  const [riderBonusAfterKm, setRiderBonusAfterKm] = useState('5');
  const [riderConfigMarketId, setRiderConfigMarketId] = useState('');
  // Tiered delivery fee: order value → delivery charge
  const [deliveryTiers, setDeliveryTiers] = useState([
    { minOrder: 0, maxOrder: 199, fee: 30 },
    { minOrder: 200, maxOrder: 499, fee: 20 },
    { minOrder: 500, maxOrder: 999, fee: 15 },
    { minOrder: 1000, maxOrder: 9999, fee: 0 },
  ]);

  React.useEffect(() => {
    fetchMarkets();
    fetchVillages();
    fetchRoles();
  }, []);

  React.useEffect(() => {
    if (role === 'MARKET_ADMIN' && markets.length > 0 && profile) {
      const market = markets.find(m => m.adminId === profile.id);
      if (market) {
        setMyMarket(market);
        setGstPercentage(market.gstPercentage?.toString() || '18');
        setPlatformFee(market.platformFee?.toString() || '0');
        setRiderBase(market.riderBaseEarning?.toString() || '30');
        setRiderBonusPerKm(market.riderDistanceBonusPerKm?.toString() || '5');
        setRiderBonusAfterKm(market.riderBonusAfterKm?.toString() || '5');
        if (market.deliveryChargeConfig?.default) {
          setDeliveryBase(market.deliveryChargeConfig.default.toString());
        }
        if (market.deliveryChargeConfig?.tiers?.length > 0) {
          setDeliveryTiers(market.deliveryChargeConfig.tiers);
        }
      }
    }
  }, [role, markets, profile]);

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/roles`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setRoles(d || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchVillages = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/markets/all-villages`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setVillages(d || []);
      }
    } catch (e) { console.error(e); }
  };

  const handleBootstrapGeo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm(`This will insert ${geoCountry} -> ${geoState} -> ${geoDistrict} -> ${geoCity} -> ${geoVillage} into the database. Proceed?`)) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/markets/bootstrap-default-geo`, { 
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          countryName: geoCountry,
          stateName: geoState,
          districtName: geoDistrict,
          cityName: geoCity,
          villageName: geoVillage,
          pincode: geoPincode
        })
      });
      if (res.ok) {
        alert('Boostrap successful! Location hierarchy created.');
        fetchVillages();
      } else {
        alert('Failed to bootstrap location data.');
      }
    } catch (e) { alert('Network Error'); }
    setLoading(false);
  };

  const fetchMarkets = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/super-admin/markets?limit=100`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setMarkets(d.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/super-admin/markets`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: marketName, 
          villageId, 
          latitude: parseFloat(latitude), 
          longitude: parseFloat(longitude) 
        }),
      });
      if (res.ok) {
        alert('Market created successfully!');
        setMarketName(''); setVillageId(''); setLatitude(''); setLongitude('');
        fetchMarkets();
      } else {
        const error = await res.json();
        let errMsg = error.message || error.error || 'Unknown error';
        if (Array.isArray(errMsg)) errMsg = errMsg.join(', ');
        else if (typeof errMsg === 'object') errMsg = JSON.stringify(errMsg);
        alert('Failed: ' + errMsg);
      }
    } catch (err) {
      alert('Network Error');
    }
    setLoading(false);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMarketId) {
      alert('Please select a market to assign this admin to.');
      return;
    }
    setLoading(true);
    try {
      const nameParts = adminName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Doe';

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: adminEmail, 
          password: adminPassword, 
          firstName,
          lastName,
          phone: adminPhone
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        let errMsg = error.message || error.error || 'Unknown error';
        if (Array.isArray(errMsg)) errMsg = errMsg.join(', ');
        else if (typeof errMsg === 'object') errMsg = JSON.stringify(errMsg);
        alert('Failed to create user: ' + errMsg);
        setLoading(false);
        return;
      }
      
      const user = await res.json();
      const token = localStorage.getItem('admin_token');

      const roleRes = await fetch(`${API_BASE}/roles/assign/${user.id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roleName: 'MARKET_ADMIN' }),
      });

      if (roleRes.ok) {
        const marketRes = await fetch(`${API_BASE}/super-admin/markets/${selectedMarketId}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ adminId: user.id }),
        });

        if (marketRes.ok) {
          alert('Market Admin created, role assigned, and linked to market successfully!');
          setAdminName(''); setAdminEmail(''); setAdminPhone(''); setAdminPassword(''); setSelectedMarketId('');
        } else {
          const mErr = await marketRes.text();
          alert('Role assigned, but failed to link to Market: ' + mErr);
        }
      } else {
        const rErr = await roleRes.text();
        alert('User created, but role assignment failed: ' + rErr);
      }
    } catch (err) {
      alert('Network Error');
    }
    setLoading(false);
  };

  const handleCreateGlobalStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffRole) {
      alert('Please select a role.');
      return;
    }
    setLoading(true);
    try {
      const nameParts = staffName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Doe';

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: staffEmail, password: staffPassword, firstName, lastName, phone: staffPhone }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        let errMsg = error.message || error.error || 'Unknown error';
        if (Array.isArray(errMsg)) errMsg = errMsg.join(', ');
        else if (typeof errMsg === 'object') errMsg = JSON.stringify(errMsg);
        alert('Failed to create user: ' + errMsg);
        setLoading(false);
        return;
      }
      
      const user = await res.json();
      const token = localStorage.getItem('admin_token');

      const roleRes = await fetch(`${API_BASE}/roles/assign/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ roleName: staffRole }),
      });

      if (roleRes.ok) {
        alert(`${staffRole} created and role assigned successfully!`);
        setStaffName(''); setStaffEmail(''); setStaffPhone(''); setStaffPassword(''); setStaffRole('');
      } else {
        const errorText = await roleRes.text();
        alert('User created, but role assignment failed: ' + errorText);
      }
    } catch (err) {
      alert('Network Error');
    }
    setLoading(false);
  };

  const handleUpdateMyMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myMarket) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/super-admin/markets/${myMarket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          gstPercentage: parseFloat(gstPercentage),
          platformFee: parseFloat(platformFee),
          deliveryChargeConfig: { 
            default: parseFloat(deliveryBase),
            tiers: deliveryTiers.map(t => ({
              minOrder: Number(t.minOrder),
              maxOrder: Number(t.maxOrder),
              fee: Number(t.fee)
            }))
          },
          imageUrl: myMarket.imageUrl
        }),
      });
      if (res.ok) {
        alert('Market configuration updated successfully!');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert('Failed to update: ' + (errData?.message || JSON.stringify(errData) || 'Unknown error'));
      }
    } catch (err) {
      alert('Network Error: ' + (err as any)?.message);
    }
    setLoading(false);
  };

  const handleUpdateRiderConfig = async (marketId: string, baseOverride?: string, bonusPerKmOverride?: string, bonusAfterKmOverride?: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/markets/market-nodes/${marketId}/rider-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          riderBaseEarning:        parseFloat(baseOverride       ?? riderBase),
          riderDistanceBonusPerKm: parseFloat(bonusPerKmOverride  ?? riderBonusPerKm),
          riderBonusAfterKm:       parseFloat(bonusAfterKmOverride ?? riderBonusAfterKm),
        }),
      });
      if (res.ok) {
        alert('Rider earning config saved successfully!');
        fetchMarkets();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert('Failed: ' + (errData?.message || 'Unknown error'));
      }
    } catch (err) { alert('Network Error'); }
    setLoading(false);
  };

    if (role === 'MARKET_ADMIN') {
    return (
      <div className="p-8 bg-slate-50 min-h-screen">
        <h1 className="text-2xl font-extrabold text-gray-900">Manage My Market</h1>
        <p className="text-sm text-gray-500 mt-1">Configure GST, Delivery Charges, and Tiered Pricing for your local market.</p>
        
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-2xl">
          {!myMarket ? (
            <p className="text-gray-500">Loading your market details...</p>
          ) : (
            <form onSubmit={handleUpdateMyMarket} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Market Name</label>
                <input type="text" value={myMarket.name} disabled className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500 outline-none" />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST Percentage (%)</label>
                  <input required type="number" step="any" value={gstPercentage} onChange={e=>setGstPercentage(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                  <p className="text-xs text-gray-400 mt-1">Standard tax applied to order item total.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Platform Fee (₹)</label>
                  <input required type="number" step="any" value={platformFee} onChange={e=>setPlatformFee(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                  <p className="text-xs text-gray-400 mt-1">Fixed fee charged to the customer directly.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Delivery Fee (₹)</label>
                  <input required type="number" step="any" value={deliveryBase} onChange={e=>setDeliveryBase(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                  <p className="text-xs text-gray-400 mt-1">Fallback fee if no tier matches.</p>
                </div>
              </div>

              {/* Tiered Delivery Fee Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-800">Tiered Delivery Fee (Based on Order Value)</label>
                    <p className="text-xs text-gray-400 mt-0.5">Set different delivery charges based on the customer's cart total.</p>
                  </div>
                  <button type="button" onClick={() => setDeliveryTiers([...deliveryTiers, { minOrder: 0, maxOrder: 999, fee: 20 }])} className="text-xs bg-indigo-50 text-indigo-600 font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-100">
                    + Add Tier
                  </button>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-gray-600 font-semibold">Min Order (₹)</th>
                        <th className="px-4 py-3 text-left text-gray-600 font-semibold">Max Order (₹)</th>
                        <th className="px-4 py-3 text-left text-gray-600 font-semibold">Delivery Fee (₹)</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryTiers.map((tier, idx) => (
                        <tr key={idx} className="border-t border-slate-100">
                          <td className="px-4 py-2">
                            <input type="number" value={tier.minOrder} onChange={e => { const t = [...deliveryTiers]; t[idx] = { ...t[idx], minOrder: Number(e.target.value) }; setDeliveryTiers(t); }} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" value={tier.maxOrder} onChange={e => { const t = [...deliveryTiers]; t[idx] = { ...t[idx], maxOrder: Number(e.target.value) }; setDeliveryTiers(t); }} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                          </td>
                          <td className="px-4 py-2">
                            <input type="number" value={tier.fee} onChange={e => { const t = [...deliveryTiers]; t[idx] = { ...t[idx], fee: Number(e.target.value) }; setDeliveryTiers(t); }} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-bold text-sm text-green-700 outline-none focus:ring-2 focus:ring-indigo-400" />
                          </td>
                          <td className="px-4 py-2">
                            <button type="button" onClick={() => setDeliveryTiers(deliveryTiers.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-400 mt-2">Example: Order ₹0–199 → ₹30 delivery. Order ₹200–499 → ₹20. Order ≥₹1000 → FREE (₹0).</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Market Image URL</label>
                <input 
                  type="text" 
                  value={myMarket.imageUrl || ''} 
                  onChange={e => setMyMarket({...myMarket, imageUrl: e.target.value})} 
                  placeholder="https://example.com/market-image.jpg"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                />
                <p className="text-xs text-gray-400 mt-1">Provide an image URL to show this market nicely in the customer app.</p>
              </div>

              <button disabled={loading} type="submit" className="w-full mt-4 bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition">
                {loading ? 'Saving...' : 'Save Market Settings'}
              </button>
            </form>
          )}
        </div>

        {/* Rider Earning Config Card */}
        {myMarket && (
          <div className="mt-8 bg-white rounded-2xl shadow-sm border border-green-200 p-8 max-w-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">🏍️ Rider Earning Configuration</h2>
            <p className="text-sm text-gray-500 mb-6">Set how much your riders earn per delivery in this market. These rates apply to all future deliveries.</p>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Pay per Delivery (₹)</label>
                <input type="number" step="any" value={riderBase} onChange={e => setRiderBase(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 font-bold text-green-700" />
                <p className="text-xs text-gray-400 mt-1">Fixed amount per completed delivery.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Distance Bonus (₹/km)</label>
                <input type="number" step="any" value={riderBonusPerKm} onChange={e => setRiderBonusPerKm(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 font-bold" />
                <p className="text-xs text-gray-400 mt-1">Extra pay per km beyond the threshold.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Starts After (km)</label>
                <input type="number" step="any" value={riderBonusAfterKm} onChange={e => setRiderBonusAfterKm(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-green-500 font-bold" />
                <p className="text-xs text-gray-400 mt-1">Distance bonus kicks in after this km.</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm text-green-800 font-medium">
              Example: Rider completes a {Number(riderBonusAfterKm)+3}km delivery → Base ₹{riderBase} + (3km × ₹{riderBonusPerKm}) = ₹{(Number(riderBase) + 3 * Number(riderBonusPerKm)).toFixed(0)} total earning
            </div>
            <button onClick={() => handleUpdateRiderConfig(myMarket.id)} disabled={loading}
              className="mt-4 w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition">
              {loading ? 'Saving...' : 'Save Rider Pay Rates'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-extrabold text-gray-900">Markets & Personnel Management</h1>
      <p className="text-sm text-gray-500 mt-1">Super Admin options to define geospatial zones and register Market Admins.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        {/* Create Market Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Create New Market Zone</h2>
          <form onSubmit={handleCreateMarket} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Market Name</label>
              <input required type="text" value={marketName} onChange={e=>setMarketName(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-green-500" placeholder="e.g. Desari Market" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Base Village / Zone</label>
              {villages.length === 0 ? (
                <div className="flex flex-col gap-3 p-4 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-red-600 text-sm font-bold">No locations exist in the database! Initialize your first setup:</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <input required type="text" value={geoCountry} onChange={e=>setGeoCountry(e.target.value)} className="w-full px-3 py-1.5 border rounded outline-none text-sm" placeholder="Country" />
                    <input required type="text" value={geoState} onChange={e=>setGeoState(e.target.value)} className="w-full px-3 py-1.5 border rounded outline-none text-sm" placeholder="State" />
                    <input required type="text" value={geoDistrict} onChange={e=>setGeoDistrict(e.target.value)} className="w-full px-3 py-1.5 border rounded outline-none text-sm" placeholder="District" />
                    <input required type="text" value={geoCity} onChange={e=>setGeoCity(e.target.value)} className="w-full px-3 py-1.5 border rounded outline-none text-sm" placeholder="City" />
                    <input required type="text" value={geoVillage} onChange={e=>setGeoVillage(e.target.value)} className="w-full px-3 py-1.5 border rounded outline-none text-sm" placeholder="Village Zone" />
                    <input required type="text" value={geoPincode} onChange={e=>setGeoPincode(e.target.value)} className="w-full px-3 py-1.5 border rounded outline-none text-sm" placeholder="Pincode" />
                  </div>
                  
                  <button type="button" onClick={handleBootstrapGeo} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm w-full mt-1 hover:bg-slate-700">
                    Submit Location Setup
                  </button>
                </div>
              ) : (
                <select required value={villageId} onChange={e=>setVillageId(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-green-500 bg-white">
                  <option value="">Select Village...</option>
                  {villages.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.city?.name})</option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input required type="number" step="any" value={latitude} onChange={e=>setLatitude(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-green-500" placeholder="25.5941" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input required type="number" step="any" value={longitude} onChange={e=>setLongitude(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-green-500" placeholder="85.1376" />
              </div>
            </div>
            <button disabled={loading} type="submit" className="w-full mt-4 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition">Create Market</button>
          </form>
        </div>

        {/* Create Market Admin Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Register Market Admin User</h2>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Market</label>
              <select required value={selectedMarketId} onChange={e=>setSelectedMarketId(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select a Market...</option>
                {markets.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Full Name</label>
              <input required type="text" value={adminName} onChange={e=>setAdminName(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address (Login ID)</label>
              <input required type="email" value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="admin@desarimarket.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input required type="text" value={adminPhone} onChange={e=>setAdminPhone(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="+91 9876543210" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secure Password</label>
              <input required type="password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter strong password" />
            </div>
            <button disabled={loading} type="submit" className="w-full mt-4 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition">Register & Assign Role</button>
          </form>
        </div>
      </div>

      <div className="mt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-4xl mx-auto">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Register Global Platform Staff</h2>
          <p className="text-sm text-gray-500 mb-6 -mt-4">Use this to create District Admins, Support Agents, or System Admins that do not need to be locked to a specific Market.</p>
          <form onSubmit={handleCreateGlobalStaff} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign Platform Role</label>
              <select required value={staffRole} onChange={e=>setStaffRole(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                <option value="">Select a Role...</option>
                {roles.filter(r => r.name !== 'CUSTOMER' && r.name !== 'SHOP_OWNER' && r.name !== 'DELIVERY_PARTNER' && r.name !== 'MARKET_ADMIN').map(r => (
                  <option key={r.id} value={r.name}>{r.name.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Staff Full Name</label>
                <input required type="text" value={staffName} onChange={e=>setStaffName(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500" placeholder="Jane Smith" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input required type="email" value={staffEmail} onChange={e=>setStaffEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500" placeholder="jane@bazarchowk.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input required type="text" value={staffPhone} onChange={e=>setStaffPhone(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500" placeholder="+91 9999999999" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Secure Password</label>
                <input required type="password" value={staffPassword} onChange={e=>setStaffPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500" placeholder="Enter strong password" />
              </div>
            </div>
            <button disabled={loading} type="submit" className="w-full mt-4 bg-purple-600 text-white font-bold py-3 rounded-lg hover:bg-purple-700 transition">Create Staff Account</button>
          </form>
        </div>
      </div>

      {/* Super Admin: Per-Market Rider Pay Rates */}
      <div className="mt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">🏍️ Rider Pay Rates — Per Market</h2>
          <p className="text-sm text-gray-500 mb-6">Configure rider earning rates independently for each market. Changes take effect for the next delivery in that market.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Market</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Base Pay (₹)</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Bonus/km (₹)</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Bonus After (km)</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((m: any) => (
                  <MarketRiderConfigRow key={m.id} market={m} onSave={handleUpdateRiderConfig} loading={loading} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketRiderConfigRow({ market, onSave, loading }: { market: any; onSave: (id: string, base: string, bonusPerKm: string, bonusAfterKm: string) => void; loading: boolean }) {
  const [base, setBase] = React.useState(market.riderBaseEarning?.toString() || '30');
  const [bonusPerKm, setBonusPerKm] = React.useState(market.riderDistanceBonusPerKm?.toString() || '5');
  const [bonusAfterKm, setBonusAfterKm] = React.useState(market.riderBonusAfterKm?.toString() || '5');

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-3 font-semibold text-gray-900">{market.name}</td>
      <td className="px-4 py-3">
        <input type="number" step="any" value={base} onChange={e => setBase(e.target.value)}
          className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-green-700 outline-none focus:ring-2 focus:ring-green-400" />
      </td>
      <td className="px-4 py-3">
        <input type="number" step="any" value={bonusPerKm} onChange={e => setBonusPerKm(e.target.value)}
          className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-green-400" />
      </td>
      <td className="px-4 py-3">
        <input type="number" step="any" value={bonusAfterKm} onChange={e => setBonusAfterKm(e.target.value)}
          className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-green-400" />
      </td>
      <td className="px-4 py-3">
        <button
          disabled={loading}
          onClick={() => onSave(market.id, base, bonusPerKm, bonusAfterKm)}
          className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
        >
          Save
        </button>
      </td>
    </tr>
  );
}
