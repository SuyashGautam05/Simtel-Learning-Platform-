import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-white">
      {/* Left branding panel */}
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
            Engineering education,
            <br />
            <span className="text-gold">simulated to scale.</span>
          </h1>
          <p className="mt-4 max-w-md text-navy-200">
            Interactive simulations, real experiments and structured theory across 15+
            engineering domains — PLC, VFD, Embedded, RF, IoT and more.
          </p>

          <div className="mt-8 flex gap-6 text-sm text-navy-200">
            <div>
              <p className="text-2xl font-bold text-white">15+</p>
              <p>Modules</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">100+</p>
              <p>Simulations</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">1000+</p>
              <p>Students</p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-navy-300">
          © {new Date().getFullYear()} Simtel. All rights reserved.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-col items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm animate-fade-in-scale">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy text-gold">
              <Zap size={18} fill="currentColor" />
            </div>
            <span className="text-base font-bold text-navy-900">Simtel</span>
          </div>

          <h2 className="text-2xl font-bold text-navy-900">Welcome back</h2>
          <p className="mt-1 text-sm text-navy-400">Sign in to continue your learning journey.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
                  Sign in <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-navy-400">
            Access is provisioned by your platform or college administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
