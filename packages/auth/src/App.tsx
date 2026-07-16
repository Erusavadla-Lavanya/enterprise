import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import AuthService from "./services/auth.service";
import { restoreRedirectSession } from "./session";
import { signOut } from "aws-amplify/auth";
import "./amplify";

type AuthPage = "login" | "register" | "forgot-password";

const decodeJwt = (token: string) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export default function App() {
  const [page, setPage] = useState<AuthPage>("login");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      const justLoggedOut = sessionStorage.getItem('hrms.loggedOut') === 'true';
      if (justLoggedOut) {
        sessionStorage.removeItem('hrms.loggedOut');
        try {
          await signOut();
        } catch (e) {
          console.error("Failed to sign out of Cognito:", e);
        }
        setLoading(false);
        return;
      }

      try {
        // 1. Try to recover redirect session from Cognito
        const cognitoSession = await restoreRedirectSession();
        if (cognitoSession) {
          try {
            window.history.replaceState({}, document.title, window.location.origin + '/');
          } catch (e) {}

          const decoded = decodeJwt(cognitoSession.idToken);
          const email = decoded?.email;
          if (email) {
            const user = await AuthService.oauthLogin(email);
            window.dispatchEvent(
              new CustomEvent("hrms:auth-session", {
                detail: user,
              }),
            );
            return;
          }
        }
      } catch (err: any) {
        console.error("Cognito Redirect Authentication failed:", err);
        const errMsg = err.message || "";
        try {
          window.history.replaceState({}, document.title, window.location.origin + '/');
        } catch (e) {}

        if (errMsg.includes("User is not authorized")) {
          window.dispatchEvent(new CustomEvent("hrms:auth-unauthorized"));
        } else {
          window.dispatchEvent(
            new CustomEvent("hrms:auth-error", {
              detail: errMsg || "Cognito redirect authentication failed.",
            }),
          );
        }
        return;
      }

      // 2. Regular check for existing session
      try {
        const user = await AuthService.getSession();
        if (user) {
          window.dispatchEvent(
            new CustomEvent("hrms:auth-session", {
              detail: user,
            }),
          );
        }
      } catch {
        // User not signed in
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-5 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  switch (page) {
    case "register":
      return (
        <Register
          onLogin={() => setPage("login")}
        />
      );

    case "forgot-password":
      return (
        <ForgotPassword
          onBackToLogin={() => setPage("login")}
        />
      );

    default:
      return (
        <Login
          onRegister={() => setPage("register")}
          onForgotPassword={() => setPage("forgot-password")}
        />
      );
  }
}