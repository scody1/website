import { z } from 'zod';
import { db } from './db';
import type { AllSettings, SettingsSection } from '../shared/types';

const str = (max = 500) => z.string().trim().max(max);
const money = z.coerce.number().int().min(0).max(1_000_000);
const optionalPhone = z.string().trim().refine((v) => v === '' || /^\+?[0-9 -]{10,15}$/.test(v), 'Enter a valid phone number');
const optionalPincode = z.string().trim().refine((v) => v === '' || /^[1-9][0-9]{5}$/.test(v), 'Enter a valid 6-digit pincode');

export const settingsSchemas = {
  store: z.object({
    storeName: str(120).min(1, 'Store name is required'),
    tagline: str(200),
    announcement: str(300),
    whatsapp: optionalPhone,
    supportPhone: optionalPhone,
    supportEmail: z.string().trim().refine((v) => v === '' || z.string().email().safeParse(v).success, 'Enter a valid email'),
    instagramUrl: z.string().trim().refine((v) => v === '' || /^https?:\/\//.test(v), 'Must start with https://'),
    whatsappGreeting: str(500),
    heroHeadline: str(200),
    heroSubheadline: str(500)
  }),
  business: z.object({
    contactName: str(120),
    businessLegalName: str(200),
    phone: optionalPhone,
    shopHouseNo: str(200),
    street: str(300),
    landmark: str(200),
    city: str(100),
    state: str(100),
    pincode: optionalPincode,
    billingType: z.enum(['NONGST', 'GST']),
    gstin: z.string().trim().toUpperCase().refine((v) => v === '' || /^[0-9]{2}[A-Z0-9]{13}$/.test(v), 'GSTIN must be 15 characters'),
    pan: z.string().trim().toUpperCase().refine((v) => v === '' || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v), 'Enter a valid PAN'),
    shiprocketPickupNickname: str(100),
    delhiveryPickupName: str(100)
  }),
  payments: z.object({
    standardShippingFee: money,
    freeShippingThreshold: money,
    codFee: money,
    codMaxOrderValue: money,
    enableCod: z.boolean(),
    enableUpi: z.boolean(),
    enableRazorpay: z.boolean(),
    upiId: z.string().trim().refine((v) => v === '' || /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(v), 'Enter a valid UPI ID (name@bank)'),
    merchantName: str(100)
  }),
  seo: z.object({
    metaTitle: str(120).min(1, 'Meta title is required'),
    metaDescription: str(320),
    metaKeywords: str(500),
    ogImage: z.string().trim().refine((v) => v === '' || /^https?:\/\//.test(v) || v.startsWith('/'), 'Must be a URL'),
    gaMeasurementId: z.string().trim().toUpperCase().refine((v) => v === '' || /^G-[A-Z0-9]{4,20}$/.test(v), 'Must look like G-XXXXXXXXXX')
  }),
  policies: z.object({
    privacyPolicy: str(20000),
    termsConditions: str(20000),
    refundPolicy: str(20000),
    shippingPolicy: str(20000)
  })
} satisfies Record<SettingsSection, z.ZodTypeAny>;

export const DEFAULT_SETTINGS: AllSettings = {
  store: {
    storeName: 'Rajeshwar Pooja Samagri',
    tagline: 'Sacred Pooja Essentials & Divine Brassware',
    announcement: "🙏 India's Trusted Pooja Essentials & Brassware Brand | Free Shipping on Orders Above ₹999",
    whatsapp: '',
    supportPhone: '',
    supportEmail: '',
    instagramUrl: '',
    whatsappGreeting: 'Namaste! I would like to know more about your pooja essentials and brassware.',
    heroHeadline: 'Sacred Pooja Essentials & Divine Brassware',
    heroSubheadline: 'Bring divine vibrations home with handcrafted brassware, pure dhoop samagri and authentic spiritual essentials.'
  },
  business: {
    contactName: '',
    businessLegalName: 'Rajeshwar Pooja Samagri',
    phone: '',
    shopHouseNo: '',
    street: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    billingType: 'NONGST',
    gstin: '',
    pan: '',
    shiprocketPickupNickname: '',
    delhiveryPickupName: ''
  },
  payments: {
    standardShippingFee: 79,
    freeShippingThreshold: 999,
    codFee: 49,
    codMaxOrderValue: 10000,
    enableCod: true,
    enableUpi: false,
    enableRazorpay: false,
    upiId: '',
    merchantName: 'Rajeshwar Pooja Samagri'
  },
  seo: {
    metaTitle: 'Rajeshwar Pooja Samagri | Sacred Pooja Essentials & Divine Brassware',
    metaDescription: 'Shop authentic pooja samagri, brass idols, deepams, shankhs, brass urlis and natural dhoop with pan-India delivery.',
    metaKeywords: 'pooja samagri, brass idols, dhoop burner, shankh, brass urli, deepam',
    ogImage: '',
    gaMeasurementId: ''
  },
  policies: {
    privacyPolicy: 'We collect your name, phone, email and address only to fulfil and deliver your order. Card and UPI payments are processed by our payment partners; we never store card details.',
    termsConditions: 'Orders are usually dispatched within 1–2 business days. Handcrafted brassware may show small natural variations.',
    refundPolicy: 'Items that arrive damaged, defective or incorrect can be replaced or refunded within 7 days of delivery. Please share an unboxing video or photos within 48 hours of delivery.',
    shippingPolicy: 'Orders are packed and handed to our courier partner within 1–2 business days. Delivery usually takes 3–7 business days depending on your pincode. You will receive a tracking link once your parcel ships. Cash on Delivery is available on eligible pincodes.'
  }
};

const SECTIONS = Object.keys(DEFAULT_SETTINGS) as SettingsSection[];

export async function getAllSettings(): Promise<AllSettings> {
  const rows = await db()<{ key: string; value: Record<string, unknown> }[]>`
    SELECT key, value FROM settings WHERE key = ANY(${SECTIONS})
  `;
  const out = structuredClone(DEFAULT_SETTINGS) as AllSettings;
  for (const row of rows) {
    const key = row.key as SettingsSection;
    (out as unknown as Record<string, unknown>)[key] = { ...DEFAULT_SETTINGS[key], ...row.value };
  }
  return out;
}

export async function getSettingsSection<K extends SettingsSection>(key: K): Promise<AllSettings[K]> {
  const [row] = await db()<{ value: Record<string, unknown> }[]>`SELECT value FROM settings WHERE key = ${key}`;
  return { ...DEFAULT_SETTINGS[key], ...(row?.value || {}) } as AllSettings[K];
}

export async function updateSettingsSection<K extends SettingsSection>(key: K, input: unknown): Promise<AllSettings[K]> {
  const current = await getSettingsSection(key);
  const merged = { ...current, ...(input as object) };
  const parsed = settingsSchemas[key].parse(merged) as AllSettings[K];
  await db()`
    INSERT INTO settings (key, value, updated_at) VALUES (${key}, ${db().json(parsed as never)}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
  return parsed;
}

/** Private server-only values (never sent to any client). */
export async function getPrivateValue<T>(key: string): Promise<T | null> {
  const [row] = await db()<{ value: T }[]>`SELECT value FROM settings WHERE key = ${'private:' + key}`;
  return row ? row.value : null;
}

export async function setPrivateValue(key: string, value: unknown) {
  await db()`
    INSERT INTO settings (key, value, updated_at) VALUES (${'private:' + key}, ${db().json(value as never)}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}
