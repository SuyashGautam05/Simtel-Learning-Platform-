import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap, Mail, Lock, User, Building2, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const PASSWORD_RULES = [
  { test: (v) => v.length >= 8, label: "At least 8 characters" },
  { test: (v) => /[A-Z]/.test(v), label: "One uppercase letter" },
  { test: (v) => /[a-z]/.test(v), label: "One lowercase letter" },
  { test: (v) => /[0-9]/.test(v), label: "One number" },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [collegeCode, setCollegeCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await register({ name, email, password, collegeCode: collegeCode.trim() || undefined });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-white">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-navy p-12 text-white lg:flex">
        <div className="absolute -left-24 -top-24 h-72 w-72 animate-float rounded-full bg-navy-600/40 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 animate-float rounded-full bg-gold/10 blur-3xl [animation-delay:1s]" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold shadow-card">
            <Zap size={22} className="text-navy" fill="currentColor" />
          </div>
          <span className="text-lg font-bold tracking-tight">Simtel Learning Platform</span>
        </div>

        <div className="relative z-10 animate-fade-in">
          <h1 className="text-4xl font-extrabold leading-tight">
            Create your account,
            <br />
            <span className="text-gold">start with the basics.</span>
          </h1>
          <p className="mt-4 max-w-md text-navy-200">
            Sign up to get started. Module access (PLC, Electrical, Embedded and more) is
            unlocked separately by your college admin using a product key.
          </p>
        </div>

        <p className="relative z-10 text-xs text-navy-300">
          © {new Date().getFullYear()} Simtel. All rights reserved.
        </p>
      </div>

      <div className="flex w-full flex-col items-center justify-center overflow-y-auto px-6 py-10 lg:w-1/2">
        <div className="w-full max-w-sm animate-fade-in-scale">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy text-gold">
              <Zap size={18} fill="currentColor" />
            </div>
            <span className="text-base font-bold text-navy-900">Simtel</span>
          </div>

          <h2 className="text-2xl font-bold text-navy-900">Create your account</h2>
          <p className="mt-1 text-sm text-navy-400">Takes less than a minute.</p>

          {success ? (
            <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-gold-200 bg-gold-50 px-4 py-8 text-center animate-fade-in">
              <CheckCircle2 size={32} className="text-gold-600" />
              <p className="text-sm font-semibold text-navy-900">Account created!</p>
              <p className="text-xs text-navy-400">Taking you to the login page...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-navy-700">Full name</label>
                <div className="relative">
                  <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-navy-700">Email</label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-navy-700">
                  College code <span className="font-normal text-navy-300">(optional)</span>
                </label>
                <div className="relative">
                  <Building2 size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
                  <input
                    type="text"
                    value={collegeCode}
                    onChange={(e) => setCollegeCode(e.target.value)}
                    placeholder="e.g. LNCT-BPL"
                    className="input-field pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-navy-700">Password</label>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-300" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-navy-300 hover:text-navy"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {password.length > 0 && (
                  <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 animate-fade-in">
                    {PASSWORD_RULES.map(({ test, label }) => {
                      const passed = test(password);
                      return (
                        <li
                          key={label}
                          className={`flex items-center gap-1.5 text-[11px] transition-colors ${
                            passed ? "text-gold-700" : "text-navy-300"
                          }`}
                        >
                          <CheckCircle2 size={12} className={passed ? "opacity-100" : "opacity-40"} />
                          {label}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {error && (
                <div className="animate-fade-in rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                  {error}
                </div>
              )}

              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <>
                    Create account <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-navy-400">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-navy hover:text-gold-600">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}