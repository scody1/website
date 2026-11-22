import { decryptSecret, encryptSecret, randomToken } from './crypto';
import { getPrivateValue, setPrivateValue } from './settings';
import { db } from './db';

// Courier / payment credentials. Entered once by a Super Admin in Admin → Integrations,
// stored AES-256-GCM encrypted (key derived from APP_SECRET) and never sent to a browser.
// Environment variables, when set, take precedence (useful for managed deployments).

export type CredentialSource = 'env' | 'database' | null;

interface StoredShiprocket { email: string; passwordEnc: string; webhookToken: string; savedAt: string; savedBy: string }
interface StoredRazorpay { keyId: string; keySecretEnc: string; webhookSecretEnc: string; savedAt: string; savedBy: string }
interface StoredDelhivery { tokenEnc: string; environment: 'production' | 'staging'; savedAt: string; savedBy: string }
interface StoredEmail { apiKeyEnc: string; fromEmail: string; adminEmail: string; savedAt: string; savedBy: string }

// Small in-process cache so every request does not hit the DB / decrypt.
let cache: { at: number; sr: StoredShiprocket | null; rzp: StoredRazorpay | null; dl: StoredDelhivery | null; em: StoredEmail | null } | null = null;
const CACHE_MS = 30_000;

async function load() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;
  const [sr, rzp, dl, em] = await Promise.all([
    getPrivateValue<StoredShiprocket>('shiprocket_credentials'),
    getPrivateValue<StoredRazorpay>('razorpay_credentials'),
    getPrivateValue<StoredDelhivery>('delhivery_credentials'),
    getPrivateValue<StoredEmail>('email_credentials')
  ]);
  cache = { at: Date.now(), sr, rzp, dl, em };
  return cache;
}

export function clearIntegrationCache() {
  cache = null;
}

// ---------------------------------------------------------------- Shiprocket

export async function getShiprocketCredentials(): Promise<{ email: string; password: string; source: CredentialSource } | null> {
  if (process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD) {
    return { email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD, source: 'env' };
  }
  const { sr } = await load();
  if (!sr) return null;
  return { email: sr.email, password: decryptSecret(sr.passwordEnc), source: 'database' };
}

export async function getShiprocketWebhookToken(): Promise<string | null> {
  if (process.env.SHIPROCKET_WEBHOOK_TOKEN) return process.env.SHIPROCKET_WEBHOOK_TOKEN;
  const { sr } = await load();
  return sr?.webhookToken || null;
}

export async function saveShiprocketCredentials(email: string, password: string, by: string) {
  const { sr } = await load();
  const value: StoredShiprocket = {
    email: email.trim(),
    passwordEnc: encryptSecret(password),
    webhookToken: sr?.webhookToken || randomToken(24),
    savedAt: new Date().toISOString(),
    savedBy: by
  };
  await setPrivateValue('shiprocket_credentials', value);
  await db()`DELETE FROM settings WHERE key = 'private:shiprocket_token'`; // force a fresh login with the new credentials
  clearIntegrationCache();
}

export async function removeShiprocketCredentials() {
  await db()`DELETE FROM settings WHERE key IN ('private:shiprocket_credentials', 'private:shiprocket_token')`;
  clearIntegrationCache();
}

// ---------------------------------------------------------------- Razorpay

export async function getRazorpayCredentials(): Promise<{ keyId: string; keySecret: string; webhookSecret: string; source: CredentialSource } | null> {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    return { keyId: process.env.RAZORPAY_KEY_ID, keySecret: process.env.RAZORPAY_KEY_SECRET, webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '', source: 'env' };
  }
  const { rzp } = await load();
  if (!rzp) return null;
  return {
    keyId: rzp.keyId,
    keySecret: decryptSecret(rzp.keySecretEnc),
    webhookSecret: rzp.webhookSecretEnc ? decryptSecret(rzp.webhookSecretEnc) : '',
    source: 'database'
  };
}

export async function saveRazorpayCredentials(keyId: string, keySecret: string, webhookSecret: string, by: string) {
  const value: StoredRazorpay = {
    keyId: keyId.trim(),
    keySecretEnc: encryptSecret(keySecret),
    webhookSecretEnc: webhookSecret ? encryptSecret(webhookSecret) : '',
    savedAt: new Date().toISOString(),
    savedBy: by
  };
  await setPrivateValue('razorpay_credentials', value);
  clearIntegrationCache();
}

export async function removeRazorpayCredentials() {
  await db()`DELETE FROM settings WHERE key = 'private:razorpay_credentials'`;
  clearIntegrationCache();
}

// ---------------------------------------------------------------- Delhivery

