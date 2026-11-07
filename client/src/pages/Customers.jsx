import React from 'react';
import { Users } from 'lucide-react';

export default function Customers() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500">Manage client profiles, contractors, GSTIN details, and contact info.</p>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <Users className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-800">Customers Module</h3>
        <p className="mt-1 text-sm text-slate-500">Empty placeholder page ready for customer records and directory.</p>
      </div>
    </div>
  );
}

