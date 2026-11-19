import { StoreState } from './types';

export const defaultStoreState: StoreState = {
  storeConfig: {
    storeName: 'Rajeshwar Pooja Samagri',
    tagline: 'Sacred Pooja Essentials & Divine Brassware',
    announcement: "🙏 India's Trusted Pooja Essentials & Brassware Brand | Free Express Shipping on Orders Above ₹999",
    whatsapp: '', // Empty: dynamically configured in Admin
    supportPhone: '',
    supportEmail: '',
    instagramUrl: '',
    whatsappGreeting: 'Namaste Rajeshwar Pooja Samagri! I would like to inquire about your Sacred Pooja Essentials & Brassware.',
    adminPasscode: '1234', // Default initial pin, modifiable in Admin
    heroHeadline: "India's Largest Pooja Accessories Store",
    heroSubheadline: "Bring divine vibrations and positive energies home with Vedic-energized brassware, pure dhoop samagri, and authentic spiritual essentials."
  },
  pickupAddress: {
    contactName: 'Rajeshwar Pooja Samagri Dispatch Hub',
    businessLegalName: 'Rajeshwar Pooja Samagri Enterprises',
    shopHouseNo: '',
    street: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    billingType: 'NONGST',
    gstin: '',
    pan: '',
    shiprocketPickupNickname: 'Primary_Warehouse'
  },
  courierConfig: {
    primaryCourier: 'Shiprocket',
    execMode: 'SIMULATION', // Starts in Simulation mode until Admin enters live API keys
    srEmail: '',
    srPassword: '',
    srToken: '',
    srPickupLocation: 'Primary_Warehouse',
    dlToken: '',
    apiProxyUrl: '/api/shiprocket'
  },
  paymentShipping: {
    standardShippingFee: 79,
    freeShippingThreshold: 999,
    codFee: 49,
    enableCod: true,
    enablePrepaid: true,
    upiId: '', // Configured in Admin
    merchantName: 'Rajeshwar Pooja Samagri',
    razorpayKeyId: ''
  },
  policiesSeo: {
    metaTitle: 'Rajeshwar Pooja Samagri | Sacred Pooja Essentials & Divine Brassware',
    metaDescription: 'Shop authentic Vedic Pooja Samagri, pure brass idols, handcrafted deepams, divine shankhs, brass urlis, and natural dhoop incense with pan-India delivery.',
    metaKeywords: 'pooja samagri, brass idols, dhoop burner, shankh, brass urli, deepam, spiritual items, temple decor, vedic rituals',
    ogImage: 'https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?auto=format&fit=crop&w=1200&q=80',
    gaMeasurementId: '',
    privacyPolicy: `At Rajeshwar Pooja Samagri, we respect your privacy and are committed to protecting the personal information you share with us. We collect necessary details such as customer name, shipping address, mobile number, and email solely for order fulfillment, courier delivery via partners like Shiprocket and Delhivery, and WhatsApp dispatch alerts. Your payment data is never stored on our servers and is processed via secure encrypted payment gateways.`,
    termsConditions: `By accessing or purchasing from Rajeshwar Pooja Samagri, you agree to our terms of service. All handcrafted brassware and sacred samagri are subject to natural artisan variations. Orders are fulfilled within 24–48 hours of placement. Standard transit time across India ranges between 3 to 6 business days.`,
    refundPolicy: `We offer a 7-day hassle-free replacement or refund policy for items that arrive damaged, defective, or incorrect during transit. Customers must provide an unboxing video or photographs within 48 hours of delivery to our support team on WhatsApp or Email.`
  },
  supabaseConfig: {
    url: '',
    anonKey: '',
    syncEnabled: false,
    lastSyncedAt: undefined
  },
  categories: [
    {
      id: 'cat-pooja',
      name: 'Pooja Samagri',
      slug: 'pooja-samagri',
      image: 'https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?auto=format&fit=crop&w=400&q=80',
      description: 'Pure Vedic Hawan & Daily Ritual Essentials'
    },
    {
      id: 'cat-shankh',
      name: 'Divine Shankh',
      slug: 'shankh',
      image: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=400&q=80',
      description: 'Natural Blowing & Vamavarti Conches'
    },
    {
      id: 'cat-idols',
      name: 'Brass Idols',
      slug: 'brass-idols',
      image: 'https://images.unsplash.com/photo-1567591414240-e9c1e59f3e06?auto=format&fit=crop&w=400&q=80',
      description: 'Handcrafted Deities in Pure Ashtadhatu & Brass'
    },
    {
      id: 'cat-dhoop',
      name: 'Dhoop & Incense',
      slug: 'dhoop-incense',
      image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=400&q=80',
      description: 'Sambrani Cups, Charcoal Burners & Fragrances'
    },
    {
      id: 'cat-deepam',
      name: 'Deepam & Diya',
      slug: 'deepam',
      image: 'https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?auto=format&fit=crop&w=400&q=80',
      description: 'Kamakshi, Kuthu Vilakku & Akhand Brass Diyas'
    },
    {
      id: 'cat-urli',
      name: 'Brass Urli',
      slug: 'brass-urli',
      image: 'https://images.unsplash.com/photo-1611591472159-259f7ce81187?auto=format&fit=crop&w=400&q=80',
      description: 'Traditional Floral Floating Bowls'
    }
  ],
  products: [
    {
      id: 'prod-1',
      name: 'Royal Handcrafted Pure Brass Dhoop Dani / Loban Burner with Wooden Handle',
      sku: 'RPS-DD-01',
      category: 'Dhoop & Incense',
      section: 'BESTSELLER',
      sellingPrice: 799,
      mrp: 1499,
      cogs: 340,
      stock: 45,
      isBestseller: true,
      images: [
        'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'Authentic heavy-gauge solid brass Loban and Dhoop burner featuring a heat-resistant teakwood handle, ornate lattice cutouts for smooth fragrance diffusion, and a secure lid. Ideal for purifying negative energy and filling your temple with soothing Vedic aroma.',
      spiritualBenefits: [
        'Pure brass lattice distributes purifying herbal smoke evenly across all corners',
        'Natural wood handle ensures 100% heat-insulated holding during Aarti',
        'Clears negative energies, insects, and stale air with pure Sambrani',
        'Easy-clean removable brass perforated ash plate inside'
      ],
      rating: 4.9,
      reviewCount: 342,
      weightKg: 0.65,
      dimensions: { lengthCm: 22, breadthCm: 12, heightCm: 14 },
      tags: ['Bestseller', 'Brassware', 'Dhoop Dani']
    },
    {
      id: 'prod-2',
      name: 'Sacred Natural Vamavarti Blowing Shankh (Loud Acoustic Resonance)',
      sku: 'RPS-SH-02',
      category: 'Divine Shankh',
      section: 'SHANKH',
      sellingPrice: 1299,
      mrp: 2499,
      cogs: 520,
      stock: 28,
      images: [
        'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'Natural oceanic Vamavarti Shankh selected for its flawless spiral and powerful, crisp acoustic vibrations. Blowing the Shankh during morning Pooja dispels lethargy, cleanses ambient prana, and activates respiratory health.',
      spiritualBenefits: [
        'Tested for rich, sonorous 100dB+ resonant Om vibration',
        '100% genuine sea shell with smooth polished mouthpiece',
        'Vedic blessing for prosperity, clarity, and obstacle removal',
        'Includes sacred yellow velvet aasan and brass stand'
      ],
      rating: 4.8,
      reviewCount: 189,
      weightKg: 0.85,
      dimensions: { lengthCm: 18, breadthCm: 10, heightCm: 9 }
    },
    {
      id: 'prod-3',
      name: 'Mangalavar Kamakshi Vilakku Traditional Brass Temple Deepam (Height 7.5 Inches)',
      sku: 'RPS-DP-03',
      category: 'Deepam & Diya',
      section: 'DEEPAM',
      sellingPrice: 1149,
      mrp: 1899,
      cogs: 480,
      stock: 35,
      images: [
        'https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'Auspicious South Indian brass Kamakshi Deepam with intricate Goddess Kamakshi embossing and Gajalakshmi motifs. Traditional oil capacity holds oil for continuous 12-hour Jyoti during festive poojas.',
      spiritualBenefits: [
        'Goddess Kamakshi blessing invokes everlasting domestic harmony and wealth',
        'Cast in heavyweight pure brass with high antique golden gloss finish',
        'Deep reservoir bowl prevents oil overflow and wick burning',
        'Sturdy base prevents tilting during daily Archana'
      ],
      rating: 4.9,
      reviewCount: 215,
      weightKg: 0.95,
      dimensions: { lengthCm: 14, breadthCm: 14, heightCm: 19 }
    },
    {
      id: 'prod-4',
      name: 'Shri Ram Darbar Brass Idol Ensemble (Ram, Sita, Lakshman & Hanuman)',
      sku: 'RPS-MU-04',
      category: 'Brass Idols',
      section: 'MURTI',
      sellingPrice: 3499,
      mrp: 5999,
      cogs: 1450,
      stock: 14,
      images: [
        'https://images.unsplash.com/photo-1567591414240-e9c1e59f3e06?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'Magnificent complete Ram Darbar brass sculpture hand-finished by master sthapatis. Features Maryada Purushottam Lord Ram with bow, Mata Sita, Lakshman, and devout Bhakt Hanuman with folded hands.',
      spiritualBenefits: [
        'Brings dharma, protection, and unconditional devotion into your residence',
        'Solid cast Ashtadhatu-grade brass with exquisite facial serenity',
        'Permanent anti-tarnish protective lacquer treatment',
        'Vedic energization ritual completed before final dispatch'
      ],
      rating: 5.0,
      reviewCount: 94,
      weightKg: 2.4,
      dimensions: { lengthCm: 24, breadthCm: 12, heightCm: 22 }
    },
    {
      id: 'prod-5',
      name: 'Antique Peacock Brass Urli with Floating Diya Holders (12-Inch Diameter)',
      sku: 'RPS-UR-05',
      category: 'Brass Urli',
      section: 'URLI',
      sellingPrice: 2199,
      mrp: 3899,
      cogs: 950,
      stock: 22,
      images: [
        'https://images.unsplash.com/photo-1611591472159-259f7ce81187?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'Regal centerpiece Urli bowl adorned with majestic peacocks along the rim and integrated brass diya slots. Fill with fresh water, rose petals, and floating candles to elevate temple and foyer vastu vibrations.',
      spiritualBenefits: [
        'Water element in Urli enhances positive vastu flow at entrance and mandir',
        'Twin handcrafted peacocks symbolize beauty, grace, and prosperity',
        'Heavy-bottom brass vessel maintains balance effortlessly',
        'Dual-tone antique golden polish suited for luxury traditional decor'
      ],
      rating: 4.9,
      reviewCount: 167,
      weightKg: 1.85,
      dimensions: { lengthCm: 30, breadthCm: 30, heightCm: 16 }
    },
    {
      id: 'prod-6',
      name: 'Navgrah Shanti Zodiac Brass Yantra Diya for Planetary Harmony',
      sku: 'RPS-ZD-06',
      category: 'Pooja Samagri',
      section: 'ZODIAC',
      sellingPrice: 899,
      mrp: 1699,
      cogs: 380,
      stock: 40,
      images: [
        'https://images.unsplash.com/photo-1609710228159-0fa9bd7c0827?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'Specially consecrated Navagraha oil lamp featuring engraved planetary symbols for all 12 Rashi/Zodiac houses. Helps balance planetary doshas and attract auspicious cosmic alignments.',
      spiritualBenefits: [
        'Engraved with 9 sacred Navagraha geometric seed mantras',
        'Neutralizes Shani, Rahu, and Ketu malefic planetary influences',
        'Ideal for lighting on Tuesdays, Saturdays, and Ekadashi',
        'Accompanied by a sacred energized red thread and Kalawa'
      ],
      rating: 4.8,
      reviewCount: 128,
      weightKg: 0.5,
      dimensions: { lengthCm: 15, breadthCm: 15, heightCm: 10 }
    },
    {
      id: 'prod-7',
      name: 'Vedic Panchamrit Pooja Thali Set (11-Piece Solid Pure Brass Set)',
      sku: 'RPS-TH-07',
      category: 'Pooja Samagri',
      section: 'EXPLORE',
      sellingPrice: 1799,
      mrp: 2999,
      cogs: 780,
      stock: 31,
      images: [
        'https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'Complete royal pooja thali set including engraved Gayatri Mantra plate, bell with Garuda finial, Panchamrit bowl, spoon, agarbatti stand, dhoop cup, and dual oil diyas.',
      spiritualBenefits: [
        'Every essential implement forged in coordinated sacred brass',
        'Gayatri mantra engraving creates protective aura in the prayer room',
        'Clear acoustic brass ghanti with piercing pure frequencies',
        'Comes safely packed in a velvet gift presentation box'
      ],
      rating: 4.9,
      reviewCount: 204,
      weightKg: 1.35,
      dimensions: { lengthCm: 28, breadthCm: 28, heightCm: 6 }
    },
    {
      id: 'prod-8',
      name: 'Organic Guggal & Natural Cow Ghee Sambrani Hawan Cups (Pack of 24)',
      sku: 'RPS-HC-08',
      category: 'Dhoop & Incense',
      section: 'EXPLORE',
      sellingPrice: 399,
      mrp: 699,
      cogs: 140,
      stock: 75,
      images: [
        'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80'
      ],
      description: 'Handmade Hawan cups crafted with Desi Gir cow dung charcoal base, pure Guggal resin, Loban crystals, and aromatic Ayurvedic herbs infused with desi ghee. Clean, smokeless burning that purifies temple air.',
      spiritualBenefits: [
        '100% natural, charcoal-chemical-free traditional preparation',
        'Burns completely in 25 minutes releasing authentic temple fragrance',
        'Equivalent spiritual virtue of performing a mini daily Agnihotra',
        'Natural fiber packaging keeps moisture away'
      ],
      rating: 4.9,
      reviewCount: 420,
      weightKg: 0.45,
      dimensions: { lengthCm: 20, breadthCm: 14, heightCm: 5 }
    }
  ],
  coupons: [
    {
      id: 'cp-welcome',
      code: 'DIVINE10',
      discountType: 'PERCENT',
      discountValue: 10,
      minOrderValue: 500,
      isActive: true,
      description: '10% OFF on spiritual orders above ₹500'
    },
    {
      id: 'cp-shanti',
      code: 'RAMRAJYA150',
      discountType: 'FLAT',
      discountValue: 150,
      minOrderValue: 1299,
      isActive: true,
      description: 'Flat ₹150 OFF on brassware orders above ₹1299'
    }
  ],
  orders: [],
  reviews: [
    {
      id: 'rev-1',
      productId: 'prod-1',
      productName: 'Royal Handcrafted Pure Brass Dhoop Dani',
      authorName: 'Rameshwar Sharma',
      location: 'Varanasi, UP',
      rating: 5,
      title: 'Supreme Quality Brass — Pure Temple Feel',
      comment: 'The weight of the brass and the wooden handle finish exceeded all expectations. It diffuses Loban smoothly without heating the handle at all. Beautiful packaging!',
      date: '12 Nov 2026',
      isVerifiedBuyer: true
    },
    {
      id: 'rev-2',
      productId: 'prod-3',
      productName: 'Mangalavar Kamakshi Vilakku Brass Deepam',
      authorName: 'Ananya S. Iyer',
      location: 'Chennai, TN',
      rating: 5,
      title: 'Auspicious Deepam for Friday Pooja',
      comment: 'The facial features of Goddess Kamakshi are carved with immense precision. The oil bowl is deep enough to burn for hours during evening prayers. Truly divine!',
      date: '08 Nov 2026',
      isVerifiedBuyer: true
    },
    {
      id: 'rev-3',
      productId: 'prod-2',
      productName: 'Sacred Natural Vamavarti Blowing Shankh',
      authorName: 'Pandit Devendra Joshi',
      location: 'Ujjain, MP',
      rating: 5,
      title: 'Loud, Deep Sound Resonates Through Entire Home',
      comment: 'Acoustic quality is phenomenal. Clean mouthpiece, no rough edges. Blowing it during Brahma Muhurta brings immediate calm to the mind.',
      date: '04 Nov 2026',
      isVerifiedBuyer: true
    }
  ]
};
