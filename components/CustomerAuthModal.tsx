'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { Lock, Mail, MapPin, Phone, ShieldCheck, User, X, Loader2 } from 'lucide-react';

export default function CustomerAuthModal() {
  const {
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    loginCustomer,
    signupCustomer
  } = useStore();

  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign up fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim()) return setError('Please enter your mobile number or email.');
    if (!loginPassword) return setError('Please enter your password.');

    setLoading(true);
    try {
      const ok = await loginCustomer(identifier.trim(), loginPassword);
      if (ok) {
        setIdentifier('');
        setLoginPassword('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError('Please enter your full name.');
    const cleanedPhone = phone.replace(/\D/g, '');
    if (!/^[6-9][0-9]{9}$/.test(cleanedPhone)) {
      return setError('Please enter a valid 10-digit Indian mobile number.');
    }
    if (signupPassword.length < 6) return setError('Password must be at least 6 characters long.');

    setLoading(true);
    try {
      const ok = await signupCustomer({
        name: name.trim(),
        phone: cleanedPhone,
        email: email.trim() || undefined,
        password: signupPassword,
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        state: stateName.trim(),
        pincode: pincode.trim()
      });
      if (ok) {
        setName('');
        setPhone('');
        setEmail('');
        setSignupPassword('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div onClick={closeAuthModal} className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm transition-opacity" />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
        <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white text-left shadow-2xl border border-gold-500/50 relative z-10 animate-scaleUp">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-maroon-700 via-maroon-800 to-maroon-700 p-5 text-parchment-100 flex items-center justify-between border-b border-gold-500/30">
            <div>
              <span className="text-[10px] tracking-widest uppercase font-bold text-gold-300">Rajeshwar Pooja Samagri</span>
              <h3 className="font-serif text-lg sm:text-xl font-bold flex items-center gap-2 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-gold-300" />
                <span>{authModalMode === 'login' ? 'Customer Sign In' : 'Create Customer Account'}</span>
              </h3>
            </div>
            <button
              onClick={closeAuthModal}
              className="text-parchment-200 hover:text-white p-1 rounded-lg transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 bg-parchment-100 border-b border-gold-300/40 text-xs sm:text-sm font-bold">
            <button
              type="button"
              onClick={() => { setError(null); openAuthModal('login'); }}
              className={`py-3 text-center transition-colors ${
                authModalMode === 'login'
                  ? 'bg-white text-maroon-700 border-b-2 border-maroon-700 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setError(null); openAuthModal('signup'); }}
              className={`py-3 text-center transition-colors ${
                authModalMode === 'signup'
                  ? 'bg-white text-maroon-700 border-b-2 border-maroon-700 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              New Account
            </button>
          </div>

          <div className="p-5 sm:p-6">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            {authModalMode === 'login' ? (
              /* SIGN IN FORM */
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Mobile Number or Email
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. 9876543210 or your@email.com"
                      required
                      autoFocus
                      className="w-full bg-parchment-50 border border-gold-300/60 focus:border-maroon-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-espresso focus:outline-none"
                    />
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-parchment-50 border border-gold-300/60 focus:border-maroon-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-espresso focus:outline-none"
                    />
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-maroon-700 hover:bg-maroon-800 text-white font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-60 mt-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                </button>

                <p className="text-center text-xs text-stone-500 pt-2">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setError(null); openAuthModal('signup'); }}
                    className="font-bold text-maroon-700 underline"
                  >
                    Create one now
                  </button>
                </p>
              </form>
            ) : (
              /* SIGN UP FORM */
              <form onSubmit={handleSignup} className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rameshwar Sharma"
                      required
                      autoFocus
                      className="w-full bg-parchment-50 border border-gold-300/60 focus:border-maroon-700 rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm text-espresso focus:outline-none"
                    />
                    <User className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      10-Digit Mobile *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        maxLength={10}
                        required
                        className="w-full bg-parchment-50 border border-gold-300/60 focus:border-maroon-700 rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm text-espresso focus:outline-none"
                      />
                      <Phone className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Email (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="w-full bg-parchment-50 border border-gold-300/60 focus:border-maroon-700 rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm text-espresso focus:outline-none"
                      />
                      <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Password (6+ chars) *
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Choose a password"
                      required
                      minLength={6}
                      className="w-full bg-parchment-50 border border-gold-300/60 focus:border-maroon-700 rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm text-espresso focus:outline-none"
                    />
                    <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200">
                  <span className="block text-[11px] font-bold text-maroon-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Default Delivery Address (Optional)
                  </span>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      placeholder="House / Flat No., Street, Colony"
                      className="w-full bg-parchment-50 border border-gold-300/60 focus:border-maroon-700 rounded-xl py-2 px-3 text-xs text-espresso focus:outline-none"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City"
                        className="w-full bg-parchment-50 border border-gold-300/60 focus:border-maroon-700 rounded-xl py-2 px-3 text-xs text-espresso focus:outline-none"
                      />
                      <input
                        type="text"
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        placeholder="State"
                        className="w-full bg-parchment-50 border border-gold-300/60 focus:border-maroon-700 rounded-xl py-2 px-3 text-xs text-espresso focus:outline-none"
                      />
                      <input
                        type="text"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="Pincode"
                        maxLength={6}
                        className="w-full bg-parchment-50 border border-gold-300/60 focus:border-maroon-700 rounded-xl py-2 px-3 text-xs text-espresso focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-maroon-700 hover:bg-maroon-800 text-white font-bold py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-60 mt-3"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                </button>

                <p className="text-center text-xs text-stone-500 pt-1">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setError(null); openAuthModal('login'); }}
                    className="font-bold text-maroon-700 underline"
                  >
                    Sign In
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
