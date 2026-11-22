import { NextRequest } from 'next/server';
import { z } from 'zod';
import { audit, requireAdmin } from '@/lib/server/auth';
import { appSecretProblem } from '@/lib/server/crypto';
import { ApiError, json, readJson, route, siteOrigin } from '@/lib/server/http';
import {
  getShiprocketWebhookToken, integrationStatus, removeRazorpayCredentials, removeShiprocketCredentials,
  saveRazorpayCredentials, saveShiprocketCredentials
} from '@/lib/server/integrations';
import { verifyShiprocketLogin } from '@/lib/server/shiprocket';
import { verifyRazorpayKeys } from '@/lib/server/razorpay';
import { verifyDelhiveryToken } from '@/lib/server/delhivery';
import { sendTestEmail } from '@/lib/server/email';
import { getSettingsSection } from '@/lib/server/settings';
import {
  removeDelhiveryCredentials, removeEmailCredentials, saveDelhiveryCredentials, saveEmailCredentials
} from '@/lib/server/integrations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Connection status for Shiprocket and Razorpay (never returns passwords or secrets). */
export const GET = route(async (req: NextRequest) => {
  await requireAdmin(req, 'integrations.manage');
  const status = await integrationStatus();
  const origin = siteOrigin(req);
  return json({
    ...status,
    encryptionReady: !appSecretProblem(),
    encryptionProblem: appSecretProblem(),
    shiprocketWebhook: {
      url: `${origin}/api/webhooks/tracking`,
      // The webhook token is a shared secret the admin must paste into Shiprocket, so it is shown here.
      token: status.shiprocket.connected ? await getShiprocketWebhookToken() : null
    },
    razorpayWebhook: { url: `${origin}/api/webhooks/razorpay`, events: ['payment.captured', 'payment.failed', 'order.paid'] }
  });
});

const schema = z.discriminatedUnion('provider', [
  z.object({
    provider: z.literal('shiprocket'),
    email: z.string().trim().email('Enter the API user email').max(200),
    password: z.string().min(1, 'Enter the API user password').max(200)
  }),
  z.object({
    provider: z.literal('razorpay'),
    keyId: z.string().trim().regex(/^rzp_(test|live)_[A-Za-z0-9]+$/, 'Key ID must look like rzp_live_xxxx or rzp_test_xxxx'),
    keySecret: z.string().trim().min(8, 'Enter the key secret').max(200),
    webhookSecret: z.string().trim().max(200).default('')
  }),
  z.object({
    provider: z.literal('delhivery'),
    token: z.string().trim().min(10, 'Enter the Delhivery API token').max(300),
    environment: z.enum(['production', 'staging'])
  }),
  z.object({
    provider: z.literal('email'),
    apiKey: z.string().trim().min(10, 'Enter the Resend API key').max(300),
    fromEmail: z.string().trim().min(3).max(200),
    adminEmail: z.string().trim().max(200).refine((v) => v === '' || z.string().email().safeParse(v).success, 'Enter a valid admin e-mail').default('')
  })
]);

/** Saves credentials after checking them against the provider. */
export const PUT = route(async (req: NextRequest) => {
  const user = await requireAdmin(req, 'integrations.manage');
  const problem = appSecretProblem();
  if (problem) throw new ApiError(503, problem);
  const body = await readJson(req, schema);

  if (body.provider === 'shiprocket') {
    if (process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD) {
      throw new ApiError(400, 'Shiprocket is configured through server environment variables. Remove them to manage it here.');
    }
    await verifyShiprocketLogin(body.email, body.password); // throws with Shiprocket's message if wrong
    await saveShiprocketCredentials(body.email, body.password, user.email);
    await audit(user, 'integration.shiprocket.connect', body.email, req);
  } else if (body.provider === 'delhivery') {
    if (process.env.DELHIVERY_API_TOKEN) throw new ApiError(400, 'Delhivery is configured through server environment variables.');
    const business = await getSettingsSection('business');
    await verifyDelhiveryToken(body.token, body.environment, business.pincode);
    await saveDelhiveryCredentials(body.token, body.environment, user.email);
    await audit(user, 'integration.delhivery.connect', body.environment, req);
  } else if (body.provider === 'email') {
    if (process.env.RESEND_API_KEY) throw new ApiError(400, 'E-mail is configured through server environment variables.');
    try {
      await sendTestEmail(body.apiKey, body.fromEmail, body.adminEmail || user.email);
    } catch (err) {
      throw new ApiError(400, `E-mail provider rejected the settings: ${(err as Error).message}`);
    }
    await saveEmailCredentials(body.apiKey, body.fromEmail, body.adminEmail, user.email);
    await audit(user, 'integration.email.connect', body.fromEmail, req);
  } else {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      throw new ApiError(400, 'Razorpay is configured through server environment variables. Remove them to manage it here.');
    }
    await verifyRazorpayKeys(body.keyId, body.keySecret);
    await saveRazorpayCredentials(body.keyId, body.keySecret, body.webhookSecret, user.email);
    await audit(user, 'integration.razorpay.connect', body.keyId.slice(0, 12), req);
  }
  return json({ ok: true });
});

export const DELETE = route(async (req: NextRequest) => {
  const user = await requireAdmin(req, 'integrations.manage');
  const provider = req.nextUrl.searchParams.get('provider');
  if (provider === 'shiprocket') await removeShiprocketCredentials();
  else if (provider === 'razorpay') await removeRazorpayCredentials();
  else if (provider === 'delhivery') await removeDelhiveryCredentials();
  else if (provider === 'email') await removeEmailCredentials();
  else throw new ApiError(400, 'Unknown provider.');
  await audit(user, `integration.${provider}.disconnect`, '', req);
  return json({ ok: true });
});
