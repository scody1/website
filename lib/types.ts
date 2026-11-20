export type BillingType = 'NONGST' | 'GST';

export interface StoreConfig {
  storeName: string;
  tagline: string;
  announcement: string;
  whatsapp: string;
  supportPhone: string;
  supportEmail: string;
  instagramUrl: string;
  whatsappGreeting: string;
  adminPasscode: string;
  heroHeadline: string;
  heroSubheadline: string;
}

export interface PickupAddress {
  contactName: string;
  businessLegalName: string;
  shopHouseNo: string;
  street: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  billingType: BillingType;
  gstin: string;
  pan: string;
  shiprocketPickupNickname: string;
}

export interface CourierConfig {
  primaryCourier: 'Shiprocket' | 'Delhivery';
  execMode: 'LIVE_API' | 'SIMULATION';
  srEmail: string;
  srPassword?: string;
  srToken?: string;
  srPickupLocation: string;
  dlToken?: string;
  apiProxyUrl?: string;
}

export interface PaymentShippingConfig {
  standardShippingFee: number;
  freeShippingThreshold: number;
  codFee: number;
  enableCod: boolean;
  enablePrepaid: boolean;
  upiId: string;
  merchantName: string;
  razorpayKeyId?: string;
}

export type HomepageSection =
  | 'ALL'
  | 'BESTSELLER'
  | 'ZODIAC'
  | 'SHANKH'
  | 'DEEPAM'
  | 'MURTI'
  | 'URLI'
  | 'EXPLORE';

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  section: HomepageSection;
  sellingPrice: number;
  mrp: number;
  cogs: number; // Cost of Goods Sold for accurate net profit
  stock: number;
  images: string[];
  description: string;
  spiritualBenefits: string[];
  rating: number;
  reviewCount: number;
  weightKg: number;
  dimensions: {
    lengthCm: number;
    breadthCm: number;
    heightCm: number;
  };
  isBestseller?: boolean;
  tags?: string[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string;
  description?: string;
}

export type OrderStatus =
  | 'New Order'
  | 'Processing'
  | 'Packed'
  | 'Pickup Scheduled'
  | 'Shipped'
  | 'In Transit'
  | 'Delivered'
  | 'Cancelled'
  | 'Refunded';

export interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  image: string;
  cogs: number;
}

export interface CustomerDetails {
  name: string;
  phone: string;
  email: string;
  streetAddress: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
}

export interface CourierBookingDetails {
  courierName: string;
  shipmentId?: string | number;
  orderId?: string | number;
  awbCode: string;
  courierPartner: string;
  trackingUrl: string;
  labelUrl?: string;
  invoiceUrl?: string;
  bookingTimestamp: string;
  isSimulated?: boolean;
}

export interface Order {
  id: string;
  createdAt: string;
  customer: CustomerDetails;
  items: OrderItem[];
  subtotal: number;
  couponDiscount: number;
  couponCode?: string;
  shippingFee: number;
  codFee: number;
  totalAmount: number;
  paymentMethod: 'COD' | 'ONLINE_PREPAID';
  paymentStatus: 'PENDING' | 'PENDING_VERIFICATION' | 'PAID' | 'REFUNDED';
  orderStatus: OrderStatus;
  statusNotes?: string;
  cancelReason?: string;
  refundNotes?: string;
  courierBooking?: CourierBookingDetails;
  utrNumber?: string;
}

export interface Review {
  id: string;
  productId?: string;
  productName?: string;
  authorName: string;
  location: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  isVerifiedBuyer: boolean;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENT' | 'FLAT';
  discountValue: number;
  minOrderValue: number;
  isActive: boolean;
  description?: string;
}

export interface PoliciesSeo {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogImage: string;
  gaMeasurementId: string;
  privacyPolicy: string;
  termsConditions: string;
  refundPolicy: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  syncEnabled: boolean;
  lastSyncedAt?: string;
}

export interface StoreState {
  storeConfig: StoreConfig;
  pickupAddress: PickupAddress;
  courierConfig: CourierConfig;
  paymentShipping: PaymentShippingConfig;
  policiesSeo: PoliciesSeo;
  supabaseConfig: SupabaseConfig;
  categories: Category[];
  products: Product[];
  coupons: Coupon[];
  orders: Order[];
  reviews: Review[];
}
