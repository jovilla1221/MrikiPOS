import { UserSession } from './user';

export interface TokenPayload {
  sub: string; // user_id
  tenant_id: string; // tenant_id
  outlet_id: string; // outlet_id
  role: string; // UserRole
  phone: string;
  jti?: string; // unique token id for access token revocation
  iat?: number; // issued-at timestamp used for session revocation
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
}

export interface AuthResponse {
  user: UserSession;
  tokens: AuthTokens;
}

export interface OtpResponse {
  otp_sent: boolean;
  expires_in: number;
  message: string;
}
