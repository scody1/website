'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CartItem, CartLine, CustomerOrderSummary, CustomerProfile, PincodeResult, Product, PublicCoupon, PublicStoreState } from './shared/types';
import { computeQuote } from './shared/pricing';
import { apiFetch, errorMessage } from './api';
import { useToast, ToastType } from './toast';

const CART_KEY = 'rps_cart_v3';
const COUPON_KEY = 'rps_coupon_v3';

type PolicyModal = 'privacy' | 'terms' | 'refund' | 'shipping' | null;

interface CustomerRegisterInput {
  name: string;
  phone: string;
  email?: string;
  password: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

interface StoreContextType {
  state: PublicStoreState;
  cart: CartItem[];
  activeCoupon: PublicCoupon | null;
  isCartOpen: boolean;
  isCheckoutOpen: boolean;
  selectedProductForQuickView: Product | null;
  isReviewModalOpen: boolean;
  isTrackingModalOpen: boolean;
  trackingQuery: string;
  activePolicyModal: PolicyModal;
  pincodeResult: PincodeResult | null;

  // Customer Account & Auth
  customer: CustomerProfile | null;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup';
  isAccountDrawerOpen: boolean;
  customerOrders: CustomerOrderSummary[];
  isLoadingCustomerOrders: boolean;
  openAuthModal: (mode?: 'login' | 'signup') => void;
  closeAuthModal: () => void;
  setIsAccountDrawerOpen: (v: boolean) => void;
  loginCustomer: (identifier: string, password: string) => Promise<boolean>;
  signupCustomer: (data: CustomerRegisterInput) => Promise<boolean>;
  logoutCustomer: () => Promise<void>;
  updateProfile: (data: Partial<CustomerProfile>) => Promise<boolean>;
  loadCustomerOrders: () => Promise<void>;
  cancelOrRefundOrder: (orderId: string, reason: string, upiId?: string) => Promise<{ success: boolean; action: string; message: string }>;

  setIsCartOpen: (v: boolean) => void;
  setIsCheckoutOpen: (v: boolean) => void;
  setSelectedProductForQuickView: (p: Product | null) => void;
  setIsReviewModalOpen: (v: boolean) => void;
  setIsTrackingModalOpen: (v: boolean) => void;
  setTrackingQuery: (q: string) => void;
  setActivePolicyModal: (m: PolicyModal) => void;
  showToast: (title: string, message: string, type?: ToastType) => void;

  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Promise<boolean>;
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
  checkPincode: (pincode: string) => Promise<PincodeResult | null>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode) — cart still works for this visit */
  }
}

