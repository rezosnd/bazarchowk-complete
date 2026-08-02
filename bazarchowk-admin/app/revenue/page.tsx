"use client";
import React from 'react';

export default function RevenuePage() {
  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-extrabold text-gray-900">Revenue & Financials</h1>
      <p className="text-sm text-gray-500 mt-1">Track platform commissions, rider fees, and shop payouts.</p>
      
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 text-green-600 mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900">Financial Ledger Linked</h3>
        <p className="text-gray-500 mt-2 max-w-sm mx-auto">This dashboard is connected to the core settlement engine. Detailed ledger views will populate here.</p>
      </div>
    </div>
  );
}
