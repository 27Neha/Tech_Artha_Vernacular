'use client';

import React from 'react';
import { useAdminAuth } from '@/lib/auth-context';
import { Settings, Shield, Server, CheckCircle2, User, Key } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAdminAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <h1 className="text-xl font-black text-[#102A54] tracking-tight">Platform Settings & Operations Controls</h1>
        <p className="text-xs text-gray-500 mt-1">
          Review environment configurations, integration health, and administrative role boundaries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Staff Profile */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3C3985] text-white flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">{user?.name || 'Staff Member'}</h3>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Assigned Role:</span>
              <span className="font-bold text-[#3C3985]">{user?.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Session ID:</span>
              <span className="font-mono text-gray-700">{user?.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">PII Unmasking Permission:</span>
              <span className="font-semibold text-gray-900">
                {user?.role === 'SUPER_ADMIN' ? 'Enabled (Full)' : 'Masked (Strict)'}
              </span>
            </div>
          </div>
        </div>

        {/* Integration Status */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Platform Integrations</h3>
              <p className="text-xs text-gray-400">Connected infrastructure and backend microservices</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { name: 'Core NestJS Backend', target: 'http://localhost:3000', status: 'Active' },
              { name: 'Admin Portal Web App', target: 'http://localhost:3002', status: 'Active' },
              { name: 'Cybrilla Fintech Primitives', target: 'Sandbox Finverse', status: 'Connected' },
              { name: 'AMFI / MFAPI Scheme Engine', target: 'api.mfapi.in', status: 'Operational' },
              { name: 'Resend Email Service', target: 'Transactional Provider', status: 'Configured' },
            ].map((s) => (
              <div key={s.name} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <div>
                  <div className="font-bold text-gray-800">{s.name}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{s.target}</div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{s.status}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
