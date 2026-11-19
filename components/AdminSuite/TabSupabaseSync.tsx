'use client';

import React, { useState } from 'react';
import { useStore } from '@/lib/storeContext';
import { SupabaseConfig } from '@/lib/types';
import { Database, Cloud, RefreshCw, Download, Upload, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function TabSupabaseSync() {
  const {
    state,
    updateSupabaseConfig,
    syncWithSupabase,
    exportJsonBackup,
    importJsonBackup,
    resetToDefaults,
    storageUsage,
    showToast
  } = useStore();

  const [cfg, setCfg] = useState<SupabaseConfig>({ ...state.supabaseConfig });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    updateSupabaseConfig(cfg);
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('Testing connection and synchronizing with Supabase...');
    const result = await syncWithSupabase();
    setSyncStatusMsg(result.message);
    setIsSyncing(false);
    showToast(result.success ? 'Supabase Synced' : 'Sync Warning', result.message, result.success ? 'success' : 'warn');
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importJsonBackup(content);
      }
    };
    reader.readAsText(file);
  };

  const sqlSchemaSnippet = `-- Run this in your Supabase SQL Editor to create the persistent settings table:
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY,
    store_state JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & allow anonymous read/write for dynamic store operations
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read-write for store settings"
ON public.store_settings
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);`;

  return (
    <div className="space-y-8">
      
      {/* 1. Supabase Cloud Database Configuration */}
      <div className="bg-white p-6 rounded-3xl border border-gold-500/40 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-serif text-base font-bold text-maroon-700">
                Supabase Cloud Database & Real-Time Sync Vault
              </h3>
              <p className="text-[11px] text-stone-500">
                Synchronize your store state across all devices and team members with Supabase PostgreSQL.
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              state.supabaseConfig.syncEnabled
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-stone-100 text-stone-600'
            }`}
          >
            {state.supabaseConfig.syncEnabled ? 'Cloud Sync Active' : 'LocalStorage Fallback Active'}
          </span>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Supabase Project URL</label>
              <input
                type="url"
                value={cfg.url || ''}
                onChange={(e) => setCfg({ ...cfg, url: e.target.value })}
                placeholder="https://your-project.supabase.co"
                className="w-full border border-stone-300 rounded-xl px-3 py-2 font-mono text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Supabase Public Anon Key</label>
              <input
                type="text"
                value={cfg.anonKey || ''}
                onChange={(e) => setCfg({ ...cfg, anonKey: e.target.value })}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full border border-stone-300 rounded-xl px-3 py-2 font-mono text-espresso focus:border-maroon-700 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              className="bg-maroon-700 hover:bg-maroon-800 text-parchment-100 font-bold px-5 py-2.5 rounded-xl text-xs transition"
            >
              Save Credentials
            </button>

            <button
              type="button"
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronizing...' : 'Sync Store to Supabase Now'}</span>
            </button>
          </div>

          {syncStatusMsg && (
            <div className="p-3 bg-stone-900 text-emerald-400 font-mono text-[11px] rounded-xl">
              {syncStatusMsg}
            </div>
          )}
        </form>

        {/* SQL Setup Helper Snippet */}
        <div className="pt-4 border-t border-stone-100">
          <p className="text-xs font-bold text-stone-700 mb-1">Supabase 1-Click Database Setup SQL:</p>
          <pre className="bg-stone-900 text-emerald-300 p-4 rounded-2xl text-[11px] font-mono overflow-x-auto whitespace-pre">
            {sqlSchemaSnippet}
          </pre>
        </div>
      </div>

      {/* 2. JSON Backup Export, Restore & Reset */}
      <div className="bg-white p-6 rounded-3xl border border-gold-500/40 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-stone-200">
          <Database className="w-5 h-5 text-saffron-600" />
          <div>
            <h3 className="font-serif text-base font-bold text-maroon-700">
              Offline JSON Backup, Restore & Storage Meter
            </h3>
            <p className="text-[11px] text-stone-500">
              Export and import snapshot files of your full catalog, orders, and courier settings.
            </p>
          </div>
        </div>

        {/* Storage Meter Bar */}
        <div className="p-4 bg-parchment-50 rounded-2xl border border-gold-300/40 space-y-2 text-xs">
          <div className="flex justify-between font-semibold">
            <span>LocalStorage Memory Consumption</span>
            <span className="text-maroon-700 font-bold">{storageUsage.usedKb} KB / {storageUsage.maxKb} KB ({storageUsage.percentage}%)</span>
          </div>
          <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                storageUsage.percentage > 85 ? 'bg-red-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${storageUsage.percentage}%` }}
            />
          </div>
          <p className="text-[10px] text-stone-500">
            Client-Side Canvas image compression ensures photo uploads stay well below the browser quota.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={exportJsonBackup}
            className="bg-stone-800 hover:bg-stone-900 text-amber-200 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow"
          >
            <Download className="w-4 h-4 text-gold-400" />
            <span>Download Full JSON Backup</span>
          </button>

          <label className="bg-stone-800 hover:bg-stone-900 text-amber-200 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow cursor-pointer">
            <Upload className="w-4 h-4 text-saffron-400" />
            <span>Restore JSON Backup</span>
            <input type="file" accept=".json" onChange={handleFileInput} className="hidden" />
          </label>

          <button
            onClick={resetToDefaults}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition border border-rose-200"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Factory Reset to Clean Defaults</span>
          </button>
        </div>
      </div>

    </div>
  );
}
