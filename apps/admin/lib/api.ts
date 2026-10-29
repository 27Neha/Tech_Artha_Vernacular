function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:3000`;
  }
  return 'http://127.0.0.1:3000';
}

export interface AdminUserSession {
  id: string;
  email: string;
  name: string;
  role: string;
  department?: string;
  permissions?: string[];
  status?: string;
  lastLoginAt?: string;
}

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    newThisWeek: number;
  };
  kyc: {
    total: number;
    breakdown: {
      NOT_STARTED: number;
      PENDING: number;
      SUBMITTED: number;
      VERIFIED: number;
      REJECTED: number;
      MANUAL_REVIEW: number;
    };
  };
  goals: {
    total: number;
    active: number;
    totalTargetAmount: number;
    totalMonthlySip: number;
  };
  transactions: {
    totalOrders: number;
    totalInvestedAmount: number;
    breakdown: Record<string, { count: number; volume: number }>;
  };
  support: {
    total: number;
    open: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    details: string;
    createdAt: string;
    user?: { mobile?: string; email?: string } | null;
  }>;
  timestamp: string;
}

export interface UserItem {
  id: string;
  fullName: string;
  hasProfile?: boolean;
  mobile: string | null;
  email: string | null;
  pan: string | null;
  preferredLanguage: string;
  isActive: boolean;
  createdAt: string;
  kycStatus: string;
  kycManualReview: boolean;
  onboardingStep: string;
  onboardingProgress: number;
  riskCategory: string;
  goalsCount: number;
  portfolioValue: number;
  ticketsCount: number;
}

export interface KycQueueItem {
  id: string;
  userId: string;
  applicantName: string;
  mobile: string | null;
  email: string | null;
  pan: string | null;
  provider: string;
  providerTransactionId: string | null;
  overallStatus: string;
  panStatus: string;
  documentStatus: string;
  faceLivenessStatus: string;
  faceMatchStatus: string;
  amlStatus: string;
  manualReviewRequired: boolean;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  verificationsCount: number;
}

export interface TransactionItem {
  id: string;
  fpOrderId: string | null;
  schemeIsin: string;
  amount: number;
  status: string;
  folioNumber: string | null;
  allottedUnits: number | null;
  purchasedPrice: number | null;
  failureReason: string | null;
  createdAt: string;
  userName: string;
  userMobile: string | null;
  userEmail: string | null;
}

export interface SupportMessageItem {
  id: string;
  ticketId: string;
  senderType: string;
  senderName: string;
  senderEmail?: string | null;
  content: string;
  channel: string;
  createdAt: string;
}

export interface SupportItem {
  id: string;
  referenceId?: string;
  freshdeskTicketId?: string | null;
  freshdeskStatus?: number | null;
  channel?: string;
  priority?: string;
  userId: string | null;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userMobile: string | null;
  userEmail: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerName?: string | null;
  lastCustomerMessage?: string | null;
  lastAgentReply?: string | null;
  assignedAgentName?: string | null;
  assignedAgentEmail?: string | null;
  messagesCount?: number;
  messages?: SupportMessageItem[];
  auditEvents?: any[];
}

export interface AuditItem {
  id: string;
  userId: string | null;
  action: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    mobile: string | null;
    email: string | null;
  } | null;
}

class AdminApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('techartha_admin_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('techartha_admin_token', token);
      } else {
        localStorage.removeItem('techartha_admin_token');
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('techartha_admin_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const baseUrl = getApiBaseUrl();
    let response: Response;

    try {
      response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
      });
    } catch (primaryErr: any) {
      if (typeof window !== 'undefined' && baseUrl !== '/api-proxy') {
        try {
          response = await fetch(`/api-proxy${endpoint}`, {
            ...options,
            headers,
          });
        } catch {
          throw new Error('Unable to connect to TechArtha API backend. Please ensure the backend server is running on port 3000.');
        }
      } else {
        throw new Error('Unable to connect to TechArtha API backend. Please ensure the backend server is running on port 3000.');
      }
    }

    if (response.status === 401 && typeof window !== 'undefined') {
      // Avoid infinite redirect if already on login page
      if (!window.location.pathname.includes('/login')) {
        this.setToken(null);
        window.location.href = '/login?expired=true';
      }
    }

    if (!response.ok) {
      let errorMsg = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorJson = await response.json();
        errorMsg = errorJson.message || errorJson.error || errorMsg;
      } catch {
        // Fallback to status text
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  async login(email: string, password: string): Promise<{ token: string; user: AdminUserSession }> {
    const data = await this.request<{ token: string; user: AdminUserSession }>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async getMe(): Promise<{ admin: AdminUserSession }> {
    return this.request<{ admin: AdminUserSession }>('/admin/me');
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/admin/dashboard/stats');
  }

  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    kycStatus?: string;
    maskPii?: boolean;
  } = {}): Promise<{ data: UserItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.kycStatus) query.append('kycStatus', params.kycStatus);
    if (params.maskPii !== undefined) query.append('maskPii', String(params.maskPii));

    return this.request(`/admin/users?${query.toString()}`);
  }

  async getUserDetails(id: string, unmask = false): Promise<any> {
    const query = unmask ? '?unmask=true' : '';
    return this.request(`/admin/users/${id}${query}`);
  }

  async getOnboardingQueue(params: {
    page?: number;
    limit?: number;
    status?: string;
    manualReview?: boolean;
    search?: string;
  } = {}): Promise<{ data: KycQueueItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.status) query.append('status', params.status);
    if (params.manualReview !== undefined) query.append('manualReview', String(params.manualReview));
    if (params.search) query.append('search', params.search);

    return this.request(`/admin/onboarding?${query.toString()}`);
  }

  async updateKycStatus(
    id: string,
    data: { overallStatus?: string; manualReviewRequired?: boolean; failureReason?: string; note?: string },
  ): Promise<any> {
    return this.request(`/admin/onboarding/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getTransactions(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}): Promise<{ data: TransactionItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);

    return this.request(`/admin/transactions?${query.toString()}`);
  }

  async getSupportTickets(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}): Promise<{ data: SupportItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);

    return this.request(`/admin/support?${query.toString()}`);
  }

  async updateSupportTicket(id: string, data: { status: string; notes?: string }): Promise<any> {
    return this.request(`/admin/support/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getSupportTicketDetails(id: string): Promise<SupportItem> {
    return this.request(`/admin/support/${id}`);
  }

  async replyToSupportTicket(id: string, reply: string): Promise<any> {
    return this.request(`/admin/support/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply }),
    });
  }

  async createSupportTicket(data: {
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    subject: string;
    message: string;
    channel?: string;
    priority?: string;
  }): Promise<SupportItem> {
    return this.request('/admin/support', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteSupportTicket(id: string): Promise<any> {
    return this.request(`/admin/support/${id}`, {
      method: 'DELETE',
    });
  }

  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    search?: string;
  } = {}): Promise<{ data: AuditItem[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.action) query.append('action', params.action);
    if (params.search) query.append('search', params.search);

    return this.request(`/admin/audit-logs?${query.toString()}`);
  }

  async searchFunds(query: string): Promise<any[]> {
    if (!query || query.trim().length === 0) return [];
    return this.request(`/funds/search?q=${encodeURIComponent(query)}`);
  }

  async getClientActiveGoals(clientId: string): Promise<ClientGoalsResponse> {
    return this.request(`/admin/users/${clientId}/goals`);
  }

  async updateUserProfile(
    clientId: string,
    data: { fullName?: string; dateOfBirth?: string; pan?: string; clientType?: string },
  ): Promise<any> {
    return this.request(`/admin/users/${clientId}/profile`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // TECHNICAL AGENTS MANAGEMENT
  // ==========================================
  async getTechnicalAgents(): Promise<TechnicalAgentItem[]> {
    return this.request<TechnicalAgentItem[]>('/api/v1/admin/agents');
  }

  async createTechnicalAgent(data: {
    fullName: string;
    email: string;
    phone?: string;
    role?: string;
    department?: string;
    notifyOnTickets?: boolean;
  }): Promise<TechnicalAgentItem> {
    return this.request<TechnicalAgentItem>('/api/v1/admin/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTechnicalAgent(
    id: string,
    data: Partial<TechnicalAgentItem>,
  ): Promise<TechnicalAgentItem> {
    return this.request<TechnicalAgentItem>(`/api/v1/admin/agents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTechnicalAgent(id: string): Promise<{ success: boolean; deletedAgentId: string }> {
    return this.request<{ success: boolean; deletedAgentId: string }>(`/api/v1/admin/agents/${id}`, {
      method: 'DELETE',
    });
  }

  async getAdminNotifications(): Promise<{
    notifications: any[];
    unreadCount: number;
    latestTickets: Array<{
      id: string;
      referenceId: string;
      channel: string;
      customerName: string;
      subject: string;
      createdAt: string;
    }>;
  }> {
    return this.request('/api/v1/admin/notifications');
  }

  // ==========================================
  // TEAM MANAGEMENT & INVITATIONS
  // ==========================================
  async getTeamMembers(params: { search?: string; role?: string; status?: string } = {}): Promise<{
    members: AdminTeamMember[];
    invitations: AdminInvitationItem[];
    totalActive: number;
    totalSuspended: number;
    totalPending: number;
  }> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.role) query.append('role', params.role);
    if (params.status) query.append('status', params.status);
    return this.request(`/admin/team-members?${query.toString()}`);
  }

  async inviteMember(data: {
    email: string;
    fullName?: string;
    name?: string;
    role: string;
    department?: string;
    message?: string;
  }): Promise<{ message: string; invitation: AdminInvitationItem; invitationLink?: string }> {
    return this.request('/admin/invitations', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        fullName: data.fullName || data.name || data.email.split('@')[0],
      }),
    });
  }

  async resendInvitation(id: string): Promise<{ message: string; invitation: AdminInvitationItem; invitationLink?: string }> {
    return this.request(`/admin/invitations/${id}/resend`, {
      method: 'POST',
    });
  }

  async revokeInvitation(id: string): Promise<{ message: string }> {
    return this.request(`/admin/invitations/${id}/revoke`, {
      method: 'POST',
    });
  }

  async updateMemberRole(id: string, data: { role: string; department?: string }): Promise<any> {
    return this.request(`/admin/team-members/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateMemberStatus(id: string, data: { status: 'ACTIVE' | 'SUSPENDED'; reason?: string }): Promise<any> {
    return this.request(`/admin/team-members/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteMember(id: string): Promise<any> {
    return this.request(`/admin/team-members/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // INVITATION ACCEPTANCE (PUBLIC)
  // ==========================================
  async validateInvitationToken(token: string): Promise<{
    valid: boolean;
    email: string;
    role: string;
    department?: string;
    expiresAt: string;
  }> {
    return this.request(`/admin/invitations/validate?token=${encodeURIComponent(token)}`);
  }

  async acceptInvitation(data: {
    token: string;
    password: string;
    fullName?: string;
  }): Promise<{
    token: string;
    user: AdminUserSession;
    message: string;
  }> {
    return this.request('/admin/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==========================================
  // ROLES & PERMISSIONS
  // ==========================================
  async getAllPermissions(): Promise<AdminPermissionItem[]> {
    const res = await this.request<any>('/admin/permissions');
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.permissions)) return res.permissions;
    return [];
  }

  async getAllRoles(): Promise<AdminRoleItem[]> {
    const res = await this.request<any>('/admin/roles');
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.roles)) return res.roles;
    return [];
  }

  async getRole(id: string): Promise<AdminRoleItem> {
    return this.request(`/admin/roles/${id}`);
  }

  async createCustomRole(data: {
    name: string;
    description?: string;
    permissions: string[];
  }): Promise<AdminRoleItem> {
    return this.request('/admin/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomRole(
    id: string,
    data: { name?: string; description?: string; permissions?: string[] },
  ): Promise<AdminRoleItem> {
    return this.request(`/admin/roles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCustomRole(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/admin/roles/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // SYSTEM SETTINGS & INTEGRATIONS
  // ==========================================
  async getSettingsByCategory(category: string): Promise<Record<string, any>> {
    return this.request(`/admin/settings/${category}`);
  }

  async updateSettingsCategory(category: string, values: Record<string, any>): Promise<any> {
    return this.request(`/admin/settings/${category}`, {
      method: 'PATCH',
      body: JSON.stringify(values),
    });
  }

  async testIntegrationConnection(provider: string): Promise<IntegrationTestResult> {
    return this.request(`/admin/settings/integrations/${provider}/test`, {
      method: 'POST',
    });
  }

  // ==========================================
  // OPERATIONAL DOMAINS
  // ==========================================
  async getActivityOverview(limit = 30): Promise<ActivityOverviewItem[]> {
    return this.request(`/admin/activity?limit=${limit}`);
  }

  async getBankVerifications(params: { page?: number; limit?: number; status?: string; search?: string } = {}): Promise<{
    data: BankVerificationItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    return this.request(`/admin/bank-verifications?${query.toString()}`);
  }

  async getRiskProfiles(params: { page?: number; limit?: number; category?: string; search?: string } = {}): Promise<{
    data: RiskProfileItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.category) query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    return this.request(`/admin/risk-profiles?${query.toString()}`);
  }

  async getFinancialGoals(params: { page?: number; limit?: number; status?: string; search?: string } = {}): Promise<{
    data: FinancialGoalItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    return this.request(`/admin/goals?${query.toString()}`);
  }

  async getInvestmentAccounts(params: { page?: number; limit?: number; status?: string; search?: string } = {}): Promise<{
    data: InvestmentAccountItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    return this.request(`/admin/investment-accounts?${query.toString()}`);
  }

  async getPortfolioOverview(params: { page?: number; limit?: number; search?: string } = {}): Promise<{
    data: PortfolioOverviewItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.search) query.append('search', params.search);
    return this.request(`/admin/portfolios?${query.toString()}`);
  }

  async getSipManagement(params: { page?: number; limit?: number; status?: string; search?: string } = {}): Promise<{
    data: SipManagementItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    return this.request(`/admin/sips?${query.toString()}`);
  }

  async getOrderStatus(params: { page?: number; limit?: number; status?: string; search?: string } = {}): Promise<{
    data: OrderStatusItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    return this.request(`/admin/order-status?${query.toString()}`);
  }

  async getOperationalTasks(params: { page?: number; limit?: number; status?: string; search?: string } = {}): Promise<{
    data: OperationalTaskItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    return this.request(`/admin/tasks?${query.toString()}`);
  }

  async getComplianceRecords(params: { page?: number; limit?: number; status?: string; search?: string } = {}): Promise<{
    data: ComplianceRecordItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    return this.request(`/admin/compliance?${query.toString()}`);
  }
}

export interface TechnicalAgentItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  department: string;
  isActive: boolean;
  notifyOnTickets: boolean;
  notificationEmail?: string | null;
  notificationPhone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientActiveGoal {
  id: string;
  userId: string;
  name: string;
  goalType: string;
  bucketName: string;
  status: string;
  timePeriod: number;
  monthlySip: number;
  sipDate: number;
  targetAmount: number;
  currentProgress: number;
  remainingAmount: number;
  completionPercentage: number;
  inflationRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClientGoalsResponse {
  client: {
    id: string;
    name: string;
    mobile: string | null;
    email: string | null;
    isActive: boolean;
  };
  goals: ClientActiveGoal[];
  summary: {
    totalGoals: number;
    totalTargetAmount: number;
    totalCurrentProgress: number;
    totalRemainingAmount: number;
    totalMonthlySip: number;
    overallCompletionPercentage: number;
  };
}

export interface AdminTeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'INVITED' | 'DEACTIVATED';
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  assignedRole?: {
    id: string;
    name: string;
    description?: string;
  } | null;
}

export interface AdminInvitationItem {
  id: string;
  email: string;
  role: string;
  department: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  createdAt: string;
  inviter?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface AdminPermissionItem {
  id: string;
  slug: string;
  name: string;
  module: string;
  description?: string;
}

export interface AdminRoleItem {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: string[];
  userCount?: number;
}

export interface IntegrationTestResult {
  provider: string;
  status: 'CONNECTED' | 'FAILED' | 'CONFIG_MISSING';
  message: string;
  latencyMs?: number;
  timestamp: string;
}

export interface ActivityOverviewItem {
  id: string;
  action: string;
  details?: string;
  actorEmail?: string;
  actorRole?: string;
  result?: string;
  ipAddress?: string;
  createdAt: string;
  user?: {
    id: string;
    fullName?: string;
    mobile?: string;
    email?: string;
  } | null;
}

export interface BankVerificationItem {
  id: string;
  userId: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  accountType: string;
  verificationStatus: string;
  matchScore?: number;
  failureReason?: string;
  createdAt: string;
  user?: {
    id: string;
    fullName?: string;
    mobile?: string;
    email?: string;
  };
}

export interface RiskProfileItem {
  id: string;
  userId: string;
  score: number;
  category: string;
  horizon?: string;
  knowledgeLevel?: string;
  lossTolerance?: string;
  updatedAt: string;
  user?: {
    id: string;
    fullName?: string;
    mobile?: string;
    email?: string;
  };
}

export interface FinancialGoalItem {
  id: string;
  userId: string;
  name: string;
  goalType: string;
  targetAmount: number;
  currentProgress: number;
  monthlySip: number;
  status: string;
  timePeriod: number;
  createdAt: string;
  user?: {
    id: string;
    fullName?: string;
    mobile?: string;
    email?: string;
  };
}

export interface InvestmentAccountItem {
  id: string;
  userId: string;
  accountNumber: string;
  clientCode?: string;
  status: string;
  nomineeStatus?: string;
  mandateStatus?: string;
  createdAt: string;
  user?: {
    id: string;
    fullName?: string;
    mobile?: string;
    email?: string;
  };
}

export interface PortfolioOverviewItem {
  id: string;
  userId: string;
  totalInvested: number;
  currentValue: number;
  unrealizedGainLoss: number;
  gainLossPercentage: number;
  lastSyncedAt?: string;
  holdingsCount?: number;
  user?: {
    id: string;
    fullName?: string;
    mobile?: string;
    email?: string;
  };
}

export interface SipManagementItem {
  id: string;
  userId: string;
  schemeName: string;
  amount: number;
  frequency: string;
  sipDate: number;
  mandateStatus: string;
  status: string;
  startDate?: string;
  nextDebitDate?: string;
  user?: {
    id: string;
    fullName?: string;
    mobile?: string;
    email?: string;
  };
}

export interface OrderStatusItem {
  id: string;
  userId: string;
  schemeIsin: string;
  schemeName?: string;
  amount: number;
  orderType: string;
  status: string;
  exchangeRefNumber?: string;
  unitsAllotted?: number;
  nav?: number;
  createdAt: string;
  user?: {
    id: string;
    fullName?: string;
    mobile?: string;
    email?: string;
  };
}

export interface OperationalTaskItem {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  assignedTo?: string;
  dueDate?: string;
  createdAt: string;
}

export interface ComplianceRecordItem {
  id: string;
  userId?: string;
  checkType: string;
  status: string;
  severity: string;
  details: string;
  source: string;
  timestamp: string;
  user?: {
    id: string;
    fullName?: string;
    mobile?: string;
    email?: string;
  };
}

export const adminApi = new AdminApiClient();
