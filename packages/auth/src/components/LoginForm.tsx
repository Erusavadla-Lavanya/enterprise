import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import AuthService from "../services/auth.service";
import GoogleButton from "./GoogleButton";

interface LoginFormProps {
  onForgotPassword: () => void;
  onRegister: () => void;
}

export default function LoginForm({
  onForgotPassword,
  onRegister,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleAuthError = (e: any) => {
      setError(e.detail || "User is not authorized");
    };
    window.addEventListener("hrms:auth-error", handleAuthError);
    return () => {
      window.removeEventListener("hrms:auth-error", handleAuthError);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!password.trim()) {
      setError("Password is required.");
      return;
    }

    try {
      setLoading(true);
      const user = await AuthService.login({ email, password });
      console.log("Login Successful", user);
    } catch (err: any) {
      setError(err.message || "Unable to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-10 shadow-xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-xl font-bold text-white">
          H
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Welcome to HRMS
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Email
          </label>
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-12 outline-none transition focus:border-blue-600 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-3.5 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:bg-blue-400 text-sm"
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>
      </form>

      <div className="my-6 flex items-center">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="mx-4 text-xs text-gray-400 font-medium">OR</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <GoogleButton />
    </div>
  );
}