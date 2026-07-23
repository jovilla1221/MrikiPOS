import { apiClient } from './client';

export interface RegisterPayload {
  nama: string;
  phone: string;
  pin: string;
  nama_usaha: string;
}

export interface LoginPayload {
  phone: string;
  pin: string;
}

export interface VerifyOtpPayload {
  phone: string;
  code: string;
  type: 'register' | 'login' | 'forgot_pin';
}

export async function registerApi(payload: RegisterPayload) {
  return apiClient<{ user_id: string; tenant_id: string; otp_sent: boolean }>('/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginApi(payload: LoginPayload) {
  return apiClient<{
    user: any;
    tokens: { access_token: string; refresh_token: string };
  }>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function verifyOtpApi(payload: VerifyOtpPayload) {
  return apiClient<{
    verified: boolean;
    user?: any;
    tokens?: { access_token: string; refresh_token: string };
  }>('/v1/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logoutApi() {
  return apiClient<{ message: string }>('/v1/auth/logout', {
    method: 'POST',
  });
}
