'use client';

import React, { useState } from 'react';
import { adminApi } from '@/lib/api';
import { DownloadCloud, FileSpreadsheet, CheckCircle2, Shield, Calendar } from 'lucide-react';

export default function ReportsExportPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const exportCsv = (filename: string, rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportClients = async () => {
    setDownloading('clients');
    try {
      const res = await adminApi.getUsers({ limit: 100 });
      const header = ['ID', 'Full Name', 'Mobile', 'Email', 'PAN', 'KYC Status', 'Onboarding Step', 'Risk Tier', 'Goals', 'Portfolio Value', 'Created At'];
      const rows = res.data.map((u) => [
        u.id,
        u.fullName,
        u.mobile || '',
        u.email || '',
        u.pan || '',
        u.kycStatus,
        u.onboardingStep,
        u.riskCategory,
        u.goalsCount,
        u.portfolioValue,
        u.createdAt,
      ]);
      exportCsv('techartha_clients_master', [header, ...rows]);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleExportKyc = async () => {
    setDownloading('kyc');
    try {
      const res = await adminApi.getOnboardingQueue({ limit: 100 });
      const header = ['Application ID', 'User ID', 'Applicant Name', 'Mobile', 'Overall Status', 'PAN Status', 'Face Liveness', 'AML Status', 'Manual Review Required', 'Created At'];
      const rows = res.data.map((k) => [
        k.id,
        k.userId,
        k.applicantName,
        k.mobile || '',
        k.overallStatus,
        k.panStatus,
        k.faceLivenessStatus,
        k.amlStatus,
        k.manualReviewRequired ? 'YES' : 'NO',
        k.createdAt,
      ]);
      exportCsv('techartha_kyc_compliance_queue', [header, ...rows]);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleExportOrders = async () => {
    setDownloading('orders');
    try {
      const res = await adminApi.getTransactions({ limit: 100 });
      const header = ['Order ID', 'Investor Name', 'Scheme ISIN', 'Amount', 'Status', 'Folio Number', 'Units', 'Created At'];
      const rows = res.data.map((o) => [
        o.fpOrderId || o.id,
        o.userName,
        o.schemeIsin,
        o.amount,
        o.status,
        o.folioNumber || '',
        o.allottedUnits || '',
        o.createdAt,
      ]);
      exportCsv('techartha_orders_reconciliation', [header, ...rows]);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  const handleExportAudit = async () => {
    setDownloading('audit');
    try {
      const res = await adminApi.getAuditLogs({ limit: 100 });
      const header = ['Audit ID', 'Action', 'User ID', 'User Name', 'Details', 'IP Address', 'Timestamp'];
      const rows = res.data.map((l) => [
        l.id,
        l.action,
        l.userId || '',
        l.user?.fullName || '',
        l.details || '',
        l.ipAddress || '',
        l.createdAt,
      ]);
      exportCsv('techartha_system_audit_trail', [header, ...rows]);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-black text-[#102A54] tracking-tight">Operations Reports & CSV Export</h1>
          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
            Reconciliation & Audit
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Export verified operational data tables for accounting reconciliation, compliance audits, and partner reporting.
        </p>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Master */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#3C3985] flex items-center justify-center font-bold mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Clients & Investors Master Directory</h3>
            <p className="text-xs text-gray-500 mt-1">
              Includes full user list, masked contact information, KYC status, onboarding milestones, and active portfolio totals.
            </p>
          </div>
          <button
            onClick={handleExportClients}
            disabled={downloading === 'clients'}
            className="mt-6 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#3C3985] hover:bg-[#2A2761] text-white rounded-xl text-xs font-bold transition-all shadow-2xs disabled:opacity-50"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>{downloading === 'clients' ? 'Exporting CSV...' : 'Download Clients CSV'}</span>
          </button>
        </div>

        {/* KYC Compliance */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-3">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Cybrilla KYC Compliance Pipeline</h3>
            <p className="text-xs text-gray-500 mt-1">
              Audit log of PAN checks, face liveness verifications, AML screenings, and manual review flags for compliance reporting.
            </p>
          </div>
          <button
            onClick={handleExportKyc}
            disabled={downloading === 'kyc'}
            className="mt-6 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#3C3985] hover:bg-[#2A2761] text-white rounded-xl text-xs font-bold transition-all shadow-2xs disabled:opacity-50"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>{downloading === 'kyc' ? 'Exporting CSV...' : 'Download KYC Pipeline CSV'}</span>
          </button>
        </div>

        {/* Orders & Transactions */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#F7941E] flex items-center justify-center font-bold mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Mutual Fund Orders & SIP Execution</h3>
            <p className="text-xs text-gray-500 mt-1">
              Reconciliation report of all purchase orders, scheme ISINs, executed volumes, folio numbers, and allotment units.
            </p>
          </div>
          <button
            onClick={handleExportOrders}
            disabled={downloading === 'orders'}
            className="mt-6 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#3C3985] hover:bg-[#2A2761] text-white rounded-xl text-xs font-bold transition-all shadow-2xs disabled:opacity-50"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>{downloading === 'orders' ? 'Exporting CSV...' : 'Download Orders CSV'}</span>
          </button>
        </div>

        {/* Audit Trail */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">System & Staff Audit Trail</h3>
            <p className="text-xs text-gray-500 mt-1">
              Complete chronological audit trail of all staff logins, compliance updates, PII views, and system webhook events.
            </p>
          </div>
          <button
            onClick={handleExportAudit}
            disabled={downloading === 'audit'}
            className="mt-6 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#3C3985] hover:bg-[#2A2761] text-white rounded-xl text-xs font-bold transition-all shadow-2xs disabled:opacity-50"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>{downloading === 'audit' ? 'Exporting CSV...' : 'Download Audit Log CSV'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
