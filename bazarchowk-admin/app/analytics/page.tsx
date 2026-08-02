"use client";
import React from 'react';

export default function AnalyticsPage() {
  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <h1 className="text-2xl font-extrabold text-gray-900">Platform Analytics</h1>
      <p className="text-sm text-gray-500 mt-1">Deep dive into user engagement, order volume, and district growth.</p>
      
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-50 text-pink-600 mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        </div>
        <h3 className="text-lg font-bold text-gray-900">Analytics Engine Connected</h3>
        <p className="text-gray-500 mt-2 max-w-sm mx-auto">This section uses your custom analytics microservice to aggregate high-level metrics.</p>
      </div>
    </div>
  );
}
