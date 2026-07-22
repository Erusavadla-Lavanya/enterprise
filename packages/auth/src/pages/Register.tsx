import { FormEvent, useState } from "react";
import { Eye, EyeOff, CreditCard, Shield, CheckCircle2, DollarSign } from "lucide-react";
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

  // Subscription and payment states
  const [plan, setPlan] = useState<"basic" | "standard" | "premium">("basic");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);

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

    // Validate payment if Standard or Premium is chosen
    if (plan !== "basic") {
      if (!cardName.trim()) {
        setError("Cardholder name is required.");
        return;
      }
      const cleanCard = cardNumber.replace(/\s+/g, "");
      if (cleanCard.length < 16 || isNaN(Number(cleanCard))) {
        setError("Please enter a valid 16-digit credit card number.");
        return;
      }
      if (!cardExpiry.includes("/") || cardExpiry.length < 5) {
        setError("Please enter card expiry in MM/YY format.");
        return;
      }
      if (cardCvv.length < 3 || isNaN(Number(cardCvv))) {
        setError("Please enter a valid 3-digit CVV.");
        return;
      }
    }

    try {
      setLoading(true);
      if (plan !== "basic") {
        setPaymentProcessing(true);
        // Simulate minor payment gateway latency
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setPaymentProcessing(false);
      }

      await AuthService.register({
        companyName,
        domain,
        adminEmail: email,
        password,
        subscriptionPlan: plan,
      });

      setMessage(
        plan === "basic"
          ? "Self-registration submitted successfully! Your free tenant account status is pending approval."
          : `Payment successful and self-registration submitted! Your ${plan} plan is registered. A Super Admin will review and activate your company account.`
      );
      
      // Clear fields on success
      setCompanyName("");
      setDomain("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setCardName("");
      setCardNumber("");
      setCardExpiry("");
      setCardCvv("");
    } catch (err: any) {
      setError(err.message || "Unable to register.");
    } finally {
      setLoading(false);
      setPaymentProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-6 w-full">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-950 p-10 shadow-2xl border border-slate-800">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white text-xl font-bold shadow-lg shadow-blue-500/20">
            H
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Tenant Registration
          </h1>
          <p className="mt-2 text-slate-400">
            Configure your enterprise workspace & admin details
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          {/* Base Info Grid */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Company Name</label>
              <input
                type="text"
                placeholder="Acme Corp"
                className="w-full rounded-xl bg-slate-900 border border-slate-850 p-3 text-white placeholder-slate-600 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Company Domain</label>
              <input
                type="text"
                placeholder="acme.com"
                className="w-full rounded-xl bg-slate-900 border border-slate-850 p-3 text-white placeholder-slate-600 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Admin Email Address</label>
            <input
              type="email"
              placeholder="admin@acme.com"
              className="w-full rounded-xl bg-slate-900 border border-slate-850 p-3 text-white placeholder-slate-600 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 characters"
                  className="w-full rounded-xl bg-slate-900 border border-slate-850 p-3 text-white placeholder-slate-600 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-slate-500 hover:text-slate-350"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm password"
                className="w-full rounded-xl bg-slate-900 border border-slate-850 p-3 text-white placeholder-slate-600 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Plan Selection Cards */}
          <div className="space-y-3 pt-3 border-t border-slate-800/65">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Select Subscription Plan</label>
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Basic Plan */}
              <div
                onClick={() => setPlan("basic")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition select-none flex flex-col justify-between ${
                  plan === "basic" ? "border-blue-600 bg-blue-950/20" : "border-slate-850 bg-slate-900/40 hover:border-slate-700"
                }`}
              >
                <div>
                  <h3 className="font-bold text-white text-sm">Basic Plan</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Attendance & Leave portals only.</p>
                </div>
                <div className="mt-4 flex items-baseline">
                  <span className="text-xl font-extrabold text-white">Free</span>
                </div>
              </div>

              {/* Standard Plan */}
              <div
                onClick={() => setPlan("standard")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition select-none flex flex-col justify-between ${
                  plan === "standard" ? "border-blue-600 bg-blue-950/20" : "border-slate-850 bg-slate-900/40 hover:border-slate-700"
                }`}
              >
                <div>
                  <h3 className="font-bold text-white text-sm">Standard</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Attendance, Leave & Basic Payroll.</p>
                </div>
                <div className="mt-4 flex items-baseline">
                  <span className="text-xl font-extrabold text-white">$19</span>
                  <span className="text-[10px] text-slate-500 ml-1">/mo</span>
                </div>
              </div>

              {/* Premium Plan */}
              <div
                onClick={() => setPlan("premium")}
                className={`p-4 rounded-xl border-2 cursor-pointer transition select-none flex flex-col justify-between ${
                  plan === "premium" ? "border-blue-600 bg-blue-950/20" : "border-slate-850 bg-slate-900/40 hover:border-slate-700"
                }`}
              >
                <div>
                  <h3 className="font-bold text-white text-sm">Premium</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Full suite with maximum access & support.</p>
                </div>
                <div className="mt-4 flex items-baseline">
                  <span className="text-xl font-extrabold text-white">$49</span>
                  <span className="text-[10px] text-slate-500 ml-1">/mo</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section (Rendered for Standard / Premium plans) */}
          {plan !== "basic" && (
            <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-xl space-y-4 animate-fadeIn">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-850 pb-2">
                <CreditCard className="text-blue-500" size={16} />
                Payment Information ({plan === "standard" ? "$19.00" : "$49.00"}/month)
              </h3>
              
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-white placeholder-slate-700 outline-none focus:border-blue-600 transition text-sm"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Card Number</label>
                  <input
                    type="text"
                    maxLength={19}
                    placeholder="4111 2222 3333 4444"
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-white placeholder-slate-700 outline-none focus:border-blue-600 transition text-sm font-mono"
                    value={cardNumber}
                    onChange={(e) => {
                      // Add card spacing formatting automatically
                      const v = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
                      const matches = v.match(/\d{4,16}/g);
                      const match = (matches && matches[0]) || "";
                      const parts = [];

                      for (let i = 0, len = match.length; i < len; i += 4) {
                        parts.push(match.substring(i, i + 4));
                      }

                      if (parts.length > 0) {
                        setCardNumber(parts.join(" "));
                      } else {
                        setCardNumber(v);
                      }
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Expiry Date</label>
                    <input
                      type="text"
                      maxLength={5}
                      placeholder="MM/YY"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-white placeholder-slate-700 outline-none focus:border-blue-600 transition text-sm font-mono text-center"
                      value={cardExpiry}
                      onChange={(e) => {
                        let v = e.target.value.replace(/[^0-9/]/g, "");
                        if (v.length === 2 && !v.includes("/")) {
                          v += "/";
                        }
                        setCardExpiry(v);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">CVV Code</label>
                    <input
                      type="password"
                      maxLength={3}
                      placeholder="123"
                      className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-white placeholder-slate-700 outline-none focus:border-blue-600 transition text-sm font-mono text-center"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ""))}
                    />
                  </div>
                </div>
              </div>
              
              <div className="text-[10px] text-slate-500 flex items-start gap-1">
                <Shield size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Your payment details are encrypted. By subscribing, you authorize recurring monthly charges until canceled.</span>
              </div>
            </div>
          )}

          {message && (
            <div className="rounded-xl bg-emerald-950/40 p-4 text-sm text-emerald-400 border border-emerald-800/60 flex items-start gap-2">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-rose-950/40 p-4 text-sm text-rose-400 border border-rose-800/60">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || paymentProcessing}
            className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white hover:bg-blue-500 transition disabled:bg-blue-800 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            {paymentProcessing
              ? "Authorizing Card..."
              : loading
              ? "Registering Tenant..."
              : plan === "basic"
              ? "Submit Free Registration"
              : `Pay & Complete Registration`}
          </button>
        </form>

        <div className="mt-8 text-center text-slate-400 text-sm">
          Already have an account?
          <button
            onClick={onLogin}
            className="ml-2 font-bold text-blue-500 hover:underline"
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}