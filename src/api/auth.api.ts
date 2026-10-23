
import { apiClient } from "./client";

export type AuthUser = {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  createdAt: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: AuthUser;
};

export type RegistrationDetails = {
  name: string;
  email: string;
  phone: string;
};

export type OtpMode = "register" | "login";

export type PhoneVerificationResult =
  | {
      nextStep: "email_verification";
      email: string;
      expiresInSeconds: number;
      message: string;
    }
  | AuthResponse;

export async function requestOtp(
  mode: OtpMode,
  details: RegistrationDetails,
): Promise<void> {
  await apiClient.post("/auth/request-otp", {
    mode,
    phone: details.phone,
    ...(mode === "register"
      ? {
          name: details.name.trim(),
          email: details.email.trim().toLowerCase(),
        }
      : {}),
  });
}

export async function verifyOtp(
  phone: string,
  otp: string,
): Promise<PhoneVerificationResult> {
  const response = await apiClient.post<{
    success: boolean;
    data: PhoneVerificationResult;
  }>("/auth/verify-otp", { phone, otp });

  return response.data.data;
}

export async function requestEmailOtp(phone: string): Promise<void> {
  await apiClient.post("/auth/request-email-otp", { phone });
}

export async function verifyEmailOtp(
  phone: string,
  otp: string,
): Promise<AuthResponse> {
  const response = await apiClient.post<{
    success: boolean;
    data: AuthResponse;
  }>("/auth/verify-email-otp", { phone, otp });

  return response.data.data;
}

export async function refreshSession(refreshToken: string) {
  const response = await apiClient.post<{
    success: boolean;
    data: Pick<
      AuthResponse,
      "accessToken" | "refreshToken" | "tokenType" | "expiresIn"
    >;
  }>("/auth/refresh", { refreshToken });

  return response.data.data;
}

export async function logoutSession(
  refreshToken: string,
): Promise<void> {
  await apiClient.post("/auth/logout", { refreshToken });
}