export async function getDelhiveryCredentials(): Promise<{ token: string; environment: 'production' | 'staging'; source: CredentialSource } | null> {
  if (process.env.DELHIVERY_API_TOKEN) {
    return { token: process.env.DELHIVERY_API_TOKEN, environment: process.env.DELHIVERY_ENV === 'staging' ? 'staging' : 'production', source: 'env' };
  }
  const { dl } = await load();
  if (!dl) return null;
  return { token: decryptSecret(dl.tokenEnc), environment: dl.environment, source: 'database' };
}

export async function saveDelhiveryCredentials(token: string, environment: 'production' | 'staging', by: string) {
  await setPrivateValue('delhivery_credentials', { tokenEnc: encryptSecret(token.trim()), environment, savedAt: new Date().toISOString(), savedBy: by } satisfies StoredDelhivery);
  clearIntegrationCache();
}

export async function removeDelhiveryCredentials() {
  await db()`DELETE FROM settings WHERE key = 'private:delhivery_credentials'`;
  clearIntegrationCache();
}

// ---------------------------------------------------------------- E-mail (Resend)

export async function getEmailCredentials(): Promise<{ apiKey: string; fromEmail: string; adminEmail: string; source: CredentialSource } | null> {
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    return { apiKey: process.env.RESEND_API_KEY, fromEmail: process.env.EMAIL_FROM, adminEmail: process.env.ADMIN_ALERT_EMAIL || '', source: 'env' };
  }
  const { em } = await load();
  if (!em) return null;
  return { apiKey: decryptSecret(em.apiKeyEnc), fromEmail: em.fromEmail, adminEmail: em.adminEmail, source: 'database' };
}

export async function saveEmailCredentials(apiKey: string, fromEmail: string, adminEmail: string, by: string) {
  await setPrivateValue('email_credentials', { apiKeyEnc: encryptSecret(apiKey.trim()), fromEmail: fromEmail.trim(), adminEmail: adminEmail.trim(), savedAt: new Date().toISOString(), savedBy: by } satisfies StoredEmail);
  clearIntegrationCache();
}

export async function removeEmailCredentials() {
  await db()`DELETE FROM settings WHERE key = 'private:email_credentials'`;
  clearIntegrationCache();
}

// ---------------------------------------------------------------- status (safe to show to a Super Admin)

export async function integrationStatus() {
  const { sr, rzp, dl, em } = await load();
  const dlEnv = Boolean(process.env.DELHIVERY_API_TOKEN);
  const emEnv = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  const srEnv = Boolean(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);
  const rzpEnv = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  const mask = (s: string) => (s.length <= 8 ? '••••' : `${s.slice(0, 8)}••••${s.slice(-4)}`);
  return {
    shiprocket: {
      connected: srEnv || Boolean(sr),
      source: (srEnv ? 'env' : sr ? 'database' : null) as CredentialSource,
      email: srEnv ? process.env.SHIPROCKET_EMAIL! : sr?.email || null,
      savedAt: sr?.savedAt || null,
      savedBy: sr?.savedBy || null,
      webhookTokenSet: Boolean(process.env.SHIPROCKET_WEBHOOK_TOKEN || sr?.webhookToken)
    },
    razorpay: {
      connected: rzpEnv || Boolean(rzp),
      source: (rzpEnv ? 'env' : rzp ? 'database' : null) as CredentialSource,
      keyId: rzpEnv ? mask(process.env.RAZORPAY_KEY_ID!) : rzp ? mask(rzp.keyId) : null,
      mode: (rzpEnv ? process.env.RAZORPAY_KEY_ID! : rzp?.keyId || '').startsWith('rzp_live_') ? 'live' : (rzpEnv || rzp) ? 'test' : null,
      webhookSecretSet: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET || rzp?.webhookSecretEnc),
      savedAt: rzp?.savedAt || null,
      savedBy: rzp?.savedBy || null
    },
    delhivery: {
      connected: dlEnv || Boolean(dl),
      source: (dlEnv ? 'env' : dl ? 'database' : null) as CredentialSource,
      environment: dlEnv ? (process.env.DELHIVERY_ENV === 'staging' ? 'staging' : 'production') : dl?.environment || null,
      savedAt: dl?.savedAt || null,
      savedBy: dl?.savedBy || null
    },
    email: {
      connected: emEnv || Boolean(em),
      source: (emEnv ? 'env' : em ? 'database' : null) as CredentialSource,
      fromEmail: emEnv ? process.env.EMAIL_FROM! : em?.fromEmail || null,
      adminEmail: emEnv ? process.env.ADMIN_ALERT_EMAIL || null : em?.adminEmail || null,
      savedAt: em?.savedAt || null,
      savedBy: em?.savedBy || null
    }
  };
}
