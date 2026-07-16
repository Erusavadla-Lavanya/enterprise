import { FormEvent, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import AuthService from "../services/auth.service";

interface ForgotPasswordProps {
  onBackToLogin: () => void;
}

export default function ForgotPassword({
  onBackToLogin,
}: ForgotPasswordProps) {
  const [step, setStep] = useState<1 | 2>(1);

  const [email, setEmail] = useState("");

  const [code, setCode] = useState("");

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  const sendCode = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    setLoading(true);

    setError("");

    try {
      await AuthService.forgotPassword(email);

      setMessage(
        "Verification code sent to your email."
      );

      setStep(2);
    } catch (err: any) {
      setError(
        err.message ||
          "Unable to send verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await AuthService.confirmForgotPassword(
        email,
        code,
        password,
      );

      setMessage(
        "Password changed successfully."
      );

      setTimeout(() => {
        onBackToLogin();
      }, 1500);
    } catch (err: any) {
      setError(
        err.message ||
          "Unable to reset password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">

      <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-xl">

        <div className="text-center">

          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white text-xl font-bold">
            H
          </div>

          <h1 className="text-3xl font-bold">
            Forgot Password
          </h1>

          <p className="mt-2 text-slate-500">
            Recover your HRMS account
          </p>

        </div>

        {step === 1 && (
          <form
            onSubmit={sendCode}
            className="mt-8 space-y-5"
          >
            <input
              type="email"
              placeholder="Email"
              className="w-full rounded-lg border p-3"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />

            <button
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white"
            >
              {loading
                ? "Sending..."
                : "Send Verification Code"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form
            onSubmit={resetPassword}
            className="mt-8 space-y-5"
          >
            <input
              placeholder="Verification Code"
              className="w-full rounded-lg border p-3"
              value={code}
              onChange={(e) =>
                setCode(e.target.value)
              }
            />

            <div className="relative">

              <input
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="New Password"
                className="w-full rounded-lg border p-3 pr-12"
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword,
                  )
                }
                className="absolute right-4 top-4"
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>

            </div>

            <input
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="Confirm Password"
              className="w-full rounded-lg border p-3"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(
                  e.target.value,
                )
              }
            />

            <button
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white"
            >
              {loading
                ? "Updating..."
                : "Reset Password"}
            </button>
          </form>
        )}

        {message && (
          <div className="mt-5 rounded-lg bg-green-100 p-3 text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-lg bg-red-100 p-3 text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={onBackToLogin}
          className="mt-8 w-full text-blue-600 hover:underline"
        >
          Back to Sign In
        </button>

      </div>
    </div>
  );
}