# Rajeshwar Pooja Samagri (Sacred Pooja Essentials & Divine Brassware)

A luxury, production-ready full-stack e-commerce web application and comprehensive Admin Management Suite engineered for the devotional brand **"Rajeshwar Pooja Samagri"**.

Built using **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase PostgreSQL**, and secure server-side API routes (`/api/shiprocket`, `/api/delhivery`) with zero hardcoded assumptions.

---

## 🌟 Brand Identity & Visual Language

- **Emblem**: Custom regal Vedic crest SVG in header, footer, and invoices:
  - Ornate golden mandala sunburst outer ring (`#C89D54`)
  - Deep temple maroon medallion center (`#6E1414`)
  - Sacred lotus petals & traditional brass Kalash/Diya base
  - Glowing Jyoti flame & central golden Om (ॐ)
- **Palette**:
  - Primary Background: Sacred Warm Parchment / Cream (`#FDF8F0`, `#F7EFE1`)
  - Deep Temple Maroon: `#6E1414`
  - Sacred Saffron / Terracotta: `#E66A1F`
  - Antique Temple Gold: `#C89D54`
  - Deep Espresso Text: `#23120B`
- **Typography**: `Cinzel` (Regal Serif) & `Plus Jakarta Sans` (Modern Legibility)

---

## 🛍️ Customer Storefront Architecture

1. **Top Announcement Bar**: 100% dynamic, editable from Admin panel.
2. **Floating Glassmorphic Header**: Sticky blur-pill navigation with live search dropdown, delivery pincode quick trigger, order track modal, and cart drawer.
3. **Hero Banner Carousel**: High-impact dark/maroon aesthetic with golden typography and trust badges.
4. **Live 6-Digit Pincode Serviceability Bar**: Instant delivery estimate, postal zone routing, dispatch dates, and COD eligibility.
5. **Shop By Category Carousel**: Circular gold-rimmed frames (Pooja Samagri, Shankh, Brass Idols, Dhoop & Incense, Deepam, Brass Urli).
6. **Complete Spiritual Ecosystem (Bento Grid)**: 4-card architectural grid showcasing Pure Brassware, Energized Items, Vedic Samagri, and Safe Pan-India Delivery.
7. **#1 Bestseller Spotlight Card**: Wide card modeled after the Dhoop Dani Burner with maroon badge, spiritual benefits, star ratings, MRP strikethrough, and 1-Click Buy Now.
8. **Sectioned Product Collections**: Dynamic tabs for Zodiac, Shankh, Deepam, Murti, Brass Urli, and Explore Collections with wishlist toggle, discount badges, and Quick View modals.
9. **Devotional Campaign Banner**: *"एक दिया, राम के नाम"* cultural storytelling movement.
10. **Verified Customer Reviews Wall**: Star rating summary, verified buyer badges, and "Write a Review" submission modal.
11. **Live 5-Step Order Tracking**: Visual progress bar (`Order Confirmed` → `Packed` → `Pickup Scheduled` → `In Transit` → `Delivered`) and live courier links.
12. **Floating WhatsApp & Instagram**: Dynamic WhatsApp inquiry button and persistent mobile dock.

---

## 🔐 Comprehensive Admin Management Suite (8-Tab Control Center)

- **Passcode Protection**: Configurable admin security PIN (default: `1234`).
- **7-Step Store Setup Checklist**: Real-time progress bar guiding complete store configuration.
- **Storage Meter & JSON Backup**: LocalStorage usage monitor + 1-click JSON backup export/restore.
- **Tab 1: Store Setup & Pickup Address Vault**: WhatsApp, Instagram, email, legal name, GSTIN vs Non-GST Bill of Supply, full courier pickup address.
- **Tab 2: Products & Photos Manager**: Add/edit/delete products, stock levels, COGS, and **Client-Side HTML5 Canvas Image Compressor** (auto-compresses uploaded photos to light JPEGs under 80KB).
- **Tab 3: Orders & Customer Directory**: Order workflow, status dropdowns, cancellation/refund notes, CSV export, and 1-click WhatsApp customer alerts.
- **Tab 4: 1-Click Shiprocket & Delhivery Booking**:
  - Secure server-side API `/api/shiprocket`
  - Bearer token authentication
  - 1-click adhoc order creation, AWB assignment, and pickup generation
  - Simulation sandbox fallback
  - Automatic printable **4×6 Thermal Shipping Label** with barcode & **Tax Invoice / Bill of Supply**.
- **Tab 5: Sales & COD Remittance Analytics**: Gross sales, total COGS, net profit %, COD pending vs prepaid settled revenue.
- **Tab 6: Delivery & Coupons Manager**: Standard shipping charges, free shipping threshold, COD fee, percentage and flat promo codes.
- **Tab 7: SEO & Policies Editor**: Dynamic meta title, description, GA4 event injector, and policy editors.
- **Tab 8: Supabase Cloud Database**: Real-time cloud synchronization with PostgreSQL and local fallback.

---

## 🚀 Running Locally

```bash
# Start development server
npm run dev

# Production build
npm run build
npm start
```
