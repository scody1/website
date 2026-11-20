'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import {
  StoreState,
  StoreConfig,
  PickupAddress,
  CourierConfig,
  PaymentShippingConfig,
  PoliciesSeo,
  SupabaseConfig,
  Product,
  Category,
  Order,
  OrderItem,
  Review,
  Coupon,
  OrderStatus,
  CourierBookingDetails
} from './types';
import { defaultStoreState } from './initialData';
import { playTempleBellChime } from './audioChime';
import { getSupabaseClient } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'RAJESHWAR_STORE_STATE_V2';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'warn' | 'error' | 'info';
}

export interface PincodeResult {
  pincode: string;
  isServiceable: boolean;
  city: string;
  state: string;
  estimatedDeliveryDays: number;
  estimatedDeliveryDate: string;
  codAvailable: boolean;
  message: string;
}

interface CartItem extends OrderItem { }

interface StoreContextType {
  state: StoreState;
  cart: CartItem[];
  activeCoupon: Coupon | null;
  toasts: ToastMessage[];
  isAdminOpen: boolean;
  adminUnlocked: boolean;
  isCartOpen: boolean;
  isCheckoutOpen: boolean;
  selectedProductForQuickView: Product | null;
  isReviewModalOpen: boolean;
  isTrackingModalOpen: boolean;
  trackingQuery: string;
  activePolicyModal: 'privacy' | 'terms' | 'refund' | null;
  pincodeResult: PincodeResult | null;
  storageUsage: { usedKb: number; maxKb: number; percentage: number };

  // Setters & UI controls
  setIsAdminOpen: (val: boolean) => void;
  setAdminUnlocked: (val: boolean) => void;
  setIsCartOpen: (val: boolean) => void;
  setIsCheckoutOpen: (val: boolean) => void;
  setSelectedProductForQuickView: (prod: Product | null) => void;
  setIsReviewModalOpen: (val: boolean) => void;
  setIsTrackingModalOpen: (val: boolean) => void;
  setTrackingQuery: (q: string) => void;
  setActivePolicyModal: (modal: 'privacy' | 'terms' | 'refund' | null) => void;
  showToast: (title: string, message: string, type?: 'success' | 'warn' | 'error' | 'info') => void;

  // Cart Actions
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
  cartTotals: {
    subtotal: number;
    discount: number;
    shippingFee: number;
    codFee: number;
    total: number;
    qualifiesForFreeShipping: boolean;
    amountNeededForFreeShipping: number;
  };

