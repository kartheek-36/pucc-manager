'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, ArrowRight, Lock, Mail } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const json = await res.json();

      if (!json.success) {
        toast(json.error?.message || 'Login failed', 'error');
        setLoading(false);
        return;
      }

      toast(`Welcome back, ${json.data.user.name}!`, 'success');

      if (json.data.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/van/dashboard');
      }
    } catch {
      toast('Network error during login', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-center items-center p-4 text-[#111827]">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-[#1D4ED8] items-center justify-center text-white shadow-xs">
            <Truck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#111827] tracking-tight">
            RTO Van Manager
          </h1>
          <p className="text-xs text-[#6B7280]">
            Pollution Testing Fleet & Regulatory Reporting
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#FFFFFF] rounded-xl p-6 border border-[#E7E9ED] shadow-xs space-y-5">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#111827] block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#6B7280] absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#FFFFFF] border border-[#E7E9ED] text-[#111827] text-sm focus:border-[#1D4ED8] outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#111827] block">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6B7280] absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[#FFFFFF] border border-[#E7E9ED] text-[#111827] text-sm focus:border-[#1D4ED8] outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
