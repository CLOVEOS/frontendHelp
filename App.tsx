import { useState } from "react";
import axios from "axios";

import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import OtpScreen from "./src/screens/OtpScreen";
import HomeScreen from "./src/screens/HomeScreen";

import {
  requestOtp,
  verifyOtp,
  requestEmailOtp,
  verifyEmailOtp,
} from "./src/api/auth.api";

import type {
  AuthUser,
  AuthResponse,
  RegistrationDetails,
  OtpMode,
} from "./src/api/auth.api";

import { clearTokens, saveTokens } from "./src/api/token-storage";

type Screen = "register" | "login" | "otp" | "emailOtp" | "home";

export default function App() {
  // New users see registration first.
  const [screen, setScreen] = useState<Screen>("register");
  const [authMode, setAuthMode] = useState<OtpMode>("register");

  const [phone, setPhone] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);

  async function handleRequestOtp(details: RegistrationDetails) {
    try {
      await requestOtp("register", details);

      setAuthMode("register");
      setPhone(details.phone);
      setUserName(details.name);
      setUserEmail(details.email);
      setScreen("otp");
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  }

  async function handleLoginRequestOtp(loginPhone: string) {
    try {
      const details: RegistrationDetails = {
        name: "",
        email: "",
        phone: loginPhone,
      };

      await requestOtp("login", details);

      setAuthMode("login");
      setPhone(loginPhone);
      setUserName("");
      setUserEmail("");
      setScreen("otp");
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  }

  async function handleVerifyPhoneOtp(otp: string) {
    try {
      const result = await verifyOtp(phone, otp);

      if (
        "nextStep" in result &&
        result.nextStep === "email_verification"
      ) {
        setUserEmail(result.email);
        setScreen("emailOtp");
        return;
      }

      await completeAuthentication(result);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  }

  async function handleResendPhoneOtp() {
    try {
      await requestOtp(authMode, {
        name: authMode === "register" ? userName : "",
        email: authMode === "register" ? userEmail : "",
        phone,
      });
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  }

  async function handleVerifyEmailOtp(otp: string) {
    try {
      const auth = await verifyEmailOtp(phone, otp);
      await completeAuthentication(auth);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  }

  async function handleResendEmailOtp() {
    try {
      await requestEmailOtp(phone);
    } catch (error) {
      throw new Error(getApiErrorMessage(error));
    }
  }

  async function completeAuthentication(auth: AuthResponse) {
    await saveTokens(auth);

    setUser(auth.user);
    setPhone(auth.user.phone);
    setUserName(auth.user.name ?? "");
    setUserEmail(auth.user.email ?? "");
    setScreen("home");
  }

  async function handleLogout() {
    try {
      await clearTokens();
    } catch (error) {
      console.warn("Failed to clear tokens:", error);
    } finally {
      setUser(null);
      setUserName("");
      setUserEmail("");
      setPhone("");
      setAuthMode("login");
      setScreen("login");
    }
  }

  if (screen === "register") {
    return (
      <RegisterScreen
        onContinue={handleRequestOtp}
        onLogin={() => setScreen("login")}
      />
    );
  }

  if (screen === "login") {
    return (
      <LoginScreen
        onContinue={handleLoginRequestOtp}
        onBack={() => setScreen("register")}
      />
    );
  }

  if (screen === "otp") {
    return (
      <OtpScreen
        key="phone-otp"
        phone={phone}
        channel="phone"
        onVerify={handleVerifyPhoneOtp}
        onResend={handleResendPhoneOtp}
        onBack={() => {
          setScreen(authMode === "register" ? "register" : "login");
        }}
      />
    );
  }

  if (screen === "emailOtp") {
    return (
      <OtpScreen
        key="email-otp"
        phone={userEmail}
        channel="email"
        onVerify={handleVerifyEmailOtp}
        onResend={handleResendEmailOtp}
        onBack={() => setScreen("otp")}
      />
    );
  }

  return (
    <HomeScreen
      userPhone={user?.phone ?? phone}
      userName={userName}
      userEmail={userEmail}
      onLogout={handleLogout}
    />
  );
}

function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return "Cannot reach MiniLedger. Check the backend and emulator connection.";
    }

    const message = (error.response.data as { message?: unknown } | undefined)
      ?.message;

    if (typeof message === "string" && message) return message;
    if (Array.isArray(message) && message.length) return message.join("\n");

    return "Something went wrong. Please try again.";
  }

  return error instanceof Error ? error.message : "Something went wrong.";
}
