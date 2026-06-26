// API Configuration and Utilities
import { sanitizeInput, validateObjectId } from './security';
import { logger } from './logger';
import { apiCache } from './apiCache';

// API URL Configuration
const getApiBaseUrl = (): string => {
  const configured = import.meta.env.VITE_API_URL;
  // Local dev: use Vite proxy to the backend on :3000 (bookings and other new routes)
  if (import.meta.env.DEV && (!configured || configured.includes('trippo.rw'))) {
    return '/api';
  }
  return configured || 'https://trippo.rw/api';
};

const API_BASE_URL = getApiBaseUrl();
export const PUBLIC_API_BASE_URL = API_BASE_URL;

/** WebSocket origin derived from API base */
export function getWebSocketBaseUrl(): string {
  const configured = import.meta.env.VITE_WS_URL;
  if (import.meta.env.DEV && (!configured || configured.includes('trippo.rw'))) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
  return configured || 'wss://trippo.rw';
}

// Log API URL in development mode for debugging (disabled for privacy/security)
// logger.log(`🔌 API Base URL: ${API_BASE_URL}`);

export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
  user?: T;
  isAdmin?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Request cache to prevent duplicate requests
const requestCache = new Map<string, { promise: Promise<ApiResponse<any>>; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds cache for GET requests (increased to reduce API calls)

// Generic API request function with retry logic for rate limiting
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<ApiResponse<T>> {
  // Import request manager dynamically to avoid circular dependencies
  const { requestManager } = await import('./requestManager');
  
  // Sanitize endpoint to prevent path traversal
  const sanitizedEndpoint = sanitizeInput(endpoint);
  const url = `${API_BASE_URL}${sanitizedEndpoint}`;
  
  // Get userId from localStorage - REQUIRED for all requests except auth endpoints
  const userId = localStorage.getItem("profit-pilot-user-id");
  
  // For non-auth endpoints, userId is required for data isolation
  const isAuthEndpoint = endpoint.startsWith('/auth/register') || 
                         endpoint.startsWith('/auth/login') ||
                         endpoint.startsWith('/auth/google') ||
                         endpoint.startsWith('/auth/forgot-password') ||
                         endpoint.startsWith('/auth/reset-password') ||
                         endpoint.startsWith('/auth/forgot-pin') ||
                         endpoint.startsWith('/auth/reset-pin') ||
                         endpoint.startsWith('/auth/me');
  
  // Public content endpoints (homepage CMS)
  const isPublicEndpoint = endpoint.startsWith('/content/');
  
  // Admin endpoints don't require regular userId (admin has special userId)
  const isAdminEndpoint = endpoint.startsWith('/admin/');
  
  if (!isAuthEndpoint && !isAdminEndpoint && !isPublicEndpoint && !userId) {
    throw new ApiError(
      'User not authenticated. Please login to access your data.',
      401,
      { requiresAuth: true }
    );
  }
  
  // Build headers - merge default headers with any provided headers
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // For admin endpoints, always check if admin is logged in
  if (isAdminEndpoint) {
    // Always check localStorage directly for admin endpoints
    const adminId = localStorage.getItem("profit-pilot-user-id");
    const isAdmin = localStorage.getItem("profit-pilot-is-admin") === "true";
    
    // Always log admin endpoint requests for debugging
    console.log('[API] Admin endpoint request:', {
      endpoint,
      'adminId-from-storage': adminId,
      'isAdmin-flag': isAdmin,
      'userId-from-param': userId,
      'localStorage-keys': Object.keys(localStorage).filter(k => k.includes('profit-pilot'))
    });
    
    if (adminId === 'admin' || isAdmin) {
      defaultHeaders['X-User-Id'] = 'admin';
      console.log('[API] ✅ Sending X-User-Id: admin for endpoint:', endpoint);
    } else if (userId) {
      // Fallback: use regular userId if admin check fails
      const sanitizedUserId = sanitizeInput(userId);
      if (sanitizedUserId) {
        defaultHeaders['X-User-Id'] = sanitizedUserId;
        console.warn('[API] ⚠️ Admin endpoint - using fallback userId:', sanitizedUserId, 'for endpoint:', endpoint);
      }
    } else {
      console.error('[API] ❌ Admin endpoint - no userId found in localStorage for endpoint:', endpoint);
    }
  } else {
    // For non-admin endpoints, sanitize and send userId if present
    if (userId) {
      const sanitizedUserId = sanitizeInput(userId);
      if (sanitizedUserId) {
        defaultHeaders['X-User-Id'] = sanitizedUserId;
      }
    }
  }

  const isWorkspaceMetaEndpoint = endpoint.startsWith('/workspaces');
  if (!isAuthEndpoint && !isAdminEndpoint && !isPublicEndpoint && !isWorkspaceMetaEndpoint) {
    const workspaceMode = localStorage.getItem('profit-pilot-workspace-mode') || 'personal';
    const workspaceId = localStorage.getItem('profit-pilot-active-workspace-id');
    defaultHeaders['X-Workspace-Mode'] = workspaceMode === 'workspace' ? 'workspace' : 'personal';
    if (workspaceMode === 'workspace' && workspaceId) {
      const sanitizedWorkspaceId = sanitizeInput(workspaceId);
      if (sanitizedWorkspaceId) {
        defaultHeaders['X-Workspace-Id'] = sanitizedWorkspaceId;
      }
    }
  }
  
  const mergedHeaders = {
    ...defaultHeaders,
    ...(options.headers as Record<string, string> || {}),
  };
  
  const config: RequestInit = {
    ...options,
    headers: mergedHeaders,
  };
  
  // Sanitize request body if present
  if (config.body && typeof config.body === 'string') {
    try {
      const bodyObj = JSON.parse(config.body);
      // Basic sanitization - remove any script tags or dangerous content
      const sanitizedBody = JSON.stringify(bodyObj);
      config.body = sanitizedBody;
    } catch (e) {
      // If body is not JSON, sanitize as string
      config.body = sanitizeInput(config.body);
    }
  }

  try {
    // Check cache for GET requests (deduplication)
    const isGet = (options.method || 'GET').toUpperCase() === 'GET';
    const disableGetCache =
      endpoint.startsWith('/notifications') ||
      endpoint.startsWith('/auth/me') ||
      endpoint.startsWith('/subscription') ||
      endpoint.startsWith('/content/') ||
      endpoint.startsWith('/workspaces');
    // Get userId for cache key (use the value from defaultHeaders if set, otherwise 'anonymous')
    const userIdForCache = defaultHeaders['X-User-Id'] || userId || 'anonymous';
    const workspaceScope =
      defaultHeaders['X-Workspace-Mode'] === 'workspace' && defaultHeaders['X-Workspace-Id']
        ? `workspace:${defaultHeaders['X-Workspace-Id']}`
        : 'personal';
    const cacheKey = `${options.method || 'GET'}:${endpoint}:${userIdForCache}:${workspaceScope}`;
    
    if (isGet && retryCount === 0 && !disableGetCache) {
      const cached = requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[API] Using cached request: ${endpoint}`);
        return cached.promise;
      }
    }

    // Deduplicate in-flight GET requests (even when TTL cache is disabled)
    if (isGet && retryCount === 0) {
      return requestManager.execute(cacheKey, async () => {
        return executeRequest<T>(endpoint, config, url, cacheKey, isGet, retryCount, disableGetCache);
      });
    }
    
    // For non-GET requests or retries, execute directly
    return executeRequest<T>(endpoint, config, url, cacheKey, isGet, retryCount, disableGetCache);
  } catch (error) {
    if (error instanceof ApiError) {
      // Retry 429 errors with exponential backoff
      if (error.status === 429 && retryCount < 3) {
        const waitTime = error.response?.retryAfter 
          ? (typeof error.response.retryAfter === 'string' ? parseInt(error.response.retryAfter) * 1000 : error.response.retryAfter)
          : Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return request<T>(endpoint, options, retryCount + 1);
      }
      throw error;
    }
    // Check for connection refused errors - make them silent for offline support
    const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_CONNECTION_REFUSED') || errorMessage.includes('NetworkError') || errorMessage.includes('connection')) {
      // Silent error - don't show technical messages to users
      throw new ApiError(
        '', // Empty message - will be handled gracefully
        0,
        { connectionError: true, silent: true }
      );
    }
    // For other errors, throw with the actual error message
    const errorMsg = error instanceof Error ? error.message : 'Network error occurred';
    throw new ApiError(errorMsg, 0, { silent: false });
  }
}

// Extract request execution logic
async function executeRequest<T>(
  endpoint: string,
  config: RequestInit,
  url: string,
  cacheKey: string,
  isGet: boolean,
  retryCount: number,
  disableGetCache = false
): Promise<ApiResponse<T>> {
    // Create request promise
    const requestPromise = (async () => {
      const response = await fetch(url, config);
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        // If response is not JSON, create a simple error response
        data = { error: response.statusText || 'An error occurred' };
      }

      if (!response.ok) {
        // Trial ended — redirect to billing (subscription endpoints still allowed)
        if (
          response.status === 402 &&
          data?.code === 'SUBSCRIPTION_REQUIRED' &&
          !endpoint.startsWith('/subscription')
        ) {
          window.dispatchEvent(new Event('subscription-updated'));
          if (!window.location.pathname.startsWith('/billing')) {
            window.location.assign('/billing');
          }
        }

        // Handle 429 Too Many Requests with retry logic
        if (response.status === 429 && retryCount < 3) {
          // Get retry-after from header or response data, default to exponential backoff
          const retryAfterHeader = response.headers.get('Retry-After');
          const retryAfter = retryAfterHeader || 
                            data.retryAfter || 
                            Math.min(1000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
          
          const waitTime = typeof retryAfter === 'string' ? parseInt(retryAfter) * 1000 : retryAfter;
          
          // Add jitter to prevent thundering herd
          const jitter = Math.random() * 0.25 * waitTime;
          const totalWait = Math.min(waitTime + jitter, 30000);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, totalWait));
          
        // Retry the request (will go through request manager again)
        const { requestManager } = await import('./requestManager');
        return requestManager.execute(cacheKey, async () => {
          return executeRequest<T>(endpoint, config, url, cacheKey, isGet, retryCount + 1, disableGetCache);
        });
        }
        
        // logger.error(`[API] Request failed: ${response.status}`, data);
        const details = Array.isArray(data?.details) ? data.details : [];
        const message =
          details[0]?.message ||
          data.error ||
          data.message ||
          'An error occurred';
        throw new ApiError(
          message,
          response.status,
          { ...data, details }
        );
      }

      // logger.log(`[API] Request successful:`, data);
      return data;
    })();

    // Cache GET requests (skip endpoints that need fresh data every time)
    if (isGet && retryCount === 0 && !disableGetCache) {
      requestCache.set(cacheKey, {
        promise: requestPromise as Promise<ApiResponse<any>>,
        timestamp: Date.now()
      });
      
      // Clean up cache after TTL
      setTimeout(() => {
        requestCache.delete(cacheKey);
      }, CACHE_TTL);
    }

    return requestPromise;
}

// Auth API functions
export const authApi = {
  // Send email verification code for new account registration
  async sendRegistrationOtp(data: { email: string }): Promise<ApiResponse> {
    return request('/auth/register/send-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Register a new user (requires email verification OTP)
  async register(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    otp: string;
  }): Promise<ApiResponse> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async login(data: { password: string; email: string }): Promise<ApiResponse> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async googleAuth(data: { credential: string }): Promise<ApiResponse> {
    return request('/auth/google', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get current user (only fetch if not in localStorage or explicitly requested)
  async getCurrentUser(forceFetch: boolean = false): Promise<ApiResponse> {
    // Check if user data exists in localStorage first
    const userName = localStorage.getItem('profit-pilot-user-name');
    const userEmail = localStorage.getItem('profit-pilot-user-email');
    const businessName = localStorage.getItem('profit-pilot-business-name');
    const profilePictureUrl = localStorage.getItem('profit-pilot-profile-picture-url');
    const userId = localStorage.getItem('profit-pilot-user-id');
    
    // If we have user data in localStorage and not forcing fetch, return it
    if (!forceFetch && userName && userId) {
      const cachedUser = {
        name: userName,
        email: userEmail || undefined,
        businessName: businessName || undefined,
        profilePictureUrl: profilePictureUrl || undefined,
        _id: userId,
        id: userId,
      };
      console.log('[API] Using localStorage user data (no API call)');
      return { data: cachedUser, user: cachedUser };
    }
    
    // Only fetch from API if forced or if no user data in localStorage
    const response = await request('/auth/me', {
      method: 'GET',
    });
    
    // Store user data in localStorage after fetch
    if (response?.user || response?.data) {
      const userData = response.user || response.data;
      if (userData.name) {
        localStorage.setItem('profit-pilot-user-name', userData.name);
      }
      if (userData.email) {
        localStorage.setItem('profit-pilot-user-email', userData.email);
      }
      if (userData.businessName) {
        localStorage.setItem('profit-pilot-business-name', userData.businessName);
      }
      if (userData.profilePictureUrl) {
        localStorage.setItem('profit-pilot-profile-picture-url', userData.profilePictureUrl);
      } else if (userData.profilePictureUrl === null || userData.profilePictureUrl === '') {
        localStorage.removeItem('profit-pilot-profile-picture-url');
      }
      if (userData._id || userData.id) {
        const fetchedUserId = userData._id || userData.id;
        // Only update userId if it matches current userId (prevent user switching)
        const currentUserId = localStorage.getItem('profit-pilot-user-id');
        if (!currentUserId || currentUserId === fetchedUserId.toString()) {
          localStorage.setItem('profit-pilot-user-id', fetchedUserId.toString());
        }
      }
      
      // Trigger event to update other components
      window.dispatchEvent(new Event('user-data-changed'));
    }
    
    return response;
  },

  // Update user information
  async updateUser(data: { name?: string; email?: string; phone?: string; businessName?: string }): Promise<ApiResponse> {
    const response = await request('/auth/update', {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    const userData = response?.user || response?.data;
    if (userData) {
      if (userData.name) {
        localStorage.setItem('profit-pilot-user-name', userData.name);
      }
      if (userData.email) {
        localStorage.setItem('profit-pilot-user-email', userData.email);
      }
      if (userData.businessName) {
        localStorage.setItem('profit-pilot-business-name', userData.businessName);
      }
      if (userData.profilePictureUrl) {
        localStorage.setItem('profit-pilot-profile-picture-url', userData.profilePictureUrl);
      } else if (userData.profilePictureUrl === null || userData.profilePictureUrl === '') {
        localStorage.removeItem('profit-pilot-profile-picture-url');
      } else if (data.businessName !== undefined && !data.businessName) {
        localStorage.removeItem('profit-pilot-business-name');
      }
      if (userData.phone) {
        localStorage.setItem('profit-pilot-user-phone', userData.phone);
      }
      window.dispatchEvent(new Event('user-data-changed'));
    }

    return response;
  },

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<ApiResponse> {
    return request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async changePin(data: { currentPin: string; newPin: string }): Promise<ApiResponse> {
    return this.changePassword({
      currentPassword: data.currentPin,
      newPassword: data.newPin,
    });
  },

  // Delete account
  async deleteAccount(): Promise<ApiResponse> {
    return request('/auth/delete-account', {
      method: 'DELETE',
    });
  },

  async forgotPassword(data: { email: string }): Promise<ApiResponse> {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async forgotPin(data: { email: string }): Promise<ApiResponse> {
    return this.forgotPassword(data);
  },

  async resetPassword(data: { email: string; otp: string; newPassword: string }): Promise<ApiResponse> {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async resetPin(data: { email: string; otp: string; newPin: string }): Promise<ApiResponse> {
    return this.resetPassword({
      email: data.email,
      otp: data.otp,
      newPassword: data.newPin,
    });
  },
};

// Product API functions
export const productApi = {
  // Get all products
  async getAll(): Promise<ApiResponse> {
    return request('/products', {
      method: 'GET',
    });
  },

  // Get single product
  async getById(id: string): Promise<ApiResponse> {
    return request(`/products/${id}`, {
      method: 'GET',
    });
  },

  // Create product
  async create(data: any): Promise<ApiResponse> {
    return request('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update product
  async update(id: string, data: any): Promise<ApiResponse> {
    return request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete product
  async delete(id: string): Promise<ApiResponse> {
    return request(`/products/${id}`, {
      method: 'DELETE',
    });
  },
};

// Sale API functions
export const saleApi = {
  // Get all sales - fetch ALL sales for the user from database
  async getAll(params?: { startDate?: string; endDate?: string; product?: string }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.product) queryParams.append('product', params.product);
    
    // Ensure we get ALL sales - no limit
    queryParams.append('limit', '0'); // 0 means no limit
    queryParams.append('skip', '0');
    
    const queryString = queryParams.toString();
    const url = queryString ? `/sales?${queryString}` : '/sales?limit=0&skip=0';
    
    // logger.log('[saleApi] Fetching ALL sales from database:', url);
    
    try {
      const response = await request(url, {
        method: 'GET',
      });
      
      // logger.log('[saleApi] Sales fetched from database:', {
      //   count: Array.isArray(response?.data) ? response.data.length : 0,
      //   hasData: !!response?.data,
      //   responseKeys: response ? Object.keys(response) : [],
      // });
      
      // if (response?.data && Array.isArray(response.data)) {
      //   logger.log(`[saleApi] ✓ Successfully fetched ${response.data.length} sale(s) from database`);
      // }
      
      return response;
    } catch (error: any) {
      // logger.error('[saleApi] ✗ Error fetching sales from database:', error);
      throw error;
    }
  },

  // Get single sale
  async getById(id: string): Promise<ApiResponse> {
    return request(`/sales/${id}`, {
      method: 'GET',
    });
  },

  // Create sale - Direct API call to server
  // Note: Offline handling is done at the useApi hook level
  async create(data: any): Promise<ApiResponse> {
    // logger.log('[saleApi] ===== DIRECT API CALL: Creating sale =====');
    // logger.log('[saleApi] Sale data:', JSON.stringify(data, null, 2));
    // logger.log('[saleApi] API URL:', `${API_BASE_URL}/sales`);
    // logger.log('[saleApi] Online status:', navigator.onLine);
    
    try {
      const response = await request('/sales', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      if (!response || (!response.data && !response)) {
        // logger.error('[saleApi] ✗ Invalid response structure:', response);
        throw new Error('Invalid response from sales API. Please try again.');
      }
      
      // logger.log('[saleApi] ✓ Sale created successfully via DIRECT API:', response);
      return response;
    } catch (error: any) {
      // logger.error('[saleApi] ✗ Error creating sale via DIRECT API:', error);
      // Re-throw with connection error flag if it's a network error
      // This allows the useApi hook to handle offline scenarios properly
      if (!navigator.onLine || 
          error?.message?.includes('Failed to fetch') ||
          error?.message?.includes('NetworkError') ||
          error?.message?.includes('Network request failed') ||
          error?.message?.includes('connection')) {
        const connectionError: any = new Error('Network error: Unable to connect to server.');
        connectionError.response = { connectionError: true };
        throw connectionError;
      }
      throw error;
    }
  },

  // Create bulk sales - Direct API call to server (no offline storage, no syncing)
  async createBulk(sales: any[]): Promise<ApiResponse> {
    // logger.log('[saleApi] ===== DIRECT API CALL: Creating bulk sales =====');
    // logger.log('[saleApi] Sales count:', sales.length);
    // logger.log('[saleApi] Sales data:', JSON.stringify(sales, null, 2));
    // logger.log('[saleApi] API URL:', `${API_BASE_URL}/sales/bulk`);
    // logger.log('[saleApi] Online status:', navigator.onLine);
    
    if (!navigator.onLine) {
      const error: any = new Error('Cannot record sales while offline. Please check your internet connection.');
      error.response = { connectionError: true };
      throw error;
    }
    
    if (!sales || sales.length === 0) {
      throw new Error('No sales data provided for bulk creation.');
    }
    
    try {
      const response = await request('/sales/bulk', {
        method: 'POST',
        body: JSON.stringify({ sales }),
      });
      
      if (!response || (!response.data && !response)) {
        // logger.error('[saleApi] ✗ Invalid bulk response structure:', response);
        throw new Error('Invalid response from bulk sales API. Please try again.');
      }
      
      // logger.log('[saleApi] ✓ Bulk sales created successfully via DIRECT API:', response);
      return response;
    } catch (error: any) {
      // logger.error('[saleApi] ✗ Error creating bulk sales via DIRECT API:', error);
      // Re-throw with connection error flag if it's a network error
      if (!navigator.onLine || 
          error?.message?.includes('Failed to fetch') ||
          error?.message?.includes('NetworkError') ||
          error?.message?.includes('Network request failed')) {
        const connectionError: any = new Error('Cannot record sales while offline. Please check your internet connection.');
        connectionError.response = { connectionError: true };
        throw connectionError;
      }
      throw error;
    }
  },

  // Update sale
  async update(id: string, data: any): Promise<ApiResponse> {
    return request(`/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete sale
  async delete(id: string): Promise<ApiResponse> {
    return request(`/sales/${id}`, {
      method: 'DELETE',
    });
  },

  // Delete all sales
  async deleteAll(): Promise<ApiResponse> {
    return request('/sales/all', {
      method: 'DELETE',
    });
  },
};

// Admin API functions
export const adminApi = {
  // Get system statistics
  async getSystemStats(): Promise<ApiResponse> {
    return request('/admin/stats', {
      method: 'GET',
    });
  },

  // Get all users
  async getAllUsers(): Promise<ApiResponse> {
    return request('/admin/users', {
      method: 'GET',
    });
  },

  // Get user activity
  async getUserActivity(days: number = 7): Promise<ApiResponse> {
    return request(`/admin/activity?days=${days}`, {
      method: 'GET',
    });
  },

  // Get user usage statistics
  async getUserUsage(days: number = 30): Promise<ApiResponse> {
    return request(`/admin/usage?days=${days}`, {
      method: 'GET',
    });
  },

  // Get API statistics
  async getApiStats(): Promise<ApiResponse> {
    return request('/admin/api-stats', {
      method: 'GET',
    });
  },

  // Get system health
  async getSystemHealth(): Promise<ApiResponse> {
    return request('/admin/health', {
      method: 'GET',
    });
  },

  // Get schedule statistics
  async getScheduleStats(days: number = 30): Promise<ApiResponse> {
    return request(`/admin/schedule-stats?days=${days}`, {
      method: 'GET',
    });
  },

  // Delete user and all their data
  async deleteUser(userId: string): Promise<ApiResponse> {
    return request(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  /** Enable or disable sign-in for a user account (backend: PATCH /admin/users/:id/account-status). */
  async setUserAccountStatus(userId: string, isActive: boolean): Promise<ApiResponse> {
    return request(`/admin/users/${userId}/account-status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  // Send email to single user
  async sendEmailToUser(userId: string, subject: string, message: string, html?: string): Promise<ApiResponse> {
    return request('/admin/send-email', {
      method: 'POST',
      body: JSON.stringify({ userId, subject, message, html }),
    });
  },

  // Send bulk email to multiple users
  async sendBulkEmail(userIds: string[], subject: string, message: string, html?: string): Promise<ApiResponse> {
    return request('/admin/send-bulk-email', {
      method: 'POST',
      body: JSON.stringify({ userIds, subject, message, html }),
    });
  },

  // Send in-app notification to a single user
  async sendNotificationToUser(
    userId: string,
    payload: { title: string; body: string; type?: string; data?: any; icon?: string }
  ): Promise<ApiResponse> {
    return request('/admin/send-notification', {
      method: 'POST',
      body: JSON.stringify({ userId, ...payload }),
    });
  },

  // Send in-app notification to multiple users, or all users
  async sendBulkNotification(payload: {
    userIds?: string[];
    sendToAll?: boolean;
    title: string;
    body: string;
    type?: string;
    data?: any;
    icon?: string;
  }): Promise<ApiResponse> {
    return request('/admin/send-bulk-notification', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Get notification history (admin)
  async getNotificationHistory(params?: { limit?: number; skip?: number; sentBy?: string }): Promise<ApiResponse> {
    const limit = params?.limit ?? 50;
    const skip = params?.skip ?? 0;
    const sentBy = params?.sentBy ?? 'admin';
    return request(`/admin/notifications?limit=${limit}&skip=${skip}&sentBy=${encodeURIComponent(sentBy)}`, {
      method: 'GET',
    });
  },

  async updateUserPaymentPlan(
    userId: string,
    payload: {
      active?: boolean;
      amount?: number;
      currency?: string;
      intervalMonths?: number;
      startDate?: string | Date | null;
      nextDueDate?: string | Date | null;
      status?: string;
    }
  ): Promise<ApiResponse> {
    return request(`/admin/users/${userId}/payment-plan`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async markUserPaid(userId: string, paidAt?: string | Date): Promise<ApiResponse> {
    return request(`/admin/users/${userId}/mark-paid`, {
      method: "POST",
      body: JSON.stringify({ paidAt: paidAt || new Date().toISOString() }),
    });
  },

  // Test email configuration
  async testEmail(to: string): Promise<ApiResponse> {
    return request('/admin/test-email', {
      method: 'POST',
      body: JSON.stringify({ to }),
    });
  },

  async getSubscriptionPaymentStats(days = 30): Promise<ApiResponse> {
    return request(`/admin/subscription-payments/stats?days=${days}`, { method: 'GET' });
  },

  async listSubscriptionPayments(params?: {
    days?: number;
    status?: string;
    hasIssues?: boolean;
    search?: string;
    limit?: number;
    skip?: number;
  }): Promise<ApiResponse> {
    const qs = new URLSearchParams();
    if (params?.days) qs.set('days', String(params.days));
    if (params?.status) qs.set('status', params.status);
    if (params?.hasIssues) qs.set('hasIssues', '1');
    if (params?.search) qs.set('search', params.search);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.skip) qs.set('skip', String(params.skip));
    const query = qs.toString();
    return request(`/admin/subscription-payments${query ? `?${query}` : ''}`, { method: 'GET' });
  },

  async getSubscriptionPayment(paymentId: string): Promise<ApiResponse> {
    return request(`/admin/subscription-payments/${paymentId}`, { method: 'GET' });
  },

  async resyncSubscriptionPayment(paymentId: string): Promise<ApiResponse> {
    return request(`/admin/subscription-payments/${paymentId}/resync`, { method: 'POST' });
  },

  async reconcileStuckSubscriptionPayments(limit = 25): Promise<ApiResponse> {
    return request('/admin/subscription-payments/reconcile', {
      method: 'POST',
      body: JSON.stringify({ limit }),
    });
  },

  async getHomepageContent(): Promise<ApiResponse> {
    return request('/admin/homepage', { method: 'GET' });
  },

  async updateHomepageContent(payload: Record<string, unknown>): Promise<ApiResponse> {
    return request('/admin/homepage', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getPlatformSettings(): Promise<ApiResponse> {
    return request('/admin/platform-settings', { method: 'GET' });
  },

  async updatePlatformSettings(payload: {
    currentPin: string;
    adminEmail?: string;
    newPin?: string;
    confirmNewPin?: string;
    subscriptionAmount?: number;
    trialDays?: number;
    supportEmail?: string;
    supportPhone?: string;
    whatsappNumber?: string;
    instagramUrl?: string;
    companyName?: string;
    maintenanceMode?: boolean;
  }): Promise<ApiResponse> {
    return request('/admin/platform-settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};

// Public homepage content (no auth required)
export const contentApi = {
  async getHomepage(lang: string = 'en'): Promise<ApiResponse> {
    return request(`/content/homepage?lang=${encodeURIComponent(lang)}`, {
      method: 'GET',
    });
  },

  async getContact(): Promise<ApiResponse> {
    return request('/content/contact', { method: 'GET' });
  },
};

// Client API functions
export const clientApi = {
  // Get all clients
  async getAll(): Promise<ApiResponse> {
    return request('/clients', {
      method: 'GET',
    });
  },

  // Get single client
  async getById(id: string): Promise<ApiResponse> {
    return request(`/clients/${id}`, {
      method: 'GET',
    });
  },

  // Create client
  async create(data: any): Promise<ApiResponse> {
    return request('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update client
  async update(id: string, data: any): Promise<ApiResponse> {
    return request(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete client
  async delete(id: string): Promise<ApiResponse> {
    return request(`/clients/${id}`, {
      method: 'DELETE',
    });
  },

  async getActivity(id: string): Promise<ApiResponse> {
    return request(`/clients/${id}/activity`, { method: 'GET' });
  },
};

export const vendorApi = {
  async getAll(): Promise<ApiResponse> {
    return request('/vendors', { method: 'GET' });
  },

  async getById(id: string): Promise<ApiResponse> {
    return request(`/vendors/${id}`, { method: 'GET' });
  },

  async create(data: any): Promise<ApiResponse> {
    return request('/vendors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: any): Promise<ApiResponse> {
    return request(`/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse> {
    return request(`/vendors/${id}`, { method: 'DELETE' });
  },

  async getActivity(id: string): Promise<ApiResponse> {
    return request(`/vendors/${id}/activity`, { method: 'GET' });
  },
};

export const accountApi = {
  async getAll(): Promise<ApiResponse> {
    return request('/accounts', { method: 'GET' });
  },
  async getById(id: string): Promise<ApiResponse> {
    return request(`/accounts/${id}`, { method: 'GET' });
  },
  async create(data: any): Promise<ApiResponse> {
    return request('/accounts', { method: 'POST', body: JSON.stringify(data) });
  },
  async update(id: string, data: any): Promise<ApiResponse> {
    return request(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async delete(id: string): Promise<ApiResponse> {
    return request(`/accounts/${id}`, { method: 'DELETE' });
  },
  async getActivity(id: string): Promise<ApiResponse> {
    return request(`/accounts/${id}/activity`, { method: 'GET' });
  },
  async createTransfer(data: any): Promise<ApiResponse> {
    return request('/accounts/transfers', { method: 'POST', body: JSON.stringify(data) });
  },
  async getTransfers(): Promise<ApiResponse> {
    return request('/accounts/transfers/list', { method: 'GET' });
  },
  async getReconciliation(id: string, params?: { startDate?: string; endDate?: string }): Promise<ApiResponse> {
    const q = new URLSearchParams();
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    const qs = q.toString();
    return request(`/accounts/${id}/reconciliation${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
  async toggleReconciliation(data: { type: string; id: string; reconciled: boolean }): Promise<ApiResponse> {
    return request('/accounts/reconciliation/toggle', { method: 'PATCH', body: JSON.stringify(data) });
  },
};

export const categoryBudgetApi = {
  async getAll(): Promise<ApiResponse> {
    return request('/category-budgets', { method: 'GET' });
  },
  async create(data: any): Promise<ApiResponse> {
    return request('/category-budgets', { method: 'POST', body: JSON.stringify(data) });
  },
  async update(id: string, data: any): Promise<ApiResponse> {
    return request(`/category-budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async delete(id: string): Promise<ApiResponse> {
    return request(`/category-budgets/${id}`, { method: 'DELETE' });
  },
  async getSummary(params?: { viewPeriod?: string; referenceDate?: string }): Promise<ApiResponse> {
    const q = new URLSearchParams();
    if (params?.viewPeriod) q.set('viewPeriod', params.viewPeriod);
    if (params?.referenceDate) q.set('referenceDate', params.referenceDate);
    const qs = q.toString();
    return request(`/category-budgets/summary${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
};

// Schedule API functions
export const scheduleApi = {
  // Get all schedules
  async getAll(params?: { status?: string; upcoming?: string; clientId?: string }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.upcoming) queryParams.append('upcoming', params.upcoming);
    if (params?.clientId) queryParams.append('clientId', params.clientId);
    
    const queryString = queryParams.toString();
    const url = queryString ? `/schedules?${queryString}` : '/schedules';
    
    return request(url, {
      method: 'GET',
    });
  },

  // Get upcoming schedules
  async getUpcoming(days: number = 7): Promise<ApiResponse> {
    return request(`/schedules/upcoming?days=${days}`, {
      method: 'GET',
    });
  },

  // Get single schedule
  async getById(id: string): Promise<ApiResponse> {
    return request(`/schedules/${id}`, {
      method: 'GET',
    });
  },

  // Create schedule
  async create(data: any): Promise<ApiResponse> {
    return request('/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update schedule
  async update(id: string, data: any): Promise<ApiResponse> {
    return request(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete schedule
  async delete(id: string): Promise<ApiResponse> {
    return request(`/schedules/${id}`, {
      method: 'DELETE',
    });
  },

  // Complete schedule
  async complete(id: string, data?: { completionMessage?: string; notifyClient?: boolean; notifyUser?: boolean }): Promise<ApiResponse> {
    return request(`/schedules/${id}/complete`, {
      method: "PUT",
      body: JSON.stringify(data || {}),
    });
  },
};

export const calendarEventApi = {
  async getAll(params?: { start?: string; end?: string; status?: string; eventType?: string }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.start) queryParams.append("start", params.start);
    if (params?.end) queryParams.append("end", params.end);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.eventType) queryParams.append("eventType", params.eventType);
    const queryString = queryParams.toString();
    const url = queryString ? `/calendar-events?${queryString}` : "/calendar-events";
    return request(url, { method: "GET" });
  },

  async getById(id: string): Promise<ApiResponse> {
    return request(`/calendar-events/${id}`, { method: "GET" });
  },

  async create(data: Record<string, unknown>): Promise<ApiResponse> {
    return request("/calendar-events", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return request(`/calendar-events/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse> {
    return request(`/calendar-events/${id}`, { method: "DELETE" });
  },
};

export interface TeamMemberRecord {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  department?: string;
  status?: "active" | "inactive";
  notes?: string;
}

export interface TeamTaskRecord {
  _id: string;
  title: string;
  description?: string;
  assigneeId: TeamMemberRecord | string;
  department?: string;
  status?: "todo" | "in_progress" | "done";
  priority?: "low" | "medium" | "high";
  dueDate?: string;
  monthKey?: string;
  completionNote?: string;
  completedAt?: string;
  createdAt?: string;
}

export const teamMemberApi = {
  async getAll(params?: { status?: string; department?: string }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.department) queryParams.append("department", params.department);
    const queryString = queryParams.toString();
    const url = queryString ? `/team-members?${queryString}` : "/team-members";
    return request(url, { method: "GET" });
  },

  async getById(id: string): Promise<ApiResponse> {
    return request(`/team-members/${id}`, { method: "GET" });
  },

  async create(data: Record<string, unknown>): Promise<ApiResponse> {
    return request("/team-members", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return request(`/team-members/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse> {
    return request(`/team-members/${id}`, { method: "DELETE" });
  },
};

export const teamTaskApi = {
  async getAll(params?: {
    status?: string;
    department?: string;
    assigneeId?: string;
    monthKey?: string;
  }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.department) queryParams.append("department", params.department);
    if (params?.assigneeId) queryParams.append("assigneeId", params.assigneeId);
    if (params?.monthKey) queryParams.append("monthKey", params.monthKey);
    const queryString = queryParams.toString();
    const url = queryString ? `/team-tasks?${queryString}` : "/team-tasks";
    return request(url, { method: "GET" });
  },

  async getSummary(params?: { monthKey?: string; department?: string }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.monthKey) queryParams.append("monthKey", params.monthKey);
    if (params?.department) queryParams.append("department", params.department);
    const queryString = queryParams.toString();
    const url = queryString ? `/team-tasks/summary?${queryString}` : "/team-tasks/summary";
    return request(url, { method: "GET" });
  },

  async getById(id: string): Promise<ApiResponse> {
    return request(`/team-tasks/${id}`, { method: "GET" });
  },

  async create(data: Record<string, unknown>): Promise<ApiResponse> {
    return request("/team-tasks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return request(`/team-tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async complete(id: string, completionNote?: string): Promise<ApiResponse> {
    return request(`/team-tasks/${id}/complete`, {
      method: "POST",
      body: JSON.stringify({ completionNote }),
    });
  },

  async delete(id: string): Promise<ApiResponse> {
    return request(`/team-tasks/${id}`, { method: "DELETE" });
  },
};

export const expenseApi = {
  async getAll(params?: { startDate?: string; endDate?: string }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    const queryString = queryParams.toString();
    const url = queryString ? `/expenses?${queryString}` : "/expenses";
    return request(url, { method: "GET" });
  },

  async getById(id: string): Promise<ApiResponse> {
    return request(`/expenses/${id}`, { method: "GET" });
  },

  async create(data: any): Promise<ApiResponse> {
    return request("/expenses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: any): Promise<ApiResponse> {
    return request(`/expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse> {
    return request(`/expenses/${id}`, { method: "DELETE" });
  },
};

export const incomeApi = {
  async getAll(params?: { startDate?: string; endDate?: string }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    const queryString = queryParams.toString();
    const url = queryString ? `/incomes?${queryString}` : "/incomes";
    return request(url, { method: "GET" });
  },

  async getById(id: string): Promise<ApiResponse> {
    return request(`/incomes/${id}`, { method: "GET" });
  },

  async create(data: any): Promise<ApiResponse> {
    return request("/incomes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: any): Promise<ApiResponse> {
    return request(`/incomes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse> {
    return request(`/incomes/${id}`, { method: "DELETE" });
  },
};

export const financeApi = {
  async getSummary(): Promise<ApiResponse> {
    return request("/finance/summary", { method: "GET" });
  },

  async getIncomeBySource(): Promise<ApiResponse> {
    return request("/finance/income-by-source", { method: "GET" });
  },

  async getTransactions(params?: { limit?: number }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", String(params.limit));
    const queryString = queryParams.toString();
    const url = queryString ? `/finance/transactions?${queryString}` : "/finance/transactions";
    return request(url, { method: "GET" });
  },

  async getProfitLoss(params?: { startDate?: string; endDate?: string }): Promise<ApiResponse> {
    const q = new URLSearchParams();
    if (params?.startDate) q.set("startDate", params.startDate);
    if (params?.endDate) q.set("endDate", params.endDate);
    const qs = q.toString();
    return request(`/finance/statements/profit-loss${qs ? `?${qs}` : ""}`, { method: "GET" });
  },

  async getBalanceSheet(params?: { asOfDate?: string }): Promise<ApiResponse> {
    const q = new URLSearchParams();
    if (params?.asOfDate) q.set("asOfDate", params.asOfDate);
    const qs = q.toString();
    return request(`/finance/statements/balance-sheet${qs ? `?${qs}` : ""}`, { method: "GET" });
  },

  async getCashFlow(params?: { startDate?: string; endDate?: string }): Promise<ApiResponse> {
    const q = new URLSearchParams();
    if (params?.startDate) q.set("startDate", params.startDate);
    if (params?.endDate) q.set("endDate", params.endDate);
    const qs = q.toString();
    return request(`/finance/statements/cash-flow${qs ? `?${qs}` : ""}`, { method: "GET" });
  },
};

export const payrollApi = {
  async getAll(params?: { startDate?: string; endDate?: string }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    const queryString = queryParams.toString();
    const url = queryString ? `/payrolls?${queryString}` : "/payrolls";
    return request(url, { method: "GET" });
  },

  async getById(id: string): Promise<ApiResponse> {
    return request(`/payrolls/${id}`, { method: "GET" });
  },

  async create(data: Record<string, unknown>): Promise<ApiResponse> {
    return request("/payrolls", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return request(`/payrolls/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse> {
    return request(`/payrolls/${id}`, { method: "DELETE" });
  },
};

export const billApi = {
  async getAll(params?: { startDate?: string; endDate?: string; status?: string }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.status) queryParams.append("status", params.status);
    const queryString = queryParams.toString();
    const url = queryString ? `/bills?${queryString}` : "/bills";
    return request(url, { method: "GET" });
  },

  async getById(id: string): Promise<ApiResponse> {
    return request(`/bills/${id}`, { method: "GET" });
  },

  async create(data: Record<string, unknown>): Promise<ApiResponse> {
    return request("/bills", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return request(`/bills/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async markPaid(id: string, data?: Record<string, unknown>): Promise<ApiResponse> {
    return request(`/bills/${id}/mark-paid`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    });
  },

  async delete(id: string): Promise<ApiResponse> {
    return request(`/bills/${id}`, { method: "DELETE" });
  },
};

export const taxApi = {
  async getAll(params?: { startDate?: string; endDate?: string; status?: string }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.status) queryParams.append("status", params.status);
    const queryString = queryParams.toString();
    const url = queryString ? `/taxes?${queryString}` : "/taxes";
    return request(url, { method: "GET" });
  },

  async getById(id: string): Promise<ApiResponse> {
    return request(`/taxes/${id}`, { method: "GET" });
  },

  async create(data: Record<string, unknown>): Promise<ApiResponse> {
    return request("/taxes", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return request(`/taxes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async markPaid(id: string, data?: Record<string, unknown>): Promise<ApiResponse> {
    return request(`/taxes/${id}/mark-paid`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    });
  },

  async delete(id: string): Promise<ApiResponse> {
    return request(`/taxes/${id}`, { method: "DELETE" });
  },
};

export const bankDepositApi = {
  async getAll(params?: { startDate?: string; endDate?: string }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    const queryString = queryParams.toString();
    const url = queryString ? `/bank-deposits?${queryString}` : "/bank-deposits";
    return request(url, { method: "GET" });
  },

  async getSummary(params?: { viewPeriod?: string; referenceDate?: string }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.viewPeriod) queryParams.append("viewPeriod", params.viewPeriod);
    if (params?.referenceDate) queryParams.append("referenceDate", params.referenceDate);
    const queryString = queryParams.toString();
    const url = queryString ? `/bank-deposits/summary?${queryString}` : "/bank-deposits/summary";
    return request(url, { method: "GET" });
  },

  async getById(id: string): Promise<ApiResponse> {
    return request(`/bank-deposits/${id}`, { method: "GET" });
  },

  async create(data: Record<string, unknown>): Promise<ApiResponse> {
    return request("/bank-deposits", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return request(`/bank-deposits/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse> {
    return request(`/bank-deposits/${id}`, { method: "DELETE" });
  },
};

export const loanApi = {
  async getAll(params?: { status?: string }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    const queryString = queryParams.toString();
    const url = queryString ? `/loans?${queryString}` : "/loans";
    return request(url, { method: "GET" });
  },

  async getSummary(): Promise<ApiResponse> {
    return request("/loans/summary", { method: "GET" });
  },

  async getById(id: string): Promise<ApiResponse> {
    return request(`/loans/${id}`, { method: "GET" });
  },

  async create(data: Record<string, unknown>): Promise<ApiResponse> {
    return request("/loans", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return request(`/loans/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async recordPayment(id: string, data?: Record<string, unknown>): Promise<ApiResponse> {
    return request(`/loans/${id}/record-payment`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    });
  },

  async delete(id: string): Promise<ApiResponse> {
    return request(`/loans/${id}`, { method: "DELETE" });
  },
};

export const invoiceApi = {
  async getAll(params?: { status?: string; clientId?: string }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.clientId) queryParams.append("clientId", params.clientId);
    const queryString = queryParams.toString();
    const url = queryString ? `/invoices?${queryString}` : "/invoices";
    return request(url, { method: "GET" });
  },

  async getSummary(): Promise<ApiResponse> {
    return request("/invoices/summary", { method: "GET" });
  },

  async getById(id: string): Promise<ApiResponse> {
    return request(`/invoices/${id}`, { method: "GET" });
  },

  async create(data: Record<string, unknown>): Promise<ApiResponse> {
    return request("/invoices", { method: "POST", body: JSON.stringify(data) });
  },

  async update(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return request(`/invoices/${id}`, { method: "PUT", body: JSON.stringify(data) });
  },

  async markSent(id: string): Promise<ApiResponse> {
    return request(`/invoices/${id}/mark-sent`, { method: "POST" });
  },

  async markPaid(id: string, data?: Record<string, unknown>): Promise<ApiResponse> {
    return request(`/invoices/${id}/mark-paid`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    });
  },

  async delete(id: string): Promise<ApiResponse> {
    return request(`/invoices/${id}`, { method: "DELETE" });
  },
};

export const documentApi = {
  async getAll(params?: { startDate?: string; endDate?: string }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    const queryString = queryParams.toString();
    const url = queryString ? `/documents?${queryString}` : "/documents";
    return request(url, { method: "GET" });
  },

  async getById(id: string): Promise<ApiResponse> {
    return request(`/documents/${id}`, { method: "GET" });
  },

  async create(data: Record<string, unknown>): Promise<ApiResponse> {
    return request("/documents", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return request(`/documents/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse> {
    return request(`/documents/${id}`, { method: "DELETE" });
  },
};

export const recurringExpenseApi = {
  async getAll(): Promise<ApiResponse> {
    return request("/recurring-expenses", { method: "GET" });
  },

  async create(data: Record<string, unknown>): Promise<ApiResponse> {
    return request("/recurring-expenses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return request(`/recurring-expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse> {
    return request(`/recurring-expenses/${id}`, { method: "DELETE" });
  },

  async markPaid(id: string): Promise<ApiResponse> {
    return request(`/recurring-expenses/${id}/mark-paid`, { method: "POST" });
  },
};

// Inventory API functions
export const inventoryApi = {
  async getAll(): Promise<ApiResponse> {
    return request('/inventories', { method: 'GET' });
  },

  async getById(id: string): Promise<ApiResponse> {
    return request(`/inventories/${id}`, { method: 'GET' });
  },

  async create(data: { name: string; description?: string }): Promise<ApiResponse> {
    return request('/inventories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: { name?: string; description?: string }): Promise<ApiResponse> {
    return request(`/inventories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse> {
    return request(`/inventories/${id}`, { method: 'DELETE' });
  },
};

// Notification API functions
export const notificationApi = {
  // Get all notifications for the current user
  async getAll(): Promise<ApiResponse> {
    return request('/notifications', {
      method: 'GET',
    });
  },

  // Create a notification
  async create(data: { type: string; title: string; body: string; icon?: string; data?: any }): Promise<ApiResponse> {
    return request('/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Mark a single notification as read
  async markAsRead(id: string): Promise<ApiResponse> {
    return request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  },

  // Mark all notifications as read
  async markAllAsRead(): Promise<ApiResponse> {
    return request('/notifications/read-all', {
      method: 'PUT',
    });
  },

  // Delete a single notification
  async delete(id: string): Promise<ApiResponse> {
    return request(`/notifications/${id}`, {
      method: 'DELETE',
    });
  },

  // Clear all notifications
  async clearAll(): Promise<ApiResponse> {
    return request('/notifications/all', {
      method: 'DELETE',
    });
  },
};

export const bookingApi = {
  async getAll(params?: { status?: string; date?: string; from?: string; to?: string }): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.date) queryParams.append('date', params.date);
    if (params?.from) queryParams.append('from', params.from);
    if (params?.to) queryParams.append('to', params.to);
    const queryString = queryParams.toString();
    const url = queryString ? `/bookings?${queryString}` : '/bookings';
    return request(url, { method: 'GET' });
  },

  async create(data: Record<string, unknown>): Promise<ApiResponse> {
    return request('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Record<string, unknown>): Promise<ApiResponse> {
    return request(`/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse> {
    return request(`/bookings/${id}`, { method: 'DELETE' });
  },
};

export const subscriptionApi = {
  async getStatus(sync = false): Promise<ApiResponse> {
    const qs = sync ? '?sync=1' : '';
    return request(`/subscription/status${qs}`, { method: 'GET' });
  },

  async pay(
    phone: string,
    network?: 'mtn' | 'airtel',
    options?: { forceRetry?: boolean },
  ): Promise<ApiResponse> {
    return request('/subscription/pay', {
      method: 'POST',
      body: JSON.stringify({
        phone,
        network,
        ...(options?.forceRetry ? { forceRetry: true } : {}),
      }),
    });
  },

  async getPaymentStatus(referenceId: string): Promise<ApiResponse> {
    return request(`/subscription/payments/${encodeURIComponent(referenceId)}`, {
      method: 'GET',
    });
  },

  async cancel(): Promise<ApiResponse> {
    return request('/subscription/cancel', { method: 'POST' });
  },
};

export const workspaceApi = {
  async list(): Promise<ApiResponse & { workspaces?: unknown[]; pages?: unknown[] }> {
    return request('/workspaces', { method: 'GET' });
  },

  async create(data: { name: string }): Promise<ApiResponse & { workspace?: unknown }> {
    return request('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(
    workspaceId: string,
    data: { name: string },
  ): Promise<ApiResponse & { workspace?: unknown }> {
    return request(`/workspaces/${encodeURIComponent(workspaceId)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async getMembers(workspaceId: string): Promise<ApiResponse> {
    return request(`/workspaces/${encodeURIComponent(workspaceId)}/members`, { method: 'GET' });
  },

  async searchInviteUsers(
    workspaceId: string,
    query: string,
  ): Promise<
    ApiResponse & {
      users?: Array<{
        id: string;
        name: string;
        email: string;
        profilePictureUrl?: string | null;
        alreadyMember: boolean;
      }>;
    }
  > {
    const params = new URLSearchParams({ q: query });
    return request(
      `/workspaces/${encodeURIComponent(workspaceId)}/invite-search?${params.toString()}`,
      { method: 'GET' },
    );
  },

  async invite(
    workspaceId: string,
    data: { email: string; role?: 'admin' | 'member'; permissions?: string[] },
  ): Promise<ApiResponse> {
    return request(`/workspaces/${encodeURIComponent(workspaceId)}/invites`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async previewInvite(token: string): Promise<ApiResponse> {
    return request(`/workspaces/invites/${encodeURIComponent(token)}`, { method: 'GET' });
  },

  async acceptInvite(token: string): Promise<ApiResponse & { workspace?: unknown }> {
    return request(`/workspaces/invites/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
    });
  },

  async updateMember(
    workspaceId: string,
    memberId: string,
    data: { role?: 'admin' | 'member'; permissions?: string[] },
  ): Promise<ApiResponse> {
    return request(
      `/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(memberId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      },
    );
  },

  async removeMember(workspaceId: string, memberId: string): Promise<ApiResponse> {
    return request(
      `/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(memberId)}`,
      { method: 'DELETE' },
    );
  },

  async revokeInvite(workspaceId: string, inviteId: string): Promise<ApiResponse> {
    return request(
      `/workspaces/${encodeURIComponent(workspaceId)}/invites/${encodeURIComponent(inviteId)}`,
      { method: 'DELETE' },
    );
  },
};
