import React from 'react';
import { Tag } from 'lucide-react';

export default function Pricing() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pricing</h1>
          <p className="text-sm text-slate-500">Configure sales prices, customer-specific tiers, discounts, and margins.</p>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <Tag className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-800">Pricing Module</h3>
        <p className="mt-1 text-sm text-slate-500">Empty placeholder page ready for price lists and discount structures.</p>
      </div>
    </div>
  );
}

