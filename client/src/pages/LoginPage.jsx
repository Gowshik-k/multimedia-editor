import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDemoSubmitting, setIsDemoSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsDemoSubmitting(true);
    setErrorMsg('');
    try {
      await demoLogin();
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Demo session failed');
    } finally {
      setIsDemoSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4 sm:p-6 text-neutral-900 select-none">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand */}
        <div className="text-center space-y-1">
          <div className="inline-flex w-10 h-10 rounded-lg bg-neutral-900 items-center justify-center text-white font-mono text-sm font-bold shadow-xs mb-2">
            O
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            OmniMedia Studio
          </h1>
          <p className="text-xs text-neutral-500">
            Unified Multimedia Creation & Real-Time Sync
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Instant 1-Click Demo */}
          <button
            onClick={handleDemoLogin}
            disabled={isDemoSubmitting}
            className="w-full py-2.5 px-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium flex items-center justify-center space-x-2 shadow-xs transition"
          >
            {isDemoSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            <span>1-Click Instant Demo Login</span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-neutral-200"></div>
            <span className="flex-shrink mx-3 text-[10px] text-neutral-400 uppercase tracking-wider font-mono">
              or email
            </span>
            <div className="flex-grow border-t border-neutral-200"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="text-neutral-700 text-[11px] font-medium">Email</label>
              <input
                type="email"
                required
                placeholder="creator@studio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-neutral-700 text-[11px] font-medium">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 rounded-md font-medium flex items-center justify-center border border-neutral-300 transition"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-neutral-700" />
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Default preloaded account */}
          <div className="p-2.5 rounded bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-500">
            <span className="font-medium text-neutral-700">Preloaded account: </span>
            <span className="font-mono">demo@omnimedia.studio / password123</span>
          </div>
        </div>

        <div className="text-center text-xs text-neutral-500">
          Need an account?{' '}
          <Link to="/register" className="text-neutral-900 font-medium hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
