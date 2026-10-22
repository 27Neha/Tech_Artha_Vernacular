'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminAuth } from '@/lib/auth-context';
import {
  X,
  User,
  ShieldCheck,
  Target,
  Briefcase,
  Headphones,
  FileText,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  Building,
  CreditCard,
} from 'lucide-react';

interface Props {
  userId: string | null;
  onClose: () => void;
}

export function UserDetailDrawer({ userId, onClose }: Props) {
  const { user: currentAdmin } = useAdminAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [unmask, setUnmask] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'kyc' | 'risk' | 'goals' | 'portfolio' | 'financial' | 'audit'>('profile');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setData(null);
      return;
    }

    async function fetchUser() {
      setLoading(true);
      setError(null);
      try {
        const details = await adminApi.getUserDetails(userId!, unmask);
        setData(details);
      } catch (err: any) {
        setError(err.message || 'Failed to load user operational details.');
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [userId, unmask]);

  if (!userId) return null;

  const canUnmask = currentAdmin?.role === 'SUPER_ADMIN' || currentAdmin?.role === 'OPERATIONS';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3C3985] text-white flex items-center justify-center font-bold text-base">
              {data?.profile?.fullName?.slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-[#102A54]">
                  {data?.profile?.fullName || 'User Profile'}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    data?.user?.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {data?.user?.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono">ID: {userId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canUnmask && (
              <button
                onClick={() => setUnmask(!unmask)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs"
                title="Super Admin / Operations unmask permission"
              >
                {unmask ? <EyeOff className="w-3.5 h-3.5 text-amber-600" /> : <Eye className="w-3.5 h-3.5 text-gray-500" />}
                <span>{unmask ? 'Mask PII' : 'Unmask PII'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 px-6 bg-white overflow-x-auto text-xs font-bold text-gray-500">
          {[
            { key: 'profile', label: 'Profile', icon: User },
            { key: 'kyc', label: 'KYC & Verification', icon: ShieldCheck },
            { key: 'risk', label: 'Risk Profile', icon: Target },
            { key: 'goals', label: 'Goals & SIPs', icon: Target },
            { key: 'portfolio', label: 'Portfolio', icon: Briefcase },
            { key: 'financial', label: 'Cybrilla Accounts', icon: CreditCard },
            { key: 'audit', label: 'Audit Trail', icon: FileText },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 whitespace-nowrap transition-colors ${
                  active
                    ? 'border-[#3C3985] text-[#3C3985]'
                    : 'border-transparent hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400">
              <div className="w-8 h-8 border-3 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mb-2" />
              <p className="text-xs">Loading operational dossier...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          ) : !data ? null : (
            <div>
              {/* TAB 1: PROFILE */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h4 className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-wider">
                      Identity & Demographics
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-gray-400 block mb-0.5">Full Name</span>
                        <span className="font-bold text-gray-800">{data.profile?.fullName || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">PAN Number</span>
                        <span className="font-bold text-gray-800 font-mono">{data.profile?.pan || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">Mobile Number</span>
                        <span className="font-bold text-gray-800 font-mono">{data.user?.mobile || 'Not linked'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">Email Address</span>
                        <span className="font-bold text-gray-800">{data.user?.email || 'Not verified'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">Date of Birth</span>
                        <span className="font-bold text-gray-800">
                          {data.profile?.dateOfBirth
                            ? new Date(data.profile.dateOfBirth).toLocaleDateString('en-IN')
                            : 'Not set'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">Preferred Language</span>
                        <span className="font-bold uppercase text-[#3C3985]">
                          {data.user?.preferredLanguage || 'en'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h4 className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-wider">
                      Onboarding Pipeline Status
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between font-semibold">
                        <span>Current Funnel Step</span>
                        <span className="text-[#3C3985] font-bold">
                          {data.onboarding?.lastCompletedStep || data.onboarding?.step || 'NEW'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#3C3985] h-2 rounded-full"
                          style={{ width: `${data.onboarding?.percentage || 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-gray-400">
                        <span>Completion: {data.onboarding?.percentage || 0}%</span>
                        <span>{data.onboarding?.completed ? 'Onboarded' : 'In Progress'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: KYC */}
              {activeTab === 'kyc' && (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                        Cybrilla KYC Application
                      </h4>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          data.kyc?.overallStatus === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : data.kyc?.manualReviewRequired
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {data.kyc?.overallStatus || 'NOT_STARTED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                      <div>
                        <span className="text-gray-400 block mb-0.5">Provider</span>
                        <span className="font-bold text-gray-800">{data.kyc?.provider || 'CYBRILLA'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">Cybrilla Reference ID</span>
                        <span className="font-bold text-gray-800 font-mono text-[11px]">
                          {data.kyc?.providerTransactionId || 'None'}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-gray-200/80 pt-3 space-y-2">
                      <h5 className="text-[11px] font-bold text-gray-500 uppercase">Verification Stages</h5>
                      {[
                        { label: 'PAN Verification', status: data.kyc?.panStatus },
                        { label: 'Document Ocr / Aadhaar', status: data.kyc?.documentStatus },
                        { label: 'Face Liveness Detection', status: data.kyc?.faceLivenessStatus },
                        { label: 'Face Match vs Photo ID', status: data.kyc?.faceMatchStatus },
                        { label: 'AML / PEP Compliance', status: data.kyc?.amlStatus },
                      ].map((stage) => (
                        <div key={stage.label} className="flex items-center justify-between text-xs py-1">
                          <span className="font-medium text-gray-700">{stage.label}</span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                              stage.status === 'VERIFIED' || stage.status === 'PASSED' || stage.status === 'CLEAR'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {stage.status || 'PENDING'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {data.kyc?.events && data.kyc.events.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Provider Webhook Events
                      </h5>
                      <div className="space-y-2">
                        {data.kyc.events.map((evt: any) => (
                          <div key={evt.id} className="p-3 bg-gray-50 rounded-lg text-xs font-mono border border-gray-100">
                            <div className="flex justify-between font-bold text-gray-700 mb-1">
                              <span>{evt.eventType}</span>
                              <span className="text-gray-400 text-[10px]">
                                {new Date(evt.createdAt).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 break-all">{evt.payload}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: RISK PROFILE */}
              {activeTab === 'risk' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <span className="text-xs font-bold uppercase text-gray-400 block mb-1">Assessed Tier</span>
                    <div className="text-xl font-extrabold text-[#3C3985]">
                      {data.risk?.current?.category || 'NOT_ASSESSED'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Score: <span className="font-bold">{data.risk?.current?.score ?? 'N/A'}</span> / 55 (SEBI 5-Tier
                      Framework)
                    </p>
                  </div>

                  {data.risk?.current?.answers && (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Submitted Responses</h5>
                      <pre className="text-[11px] text-gray-700 font-mono bg-white p-3 rounded-lg border border-gray-200 overflow-x-auto whitespace-pre-wrap">
                        {data.risk.current.answers}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: GOALS & CUSTOM BUCKETS */}
              {activeTab === 'goals' && (
                <div className="space-y-4">
                  {/* Goals Section */}
                  <div>
                    <h5 className="text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">
                      Target Life Goals ({data.goals?.length || 0})
                    </h5>
                    {!data.goals || data.goals.length === 0 ? (
                      <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center text-gray-400 text-xs">
                        No financial goals configured yet.
                      </div>
                    ) : (
                      data.goals.map((g: any) => (
                        <div key={g.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-2 text-xs mb-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-900 text-sm">{g.name}</span>
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-[#3C3985] font-bold text-[10px]">
                              {g.bucketName}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-1 text-gray-600">
                            <div>
                              <span className="text-gray-400 block text-[10px]">Target</span>
                              <span className="font-bold text-gray-900">₹{g.targetAmount?.toLocaleString('en-IN')}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-[10px]">Monthly SIP</span>
                              <span className="font-bold text-[#F7941E]">₹{g.monthlySip?.toLocaleString('en-IN')}</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-[10px]">Horizon</span>
                              <span className="font-bold text-gray-900">{g.timePeriod} Years</span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Custom Buckets Section */}
                  <div>
                    <h5 className="text-xs font-bold uppercase text-gray-400 mb-2 tracking-wider">
                      Custom Buckets Created in Supabase ({data.customBuckets?.length || 0})
                    </h5>
                    {!data.customBuckets || data.customBuckets.length === 0 ? (
                      <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 text-center text-gray-400 text-xs">
                        No custom buckets built by this user.
                      </div>
                    ) : (
                      data.customBuckets.map((cb: any) => {
                        let parsedFunds = [];
                        try {
                          parsedFunds = typeof cb.funds === 'string' ? JSON.parse(cb.funds) : cb.funds;
                        } catch (e) {
                          parsedFunds = [];
                        }
                        return (
                          <div key={cb.id} className="p-4 rounded-xl bg-purple-50/40 border border-purple-100 space-y-2 text-xs mb-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#102A54] text-sm">{cb.name || 'Custom Basket'}</span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {new Date(cb.createdAt).toLocaleDateString('en-IN')}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {Array.isArray(parsedFunds) &&
                                parsedFunds.map((f: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100 text-[11px]">
                                    <span className="font-medium text-gray-800 truncate max-w-[280px]">
                                      {f.schemeName || `Scheme #${f.schemeCode || f.id || idx + 1}`}
                                    </span>
                                    <span className="font-bold text-[#3C3985]">
                                      {f.allocation ?? f.percentage ?? '—'}%
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: PORTFOLIO */}
              {activeTab === 'portfolio' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Total Invested</span>
                      <span className="font-bold text-gray-900">
                        ₹{(data.portfolio?.totalInvested || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Current Value</span>
                      <span className="font-bold text-emerald-600">
                        ₹{(data.portfolio?.currentValue || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Total Returns</span>
                      <span className="font-bold text-emerald-600">
                        ₹{(data.portfolio?.totalReturns || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Holdings</h5>
                    {!data.portfolio?.holdings || data.portfolio.holdings.length === 0 ? (
                      <p className="text-xs text-gray-400 py-4 text-center">No active holdings recorded.</p>
                    ) : (
                      <div className="space-y-2">
                        {data.portfolio.holdings.map((h: any) => (
                          <div key={h.id} className="p-3 bg-white border border-gray-200 rounded-xl text-xs flex justify-between">
                            <div>
                              <div className="font-bold text-gray-900">{h.fundName}</div>
                              <div className="text-[10px] text-gray-400">{h.units} units @ NAV ₹{h.nav}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-900">₹{h.currentValue?.toLocaleString('en-IN')}</div>
                              <div className="text-[10px] text-emerald-600 font-semibold">+₹{h.returns}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: FINANCIAL (CYBRILLA) */}
              {activeTab === 'financial' && (
                <div className="space-y-4 text-xs">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h5 className="font-bold text-gray-700 mb-2">Cybrilla Investor Profile</h5>
                    {data.financialAccounts ? (
                      <div className="grid grid-cols-2 gap-2 text-gray-600">
                        <div>
                          <span className="text-gray-400 block text-[10px]">Cybrilla Profile ID</span>
                          <span className="font-mono text-gray-900">{data.financialAccounts.fpProfileId || 'Pending'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Tax Status</span>
                          <span className="text-gray-900">{data.financialAccounts.taxStatus}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Occupation</span>
                          <span className="text-gray-900">{data.financialAccounts.occupation}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Income Slab</span>
                          <span className="text-gray-900">{data.financialAccounts.incomeSlab}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-400">No Cybrilla financial profile generated yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 7: AUDIT */}
              {activeTab === 'audit' && (
                <div className="space-y-2">
                  {!data.auditTrail || data.auditTrail.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">No audit records found for this user.</p>
                  ) : (
                    data.auditTrail.map((log: any) => (
                      <div key={log.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                        <div className="flex justify-between font-bold text-gray-800 font-mono">
                          <span>{log.action}</span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(log.createdAt).toLocaleString('en-IN')}
                          </span>
                        </div>
                        {log.details && (
                          <div className="text-[11px] text-gray-500 font-mono mt-1 break-all">{log.details}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
