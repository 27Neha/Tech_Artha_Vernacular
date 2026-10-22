function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // In the browser, use the same-origin Next.js /api-proxy rewrite to eliminate CORS issues entirely
  if (typeof window !== 'undefined') {
    return '/api-proxy';
  }
  return 'http://127.0.0.1:3000';
}

export interface AdminUserSession {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'OPERATIONS' | 'SUPPORT' | 'ANALYST';
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

export interface SupportItem {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userMobile: string | null;
  userEmail: string | null;
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
      // If /api-proxy or current baseUrl failed (e.g. initial dev connection), attempt direct fallback
      if (baseUrl === '/api-proxy' && typeof window !== 'undefined') {
        const directHost = window.location.hostname || 'localhost';
        try {
          response = await fetch(`http://${directHost}:3000${endpoint}`, {
            ...options,
            headers,
          });
        } catch (fallbackErr) {
          throw new Error('Unable to reach TechArtha API backend. Please ensure the backend server is running on port 3000.');
        }
      } else {
        throw new Error(
          primaryErr?.message?.includes('fetch')
            ? 'Unable to connect to TechArtha API backend. Please verify your connection and ensure the API server is running.'
            : (primaryErr?.message || 'Connection failed.')
        );
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

export const adminApi = new AdminApiClient();
