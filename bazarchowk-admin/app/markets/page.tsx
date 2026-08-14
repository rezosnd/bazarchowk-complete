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
  const [deliveryBase, setDeliveryBase] = useState('20');
  const [customDeliveryBase, setCustomDeliveryBase] = useState('10');
  const [myMarket, setMyMarket] = useState<any>(null);

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
        if (market.deliveryChargeConfig?.default) {
          setDeliveryBase(market.deliveryChargeConfig.default.toString());
        }
        if (market.deliveryChargeConfig?.customDeliveryBase) {
          setCustomDeliveryBase(market.deliveryChargeConfig.customDeliveryBase.toString());
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
          deliveryChargeConfig: { 
            default: parseFloat(deliveryBase),
            customDeliveryBase: parseFloat(customDeliveryBase)
          },
          imageUrl: myMarket.imageUrl
        }),
      });
      if (res.ok) {
        alert('Market configuration updated successfully!');
      } else {
        alert('Failed to update market configuration.');
      }
    } catch (err) {
      alert('Network Error');
    }
    setLoading(false);
  };

  if (role === 'MARKET_ADMIN') {
    return (
      <div className="p-8 bg-slate-50 min-h-screen">
        <h1 className="text-2xl font-extrabold text-gray-900">Manage My Market</h1>
        <p className="text-sm text-gray-500 mt-1">Configure global platform settings like GST and Delivery Charges for your local market.</p>
        
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
                  <p className="text-xs text-gray-400 mt-1">Standard tax applied to platform fees.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Delivery Fee (₹)</label>
                  <input required type="number" step="any" value={deliveryBase} onChange={e=>setDeliveryBase(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                  <p className="text-xs text-gray-400 mt-1">Default rider delivery charge.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Delivery Per KM (₹)</label>
                  <input required type="number" step="any" value={customDeliveryBase} onChange={e=>setCustomDeliveryBase(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                  <p className="text-xs text-gray-400 mt-1">Charge for custom package deliveries.</p>
                </div>
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
    </div>
  );
}
