'use client';

import React, { useEffect, useState, useRef } from 'react';
import { adminApi, SupportItem, SupportMessageItem } from '@/lib/api';
import { useAdminAuth } from '@/lib/auth-context';
import {
  Search,
  CheckCircle2,
  Clock,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Phone,
  Mail,
  User,
  Check,
  Trash2,
  FileText,
  CheckCheck,
  MessageCircle,
  ArrowLeft,
  RotateCcw,
  Smartphone,
} from 'lucide-react';

const CANNED_RESPONSES = [
  {
    label: '👋 Welcome',
    text: 'Hello! Thank you for contacting TechArtha Support. How can we assist you today?',
  },
  {
    label: '✅ KYC Approved',
    text: 'Your KYC verification has been successfully reviewed and approved! You can now proceed with your mutual fund investments.',
  },
  {
    label: '🏦 Bank Verified',
    text: 'The penny drop bank verification has been successfully confirmed for your linked bank account.',
  },
  {
    label: '⏳ Under Review',
    text: 'Our technical team is actively looking into your account. We will update you shortly.',
  },
];

export default function SupportDeskPage() {
  const { user: currentAdmin } = useAdminAuth();

  // Tickets state
  const [tickets, setTickets] = useState<SupportItem[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetails, setTicketDetails] = useState<SupportItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('');

  // Reply Composer state
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyFeedback, setReplyFeedback] = useState<string | null>(null);

  // Status & Note state
  const [internalNote, setInternalNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getSupportTickets({
        page: 1,
        limit: 50,
        search: search || undefined,
        status: statusFilter || undefined,
      });

      let filtered = res.data;
      if (channelFilter) {
        filtered = filtered.filter(
          (t) => (t.channel || 'WHATSAPP').toUpperCase() === channelFilter.toUpperCase(),
        );
      }

      setTickets(filtered);
    } catch (err: any) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTicket = async (ticketId: string) => {
    setSelectedTicketId(ticketId);
    setLoadingDetails(true);
    setReplyText('');
    setReplyFeedback(null);
    setInternalNote('');

    try {
      const details = await adminApi.getSupportTicketDetails(ticketId);
      setTicketDetails(details);
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      alert(`Failed to load ticket details: ${err.message}`);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBackToTickets = () => {
    setSelectedTicketId(null);
    setTicketDetails(null);
    fetchTickets();
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, channelFilter]);

  const handleSendReply = async () => {
    if (!selectedTicketId || !replyText.trim() || sendingReply) return;
    setSendingReply(true);
    setReplyFeedback(null);

    const textToSend = replyText.trim();
    try {
      const res: any = await adminApi.replyToSupportTicket(selectedTicketId, textToSend);
      setReplyText('');
      
      const channel = (ticketDetails?.channel || 'WHATSAPP').toUpperCase();
      if (res?.warning) {
        setReplyFeedback(`⚠️ ${res.warning}`);
      } else if (channel === 'EMAIL') {
        setReplyFeedback('✓ Reply dispatched to customer via ZeptoMail email');
      } else {
        setReplyFeedback('✓ Reply dispatched to customer on WhatsApp');
      }

      // Refresh ticket conversation thread
      const updated = await adminApi.getSupportTicketDetails(selectedTicketId);
      setTicketDetails(updated);

      setTimeout(scrollToBottom, 150);
      setTimeout(() => setReplyFeedback(null), 6000);
    } catch (err: any) {
      alert(`Failed to send reply: ${err.message}`);
    } finally {
      setSendingReply(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends the reply; Shift+Enter creates a new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicketId) return;
    setUpdatingStatus(true);
    try {
      await adminApi.updateSupportTicket(selectedTicketId, {
        status: newStatus,
        notes: internalNote || `Status updated to ${newStatus} by ${currentAdmin?.email}`,
      });
      setInternalNote('');
      const updated = await adminApi.getSupportTicketDetails(selectedTicketId);
      setTicketDetails(updated);
      fetchTickets();
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ticket?')) return;
    try {
      await adminApi.deleteSupportTicket(id);
      handleBackToTickets();
    } catch (err: any) {
      alert(`Failed to delete ticket: ${err.message}`);
    }
  };

  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const pendingCount = tickets.filter((t) => t.status === 'IN_REVIEW').length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;

  return (
    <div className="space-y-4">
      {/* ============================================================== */}
      {/* VIEW 1: NORMAL TICKETS LIST (Shown by default on navigation)   */}
      {/* ============================================================== */}
      {!selectedTicketId ? (
        <div className="space-y-4">
          {/* Top Header */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-[#102A54] tracking-tight">Support Desk</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync (+91 83088 16023)
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Customer support inquiries created automatically when users reach out via WhatsApp, Email, or the TechArtha app.
              </p>
            </div>

            {/* Filter Tabs & Refresh */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200 text-xs font-bold">
                <button
                  onClick={() => setStatusFilter('')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === '' ? 'bg-white shadow-2xs text-[#102A54]' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  All ({tickets.length})
                </button>
                <button
                  onClick={() => setStatusFilter('OPEN')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    statusFilter === 'OPEN' ? 'bg-white shadow-2xs text-amber-700 font-extrabold' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Open ({openCount})
                </button>
                <button
                  onClick={() => setStatusFilter('IN_REVIEW')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    statusFilter === 'IN_REVIEW' ? 'bg-white shadow-2xs text-blue-700 font-extrabold' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Pending ({pendingCount})
                </button>
                <button
                  onClick={() => setStatusFilter('RESOLVED')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    statusFilter === 'RESOLVED' ? 'bg-white shadow-2xs text-emerald-700 font-extrabold' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Resolved ({resolvedCount})
                </button>
              </div>

              <button
                onClick={fetchTickets}
                className="p-2 text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
                title="Refresh Tickets"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search & Channel Filters */}
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row items-center gap-3">
            <div className="flex-1 w-full relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchTickets()}
                placeholder="Search tickets by client name, mobile, reference ID, or subject..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:border-[#3C3985] transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 self-start md:self-auto text-xs font-bold">
              <button
                onClick={() => setChannelFilter('')}
                className={`px-3 py-2 rounded-xl transition-all ${
                  channelFilter === '' ? 'bg-[#3C3985] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Channels
              </button>
              <button
                onClick={() => setChannelFilter('WHATSAPP')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  channelFilter === 'WHATSAPP' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </button>
              <button
                onClick={() => setChannelFilter('APP')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  channelFilter === 'APP' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                In-App
              </button>
              <button
                onClick={() => setChannelFilter('EMAIL')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  channelFilter === 'EMAIL' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Email
              </button>
              <button
                onClick={() => setChannelFilter('SMS')}
                className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                  channelFilter === 'SMS' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                SMS
              </button>
            </div>
          </div>

          {/* Tickets Queue Table */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-4">Ticket Ref</th>
                    <th className="py-3.5 px-4">Channel</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Subject</th>
                    <th className="py-3.5 px-4">Latest Message Snippet</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        <div className="w-6 h-6 border-2 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mx-auto mb-2" />
                        <span>Loading tickets...</span>
                      </td>
                    </tr>
                  ) : tickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-400">
                        No support tickets matching selected criteria.
                      </td>
                    </tr>
                  ) : (
                    tickets.map((t) => {
                      const isResolvedOrClosed = t.status === 'RESOLVED' || t.status === 'CLOSED';
                      const channel = (t.channel || 'WHATSAPP').toUpperCase();

                      return (
                        <tr
                          key={t.id}
                          onClick={() => handleOpenTicket(t.id)}
                          className={`cursor-pointer transition-colors ${
                            isResolvedOrClosed
                              ? 'bg-gray-50/60 opacity-60 hover:opacity-90 hover:bg-gray-100/60 text-gray-500'
                              : 'hover:bg-indigo-50/30'
                          }`}
                        >
                          {/* Reference ID */}
                          <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                            {t.referenceId || t.id.slice(0, 8).toUpperCase()}
                          </td>

                          {/* Channel Badge */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
                                channel === 'WHATSAPP'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : channel === 'APP'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : channel === 'EMAIL'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-orange-50 text-orange-700 border-orange-200'
                              }`}
                            >
                              {channel === 'WHATSAPP' && <MessageCircle className="w-2.5 h-2.5" />}
                              {channel === 'APP' && <Smartphone className="w-2.5 h-2.5" />}
                              {channel === 'EMAIL' && <Mail className="w-2.5 h-2.5" />}
                              {channel === 'SMS' && <Phone className="w-2.5 h-2.5" />}
                              {channel === 'APP' ? 'IN-APP' : channel}
                            </span>
                          </td>

                          {/* Client */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900">{t.customerName || t.userName || 'Registered Client'}</div>
                            <div className="text-[11px] text-gray-400 font-mono">
                              {t.customerPhone || t.userMobile || t.customerEmail || t.userEmail || 'N/A'}
                            </div>
                          </td>

                          {/* Subject */}
                          <td className="py-3.5 px-4 font-bold text-gray-800 max-w-[200px] truncate">
                            {t.subject}
                          </td>

                          {/* Snippet */}
                          <td className="py-3.5 px-4 text-gray-500 max-w-xs truncate">
                            {t.lastCustomerMessage || t.message}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                                isResolvedOrClosed
                                  ? 'bg-gray-100 text-gray-600 border-gray-300'
                                  : t.status === 'IN_REVIEW'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 text-[11px] text-gray-400 whitespace-nowrap">
                            {new Date(t.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTicket(t.id);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-[#3C3985] hover:text-white text-gray-700 border border-gray-200 text-xs font-bold transition-all"
                            >
                              Open Chat
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* VIEW 2: DEDICATED TICKET CHAT & RESOLUTION VIEW (Opened on click)*/
        /* ============================================================== */
        <div className="space-y-4">
          {/* Top Bar with Back Button */}
          <div className="bg-white px-5 py-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBackToTickets}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Tickets</span>
              </button>

              <div className="h-5 w-px bg-gray-200" />

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-gray-900">
                  {ticketDetails?.referenceId || selectedTicketId.slice(0, 8).toUpperCase()}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
                    (ticketDetails?.channel || 'WHATSAPP').toUpperCase() === 'WHATSAPP'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : (ticketDetails?.channel || '').toUpperCase() === 'APP'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  {(ticketDetails?.channel || 'WHATSAPP').toUpperCase() === 'APP' ? 'IN-APP' : (ticketDetails?.channel || 'WHATSAPP').toUpperCase()}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                    ticketDetails?.status === 'RESOLVED' || ticketDetails?.status === 'CLOSED'
                      ? 'bg-gray-100 text-gray-600 border-gray-300'
                      : ticketDetails?.status === 'IN_REVIEW'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {ticketDetails?.status}
                </span>
              </div>
            </div>

            {/* Resolution Actions */}
            <div className="flex items-center gap-2">
              {ticketDetails?.status !== 'RESOLVED' && ticketDetails?.status !== 'CLOSED' ? (
                <>
                  <button
                    onClick={() => handleUpdateStatus('IN_REVIEW')}
                    disabled={updatingStatus}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors"
                  >
                    Mark Pending
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('RESOLVED')}
                    disabled={updatingStatus}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Resolve Ticket</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleUpdateStatus('OPEN')}
                  disabled={updatingStatus}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reopen Ticket</span>
                </button>
              )}

              <button
                onClick={() => handleDeleteTicket(selectedTicketId)}
                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-2"
                title="Delete Ticket"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Workspace (2-Column Chat & Client Info) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left/Center: Chat Stream & Reply Box (2 cols) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-2xs flex flex-col h-[650px] overflow-hidden">
              {/* Ticket Subject Header */}
              <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-base font-extrabold text-[#102A54]">
                  {ticketDetails?.subject}
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                  <span>Client: <strong className="text-gray-700">{ticketDetails?.customerName || ticketDetails?.userName || 'Client'}</strong></span>
                  <span>•</span>
                  <span>Created: {ticketDetails?.createdAt ? new Date(ticketDetails.createdAt).toLocaleString('en-IN') : ''}</span>
                </div>
              </div>

              {/* Resolved Banner if resolved */}
              {(ticketDetails?.status === 'RESOLVED' || ticketDetails?.status === 'CLOSED') && (
                <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>This ticket is marked as <strong>{ticketDetails?.status}</strong>. If the customer messages again, it will automatically reopen.</span>
                  </div>
                  <button
                    onClick={() => handleUpdateStatus('OPEN')}
                    className="text-xs font-bold text-[#3C3985] hover:underline"
                  >
                    Reopen now
                  </button>
                </div>
              )}

              {/* Chat Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30">
                {loadingDetails ? (
                  <div className="py-16 text-center text-xs text-gray-400">
                    <div className="w-6 h-6 border-2 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mx-auto mb-2" />
                    Loading conversation messages...
                  </div>
                ) : (
                  <>
                    {/* Fallback initial message if thread is empty */}
                    {(!ticketDetails?.messages || ticketDetails.messages.length === 0) && (
                      <div className="flex flex-col items-start max-w-lg">
                        <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-1">
                          <span className="font-bold text-gray-700">{ticketDetails?.customerName || 'Customer'}</span>
                          <span>•</span>
                          <span>{ticketDetails?.createdAt ? new Date(ticketDetails.createdAt).toLocaleTimeString('en-IN') : ''}</span>
                        </div>
                        <div className="p-3.5 bg-white text-gray-800 rounded-2xl rounded-tl-xs border border-gray-200 shadow-2xs text-xs whitespace-pre-wrap">
                          {ticketDetails?.message}
                        </div>
                      </div>
                    )}

                    {/* Messages List */}
                    {ticketDetails?.messages?.map((m: SupportMessageItem) => {
                      const isAgent = m.senderType === 'AGENT';

                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-1">
                            <span className="font-bold text-gray-700">{m.senderName}</span>
                            <span>•</span>
                            <span>{isAgent ? 'Support Agent' : `via ${m.channel}`}</span>
                            <span>•</span>
                            <span>
                              {new Date(m.createdAt).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div
                            className={`p-3.5 rounded-2xl text-xs max-w-xl whitespace-pre-wrap ${
                              isAgent
                                ? 'bg-[#3C3985] text-white rounded-tr-xs shadow-xs'
                                : 'bg-white text-gray-800 border border-gray-200 rounded-tl-xs shadow-2xs'
                            }`}
                          >
                            <p>{m.content}</p>

                            {isAgent && (
                              <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[9px] text-indigo-200">
                                {m.deliveryStatus === 'READ' ? (
                                  <>
                                    <CheckCheck className="w-3 h-3 text-sky-300" />
                                    <span>Read by customer</span>
                                  </>
                                ) : m.deliveryStatus === 'FAILED' ? (
                                  <>
                                    <AlertCircle className="w-3 h-3 text-rose-300" />
                                    <span className="text-rose-200 font-semibold">Delivery failed</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCheck className="w-3 h-3 text-emerald-300" />
                                    <span>
                                      Sent via {m.channel === 'EMAIL' ? 'Email (ZeptoMail)' : (m.channel || 'WhatsApp')}
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Bottom Reply Composer */}
              <div className="p-4 bg-white border-t border-gray-200 space-y-2 shrink-0">
                {replyFeedback && (
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>{replyFeedback}</span>
                  </div>
                )}

                {/* Reply Input Box */}
                <div className="relative">
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Type your reply to ${ticketDetails?.customerName || 'customer'}... (Press Enter to Send, Shift+Enter for new line)`}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#3C3985] resize-none"
                  />
                </div>

                {/* Canned Answers & Send Button */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  {/* Canned Quick Replies */}
                  <div className="flex items-center gap-1 overflow-x-auto text-[10px]">
                    <span className="text-gray-400 font-bold uppercase mr-1">Quick:</span>
                    {CANNED_RESPONSES.map((resp) => (
                      <button
                        key={resp.label}
                        type="button"
                        onClick={() => setReplyText((prev) => (prev ? `${prev} ${resp.text}` : resp.text))}
                        className="px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors shrink-0"
                      >
                        {resp.label}
                      </button>
                    ))}
                  </div>

                  {/* Send Button */}
                  <button
                    type="button"
                    disabled={sendingReply || !replyText.trim()}
                    onClick={handleSendReply}
                    className={`flex items-center gap-1.5 px-4 py-2 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all shadow-xs ${
                      ticketDetails?.channel === 'EMAIL'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : ticketDetails?.channel === 'APP'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                    title="Send Reply (Press Enter)"
                  >
                    {sendingReply ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : ticketDetails?.channel === 'EMAIL' ? (
                      <Mail className="w-3.5 h-3.5" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Send via {ticketDetails?.channel === 'APP' ? 'In-App' : ticketDetails?.channel === 'EMAIL' ? 'Email' : 'WhatsApp'} (Enter)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Client Profile & Ticket Properties (1 col) */}
            <div className="space-y-4">
              {/* Client Profile Card */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
                <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">
                  Client Profile
                </h3>

                <div className="flex items-center gap-3 pt-1">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500 to-[#3C3985] text-white flex items-center justify-center font-black text-sm">
                    {(ticketDetails?.customerName || ticketDetails?.userName || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 truncate">
                      {ticketDetails?.customerName || ticketDetails?.userName || 'Registered Client'}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-mono">
                      ID: {ticketDetails?.userId ? ticketDetails.userId.slice(0, 8) : 'Visitor'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-gray-600">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase">Mobile:</span>
                    <a
                      href={`https://wa.me/${(ticketDetails?.customerPhone || ticketDetails?.userMobile || '').replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <MessageCircle className="w-3 h-3 text-emerald-600" />
                      {ticketDetails?.customerPhone || ticketDetails?.userMobile || 'N/A'}
                    </a>
                  </div>

                  <div className="flex items-center justify-between text-gray-600">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase">Email:</span>
                    <span className="font-mono text-[11px] truncate max-w-[150px]">
                      {ticketDetails?.customerEmail || ticketDetails?.userEmail || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ticket Properties */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
                <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">
                  Ticket Details
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Status</label>
                    <select
                      value={ticketDetails?.status}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      disabled={updatingStatus}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:bg-white focus:outline-none focus:border-[#3C3985]"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_REVIEW">Under Review / Pending</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Channel</label>
                    <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {ticketDetails?.channel || 'WHATSAPP'}
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Assigned Agent</label>
                    <span className="text-gray-700 font-medium text-xs block truncate">
                      {ticketDetails?.assignedAgentName || currentAdmin?.email || 'Support Operations'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Internal Notes */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-2">
                <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">
                  Internal Resolution Notes
                </h3>
                <textarea
                  rows={3}
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Log internal KYC or technical notes..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#3C3985] resize-none"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(ticketDetails?.status || 'OPEN')}
                  disabled={!internalNote.trim() || updatingStatus}
                  className="w-full py-2 bg-gray-100 hover:bg-[#3C3985] hover:text-white disabled:opacity-40 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Save Internal Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
