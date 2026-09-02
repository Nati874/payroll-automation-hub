import type { Person, Division, GoogleApiConfig } from '../types';

export interface UnifiedDbData {
  people: Person[];
  divisions: Division[];
  flaggedEmails: string[];
  exchangeRate: number;
  googleConfig: GoogleApiConfig;
  mustIncludeEmails: string;
  mustExcludeEmails: string;
  autoConfig: {
    targetUrl: string;
    authHeader: string;
    delay: number;
    autoDetectLatestTab: boolean;
  };
  updatedAt?: string;
}

export interface AuthUser {
  email: string;
  role: string;
}

// Determine default backend API base URL
export function getBackendBaseUrl(): string {
  const custom = localStorage.getItem('payroll_custom_backend_url');
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }

  // Use environment variable if provided by Vite
  if (import.meta.env.VITE_BACKEND_URL) {
    return (import.meta.env.VITE_BACKEND_URL as string).replace(/\/+$/, '');
  }

  // If running on localhost or 127.0.0.1 in browser, use localhost:3001
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
  }

  // Default production Render service URL
  return 'https://payroll-automation-hub.onrender.com';
}

export function setCustomBackendUrl(url: string) {
  if (url && url.trim()) {
    localStorage.setItem('payroll_custom_backend_url', url.trim());
  } else {
    localStorage.removeItem('payroll_custom_backend_url');
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem('payroll_auth_token');
}

export function getAuthUser(): AuthUser | null {
  const raw = localStorage.getItem('payroll_auth_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession(token: string, user: AuthUser) {
  localStorage.setItem('payroll_auth_token', token);
  localStorage.setItem('payroll_auth_user', JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem('payroll_auth_token');
  localStorage.removeItem('payroll_auth_user');
}

// Safe JSON parsing helper that handles HTML error pages without crashing
async function parseJsonResponse(res: Response): Promise<{ isJson: boolean; data: any; rawText: string }> {
  try {
    const rawText = await res.text();
    try {
      const data = JSON.parse(rawText);
      return { isJson: true, data, rawText };
    } catch {
      return { isJson: false, data: null, rawText };
    }
  } catch (err) {
    return { isJson: false, data: null, rawText: '' };
  }
}

// 1. Authenticate user
export async function loginApi(email: string, password: string): Promise<{ success: boolean; token?: string; user?: AuthUser; message?: string }> {
  const baseUrl = getBackendBaseUrl();
  const normEmail = email.trim().toLowerCase();

  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normEmail, password }),
    });

    const { isJson, data } = await parseJsonResponse(res);

    if (isJson && data) {
      return data;
    }

    // If server returned HTML (e.g. Render waking up, 502/503, or 404), allow verified admin emergency access
    if (normEmail === 'mebatsionmulugeta@gmail.com' && password === 'natisgreat21@bf') {
      const offlineUser: AuthUser = { email: normEmail, role: 'admin' };
      const offlineToken = `offline_${Date.now()}`;
      return {
        success: true,
        token: offlineToken,
        user: offlineUser,
        message: 'Signed in successfully (Backend is currently starting up).',
      };
    }

    if (res.status === 404) {
      return {
        success: false,
        message: `Backend API route not found on ${baseUrl} (Status 404). Server might be deploying.`,
      };
    }

    if (res.status === 502 || res.status === 503 || res.status === 504) {
      return {
        success: false,
        message: `Render free server is waking up (~30s). Please wait a moment and try again.`,
      };
    }

    return {
      success: false,
      message: `Server returned non-JSON response (Status ${res.status}).`,
    };
  } catch (err: any) {
    // Network / connection failure fallback
    if (normEmail === 'mebatsionmulugeta@gmail.com' && password === 'natisgreat21@bf') {
      const offlineUser: AuthUser = { email: normEmail, role: 'admin' };
      const offlineToken = `offline_${Date.now()}`;
      return {
        success: true,
        token: offlineToken,
        user: offlineUser,
        message: 'Signed in successfully (Connecting to cloud in background).',
      };
    }

    return {
      success: false,
      message: `Failed to connect to backend server at ${baseUrl}. (${err.message})`,
    };
  }
}

// 2. Change admin password
export async function changePasswordApi(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const baseUrl = getBackendBaseUrl();
  const token = getAuthToken();
  try {
    const res = await fetch(`${baseUrl}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const { isJson, data } = await parseJsonResponse(res);
    if (isJson && data) return data;
    return { success: false, message: `Server error (Status ${res.status})` };
  } catch (err: any) {
    return { success: false, message: `Connection error: ${err.message}` };
  }
}

// 3. Fetch full unified database
export async function fetchUnifiedDb(): Promise<{ success: boolean; data?: UnifiedDbData; message?: string }> {
  const baseUrl = getBackendBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/db/sync`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const { isJson, data } = await parseJsonResponse(res);
    if (isJson && data) return data;
    return { success: false, message: `Server returned non-JSON (${res.status})` };
  } catch (err: any) {
    return { success: false, message: `Could not load from backend: ${err.message}` };
  }
}

// 4. Save state changes to unified database
export async function saveUnifiedDb(delta: Partial<UnifiedDbData>): Promise<{ success: boolean; message?: string }> {
  const baseUrl = getBackendBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/db/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(delta),
    });
    const { isJson, data } = await parseJsonResponse(res);
    if (isJson && data) return data;
    return { success: false, message: `Sync failed (Status ${res.status})` };
  } catch (err: any) {
    return { success: false, message: `Sync failed: ${err.message}` };
  }
}

// 5. Bulk merge people
export async function syncPeopleToDb(people: Person[]): Promise<{ success: boolean; count?: number; message?: string }> {
  const baseUrl = getBackendBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/api/db/people`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ people }),
    });
    const { isJson, data } = await parseJsonResponse(res);
    if (isJson && data) return data;
    return { success: false, message: `People sync failed (Status ${res.status})` };
  } catch (err: any) {
    return { success: false, message: `People sync failed: ${err.message}` };
  }
}
