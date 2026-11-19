import type { Metadata } from 'next';
import { Cinzel, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/lib/storeContext';
import ToastContainer from '@/components/ToastContainer';

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-cinzel',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Rajeshwar Pooja Samagri | Sacred Pooja Essentials & Divine Brassware',
  description: "India's Trusted Brand for Consecrated Brass Idols, Vedic Hawan Samagri, Pure Dhoop Dani, Kamakshi Deepams, and Divine Shankhs.",
  keywords: 'Rajeshwar Pooja Samagri, Brass Idols, Dhoop Burner, Shankh, Brass Urli, Deepam, Spiritual Store, Pan India Pooja Delivery',
  openGraph: {
    title: 'Rajeshwar Pooja Samagri | Sacred Pooja Essentials & Divine Brassware',
    description: "Shop authentic Vedic Pooja Samagri and heavy-gauge brassware online with Pan-India express dispatch.",
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${cinzel.variable} ${plusJakarta.variable}`}>
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>ॐ</text></svg>" />
      </head>
      <body className="antialiased min-h-screen selection:bg-gold-500/30 selection:text-maroon-700">
        <StoreProvider>
          {children}
          <ToastContainer />
        </StoreProvider>
      </body>
    </html>
  );
}
