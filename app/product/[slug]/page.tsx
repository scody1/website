import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { getPublicProductBySlug, getPublicStoreState, listProductReviews } from '@/lib/server/catalog';
import { isDbConfigured } from '@/lib/server/db';
import { StoreProvider } from '@/lib/storeContext';
import ProductPage from '@/components/ProductPage';
import SetupRequired, { databaseReady } from '@/components/SetupRequired';

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

function absolute(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//.test(url)) return url;
  const site = (process.env.SITE_URL || '').replace(/\/$/, '');
  return site ? `${site}${url}` : url;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isDbConfigured()) return { title: 'Setup required' };
  const product = await getPublicProductBySlug(params.slug).catch(() => null);
  if (!product) return { title: 'Product not found' };
  const description = (product.description || (product.spiritualBenefits || []).join('. ')).slice(0, 160);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: { title: product.name, description, type: 'website', images: product.images?.[0] ? [absolute(product.images[0]) as string] : undefined }
  };
}

const safeJsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

export default async function ProductRoute({ params }: Props) {
  if (!isDbConfigured() || !(await databaseReady())) return <SetupRequired />;
  const product = await getPublicProductBySlug(params.slug);
  if (!product) notFound();
  const [state, reviews] = await Promise.all([getPublicStoreState(), listProductReviews(product.id)]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: (product.images || []).map(absolute),
    description: product.description,
    sku: product.sku,
    category: product.category,
    brand: { '@type': 'Brand', name: state.storeConfig.storeName },
    offers: {
      '@type': 'Offer',
      url: absolute(`/product/${product.slug}`),
      price: product.sellingPrice,
      priceCurrency: 'INR',
      availability: product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition'
    },
    ...(product.reviewCount > 0
      ? {
          aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount },
          review: reviews.slice(0, 5).map((r) => ({
            '@type': 'Review',
            reviewRating: { '@type': 'Rating', ratingValue: r.rating },
            author: { '@type': 'Person', name: r.authorName },
            reviewBody: r.comment
          }))
        }
      : {})
  };

  const gaId = /^G-[A-Z0-9]{4,20}$/.test(state.policiesSeo.gaMeasurementId) ? state.policiesSeo.gaMeasurementId : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      {gaId && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');gtag('event','view_item',{currency:'INR',value:${product.sellingPrice},items:[{item_id:${JSON.stringify(product.sku)},item_name:${JSON.stringify(product.name).replace(/</g, '\\u003c')},price:${product.sellingPrice}}]});`}
          </Script>
        </>
      )}
      <StoreProvider initialState={state}>
        <ProductPage product={product} reviews={reviews} />
      </StoreProvider>
    </>
  );
}