export function StoreProvider({ initialState, children }: { initialState: PublicStoreState; children: React.ReactNode }) {
  const { showToast } = useToast();
  const [state] = useState<PublicStoreState>(initialState);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [activeCoupon, setActiveCoupon] = useState<PublicCoupon | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedProductForQuickView, setSelectedProductForQuickView] = useState<Product | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingQuery, setTrackingQuery] = useState('');
  const [activePolicyModal, setActivePolicyModal] = useState<PolicyModal>(null);
  const [pincodeResult, setPincodeResult] = useState<PincodeResult | null>(null);

  // Customer Authentication & Account State
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [isAccountDrawerOpen, setIsAccountDrawerOpen] = useState(false);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrderSummary[]>([]);
  const [isLoadingCustomerOrders, setIsLoadingCustomerOrders] = useState(false);

  const openAuthModal = useCallback((mode: 'login' | 'signup' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const loadCustomerOrders = useCallback(async () => {
    setIsLoadingCustomerOrders(true);
    try {
      const res = await apiFetch<{ orders: CustomerOrderSummary[] }>('/api/customer/orders');
      setCustomerOrders(res.orders || []);
    } catch {
      // not logged in or failed
    } finally {
      setIsLoadingCustomerOrders(false);
    }
  }, []);

  // Fetch current customer profile on mount
  useEffect(() => {
    let unmounted = false;
    apiFetch<{ customer: CustomerProfile | null }>('/api/customer/me')
      .then((res) => {
        if (!unmounted && res.customer) {
          setCustomer(res.customer);
        }
      })
      .catch(() => {});
    return () => {
      unmounted = true;
    };
  }, []);

  // Whenever customer is set, load their orders
  useEffect(() => {
    if (customer) {
      loadCustomerOrders();
    } else {
      setCustomerOrders([]);
    }
  }, [customer, loadCustomerOrders]);

  const loginCustomer = useCallback(
    async (identifier: string, password: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ ok: boolean; customer: CustomerProfile }>('/api/customer/login', {
          method: 'POST',
          json: { identifier, password }
        });
        setCustomer(res.customer);
        setIsAuthModalOpen(false);
        showToast('Welcome back!', `Signed in as ${res.customer.name}`, 'info');
        return true;
      } catch (err) {
        showToast('Sign In Failed', errorMessage(err), 'warn');
        return false;
      }
    },
    [showToast]
  );

  const signupCustomer = useCallback(
    async (data: CustomerRegisterInput): Promise<boolean> => {
      try {
        const res = await apiFetch<{ ok: boolean; customer: CustomerProfile }>('/api/customer/signup', {
          method: 'POST',
          json: data
        });
        setCustomer(res.customer);
        setIsAuthModalOpen(false);
        showToast('Account Created!', `Welcome to Rajeshwar Pooja Samagri, ${res.customer.name}!`, 'info');
        return true;
      } catch (err) {
        showToast('Registration Failed', errorMessage(err), 'warn');
        return false;
      }
    },
    [showToast]
  );

  const logoutCustomer = useCallback(async () => {
    try {
      await apiFetch('/api/customer/logout', { method: 'POST' });
    } catch {
      // continue clearing local state
    }
    setCustomer(null);
    setCustomerOrders([]);
    setIsAccountDrawerOpen(false);
    showToast('Signed Out', 'You have been signed out successfully.', 'info');
  }, [showToast]);

  const updateProfile = useCallback(
    async (data: Partial<CustomerProfile>): Promise<boolean> => {
      try {
        const res = await apiFetch<{ ok: boolean; customer: CustomerProfile }>('/api/customer/profile', {
          method: 'PUT',
          json: data
        });
        setCustomer(res.customer);
        showToast('Profile Updated', 'Your profile details have been saved.', 'info');
        return true;
      } catch (err) {
        showToast('Update Failed', errorMessage(err), 'warn');
        return false;
      }
    },
    [showToast]
  );

  const cancelOrRefundOrder = useCallback(
    async (orderId: string, reason: string, upiId?: string) => {
      try {
        const res = await apiFetch<{ success: boolean; action: string; message: string }>(
          `/api/customer/orders/${orderId}/cancel`,
          {
            method: 'POST',
            json: { reason, upiId }
          }
        );
        showToast(res.action === 'cancelled' ? 'Order Cancelled' : 'Request Submitted', res.message, 'success');
        await loadCustomerOrders();
        return res;
      } catch (err) {
        showToast('Action Failed', errorMessage(err), 'warn');
        throw err;
      }
    },
    [showToast, loadCustomerOrders]
  );

  const productsById = useMemo(() => new Map(state.products.map((p) => [p.id, p])), [state.products]);

  // Restore the cart, dropping products that no longer exist and capping to current stock.
  useEffect(() => {
    const saved = readStorage<CartLine[]>(CART_KEY, []);
    const valid = Array.isArray(saved)
      ? saved
          .filter((l) => l && typeof l.productId === 'string' && productsById.get(l.productId)?.stock)
          .map((l) => ({ productId: l.productId, quantity: Math.min(Math.max(1, Math.floor(l.quantity) || 1), productsById.get(l.productId)!.stock) }))
      : [];
    setLines(valid);
    setActiveCoupon(readStorage<PublicCoupon | null>(COUPON_KEY, null));
    setLoaded(true);
  }, [productsById]);

  useEffect(() => {
    if (loaded) writeStorage(CART_KEY, lines);
  }, [lines, loaded]);
  useEffect(() => {
    if (loaded) writeStorage(COUPON_KEY, activeCoupon);
  }, [activeCoupon, loaded]);

  const cart: CartItem[] = useMemo(
    () =>
      lines
        .map((l) => {
          const p = productsById.get(l.productId);
          if (!p) return null;
          return { productId: p.id, quantity: l.quantity, name: p.name, sku: p.sku, price: p.sellingPrice, image: p.images[0] || '', stock: p.stock };
        })
        .filter(Boolean) as CartItem[],
    [lines, productsById]
  );

  const addToCart = useCallback((product: Product, quantity = 1) => {
    if (product.stock <= 0) {
      showToast('Out of Stock', `${product.name} is currently out of stock.`, 'warn');
      return;
    }
    const have = lines.find((l) => l.productId === product.id)?.quantity || 0;
    const added = Math.max(0, Math.min(quantity, product.stock - have));
    if (added === 0) {
      showToast('Stock Limit Reached', `Only ${product.stock} unit(s) of ${product.name} are available.`, 'warn');
    } else {
      setLines((prev) => {
        const existing = prev.find((l) => l.productId === product.id);
        const qty = Math.min(product.stock, (existing?.quantity || 0) + added);
        return existing
          ? prev.map((l) => (l.productId === product.id ? { ...l, quantity: qty } : l))
          : [...prev, { productId: product.id, quantity: qty }];
      });
      if (added < quantity) showToast('Quantity Adjusted', `Added ${added} — that is all the stock we have.`, 'info');
      else showToast('Added to Cart', `${product.name} (Qty: ${added})`);
    }
    setIsCartOpen(true);
  }, [lines, showToast]);

  const removeFromCart = useCallback((productId: string) => setLines((prev) => prev.filter((l) => l.productId !== productId)), []);

  const updateCartQty = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const p = productsById.get(productId);
    let target = quantity;
    if (p && quantity > p.stock) {
      target = Math.max(1, p.stock);
      showToast('Stock Limit Reached', `Only ${p.stock} unit(s) available for ${p.name}.`, 'warn');
    }
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity: target } : l)));
  }, [productsById, removeFromCart, showToast]);

  const clearCart = useCallback(() => {
    setLines([]);
    setActiveCoupon(null);
  }, []);

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const applyCoupon = useCallback(async (code: string) => {
    try {
      const { coupon } = await apiFetch<{ coupon: PublicCoupon }>('/api/coupons/validate', { method: 'POST', json: { code, subtotal } });
      setActiveCoupon(coupon);
      showToast('Coupon Applied', `${coupon.code} applied.`);
      return true;
    } catch (err) {
      showToast('Coupon Not Applied', errorMessage(err), 'warn');
      return false;
    }
  }, [subtotal, showToast]);

  const removeCoupon = useCallback(() => {
    setActiveCoupon(null);
    showToast('Coupon Removed', 'The coupon discount was removed.', 'info');
  }, [showToast]);

  const estimate = computeQuote(
    cart.map((i) => ({ unitPrice: i.price, quantity: i.quantity })),
    state.paymentShipping,
    null,
    activeCoupon
  );

  const checkPincode = useCallback(async (pincode: string) => {
    try {
      const { result } = await apiFetch<{ result: PincodeResult }>(`/api/pincode?pin=${encodeURIComponent(pincode)}`);
      setPincodeResult(result);
      return result;
    } catch (err) {
      showToast('Pincode Check Failed', errorMessage(err), 'warn');
      return null;
    }
  }, [showToast]);

  return (
    <StoreContext.Provider
      value={{
        state,
        cart,
        activeCoupon,
        isCartOpen,
        isCheckoutOpen,
        selectedProductForQuickView,
        isReviewModalOpen,
        isTrackingModalOpen,
        trackingQuery,
        activePolicyModal,
        pincodeResult,

        // Customer Account & Auth
        customer,
        isAuthModalOpen,
        authModalMode,
        isAccountDrawerOpen,
        customerOrders,
        isLoadingCustomerOrders,
        openAuthModal,
        closeAuthModal,
        setIsAccountDrawerOpen,
        loginCustomer,
        signupCustomer,
        logoutCustomer,
        updateProfile,
        loadCustomerOrders,
        cancelOrRefundOrder,

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
        cartTotals: {
          subtotal: estimate.subtotal,
          discount: estimate.discount,
          shippingFee: estimate.shippingFee,
          codFee: estimate.codFee,
          total: estimate.total,
          qualifiesForFreeShipping: estimate.qualifiesForFreeShipping,
          amountNeededForFreeShipping: estimate.amountNeededForFreeShipping
        },
        checkPincode
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}
