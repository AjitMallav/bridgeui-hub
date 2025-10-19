"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isValidEmail, isValidPhone, normalizePhone } from "@/lib/validators";
import { DemoUser, setUser, getUser, DEFAULT_PREFS } from "@/lib/demoAuth";
import { Mail, Phone } from "lucide-react";

type LoginMethod = "email" | "phone";
type Step = "input" | "verify";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();

  const [loginMethod, setLoginMethod] = useState<LoginMethod>("email");
  const [step, setStep] = useState<Step>("input");

  // Form states
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState(""); // visual only
  const [code, setCode] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [testCode, setTestCode] = useState<string>(""); // local MFA code

  const redirect = search.get("redirect") || "/dashboard";

  useEffect(() => {
    if (getUser()) router.replace(String(redirect));
  }, [redirect, router]);

  function resetToInput() {
    setStep("input");
    setCode("");
    setError("");
    setMessage("");
  }

  // STEP 1: send code (local/demo)
  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (loginMethod === "email") {
        if (!isValidEmail(email))
          throw new Error("Please enter a valid email address.");
      } else {
        if (!isValidPhone(phone))
          throw new Error(
            "Please enter a valid phone number (8–15 digits with optional +)."
          );
      }
      if (!password) throw new Error("Please enter your password.");

      const generated = Math.floor(100000 + Math.random() * 900000).toString();
      setTestCode(generated);
      setMessage("Verification code sent.");
      setStep("verify");

      setTimeout(
        () => alert(`BridgeUI – Your verification code is: ${generated}`),
        300
      );
    } catch (err: any) {
      setError(err.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: verify code (local/demo)
  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const entered = code.trim();
      if (entered.length !== 6 || !/^\d{6}$/.test(entered)) {
        throw new Error("Please enter the 6-digit code.");
      }
      if (entered !== testCode) throw new Error("Invalid verification code.");

      setMessage("Login successful! Redirecting...");

      const user: DemoUser = {
        name: loginMethod === "email" ? email.split("@")[0] || "User" : "User",
        email: loginMethod === "email" ? email.trim() : undefined,
        phone: loginMethod === "phone" ? normalizePhone(phone) : undefined,
        token:
          loginMethod === "email"
            ? `demo-${email.trim()}`
            : `demo-${normalizePhone(phone)}`,
        conditions: [],
        preferences: {
          ...DEFAULT_PREFS,
          buttonSize: 55,
          fontSize: 16,
          contrast: "high",
          spacing: "default"
        }
      };
      setUser(user);

      setTimeout(() => {
        router.replace(String(redirect));
        router.refresh();
      }, 400);
    } catch (err: any) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const submitDisabled =
    loading ||
    (loginMethod === "email" ? !isValidEmail(email) : !isValidPhone(phone)) ||
    !password;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-lg">
            <span className="text-lg font-extrabold">B</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Chameleon
            </span>
          </h1>
          <p className="text-sm text-slate-800 mt-1">
            Sign in with email or phone.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-300 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => {
                setLoginMethod("email");
                resetToInput();
              }}
              className={`flex-1 px-6 py-3 text-sm font-semibold transition-all ${
                loginMethod === "email"
                  ? "text-white bg-gradient-to-r from-green-600 to-emerald-700"
                  : "text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Mail size={16} className="inline -mt-0.5 mr-1" />
              Email Login
            </button>
            <button
              onClick={() => {
                setLoginMethod("phone");
                resetToInput();
              }}
              className={`flex-1 px-6 py-3 text-sm font-semibold transition-all ${
                loginMethod === "phone"
                  ? "text-white bg-gradient-to-r from-green-600 to-emerald-700"
                  : "text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Phone size={16} className="inline -mt-0.5 mr-1" />
              Phone Login
            </button>
          </div>

          <div className="p-6">
            {/* Error / Success */}
            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded-xl text-sm text-rose-800">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-sm text-emerald-800">
                {message}
              </div>
            )}

            {/* Step 1: Input */}
            {step === "input" && (
              <form onSubmit={handleSendCode} className="space-y-4">
                {loginMethod === "email" ? (
                  <>
                    <label
                      htmlFor="email"
                      className="block text-sm font-semibold text-slate-900"
                    >
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-slate-900 placeholder-slate-500"
                    />
                  </>
                ) : (
                  <>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-semibold text-slate-900"
                    >
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      required
                      placeholder="+1 206 555 0100"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-slate-900 placeholder-slate-500"
                    />
                    <p className="text-xs text-slate-700 mt-1">
                      Accepts (8–15 digits) or 10 digits.
                    </p>
                  </>
                )}

                <label
                  htmlFor="pwd"
                  className="block text-sm font-semibold text-slate-900"
                >
                  Password
                </label>
                <input
                  id="pwd"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-slate-900 placeholder-slate-500"
                />

                <button
                  type="submit"
                  disabled={submitDisabled}
                  className={`w-full h-11 rounded-xl text-sm font-semibold transition ${
                    submitDisabled
                      ? "cursor-not-allowed bg-slate-200 text-slate-600"
                      : "bg-slate-900 text-white hover:bg-black"
                  }`}
                >
                  {loading ? "Sending..." : "Send Verification Code"}
                </button>
              </form>
            )}

            {/* Step 2: Verify */}
            {step === "verify" && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <label
                  htmlFor="code"
                  className="block text-sm font-semibold text-slate-900"
                >
                  Verification Code
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={e =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-green-600 text-center text-2xl tracking-widest font-mono text-slate-900 placeholder-slate-500"
                />
                <p className="text-sm text-slate-800">
                  Code sent to{" "}
                  {loginMethod === "email" ? email : normalizePhone(phone)}
                </p>

                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className={`w-full h-11 rounded-xl text-sm font-semibold transition ${
                    loading || code.length !== 6
                      ? "cursor-not-allowed bg-slate-200 text-slate-600"
                      : "bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800"
                  }`}
                >
                  {loading ? "Verifying..." : "Verify & Login"}
                </button>

                <button
                  type="button"
                  onClick={resetToInput}
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  ← Back to input
                </button>
              </form>
            )}

            {/* Info Box */}
            <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-300">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">
                🔐 Verification
              </h4>
              <ul className="text-xs text-blue-900 space-y-1">
                <li>• 6-digit code shown in-page and via alert for demo.</li>
                <li>• No data leaves your device; this is local only.</li>
                <li>• In prod, these steps would call real APIs.</li>
              </ul>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full h-10 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            ← Back to Home
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-800 mt-6">
          Adaptive accessibility, powered by BridgeUI.
        </p>
      </div>
    </div>
  );
}
