// Types shared by the storefront, admin panel and server.
// All money values are whole rupees.

export type HomepageSection = 'ALL' | 'BESTSELLER' | 'ZODIAC' | 'SHANKH' | 'DEEPAM' | 'MURTI' | 'URLI' | 'EXPLORE';
export type ProductSection = Exclude<HomepageSection, 'ALL'>;
export const PRODUCT_SECTIONS: ProductSection[] = ['BESTSELLER', 'ZODIAC', 'SHANKH', 'DEEPAM', 'MURTI', 'URLI', 'EXPLORE'];

export type BillingType = 'NONGST' | 'GST';

export interface StoreProfile {
  storeName: string;
  tagline: string;
  announcement: string;
  whatsapp: string;
  supportPhone: string;
  supportEmail: string;
  instagramUrl: string;
  whatsappGreeting: string;
  heroHeadline: string;
  heroSubheadline: string;
}

export interface BusinessProfile {
  contactName: string;
  businessLegalName: string;
  phone: string;
  shopHouseNo: string;
  street: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  billingType: BillingType;
  gstin: string;
  pan: string;
  /** Must exactly match a pickup location name in the Shiprocket panel. */
  shiprocketPickupNickname: string;
  /** Must exactly match the registered warehouse (client warehouse) name in Delhivery. */
  delhiveryPickupName: string;
}

export interface PaymentSettings {
  standardShippingFee: number;
  freeShippingThreshold: number;
  codFee: number;
  /** 0 = no limit */
  codMaxOrderValue: number;
  enableCod: boolean;
  enableUpi: boolean;
  enableRazorpay: boolean;
  upiId: string;
  merchantName: string;
}

export interface SeoSettings {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogImage: string;
  gaMeasurementId: string;
}

export interface PolicySettings {
  privacyPolicy: string;
  termsConditions: string;
  refundPolicy: string;
  shippingPolicy: string;
}

export interface AllSettings {
  store: StoreProfile;
  business: BusinessProfile;
  payments: PaymentSettings;
  seo: SeoSettings;
  policies: PolicySettings;
}
export type SettingsSection = keyof AllSettings;

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  /** URL slug: /product/<slug> */
  slug: string;
  name: string;
  sku: string;
  categoryId: string | null;
  /** Category display name */
  category: string;
  section: ProductSection;
  sellingPrice: number;
  mrp: number;
  stock: number;
  images: string[];
  description: string;
  spiritualBenefits: string[];
  tags: string[];
  /** Average of approved reviews (0 when there are none). */
  rating: number;
  reviewCount: number;
  weightKg: number;
  dimensions: { lengthCm: number; breadthCm: number; heightCm: number };
  isBestseller: boolean;
  hsnCode: string;
  gstRate: number;
}

export interface AdminProduct extends Product {
  costPrice: number;
  isActive: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string | null;
  productName: string | null;
  authorName: string;
  location: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  isVerifiedBuyer: boolean;
}

export interface AdminReview extends Review {
  isApproved: boolean;
  orderNumber: string | null;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'PERCENT' | 'FLAT';
  discountValue: number;
  maxDiscount: number | null;
  minOrderValue: number;
  usageLimit: number | null;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

/** What the storefront is allowed to know about a coupon. */
export type PublicCoupon = Pick<Coupon, 'code' | 'description' | 'discountType' | 'discountValue' | 'maxDiscount' | 'minOrderValue'>;

export type PaymentMethod = 'COD' | 'UPI' | 'RAZORPAY';
export type PaymentStatus = 'PENDING' | 'AWAITING_VERIFICATION' | 'PAID' | 'FAILED' | 'REFUNDED';
export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'NEW'
  | 'PROCESSING'
  | 'PACKED'
  | 'READY_TO_SHIP'
  | 'PICKUP_SCHEDULED'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RTO'
  | 'REFUNDED';

export interface OrderItem {
  productId: string | null;
  name: string;
  sku: string;
  image: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  lineTotal: number;
  hsnCode: string;
  gstRate: number;
}

export interface OrderEvent {
  id: number;
  kind: string;
  message: string;
  actor: string;
  createdAt: string;
}

export interface CustomerDetails {
  name: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
}

export interface ShippingInfo {
  provider: string | null;
  srOrderId: number | null;
  srShipmentId: number | null;
  courierName: string | null;
  awbCode: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  invoiceUrl: string | null;
  pickupScheduledFor: string | null;
  shippingStatus: string | null;
  shippingCost: number | null;
  packageWeightKg: number | null;
  lastTrackingSync: string | null;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  customer: CustomerDetails;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  shippingFee: number;
  codFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  utrNumber: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  paidAt: string | null;
  adminNotes: string;
  cancelReason: string;
  refundNotes: string;
  refundAmount: number | null;
  razorpayRefundId: string | null;
  refundedAt: string | null;
  shipping: ShippingInfo;
  events?: OrderEvent[];
}

/** Limited order view returned to customers on the tracking page. */
export interface PublicTracking {
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  total: number;
  firstName: string;
  city: string;
  pincode: string;
  items: { name: string; quantity: number }[];
  courierName: string | null;
  awbCode: string | null;
  trackingUrl: string | null;
  shippingStatus: string | null;
  events: { message: string; createdAt: string }[];
}

export interface Quote {
  subtotal: number;
  discount: number;
  couponCode: string | null;
  couponError: string | null;
  shippingFee: number;
  codFee: number;
  total: number;
  qualifiesForFreeShipping: boolean;
  amountNeededForFreeShipping: number;
  codAllowed: boolean;
}

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface CartItem extends CartLine {
  name: string;
  sku: string;
  price: number;
  image: string;
  stock: number;
}

/** Shape of the data the storefront renders. */
export interface PublicStoreState {
  storeConfig: StoreProfile;
  pickupAddress: Omit<BusinessProfile, 'pan' | 'shiprocketPickupNickname' | 'delhiveryPickupName' | 'contactName' | 'phone'>;
  paymentShipping: PaymentSettings & { razorpayKeyId: string };
  policiesSeo: SeoSettings & PolicySettings;
  categories: Category[];
  products: Product[];
  reviews: Review[];
}

export interface PincodeResult {
  pincode: string;
  isServiceable: boolean;
  /** true when Shiprocket confirmed it, false for a postal-zone estimate */
  live: boolean;
  region: string;
  estimatedDeliveryDays: number;
  estimatedDeliveryDate: string;
  codAvailable: boolean;
  message: string;
}
