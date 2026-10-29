'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/auth-context';
import {
  adminApi,
  AdminTeamMember,
  AdminInvitationItem,
  AdminRoleItem,
  AdminPermissionItem,
  IntegrationTestResult,
} from '@/lib/api';
import {
  Settings,
  Shield,
  Server,
  CheckCircle2,
  User,
  Key,
  UserPlus,
  Users,
  Mail,
  Phone,
  Trash2,
  Check,
  X,
  Bell,
  RefreshCw,
  Lock,
  Globe,
  Sliders,
  ShieldAlert,
  FileText,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  ChevronRight,
  Send,
  AlertTriangle,
  RotateCw,
  Plus,
  CheckSquare,
  Square,
} from 'lucide-react';

const TABS = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'team', label: 'Team Members', icon: Users },
  { id: 'roles', label: 'Roles & Permissions', icon: Shield },
  { id: 'security', label: 'Security Policies', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'API Integrations', icon: Server },
  { id: 'audit', label: 'Audit Settings', icon: FileText },
  { id: 'privacy', label: 'Data & Privacy', icon: Eye },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, hasPermission, isSuperAdmin } = useAdminAuth();

  const activeTab = searchParams.get('tab') || 'general';

  const setTab = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.replace(`/settings?${params.toString()}`);
  };

  // ==========================================
  // TAB 1: GENERAL SETTINGS
  // ==========================================
  const [generalSettings, setGeneralSettings] = useState<any>({
    platformName: 'TechArtha',
    registeredEntityName: 'TechArtha Fintech Solutions Pvt. Ltd.',
    contactEmail: 'support@techartha.com',
    contactPhone: '+91 83088 16023',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
    supportedLanguages: 'en,hi,mr,gu,ta,te,kn,bn',
  });
  const [loadingGeneral, setLoadingGeneral] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalSavedToast, setGeneralSavedToast] = useState(false);

  const fetchGeneralSettings = async () => {
    setLoadingGeneral(true);
    try {
      const data = await adminApi.getSettingsByCategory('general');
      if (data && Object.keys(data).length > 0) {
        setGeneralSettings((prev: any) => ({ ...prev, ...data }));
      }
    } catch {
      // Use defaults
    } finally {
      setLoadingGeneral(false);
    }
  };

  const saveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGeneral(true);
    try {
      await adminApi.updateSettingsCategory('general', generalSettings);
      setGeneralSavedToast(true);
      setTimeout(() => setGeneralSavedToast(false), 3000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setSavingGeneral(false);
    }
  };

  // ==========================================
  // TAB 2: TEAM MEMBERS & INVITATIONS
  // ==========================================
  const [teamMembers, setTeamMembers] = useState<AdminTeamMember[]>([]);
  const [invitations, setInvitations] = useState<AdminInvitationItem[]>([]);
  const [teamStats, setTeamStats] = useState({ totalActive: 0, totalSuspended: 0, totalPending: 0 });
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [teamRoleFilter, setTeamRoleFilter] = useState('');
  const [teamStatusFilter, setTeamStatusFilter] = useState('');

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('SUPPORT');
  const [inviteDepartment, setInviteDepartment] = useState('Support & Operations');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ message: string; link?: string } | null>(null);

  // Edit Role Modal
  const [editingMember, setEditingMember] = useState<AdminTeamMember | null>(null);
  const [newRole, setNewRole] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [updatingRole, setUpdatingRole] = useState(false);

  const fetchTeam = async () => {
    setLoadingTeam(true);
    try {
      const data = await adminApi.getTeamMembers({
        search: teamSearch,
        role: teamRoleFilter,
        status: teamStatusFilter,
      });
      setTeamMembers(data.members || []);
      setInvitations(data.invitations || []);
      setTeamStats({
        totalActive: data.totalActive || 0,
        totalSuspended: data.totalSuspended || 0,
        totalPending: data.totalPending || 0,
      });
    } catch (err) {
      console.error('Failed to load team', err);
    } finally {
      setLoadingTeam(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await adminApi.inviteMember({
        email: inviteEmail.trim(),
        name: inviteName.trim() || undefined,
        role: inviteRole,
        department: inviteDepartment,
        message: inviteMessage.trim() || undefined,
      });
      setInviteResult({ message: res.message, link: res.invitationLink });
      fetchTeam();
    } catch (err: any) {
      alert(`Failed to send invitation: ${err.message}`);
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvite = async (invitationId: string) => {
    try {
      const res = await adminApi.resendInvitation(invitationId);
      alert(res.message + (res.invitationLink ? `\nLink: ${res.invitationLink}` : ''));
      fetchTeam();
    } catch (err: any) {
      alert(`Failed to resend: ${err.message}`);
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    try {
      await adminApi.revokeInvitation(invitationId);
      fetchTeam();
    } catch (err: any) {
      alert(`Failed to revoke: ${err.message}`);
    }
  };

  const handleToggleMemberStatus = async (member: AdminTeamMember) => {
    const nextStatus = member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const actionLabel = nextStatus === 'SUSPENDED' ? 'suspend' : 'reactivate';
    if (!confirm(`Are you sure you want to ${actionLabel} ${member.name} (${member.email})?`)) return;

    try {
      await adminApi.updateMemberStatus(member.id, {
        status: nextStatus,
        reason: `Status changed to ${nextStatus} by administrator`,
      });
      fetchTeam();
    } catch (err: any) {
      alert(`Action blocked: ${err.message}`);
    }
  };

  const handleDeleteMember = async (member: AdminTeamMember) => {
    if (!confirm(`Are you sure you want to completely remove ${member.name} (${member.email})? This action cannot be undone.`)) return;
    try {
      await adminApi.deleteMember(member.id);
      fetchTeam();
    } catch (err: any) {
      alert(`Action blocked: ${err.message}`);
    }
  };

  const handleUpdateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !newRole) return;
    setUpdatingRole(true);
    try {
      await adminApi.updateMemberRole(editingMember.id, {
        role: newRole,
        department: newDepartment || editingMember.department,
      });
      setEditingMember(null);
      fetchTeam();
    } catch (err: any) {
      alert(`Failed to update role: ${err.message}`);
    } finally {
      setUpdatingRole(false);
    }
  };

  // ==========================================
  // TAB 3: ROLES & PERMISSIONS MATRIX
  // ==========================================
  const [roles, setRoles] = useState<AdminRoleItem[]>([]);
  const [allPermissions, setAllPermissions] = useState<AdminPermissionItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [savingRolePerms, setSavingRolePerms] = useState(false);
  const [rolePermsSavedToast, setRolePermsSavedToast] = useState(false);

  // Custom Role Creator Modal
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [customRoleName, setCustomRoleName] = useState('');
  const [customRoleDesc, setCustomRoleDesc] = useState('');
  const [creatingRole, setCreatingRole] = useState(false);

  const fetchRolesAndPermissions = async () => {
    setLoadingRoles(true);
    try {
      const [rData, pData] = await Promise.all([
        adminApi.getAllRoles(),
        adminApi.getAllPermissions(),
      ]);
      const validRoles = Array.isArray(rData) ? rData : [];
      const validPerms = Array.isArray(pData)
        ? pData
        : Array.isArray((pData as any)?.permissions)
        ? (pData as any).permissions
        : [];
      setRoles(validRoles);
      setAllPermissions(validPerms);
      if (validRoles.length > 0 && !selectedRoleId) {
        setSelectedRoleId(validRoles[0].id);
        setRolePermissions(validRoles[0].permissions || []);
      }
    } catch (err) {
      console.error('Failed to load roles and permissions', err);
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleSelectRole = (role: AdminRoleItem) => {
    setSelectedRoleId(role.id);
    setRolePermissions(role.permissions || []);
  };

  const togglePermission = (slug: string) => {
    const activeRole = roles.find((r) => r.id === selectedRoleId);
    if (activeRole?.name === 'SUPER_ADMIN') return; // Cannot edit super admin wildcard

    setRolePermissions((prev) =>
      prev.includes(slug) ? prev.filter((p) => p !== slug) : [...prev, slug],
    );
  };

  const toggleModulePermissions = (module: string, permSlugs: string[]) => {
    const activeRole = roles.find((r) => r.id === selectedRoleId);
    if (activeRole?.name === 'SUPER_ADMIN') return;

    const allSelected = permSlugs.every((slug) => rolePermissions.includes(slug));
    if (allSelected) {
      setRolePermissions((prev) => prev.filter((p) => !permSlugs.includes(p)));
    } else {
      const unique = Array.from(new Set([...rolePermissions, ...permSlugs]));
      setRolePermissions(unique);
    }
  };

  const handleSaveRolePermissions = async () => {
    const activeRole = roles.find((r) => r.id === selectedRoleId);
    if (!activeRole || activeRole.name === 'SUPER_ADMIN') return;

    setSavingRolePerms(true);
    try {
      await adminApi.updateCustomRole(activeRole.id, {
        permissions: rolePermissions,
      });
      setRolePermsSavedToast(true);
      setTimeout(() => setRolePermsSavedToast(false), 3000);
      fetchRolesAndPermissions();
    } catch (err: any) {
      alert(`Failed to save role permissions: ${err.message}`);
    } finally {
      setSavingRolePerms(false);
    }
  };

  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRoleName.trim()) return;
    setCreatingRole(true);
    try {
      const newRole = await adminApi.createCustomRole({
        name: customRoleName.trim().toUpperCase().replace(/\s+/g, '_'),
        description: customRoleDesc.trim(),
        permissions: rolePermissions,
      });
      setShowCreateRoleModal(false);
      setCustomRoleName('');
      setCustomRoleDesc('');
      await fetchRolesAndPermissions();
      setSelectedRoleId(newRole.id);
      setRolePermissions(newRole.permissions || []);
    } catch (err: any) {
      alert(`Failed to create custom role: ${err.message}`);
    } finally {
      setCreatingRole(false);
    }
  };

  // Group permissions by module
  const safePermissionsList = Array.isArray(allPermissions) ? allPermissions : [];
  const permissionsByModule = safePermissionsList.reduce((acc, perm) => {
    const mod = perm.module || 'general';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(perm);
    return acc;
  }, {} as Record<string, AdminPermissionItem[]>);

  // ==========================================
  // TAB 4: SECURITY POLICIES
  // ==========================================
  const [securitySettings, setSecuritySettings] = useState<any>({
    sessionTimeoutMinutes: 60,
    maxFailedLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    passwordExpiryDays: 90,
    requireMfa: false,
    invitationExpiryHours: 24,
    enforceStrongPasswords: true,
  });
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [securitySavedToast, setSecuritySavedToast] = useState(false);

  const fetchSecuritySettings = async () => {
    try {
      const data = await adminApi.getSettingsByCategory('security');
      if (data && Object.keys(data).length > 0) {
        setSecuritySettings((prev: any) => ({ ...prev, ...data }));
      }
    } catch {}
  };

  const saveSecuritySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSecurity(true);
    try {
      await adminApi.updateSettingsCategory('security', securitySettings);
      setSecuritySavedToast(true);
      setTimeout(() => setSecuritySavedToast(false), 3000);
    } catch (err: any) {
      alert(`Failed to save security settings: ${err.message}`);
    } finally {
      setSavingSecurity(false);
    }
  };

  // ==========================================
  // TAB 5: NOTIFICATION SETTINGS
  // ==========================================
  const [notificationSettings, setNotificationSettings] = useState<any>({
    alertOnSupportTickets: true,
    alertOnKycEscalations: true,
    dailyOperationsDigest: true,
    recipientEmails: 'ops@techartha.com, support@techartha.com',
  });
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [notificationsSavedToast, setNotificationsSavedToast] = useState(false);

  const fetchNotificationSettings = async () => {
    try {
      const data = await adminApi.getSettingsByCategory('notifications');
      if (data && Object.keys(data).length > 0) {
        setNotificationSettings((prev: any) => ({ ...prev, ...data }));
      }
    } catch {}
  };

  const saveNotificationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNotifications(true);
    try {
      await adminApi.updateSettingsCategory('notifications', notificationSettings);
      setNotificationsSavedToast(true);
      setTimeout(() => setNotificationsSavedToast(false), 3000);
    } catch (err: any) {
      alert(`Failed to save notification settings: ${err.message}`);
    } finally {
      setSavingNotifications(false);
    }
  };

  // ==========================================
  // TAB 6: INTEGRATION SETTINGS
  // ==========================================
  const [integrations, setIntegrations] = useState<any>({
    resendApiKey: '',
    resendFromEmail: 'support@techartha.com',
    interaktApiKey: '',
    interaktPhoneNumber: '+91 83088 16023',
    cybrillaClientId: '',
    cybrillaSecret: '',
    bseMemberCode: '',
    bseUserId: '',
  });
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, IntegrationTestResult>>({});
  const [savingIntegrations, setSavingIntegrations] = useState(false);
  const [integrationsSavedToast, setIntegrationsSavedToast] = useState(false);

  const fetchIntegrations = async () => {
    try {
      const data = await adminApi.getSettingsByCategory('integrations');
      if (data && Object.keys(data).length > 0) {
        setIntegrations((prev: any) => ({ ...prev, ...data }));
      }
    } catch {}
  };

  const handleTestIntegration = async (provider: string) => {
    setTestingProvider(provider);
    try {
      const res = await adminApi.testIntegrationConnection(provider);
      setTestResults((prev) => ({ ...prev, [provider]: res }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: {
          provider,
          status: 'FAILED',
          message: err.message,
          timestamp: new Date().toISOString(),
        },
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const saveIntegrations = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingIntegrations(true);
    try {
      await adminApi.updateSettingsCategory('integrations', integrations);
      setIntegrationsSavedToast(true);
      setTimeout(() => setIntegrationsSavedToast(false), 3000);
    } catch (err: any) {
      alert(`Failed to save integrations: ${err.message}`);
    } finally {
      setSavingIntegrations(false);
    }
  };

  // ==========================================
  // TAB 7: AUDIT SETTINGS
  // ==========================================
  const [auditSettings, setAuditSettings] = useState<any>({
    retentionDays: 1825, // 5 years SEBI compliance
    logIpAddresses: true,
    logPiiAccess: true,
    alertOnPrivilegeEscalation: true,
  });
  const [savingAudit, setSavingAudit] = useState(false);
  const [auditSavedToast, setAuditSavedToast] = useState(false);

  const fetchAuditSettings = async () => {
    try {
      const data = await adminApi.getSettingsByCategory('audit');
      if (data && Object.keys(data).length > 0) {
        setAuditSettings((prev: any) => ({ ...prev, ...data }));
      }
    } catch {}
  };

  const saveAuditSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAudit(true);
    try {
      await adminApi.updateSettingsCategory('audit', auditSettings);
      setAuditSavedToast(true);
      setTimeout(() => setAuditSavedToast(false), 3000);
    } catch (err: any) {
      alert(`Failed to save audit settings: ${err.message}`);
    } finally {
      setSavingAudit(false);
    }
  };

  // ==========================================
  // TAB 8: DATA & PRIVACY
  // ==========================================
  const [privacySettings, setPrivacySettings] = useState<any>({
    maskSupportPii: true,
    maskOperationsPii: false,
    consentRetentionYears: 7,
    allowDataErasure: false,
  });
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [privacySavedToast, setPrivacySavedToast] = useState(false);

  const fetchPrivacySettings = async () => {
    try {
      const data = await adminApi.getSettingsByCategory('privacy');
      if (data && Object.keys(data).length > 0) {
        setPrivacySettings((prev: any) => ({ ...prev, ...data }));
      }
    } catch {}
  };

  const savePrivacySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrivacy(true);
    try {
      await adminApi.updateSettingsCategory('privacy', privacySettings);
      setPrivacySavedToast(true);
      setTimeout(() => setPrivacySavedToast(false), 3000);
    } catch (err: any) {
      alert(`Failed to save privacy settings: ${err.message}`);
    } finally {
      setSavingPrivacy(false);
    }
  };

  // Load active tab data on mount or change
  useEffect(() => {
    if (activeTab === 'general') fetchGeneralSettings();
    if (activeTab === 'team') fetchTeam();
    if (activeTab === 'roles') fetchRolesAndPermissions();
    if (activeTab === 'security') fetchSecuritySettings();
    if (activeTab === 'notifications') fetchNotificationSettings();
    if (activeTab === 'integrations') fetchIntegrations();
    if (activeTab === 'audit') fetchAuditSettings();
    if (activeTab === 'privacy') fetchPrivacySettings();
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#3C3985] uppercase tracking-wider mb-1">
            <Sliders className="w-4 h-4" />
            <span>Institutional Governance</span>
          </div>
          <h1 className="text-2xl font-black text-[#102A54] tracking-tight">
            System Settings & Access Control
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage institutional configurations, team members, role-based access control, and integration credentials.
          </p>
        </div>

        {activeTab === 'team' && (
          <button
            onClick={() => {
              setInviteResult(null);
              setShowInviteModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#3C3985] hover:bg-[#2F2C6E] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Team Member</span>
          </button>
        )}

        {activeTab === 'roles' && (
          <button
            onClick={() => setShowCreateRoleModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#3C3985] hover:bg-[#2F2C6E] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom Role</span>
          </button>
        )}
      </div>

      {/* Sub-tab Navigation */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-1.5 shadow-2xs overflow-x-auto flex items-center gap-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-[#3C3985] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: GENERAL SETTINGS                                   */}
      {/* ========================================================= */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-2xs p-6 md:p-8 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-base font-black text-[#102A54]">General Platform Profile</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Entity registration, primary contact details, and localization defaults.
            </p>
          </div>

          {generalSavedToast && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>General settings updated and applied successfully!</span>
            </div>
          )}

          <form onSubmit={saveGeneralSettings} className="space-y-5 text-xs max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Platform Brand Name</label>
                <input
                  type="text"
                  required
                  value={generalSettings.platformName}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, platformName: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Registered Entity Legal Name</label>
                <input
                  type="text"
                  required
                  value={generalSettings.registeredEntityName}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, registeredEntityName: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Primary Support Email</label>
                <input
                  type="email"
                  required
                  value={generalSettings.contactEmail}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, contactEmail: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Support Helpline Phone</label>
                <input
                  type="text"
                  required
                  value={generalSettings.contactPhone}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, contactPhone: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Default Timezone</label>
                <input
                  type="text"
                  disabled
                  value={generalSettings.timezone}
                  className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-xl font-mono text-gray-600"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Default Base Currency</label>
                <input
                  type="text"
                  disabled
                  value={generalSettings.currency}
                  className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-xl font-mono text-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">
                Supported Vernacular Languages (ISO-639)
              </label>
              <input
                type="text"
                value={generalSettings.supportedLanguages}
                onChange={(e) => setGeneralSettings({ ...generalSettings, supportedLanguages: e.target.value })}
                placeholder="en,hi,mr,gu,ta,te,kn,bn"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:border-[#3C3985]"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Comma-separated ISO language codes enabled across mobile app and investor onboarding.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingGeneral}
                className="px-6 py-2.5 bg-[#3C3985] hover:bg-[#2F2C6E] text-white font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {savingGeneral ? 'Saving Changes...' : 'Save General Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: TEAM MEMBERS & INVITATIONS                         */}
      {/* ========================================================= */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Staff</p>
                <p className="text-xl font-black text-gray-900 mt-0.5">{teamStats.totalActive}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Pending Invites</p>
                <p className="text-xl font-black text-amber-600 mt-0.5">{teamStats.totalPending}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Mail className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Suspended Accounts</p>
                <p className="text-xl font-black text-rose-600 mt-0.5">{teamStats.totalSuspended}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-[#102A54]">Active & Registered Team Members</h3>
                <p className="text-xs text-gray-400">Team members with configured administrative credentials.</p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchTeam()}
                  className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#3C3985]"
                />
                <button
                  onClick={fetchTeam}
                  className="p-2 text-gray-500 hover:text-gray-800 bg-gray-50 rounded-xl border border-gray-200"
                  title="Refresh list"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-5">Member</th>
                    <th className="py-3 px-5">Role</th>
                    <th className="py-3 px-5">Department</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Last Login</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {loadingTeam ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-400">
                        <div className="w-5 h-5 border-2 border-[#3C3985]/20 border-t-[#3C3985] rounded-full animate-spin mx-auto mb-2" />
                        <span>Loading team members...</span>
                      </td>
                    </tr>
                  ) : teamMembers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-400">
                        No team members found.
                      </td>
                    </tr>
                  ) : (
                    teamMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#3C3985]/10 text-[#3C3985] font-black text-xs flex items-center justify-center shrink-0">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{member.name}</p>
                              <p className="text-[11px] text-gray-400">{member.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-5">
                          <span
                            className={`px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
                              member.role === 'SUPER_ADMIN'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : member.role === 'ADMIN'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : member.role === 'SUPPORT'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : member.role === 'OPERATIONS'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-gray-100 text-gray-800 border-gray-200'
                            }`}
                          >
                            {member.role.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-gray-600">{member.department}</td>

                        <td className="py-3.5 px-5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              member.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {member.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-gray-400 font-mono text-[11px]">
                          {member.lastLoginAt
                            ? new Date(member.lastLoginAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Never'}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingMember(member);
                                setNewRole(member.role);
                                setNewDepartment(member.department);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-gray-700 hover:text-[#3C3985] hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                            >
                              Edit Role
                            </button>

                            <button
                              onClick={() => handleToggleMemberStatus(member)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors border ${
                                member.status === 'ACTIVE'
                                  ? 'text-amber-700 hover:bg-amber-50 border-amber-200'
                                  : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                              }`}
                            >
                              {member.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                            </button>

                            <button
                              onClick={() => handleDeleteMember(member)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Invitations Section */}
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-base font-black text-[#102A54]">Pending Account Invitations</h3>
              <p className="text-xs text-gray-400">
                Single-use invitations dispatched to new team members. Links expire after 24 hours.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-5">Recipient Email</th>
                    <th className="py-3 px-5">Designated Role</th>
                    <th className="py-3 px-5">Department</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Expires At</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {invitations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        No pending invitations. Click <strong>"Invite Team Member"</strong> to send one.
                      </td>
                    </tr>
                  ) : (
                    invitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-5 font-bold text-gray-900">{inv.email}</td>
                        <td className="py-3.5 px-5">
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-indigo-50 text-[#3C3985] border border-indigo-200 uppercase">
                            {inv.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-gray-600">{inv.department}</td>
                        <td className="py-3.5 px-5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-gray-400 font-mono text-[11px]">
                          {new Date(inv.expiresAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleResendInvite(inv.id)}
                              className="px-2.5 py-1 text-[11px] font-bold text-[#3C3985] hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100"
                            >
                              Resend
                            </button>
                            <button
                              onClick={() => handleRevokeInvite(inv.id)}
                              className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100"
                            >
                              Revoke
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: ROLES & PERMISSIONS MATRIX                         */}
      {/* ========================================================= */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-2xs p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-black text-[#102A54]">Roles & Granular Permissions</h3>
                <p className="text-xs text-gray-400">
                  Select a role on the left to inspect and configure its backend-enforced permissions.
                </p>
              </div>

              {roles.find((r) => r.id === selectedRoleId)?.name !== 'SUPER_ADMIN' && (
                <button
                  onClick={handleSaveRolePermissions}
                  disabled={savingRolePerms}
                  className="px-4 py-2 bg-[#3C3985] hover:bg-[#2F2C6E] text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {savingRolePerms ? 'Saving Permissions...' : 'Save Permissions Matrix'}
                </button>
              )}
            </div>

            {rolePermsSavedToast && (
              <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Role permissions matrix saved successfully!</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
              {/* Role List */}
              <div className="lg:col-span-1 space-y-1.5 border-r border-gray-100 pr-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  System & Custom Roles ({roles.length})
                </p>
                {roles.map((r) => {
                  const isSelected = r.id === selectedRoleId;
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleSelectRole(r)}
                      className={`w-full text-left p-3 rounded-2xl transition-all border ${
                        isSelected
                          ? 'bg-[#3C3985] text-white border-[#3C3985] shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200/80 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{r.name.replace('_', ' ')}</span>
                        {r.isSystem && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            System
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[10px] mt-0.5 truncate ${
                          isSelected ? 'text-indigo-100' : 'text-gray-400'
                        }`}
                      >
                        {r.description || 'No description provided'}
                      </p>
                      <p
                        className={`text-[9px] mt-1 font-mono ${
                          isSelected ? 'text-indigo-200' : 'text-gray-400'
                        }`}
                      >
                        {r.userCount || 0} active member{r.userCount === 1 ? '' : 's'}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Permissions Matrix */}
              <div className="lg:col-span-3 space-y-6">
                {(() => {
                  const activeRole = roles.find((r) => r.id === selectedRoleId);
                  const isSuperAdminRole = activeRole?.name === 'SUPER_ADMIN';

                  if (isSuperAdminRole) {
                    return (
                      <div className="p-6 rounded-2xl bg-purple-50/70 border border-purple-100 text-center space-y-2">
                        <Shield className="w-8 h-8 text-purple-700 mx-auto" />
                        <h4 className="text-sm font-bold text-purple-900">Unrestricted Wildcard Access</h4>
                        <p className="text-xs text-purple-700 max-w-lg mx-auto">
                          The <strong>SUPER_ADMIN</strong> role holds permanent wildcard (<code>*</code>) permissions across all API routes, database models, team management, and compliance operations.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      {Object.entries(permissionsByModule).map(([module, perms]) => {
                        const permSlugs = perms.map((p) => p.slug);
                        const allSelected = permSlugs.every((slug) => rolePermissions.includes(slug));

                        return (
                          <div
                            key={module}
                            className="bg-gray-50/60 rounded-2xl border border-gray-200/80 p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                              <span className="font-bold text-xs text-gray-900 uppercase tracking-wider">
                                {module.replace('_', ' ')} Module
                              </span>
                              <button
                                type="button"
                                onClick={() => toggleModulePermissions(module, permSlugs)}
                                className="text-[11px] font-bold text-[#3C3985] hover:underline"
                              >
                                {allSelected ? 'Deselect All' : 'Select All'}
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              {perms.map((p) => {
                                const isChecked = rolePermissions.includes(p.slug);
                                return (
                                  <label
                                    key={p.slug}
                                    onClick={() => togglePermission(p.slug)}
                                    className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                                      isChecked
                                        ? 'bg-white border-[#3C3985]/40 shadow-2xs'
                                        : 'bg-white/50 border-gray-200 hover:bg-white'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {}}
                                      className="mt-0.5 rounded text-[#3C3985] focus:ring-[#3C3985]"
                                    />
                                    <div>
                                      <p className="text-xs font-bold text-gray-900">{p.name}</p>
                                      <p className="text-[10px] text-gray-400 font-mono">{p.slug}</p>
                                      {p.description && (
                                        <p className="text-[10px] text-gray-500 mt-0.5">{p.description}</p>
                                      )}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: SECURITY POLICIES                                  */}
      {/* ========================================================= */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-2xs p-6 md:p-8 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-base font-black text-[#102A54]">Authentication & Session Governance</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Enforce enterprise security thresholds for staff sessions and credential rotation.
            </p>
          </div>

          {securitySavedToast && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Security policies saved successfully!</span>
            </div>
          )}

          <form onSubmit={saveSecuritySettings} className="space-y-5 text-xs max-w-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Session Inactivity Timeout (Minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="1440"
                  value={securitySettings.sessionTimeoutMinutes}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      sessionTimeoutMinutes: Number(e.target.value),
                    })
                  }
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Max Failed Login Attempts
                </label>
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={securitySettings.maxFailedLoginAttempts}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      maxFailedLoginAttempts: Number(e.target.value),
                    })
                  }
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Password Expiry Interval (Days)
                </label>
                <input
                  type="number"
                  min="30"
                  max="365"
                  value={securitySettings.passwordExpiryDays}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      passwordExpiryDays: Number(e.target.value),
                    })
                  }
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Invitation Link Validity (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="72"
                  value={securitySettings.invitationExpiryHours}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      invitationExpiryHours: Number(e.target.value),
                    })
                  }
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={securitySettings.enforceStrongPasswords}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      enforceStrongPasswords: e.target.checked,
                    })
                  }
                  className="rounded text-[#3C3985] focus:ring-[#3C3985]"
                />
                <span className="text-gray-700 font-bold">
                  Enforce strict fintech password policy (Min 8 chars, Upper, Lower, Number & Symbol)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={securitySettings.requireMfa}
                  onChange={(e) =>
                    setSecuritySettings({ ...securitySettings, requireMfa: e.target.checked })
                  }
                  className="rounded text-[#3C3985] focus:ring-[#3C3985]"
                />
                <span className="text-gray-700 font-bold">
                  Require Multi-Factor Authentication (MFA) for administrative roles
                </span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSecurity}
                className="px-6 py-2.5 bg-[#3C3985] hover:bg-[#2F2C6E] text-white font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {savingSecurity ? 'Saving Security Policies...' : 'Save Security Policies'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: NOTIFICATION SETTINGS                              */}
      {/* ========================================================= */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-2xs p-6 md:p-8 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-base font-black text-[#102A54]">Operational Alert Routing</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure automated notifications for customer queries, KYC manual reviews, and daily reports.
            </p>
          </div>

          {notificationsSavedToast && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Notification routing rules updated!</span>
            </div>
          )}

          <form onSubmit={saveNotificationSettings} className="space-y-5 text-xs max-w-2xl">
            <div className="space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl border border-gray-200/80 bg-gray-50/50">
                <input
                  type="checkbox"
                  checked={notificationSettings.alertOnSupportTickets}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      alertOnSupportTickets: e.target.checked,
                    })
                  }
                  className="rounded text-[#3C3985] focus:ring-[#3C3985]"
                />
                <div>
                  <p className="font-bold text-gray-900">High-Priority Support Ticket Alerts</p>
                  <p className="text-[11px] text-gray-500">
                    Send instantaneous email dispatch when investor submits critical issue.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl border border-gray-200/80 bg-gray-50/50">
                <input
                  type="checkbox"
                  checked={notificationSettings.alertOnKycEscalations}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      alertOnKycEscalations: e.target.checked,
                    })
                  }
                  className="rounded text-[#3C3985] focus:ring-[#3C3985]"
                />
                <div>
                  <p className="font-bold text-gray-900">KYC Manual Review Escalations</p>
                  <p className="text-[11px] text-gray-500">
                    Notify compliance operations when HyperVerge flags document or face liveness mismatch.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl border border-gray-200/80 bg-gray-50/50">
                <input
                  type="checkbox"
                  checked={notificationSettings.dailyOperationsDigest}
                  onChange={(e) =>
                    setNotificationSettings({
                      ...notificationSettings,
                      dailyOperationsDigest: e.target.checked,
                    })
                  }
                  className="rounded text-[#3C3985] focus:ring-[#3C3985]"
                />
                <div>
                  <p className="font-bold text-gray-900">Daily Operations Summary Digest</p>
                  <p className="text-[11px] text-gray-500">
                    Summarize AUM inflows, new investor registrations, and pending orders every 09:00 AM IST.
                  </p>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">
                Recipient Notification Addresses (Comma-Separated)
              </label>
              <input
                type="text"
                value={notificationSettings.recipientEmails}
                onChange={(e) =>
                  setNotificationSettings({
                    ...notificationSettings,
                    recipientEmails: e.target.value,
                  })
                }
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingNotifications}
                className="px-6 py-2.5 bg-[#3C3985] hover:bg-[#2F2C6E] text-white font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {savingNotifications ? 'Saving...' : 'Save Notification Rules'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: INTEGRATION SETTINGS                               */}
      {/* ========================================================= */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200/80 shadow-2xs p-6 md:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-black text-[#102A54]">Platform Microservice Integrations</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage API keys, gateway webhooks, and live connectivity for communication and exchange providers.
                </p>
              </div>

              <button
                onClick={saveIntegrations}
                disabled={savingIntegrations}
                className="px-5 py-2.5 bg-[#3C3985] hover:bg-[#2F2C6E] text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {savingIntegrations ? 'Saving Credentials...' : 'Save API Credentials'}
              </button>
            </div>

            {integrationsSavedToast && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Integration credentials updated successfully!</span>
              </div>
            )}

            {/* Provider Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Provider 1: Resend */}
              <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-bold">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Resend (Email Gateway)</h4>
                      <p className="text-[10px] text-gray-400">Transactional invitations and alert emails</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTestIntegration('resend')}
                    disabled={testingProvider === 'resend'}
                    className="px-3 py-1 bg-white hover:bg-gray-100 border border-gray-200 font-bold rounded-lg transition-colors text-[11px]"
                  >
                    {testingProvider === 'resend' ? 'Pinging...' : 'Test Connection'}
                  </button>
                </div>

                {testResults['resend'] && (
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] font-bold ${
                      testResults['resend'].status === 'CONNECTED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {testResults['resend'].message}
                  </div>
                )}

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Resend API Key</label>
                  <input
                    type="password"
                    placeholder="re_..."
                    value={integrations.resendApiKey || ''}
                    onChange={(e) => setIntegrations({ ...integrations, resendApiKey: e.target.value })}
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">From Email Address</label>
                  <input
                    type="text"
                    value={integrations.resendFromEmail || ''}
                    onChange={(e) => setIntegrations({ ...integrations, resendFromEmail: e.target.value })}
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              {/* Provider 2: Interakt WhatsApp */}
              <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Interakt (WhatsApp BSP)</h4>
                      <p className="text-[10px] text-gray-400">Two-way investor communication and alerts</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTestIntegration('interakt')}
                    disabled={testingProvider === 'interakt'}
                    className="px-3 py-1 bg-white hover:bg-gray-100 border border-gray-200 font-bold rounded-lg transition-colors text-[11px]"
                  >
                    {testingProvider === 'interakt' ? 'Pinging...' : 'Test Connection'}
                  </button>
                </div>

                {testResults['interakt'] && (
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] font-bold ${
                      testResults['interakt'].status === 'CONNECTED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {testResults['interakt'].message}
                  </div>
                )}

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Interakt API Key</label>
                  <input
                    type="password"
                    placeholder="Enter secret key..."
                    value={integrations.interaktApiKey || ''}
                    onChange={(e) => setIntegrations({ ...integrations, interaktApiKey: e.target.value })}
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">WhatsApp Business Phone</label>
                  <input
                    type="text"
                    value={integrations.interaktPhoneNumber || ''}
                    onChange={(e) => setIntegrations({ ...integrations, interaktPhoneNumber: e.target.value })}
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl font-medium"
                  />
                </div>
              </div>

              {/* Provider 3: Cybrilla */}
              <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Cybrilla Fintech Core</h4>
                      <p className="text-[10px] text-gray-400">Order routing, investor accounts & mandates</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTestIntegration('cybrilla')}
                    disabled={testingProvider === 'cybrilla'}
                    className="px-3 py-1 bg-white hover:bg-gray-100 border border-gray-200 font-bold rounded-lg transition-colors text-[11px]"
                  >
                    {testingProvider === 'cybrilla' ? 'Pinging...' : 'Test Connection'}
                  </button>
                </div>

                {testResults['cybrilla'] && (
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] font-bold ${
                      testResults['cybrilla'].status === 'CONNECTED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {testResults['cybrilla'].message}
                  </div>
                )}

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Client ID</label>
                  <input
                    type="text"
                    value={integrations.cybrillaClientId || ''}
                    onChange={(e) => setIntegrations({ ...integrations, cybrillaClientId: e.target.value })}
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Client Secret</label>
                  <input
                    type="password"
                    value={integrations.cybrillaSecret || ''}
                    onChange={(e) => setIntegrations({ ...integrations, cybrillaSecret: e.target.value })}
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Provider 4: BSE StAR MF */}
              <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-700 text-white flex items-center justify-center font-bold">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">BSE StAR MF Gateway</h4>
                      <p className="text-[10px] text-gray-400">Exchange UCC registration & order execution</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTestIntegration('bse')}
                    disabled={testingProvider === 'bse'}
                    className="px-3 py-1 bg-white hover:bg-gray-100 border border-gray-200 font-bold rounded-lg transition-colors text-[11px]"
                  >
                    {testingProvider === 'bse' ? 'Pinging...' : 'Test Connection'}
                  </button>
                </div>

                {testResults['bse'] && (
                  <div
                    className={`p-2.5 rounded-xl border text-[11px] font-bold ${
                      testResults['bse'].status === 'CONNECTED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {testResults['bse'].message}
                  </div>
                )}

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Member Code</label>
                  <input
                    type="text"
                    value={integrations.bseMemberCode || ''}
                    onChange={(e) => setIntegrations({ ...integrations, bseMemberCode: e.target.value })}
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">BSE User ID</label>
                  <input
                    type="text"
                    value={integrations.bseUserId || ''}
                    onChange={(e) => setIntegrations({ ...integrations, bseUserId: e.target.value })}
                    className="w-full p-2 bg-white border border-gray-200 rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 7: AUDIT SETTINGS                                     */}
      {/* ========================================================= */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-2xs p-6 md:p-8 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-base font-black text-[#102A54]">SEBI Audit Trail & Log Archival</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Regulatory compliance retention policies for immutable administrative action logs.
            </p>
          </div>

          {auditSavedToast && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Audit configuration saved!</span>
            </div>
          )}

          <form onSubmit={saveAuditSettings} className="space-y-5 text-xs max-w-2xl">
            <div>
              <label className="block text-gray-700 font-bold mb-1">
                Audit Trail Retention Horizon (Days)
              </label>
              <input
                type="number"
                min="365"
                max="3650"
                value={auditSettings.retentionDays}
                onChange={(e) =>
                  setAuditSettings({ ...auditSettings, retentionDays: Number(e.target.value) })
                }
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Recommended 1825 days (5 years) to fulfill SEBI Master Circular for Investment Intermediaries.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={auditSettings.logIpAddresses}
                  onChange={(e) =>
                    setAuditSettings({ ...auditSettings, logIpAddresses: e.target.checked })
                  }
                  className="rounded text-[#3C3985] focus:ring-[#3C3985]"
                />
                <span className="text-gray-700 font-bold">
                  Capture client IP address and user-agent on every administrative request
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={auditSettings.logPiiAccess}
                  onChange={(e) =>
                    setAuditSettings({ ...auditSettings, logPiiAccess: e.target.checked })
                  }
                  className="rounded text-[#3C3985] focus:ring-[#3C3985]"
                />
                <span className="text-gray-700 font-bold">
                  Explicitly record audit event whenever staff unmasks sensitive investor PII (PAN/Bank)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={auditSettings.alertOnPrivilegeEscalation}
                  onChange={(e) =>
                    setAuditSettings({
                      ...auditSettings,
                      alertOnPrivilegeEscalation: e.target.checked,
                    })
                  }
                  className="rounded text-[#3C3985] focus:ring-[#3C3985]"
                />
                <span className="text-gray-700 font-bold">
                  Flag immediate security alert if staff role modification or privilege escalation occurs
                </span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingAudit}
                className="px-6 py-2.5 bg-[#3C3985] hover:bg-[#2F2C6E] text-white font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {savingAudit ? 'Saving...' : 'Save Audit Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 8: DATA & PRIVACY                                     */}
      {/* ========================================================= */}
      {activeTab === 'privacy' && (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-2xs p-6 md:p-8 space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-base font-black text-[#102A54]">Data Protection & PII Masking</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              DPDP Act 2023 compliance controls for investor personally identifiable information.
            </p>
          </div>

          {privacySavedToast && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Data privacy rules saved successfully!</span>
            </div>
          )}

          <form onSubmit={savePrivacySettings} className="space-y-5 text-xs max-w-2xl">
            <div className="space-y-3">
              <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl border border-gray-200/80 bg-gray-50/50">
                <input
                  type="checkbox"
                  checked={privacySettings.maskSupportPii}
                  onChange={(e) =>
                    setPrivacySettings({ ...privacySettings, maskSupportPii: e.target.checked })
                  }
                  className="rounded text-[#3C3985] focus:ring-[#3C3985]"
                />
                <div>
                  <p className="font-bold text-gray-900">Enforce Strict PII Masking for Support Accounts</p>
                  <p className="text-[11px] text-gray-500">
                    Hides phone, email, PAN, and bank accounts for technical support staff (e.g. <code>+91 98*** **210</code>).
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl border border-gray-200/80 bg-gray-50/50">
                <input
                  type="checkbox"
                  checked={privacySettings.maskOperationsPii}
                  onChange={(e) =>
                    setPrivacySettings({
                      ...privacySettings,
                      maskOperationsPii: e.target.checked,
                    })
                  }
                  className="rounded text-[#3C3985] focus:ring-[#3C3985]"
                />
                <div>
                  <p className="font-bold text-gray-900">Enforce PII Masking for Operations Role</p>
                  <p className="text-[11px] text-gray-500">
                    Requires operations personnel to click explicit unmask toggle with mandatory audit logging.
                  </p>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">
                Investor Consent Record Retention (Years)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={privacySettings.consentRetentionYears}
                onChange={(e) =>
                  setPrivacySettings({
                    ...privacySettings,
                    consentRetentionYears: Number(e.target.value),
                  })
                }
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPrivacy}
                className="px-6 py-2.5 bg-[#3C3985] hover:bg-[#2F2C6E] text-white font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {savingPrivacy ? 'Saving...' : 'Save Privacy Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: INVITE TEAM MEMBER                                 */}
      {/* ========================================================= */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#102A54]">Invite Operations Member</h3>
                <p className="text-xs text-gray-400">Generate a cryptographically signed single-use invitation.</p>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {inviteResult ? (
              <div className="p-6 space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-gray-900">Invitation Generated!</h4>
                <p className="text-xs text-gray-500">{inviteResult.message}</p>

                {inviteResult.link && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-left">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Direct Activation Link:
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteResult.link}
                        className="w-full text-xs font-mono p-1.5 bg-white border border-gray-200 rounded-lg"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(inviteResult.link!);
                          alert('Invitation link copied to clipboard!');
                        }}
                        className="p-2 bg-[#3C3985] text-white rounded-lg hover:bg-[#2F2C6E]"
                        title="Copy Link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleInviteSubmit} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Corporate Email Address *</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. priya.ops@techartha.com"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Full Name (Optional)</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Department</label>
                  <select
                    value={inviteDepartment}
                    onChange={(e) => setInviteDepartment(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
                  >
                    <option value="Support & Operations">Support & Operations</option>
                    <option value="Customer Experience">Customer Experience</option>
                    <option value="Investment Operations">Investment Operations</option>
                    <option value="Finance & Accounts">Finance & Accounts</option>
                    <option value="Legal & Compliance">Legal & Compliance</option>
                    <option value="Executive Management">Executive Management</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Assigned Institutional Role *</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
                  >
                    {isSuperAdmin && <option value="SUPER_ADMIN">SUPER_ADMIN (Full Wildcard Access)</option>}
                    <option value="ADMIN">ADMIN (Platform Administrator)</option>
                    <option value="SUPPORT">SUPPORT (Support Desk & Masked PII)</option>
                    <option value="OPERATIONS">OPERATIONS (KYC & Order Processing)</option>
                    <option value="FINANCE">FINANCE (Payouts & Reconciliations)</option>
                    <option value="COMPLIANCE">COMPLIANCE (AML & Regulatory Audit)</option>
                    <option value="ANALYST">ANALYST (Read-Only Metrics)</option>
                    {roles
                      .filter((r) => !r.isSystem)
                      .map((cr) => (
                        <option key={cr.id} value={cr.name}>
                          {cr.name} (Custom Role)
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    className="px-5 py-2 bg-[#3C3985] hover:bg-[#2F2C6E] disabled:opacity-40 text-white font-bold rounded-xl shadow-xs"
                  >
                    {inviting ? 'Generating Invite...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT MEMBER ROLE                                   */}
      {/* ========================================================= */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#102A54]">Update Member Role</h3>
                <p className="text-xs text-gray-400">{editingMember.name} ({editingMember.email})</p>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateRoleSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Institutional Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
                >
                  {isSuperAdmin && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPPORT">SUPPORT</option>
                  <option value="OPERATIONS">OPERATIONS</option>
                  <option value="FINANCE">FINANCE</option>
                  <option value="COMPLIANCE">COMPLIANCE</option>
                  <option value="ANALYST">ANALYST</option>
                  {roles
                    .filter((r) => !r.isSystem)
                    .map((cr) => (
                      <option key={cr.id} value={cr.name}>
                        {cr.name} (Custom)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Department</label>
                <input
                  type="text"
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingRole}
                  className="px-5 py-2 bg-[#3C3985] hover:bg-[#2F2C6E] text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {updatingRole ? 'Updating...' : 'Update Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE CUSTOM ROLE                                 */}
      {/* ========================================================= */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#102A54]">Create Custom Role</h3>
                <p className="text-xs text-gray-400">Define a custom operational permission scope.</p>
              </div>
              <button
                onClick={() => setShowCreateRoleModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomRole} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Role Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JUNIOR_KYC_OFFICER"
                  value={customRoleName}
                  onChange={(e) => setCustomRoleName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold uppercase focus:bg-white focus:outline-none focus:border-[#3C3985]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe operational responsibilities and scope..."
                  value={customRoleDesc}
                  onChange={(e) => setCustomRoleDesc(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-[#3C3985]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateRoleModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingRole || !customRoleName.trim()}
                  className="px-5 py-2 bg-[#3C3985] hover:bg-[#2F2C6E] text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {creatingRole ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center">
          <div className="w-8 h-8 border-3 border-[#3C3985] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500 font-semibold">Loading platform settings...</p>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
