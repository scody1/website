'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/lib/storeContext';
import AdminSuite from '@/components/AdminSuite';
import AdminPasscodeModal from '@/components/AdminSuite/AdminPasscodeModal';
import { Loader2 } from 'lucide-react';

export default function AdminPage() {
  const { adminUnlocked, setAdminUnlocked } = useStore();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null;
        const res = await fetch('/api/admin/check-session', {
          headers: storedToken ? { 'x-admin-token': storedToken } : {},
          credentials: 'include'
        });
        const data = await res.json();
        if (data.authenticated) {
          setAdminUnlocked(true);
        } else {
          setAdminUnlocked(false);
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('admin_token');
          }
        }
      } catch (err) {
        setAdminUnlocked(false);
      } finally {
        setCheckingSession(false);
      }
    };

    checkAuth();
  }, [setAdminUnlocked]);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-parchment-100 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-gold-400" />
        <p className="text-sm font-serif tracking-widest text-gold-300">
          Verifying Admin Authorization...
        </p>
      </div>
    );
  }

  if (!adminUnlocked) {
    return <AdminPasscodeModal />;
  }

  return <AdminSuite />;
}
