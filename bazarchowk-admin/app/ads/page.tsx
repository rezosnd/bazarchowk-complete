'use client';

import React, { useEffect, useState } from 'react';
// Removed shadcn imports because they don't exist
import { CheckCircle, Megaphone, Eye, MousePointerClick } from 'lucide-react';
import api from '@/lib/api';

export default function AdsAdminDashboard() {
  const [ads, setAds] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Plan form state
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planType, setPlanType] = useState('FEATURED_SHOP');
  const [durationDays, setDurationDays] = useState('7');
  const [price, setPrice] = useState('499');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adsRes, plansRes] = await Promise.all([
        api.get('/ads/admin/all'),
        api.get('/ads/plans')
      ]);
      setAds(adsRes.data);
      setPlans(plansRes.data);
    } catch (error) {
      console.error('Failed to fetch ads/plans', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/ads/${id}/approve`);
      fetchData();
    } catch (e) {
      console.error('Failed to approve', e);
      alert('Failed to approve ad');
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/ads/plans', {
        name: planName,
        type: planType,
        durationDays: parseInt(durationDays),
        price: parseFloat(price)
      });
      alert('Ad Plan created successfully!');
      setShowPlanForm(false);
      setPlanName('');
      fetchData();
    } catch (err) {
      alert('Failed to create plan');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Advertisement Network</h1>
          <p className="text-slate-500 mt-2">Manage and approve local business promotions</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setShowPlanForm(!showPlanForm)} className="border px-4 py-2 rounded-md font-semibold bg-white hover:bg-slate-50">
            {showPlanForm ? 'Hide Form' : 'Create Ad Plan'}
          </button>
          <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full font-semibold flex items-center gap-2">
            <Megaphone className="w-5 h-5" />
            {ads.filter(a => a.status === 'ACTIVE').length} Active Ads
          </div>
        </div>
      </div>

      {showPlanForm && (
        <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-emerald-100">
            <h3 className="text-lg font-semibold">Create New Ad Plan</h3>
          </div>
          <div className="p-6">
            <form onSubmit={handleCreatePlan} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div>
                <label className="text-sm font-semibold mb-1 block">Plan Name</label>
                <input required value={planName} onChange={e=>setPlanName(e.target.value)} placeholder="e.g. Premium Banner" className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Ad Type</label>
                <select value={planType} onChange={e=>setPlanType(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white">
                  <option value="FEATURED_SHOP">Featured Shop</option>
                  <option value="BANNER">Image Banner</option>
                  <option value="FEATURED_PRODUCT">Featured Product</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Duration (Days)</label>
                <input type="number" required value={durationDays} onChange={e=>setDurationDays(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1 block">Price (₹)</label>
                <input type="number" required value={price} onChange={e=>setPrice(e.target.value)} className="w-full border rounded-lg px-3 py-2" />
              </div>
              <button type="submit" className="bg-emerald-600 text-white hover:bg-emerald-700 h-10 w-full rounded-lg font-semibold">Create Plan</button>
            </form>
          </div>
        </div>
      )}

      {/* ── Active & Pending Ads Section ── */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-4">Purchased Advertisements</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-500">Loading Ads...</div>
          ) : ads.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed rounded-xl">No advertisements purchased by shops yet.</div>
          ) : (
            ads.map(ad => (
              <div key={ad.id} className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-sm">
                <div className="bg-slate-50 border-b p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">{ad.shop?.name || 'Unknown Shop'}</h3>
                      <p className="text-sm font-medium text-emerald-600 mt-1">{ad.plan?.name}</p>
                    </div>
                    <span 
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        ad.status === 'ACTIVE' ? 'bg-emerald-500 text-white' : 
                        ad.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {ad.status}
                    </span>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {ad.title && (
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold">Ad Title</p>
                      <p className="text-slate-900 font-medium">{ad.title}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center text-slate-500 gap-1 text-xs uppercase font-semibold">
                        <Eye className="w-3 h-3" /> Impressions
                      </div>
                      <p className="text-lg font-bold text-slate-900">{ad.impressions || 0}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center text-slate-500 gap-1 text-xs uppercase font-semibold">
                        <MousePointerClick className="w-3 h-3" /> Clicks
                      </div>
                      <p className="text-lg font-bold text-slate-900">{ad.clicks || 0}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-xs text-slate-500 mb-1 font-semibold uppercase">Status Info</p>
                    <p className="text-sm font-medium text-slate-700">Ends: {new Date(ad.endDate).toLocaleDateString()}</p>
                  </div>
                </div>
                {ad.status === 'PENDING' && (
                  <div className="p-4 bg-slate-50 border-t flex justify-end">
                    <button onClick={() => handleApprove(ad.id)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Approve Ad
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Configured Ad Plans Section ── */}
      <div className="mt-12">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-4">Configured Ad Plans</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <div className="col-span-full py-6 text-center text-slate-500">Loading Plans...</div>
          ) : plans.length === 0 ? (
            <div className="col-span-full py-6 text-center text-slate-500 border-2 border-dashed rounded-xl">No plans configured. Create one above!</div>
          ) : (
            plans.map(plan => (
              <div key={plan.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="bg-slate-50 border-b p-6 pb-4">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                </div>
                <div className="p-6 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Type</span>
                    <span className="font-semibold text-slate-900">{plan.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Duration</span>
                    <span className="font-semibold text-slate-900">{plan.durationDays} Days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Price</span>
                    <span className="font-semibold text-emerald-600">₹{plan.price}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
