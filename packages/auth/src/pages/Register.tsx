import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import AuthService from "../services/auth.service";

interface RegisterProps {
  onLogin: () => void;
}

export default function Register({ onLogin }: RegisterProps) {
  const [companyName, setCompanyName] = useState("");
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }

    if (!domain.trim()) {
      setError("Domain name is required (e.g. acme.com).");
      return;
    }

    if (!email.trim()) {
      setError("Admin email is required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await AuthService.register({
        companyName,
        domain,
        adminEmail: email,
        password,
      });

      setMessage(
        "Self-registration submitted successfully! Your tenant status is 'Pending Approval'. A Super Admin will review and activate your company."
      );
      
      // Clear fields on success
      setCompanyName("");
      setDomain("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Unable to register.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-lg rounded-2xl bg-white p-10 shadow-xl border border-slate-200">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white text-xl font-bold">
            H
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            Tenant Self-Registration
          </h1>
          <p className="mt-2 text-slate-500">
            Register your company and admin account
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Company Name</label>
            <input
              type="text"
              placeholder="e.g. Acme Corp"
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-600 transition"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Company Domain</label>
            <input
              type="text"
              placeholder="e.g. acme.com"
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-600 transition"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Admin Email Address</label>
            <input
              type="email"
              placeholder="e.g. admin@acme.com"
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-600 transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                className="w-full rounded-lg border border-slate-300 p-3 pr-12 outline-none focus:border-blue-600 transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4 text-slate-500 hover:text-slate-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm Password</label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm password"
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-600 transition"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {message && (
            <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-200">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-800 border border-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition disabled:bg-blue-400"
          >
            {loading ? "Registering..." : "Submit Registration"}
          </button>
        </form>

        <div className="mt-8 text-center text-slate-600">
          Already have an account?
          <button
            onClick={onLogin}
            className="ml-2 font-semibold text-blue-600 hover:underline"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}