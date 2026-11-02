import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await register(username, email, password);
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
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
            Create Studio Account
          </h1>
          <p className="text-xs text-neutral-500">
            Real-time collaborative multimedia workspace
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div className="space-y-1">
              <label className="text-neutral-700 text-[11px] font-medium">Username</label>
              <input
                type="text"
                required
                placeholder="Alex Creator"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-300 rounded-md px-3 py-2 text-neutral-900 outline-none focus:border-neutral-900 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-neutral-700 text-[11px] font-medium">Email address</label>
              <input
                type="email"
                required
                placeholder="alex@studio.com"
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
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md font-medium flex items-center justify-center shadow-xs transition"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <span>Register</span>
              )}
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-neutral-500">
          Already have an account?{' '}
          <Link to="/login" className="text-neutral-900 font-medium hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