  // Order & Tracking Actions
  createOrder: (orderData: Omit<Order, 'id' | 'createdAt'>) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus, notes?: string, cancelOrRefundNote?: string) => void;
  updateOrderCourierBooking: (orderId: string, booking: CourierBookingDetails) => void;
  findOrderOrShipment: (query: string) => Order | undefined;
  checkPincode: (pincode: string) => PincodeResult;

  // Catalog & Content Updates
  addProduct: (product: Omit<Product, 'id'>) => Product;
  editProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  addReview: (review: Omit<Review, 'id' | 'date'>) => void;
  addCoupon: (coupon: Omit<Coupon, 'id'>) => void;
  toggleCoupon: (couponId: string) => void;
  deleteCoupon: (couponId: string) => void;

  // Admin Config Updates
  updateStoreConfig: (cfg: Partial<StoreConfig>) => void;
  updatePickupAddress: (addr: Partial<PickupAddress>) => void;
  updateCourierConfig: (cfg: Partial<CourierConfig>) => void;
  updatePaymentShipping: (cfg: Partial<PaymentShippingConfig>) => void;
  updatePoliciesSeo: (cfg: Partial<PoliciesSeo>) => void;
  updateSupabaseConfig: (cfg: Partial<SupabaseConfig>) => void;

  // Data Tools
  exportJsonBackup: () => void;
  importJsonBackup: (jsonString: string) => boolean;
  resetToDefaults: () => void;
  syncWithSupabase: () => Promise<{ success: boolean; message: string }>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(defaultStoreState);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCoupon, setActiveCoupon] = useState<Coupon | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals & Drawers
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProductForQuickView, setSelectedProductForQuickView] = useState<Product | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingQuery, setTrackingQuery] = useState('');
  const [activePolicyModal, setActivePolicyModal] = useState<'privacy' | 'terms' | 'refund' | null>(null);
  const [pincodeResult, setPincodeResult] = useState<PincodeResult | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state from localStorage on initial client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState((prev) => ({
          ...prev,
          ...parsed,
          storeConfig: { ...prev.storeConfig, ...(parsed.storeConfig || {}) },
          pickupAddress: { ...prev.pickupAddress, ...(parsed.pickupAddress || {}) },
          courierConfig: { ...prev.courierConfig, ...(parsed.courierConfig || {}) },
          paymentShipping: { ...prev.paymentShipping, ...(parsed.paymentShipping || {}) },
          policiesSeo: { ...prev.policiesSeo, ...(parsed.policiesSeo || {}) },
          supabaseConfig: {
            ...prev.supabaseConfig,
            ...(parsed.supabaseConfig || {}),
            url: parsed.supabaseConfig?.url || prev.supabaseConfig.url,
            anonKey: parsed.supabaseConfig?.anonKey || prev.supabaseConfig.anonKey,
            syncEnabled: parsed.supabaseConfig?.syncEnabled ?? prev.supabaseConfig.syncEnabled
          },
          categories: parsed.categories && parsed.categories.length > 0 ? parsed.categories : prev.categories,
          products: parsed.products && parsed.products.length > 0 ? parsed.products : prev.products,
          coupons: parsed.coupons || prev.coupons,
          orders: parsed.orders || prev.orders,
          reviews: parsed.reviews || prev.reviews
        }));
      }
    } catch (err) {
      console.error('Failed to load local store state:', err);
    }
    setIsLoaded(true);
  }, []);

  // Save state to localStorage whenever state changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('LocalStorage limit reached or error:', err);
    }
  }, [state, isLoaded]);

  // Toast notification helper
  const showToast = useCallback((title: string, message: string, type: 'success' | 'warn' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Calculate storage usage
  const storageUsage = {
    usedKb: typeof window !== 'undefined' ? Math.round((localStorage.getItem(LOCAL_STORAGE_KEY)?.length || 0) * 2 / 1024) : 0,
    maxKb: 5120, // 5MB standard browser localStorage limit
    get percentage() {
      return Math.min(100, Math.round((this.usedKb / this.maxKb) * 100));
    }
  };

  // Cart operations
  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: product.sellingPrice,
          cogs: product.cogs || Math.round(product.sellingPrice * 0.45),
          quantity,
          image: product.images[0] || ''
        }
      ];
    });
    showToast('Added to Sacred Cart', `${product.name} (Qty: ${quantity}) has been added.`);
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const updateCartQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setActiveCoupon(null);
  };

  const applyCoupon = (code: string): boolean => {
    const cleanCode = code.trim().toUpperCase();
    const found = state.coupons.find(
      (c) => c.code.toUpperCase() === cleanCode && c.isActive
    );
    if (!found) {
      showToast('Invalid Coupon', `Coupon code "${cleanCode}" is invalid or expired.`, 'warn');
      return false;
    }
    const currentSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (currentSubtotal < found.minOrderValue) {
      showToast(
        'Minimum Order Required',
        `Apply this coupon on orders above ₹${found.minOrderValue}. Your cart is ₹${currentSubtotal}.`,
        'warn'
      );
      return false;
    }
    setActiveCoupon(found);
    showToast('Coupon Applied!', `"${found.code}" applied successfully.`);
    return true;
  };

  const removeCoupon = () => {
    setActiveCoupon(null);
    showToast('Coupon Removed', 'Applied coupon discount removed.', 'info');
  };

  // Cart calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const qualifiesForFreeShipping = subtotal >= state.paymentShipping.freeShippingThreshold;
  const amountNeededForFreeShipping = Math.max(0, state.paymentShipping.freeShippingThreshold - subtotal);
  const shippingFee = subtotal > 0 ? (qualifiesForFreeShipping ? 0 : state.paymentShipping.standardShippingFee) : 0;

  let discount = 0;
  if (activeCoupon) {
    if (activeCoupon.discountType === 'PERCENT') {
      discount = Math.round((subtotal * activeCoupon.discountValue) / 100);
    } else {
      discount = activeCoupon.discountValue;
    }
    discount = Math.min(discount, subtotal);
  }

  const codFee = state.paymentShipping.enableCod ? state.paymentShipping.codFee : 0;
  const total = Math.max(0, subtotal - discount + shippingFee);

  const cartTotals = {
    subtotal,
    discount,
    shippingFee,
    codFee,
    total,
    qualifiesForFreeShipping,
    amountNeededForFreeShipping
  };

  // 6-Digit Pincode Serviceability Engine
  const checkPincode = (pincode: string): PincodeResult => {
    const clean = pincode.replace(/\D/g, '').slice(0, 6);
    if (clean.length !== 6) {
      const res: PincodeResult = {
        pincode: clean,
        isServiceable: false,
        city: '',
        state: '',
        estimatedDeliveryDays: 0,
        estimatedDeliveryDate: '',
        codAvailable: false,
        message: 'Please enter a valid 6-digit Indian postal pincode.'
      };
      setPincodeResult(res);
      return res;
    }

    // Realistic delivery estimation logic based on Indian Postal Zones
    const firstDigit = clean[0];
    let city = 'Metro Hub';
    let stateName = 'India';
    let days = 3;

    if (firstDigit === '1' || firstDigit === '2') {
      city = 'North Region (Delhi NCR / UP / HR / PB / RJ)';
      stateName = 'Northern Zone';
      days = 3;
    } else if (firstDigit === '3' || firstDigit === '4') {
      city = 'West Region (MH / GJ / MP / Goa)';
      stateName = 'Western Zone';
      days = 2;
    } else if (firstDigit === '5' || firstDigit === '6') {
      city = 'South Region (KA / TN / KL / AP / TS)';
      stateName = 'Southern Zone';
      days = 3;
    } else if (firstDigit === '7' || firstDigit === '8') {
      city = 'East & Central (WB / BR / JH / OD / NE)';
      stateName = 'Eastern Zone';
      days = 4;
    }

    const deliveryDateObj = new Date();
    deliveryDateObj.setDate(deliveryDateObj.getDate() + days);
    const dateFormatted = deliveryDateObj.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    const res: PincodeResult = {
      pincode: clean,
      isServiceable: true,
      city,
      state: stateName,
      estimatedDeliveryDays: days,
      estimatedDeliveryDate: dateFormatted,
      codAvailable: state.paymentShipping.enableCod,
      message: `Delivery available in ${days}-${days + 1} business days. Estimated dispatch within 24 hours.`
    };
    setPincodeResult(res);
    return res;
  };

  // Order Operations
  const createOrder = (orderData: Omit<Order, 'id' | 'createdAt'>): Order => {
    const orderId = `RPS-${Date.now().toString().slice(-6)}`;
    const newOrder: Order = {
      ...orderData,
      id: orderId,
      createdAt: new Date().toISOString()
    };

    setState((prev) => ({
      ...prev,
      orders: [newOrder, ...prev.orders]
    }));

    // Trigger audible notification chime
    playTempleBellChime();

    showToast(
      'Order Placed Successfully! 🙏',
      `Order #${orderId} confirmed for ${orderData.customer.name}.`,
      'success'
    );

    clearCart();
    return newOrder;
  };

  const updateOrderStatus = (
    orderId: string,
    status: OrderStatus,
    notes?: string,
    cancelOrRefundNote?: string
  ) => {
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          orderStatus: status,
          statusNotes: notes || o.statusNotes,
          cancelReason: status === 'Cancelled' ? (cancelOrRefundNote || o.cancelReason) : o.cancelReason,
          refundNotes: status === 'Refunded' ? (cancelOrRefundNote || o.refundNotes) : o.refundNotes,
          paymentStatus: status === 'Refunded' ? 'REFUNDED' : o.paymentStatus
        };
      })
    }));
    showToast('Order Status Updated', `Order #${orderId} marked as ${status}.`);
  };

  const updateOrderCourierBooking = (orderId: string, booking: CourierBookingDetails) => {
    setState((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          orderStatus: 'Pickup Scheduled',
          courierBooking: booking
        };
      })
    }));
    showToast('Courier Booked!', `AWB #${booking.awbCode} assigned via ${booking.courierPartner}.`);
  };

  const findOrderOrShipment = (query: string): Order | undefined => {
    const q = query.trim().toUpperCase();
    if (!q) return undefined;
    return state.orders.find(
      (o) =>
        o.id.toUpperCase() === q ||
        o.id.replace('RPS-', '').toUpperCase() === q ||
        o.courierBooking?.awbCode.toUpperCase() === q ||
        o.customer.phone.replace(/\D/g, '') === q.replace(/\D/g, '')
    );
  };

  // Products & Catalog
  const addProduct = (prodData: Omit<Product, 'id'>): Product => {
    const id = `prod-${Date.now()}`;
    const newProd: Product = { ...prodData, id };
    setState((prev) => ({
      ...prev,
      products: [newProd, ...prev.products]
    }));
    showToast('Product Added', `${newProd.name} is now live in the catalog.`);
    return newProd;
  };

  const editProduct = (product: Product) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === product.id ? product : p))
    }));
    showToast('Product Saved', `${product.name} updated successfully.`);
  };

  const deleteProduct = (productId: string) => {
    setState((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== productId)
    }));
    showToast('Product Removed', 'The item has been deleted from the catalog.', 'warn');
  };

  // Reviews
  const addReview = (reviewData: Omit<Review, 'id' | 'date'>) => {
    const newRev: Review = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      date: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    };
    setState((prev) => ({
      ...prev,
      reviews: [newRev, ...prev.reviews]
    }));
    showToast('Review Submitted', 'Thank you for sharing your devotional experience! 🙏');
  };

  // Coupons
  const addCoupon = (couponData: Omit<Coupon, 'id'>) => {
    const newCoupon: Coupon = {
      ...couponData,
      id: `cp-${Date.now()}`,
      code: couponData.code.trim().toUpperCase()
    };
    setState((prev) => ({
      ...prev,
      coupons: [...prev.coupons, newCoupon]
    }));
    showToast('Coupon Created', `Promo code ${newCoupon.code} is now active.`);
  };

  const toggleCoupon = (couponId: string) => {
    setState((prev) => ({
      ...prev,
      coupons: prev.coupons.map((c) =>
        c.id === couponId ? { ...c, isActive: !c.isActive } : c
      )
    }));
  };

  const deleteCoupon = (couponId: string) => {
    setState((prev) => ({
      ...prev,
      coupons: prev.coupons.filter((c) => c.id !== couponId)
    }));
    showToast('Coupon Deleted', 'Coupon removed from store.', 'info');
  };

  // Configuration Updates
  const updateStoreConfig = (cfg: Partial<StoreConfig>) => {
    setState((prev) => ({
      ...prev,
      storeConfig: { ...prev.storeConfig, ...cfg }
    }));
    showToast('Store Profile Updated', 'General settings saved successfully.');
  };

  const updatePickupAddress = (addr: Partial<PickupAddress>) => {
    setState((prev) => ({
      ...prev,
      pickupAddress: { ...prev.pickupAddress, ...addr }
    }));
    showToast('Pickup Address Saved', 'Courier pickup and dispatch address updated.');
  };

  const updateCourierConfig = (cfg: Partial<CourierConfig>) => {
    setState((prev) => ({
      ...prev,
      courierConfig: { ...prev.courierConfig, ...cfg }
    }));
    showToast('Courier Credentials Saved', 'Shiprocket & Delhivery configuration updated.');
  };

  const updatePaymentShipping = (cfg: Partial<PaymentShippingConfig>) => {
    setState((prev) => ({
      ...prev,
      paymentShipping: { ...prev.paymentShipping, ...cfg }
    }));
    showToast('Pricing Rules Updated', 'Shipping and payment fees updated.');
  };

  const updatePoliciesSeo = (cfg: Partial<PoliciesSeo>) => {
    setState((prev) => ({
      ...prev,
      policiesSeo: { ...prev.policiesSeo, ...cfg }
    }));
    showToast('SEO & Legal Policies Saved', 'Meta information and policies updated.');
  };

  const updateSupabaseConfig = (cfg: Partial<SupabaseConfig>) => {
    setState((prev) => ({
      ...prev,
      supabaseConfig: { ...prev.supabaseConfig, ...cfg }
    }));
    showToast('Cloud Database Config Saved', 'Supabase credentials updated.');
  };

  // Backup & Restore
  const exportJsonBackup = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `rajeshwar-pooja-backup-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Backup Exported', 'Complete store configuration & orders saved to JSON file.');
    } catch (err) {
      showToast('Export Failed', 'Could not export backup JSON file.', 'error');
    }
  };

  const importJsonBackup = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON structure');
      setState((prev) => ({
        ...prev,
        ...parsed,
        storeConfig: { ...prev.storeConfig, ...(parsed.storeConfig || {}) },
        pickupAddress: { ...prev.pickupAddress, ...(parsed.pickupAddress || {}) },
        courierConfig: { ...prev.courierConfig, ...(parsed.courierConfig || {}) },
        paymentShipping: { ...prev.paymentShipping, ...(parsed.paymentShipping || {}) },
        policiesSeo: { ...prev.policiesSeo, ...(parsed.policiesSeo || {}) }
      }));
      showToast('Backup Restored', 'Store state successfully loaded from JSON backup.');
      return true;
    } catch (err) {
      showToast('Restore Failed', 'Invalid JSON backup file or corrupted format.', 'error');
      return false;
    }
  };

  const resetToDefaults = () => {
    if (confirm('Are you sure you want to reset all store data to clean defaults? This cannot be undone.')) {
      setState(defaultStoreState);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      showToast('Store Reset', 'Default store configuration restored.');
    }
  };

  // Cloud Supabase Sync
  const syncWithSupabase = async (): Promise<{ success: boolean; message: string }> => {
    const client = getSupabaseClient(state.supabaseConfig.url, state.supabaseConfig.anonKey);
    if (!client) {
      return {
        success: false,
        message: 'Supabase URL or Public Anon Key is missing. Please configure them in Tab 8.'
      };
    }

    try {
      // Test connection by checking or upserting store settings row
      const { error } = await client
        .from('store_settings')
        .upsert(
          {
            id: 'current_store',
            store_state: state,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'id' }
        );

      if (error) {
        return {
          success: false,
          message: `Supabase table sync notice: ${error.message}. Ensure table 'store_settings' exists with columns (id text primary key, store_state jsonb, updated_at timestamptz).`
        };
      }

      setState((prev) => ({
        ...prev,
        supabaseConfig: {
          ...prev.supabaseConfig,
          syncEnabled: true,
          lastSyncedAt: new Date().toISOString()
        }
      }));

      return {
        success: true,
        message: 'Successfully synchronized store state with Supabase cloud database!'
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return {
        success: false,
        message: `Supabase sync error: ${msg}`
      };
    }
  };

  return (
    <StoreContext.Provider
      value={{
        state,
        cart,
        activeCoupon,
        toasts,
        isAdminOpen,
        adminUnlocked,
        isCartOpen,
        isCheckoutOpen,
        selectedProductForQuickView,
        isReviewModalOpen,
        isTrackingModalOpen,
        trackingQuery,
        activePolicyModal,
        pincodeResult,
        storageUsage,

        setIsAdminOpen,
        setAdminUnlocked,
        setIsCartOpen,
        setIsCheckoutOpen,
        setSelectedProductForQuickView,
        setIsReviewModalOpen,
        setIsTrackingModalOpen,
        setTrackingQuery,
        setActivePolicyModal,
        showToast,

        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        applyCoupon,
        removeCoupon,
        cartTotals,

        createOrder,
        updateOrderStatus,
        updateOrderCourierBooking,
        findOrderOrShipment,
        checkPincode,

        addProduct,
        editProduct,
        deleteProduct,
        addReview,
        addCoupon,
        toggleCoupon,
        deleteCoupon,

        updateStoreConfig,
        updatePickupAddress,
        updateCourierConfig,
        updatePaymentShipping,
        updatePoliciesSeo,
        updateSupabaseConfig,

        exportJsonBackup,
        importJsonBackup,
        resetToDefaults,
        syncWithSupabase
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
