import type { Metadata } from 'next';
import Script from 'next/script';
import { getPublicStoreState } from '@/lib/server/catalog';
import { getSettingsSection } from '@/lib/server/settings';
import { isDbConfigured } from '@/lib/server/db';
import { StoreProvider } from '@/lib/storeContext';
import Storefront from '@/components/Storefront';
import SetupRequired from '@/components/SetupRequired';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  if (!isDbConfigured()) return { title: 'Setup required' };
  try {
    const seo = await getSettingsSection('seo');
    return {
      title: seo.metaTitle,
      description: seo.metaDescription,
      keywords: seo.metaKeywords,
      openGraph: {
        title: seo.metaTitle,
        description: seo.metaDescription,
        type: 'website',
        images: seo.ogImage ? [seo.ogImage] : undefined
      }
    };
  } catch {
    return {};
  }
}

/** JSON for a <script> tag, escaped so text like "</script>" in product names cannot break out. */
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export default async function Home() {
  if (!isDbConfigured()) return <SetupRequired reason="DATABASE_URL is not set." />;

  let state;
  try {
    state = await getPublicStoreState();
  } catch (err) {
    console.error('[home] failed to load store data', err);
    return <SetupRequired reason="The database could not be reached or has not been migrated. Run `npm run db:migrate`." />;
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: state.storeConfig.storeName,
    description: state.storeConfig.heroSubheadline,
    telephone: state.storeConfig.supportPhone || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: state.pickupAddress.street || undefined,
      addressLocality: state.pickupAddress.city || undefined,
      postalCode: state.pickupAddress.pincode || undefined,
      addressCountry: 'IN'
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: state.storeConfig.storeName,
      itemListElement: state.products.map((p) => ({
        '@type': 'Product',
        name: p.name,
        image: p.images[0],
        description: p.description,
        sku: p.sku,
        ...(p.reviewCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.reviewCount } } : {}),
        offers: {
          '@type': 'Offer',
          price: p.sellingPrice,
          priceCurrency: 'INR',
          availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
        }
      }))
    }
  };

  const gaId = /^G-[A-Z0-9]{4,20}$/.test(state.policiesSeo.gaMeasurementId) ? state.policiesSeo.gaMeasurementId : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}
          </Script>
        </>
      )}
      <StoreProvider initialState={state}>
        <Storefront />
      </StoreProvider>
    </>
  );
}
