import { Helmet } from 'react-helmet-async';
import {
  buildProductStructuredData,
  DEFAULT_SEO_IMAGE_PATH,
  PRODUCT_SEO_SITE,
  getAbsoluteImageUrl,
} from '../utils/productSeo';

export default function SEO({
  title,
  description,
  image,
  type = 'website',
  url,
  canonicalUrl,
  noindex = false,
  robots,
  productData,
  schemaData,
}) {
  const siteTitle = 'Rosary Plant House';
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const defaultDesc = 'Beautiful succulents, cacti & indoor plants from Nilgiris, Coonoor. Shop online and get plants delivered across India.';
  const finalDesc = description || defaultDesc;
  const defaultImage = DEFAULT_SEO_IMAGE_PATH;
  const finalImage = getAbsoluteImageUrl(image || defaultImage, PRODUCT_SEO_SITE.url);
  const finalUrl = canonicalUrl || url;
  const robotsContent = robots || (noindex
    ? 'noindex,follow'
    : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
  const productSchema = productData ? buildProductStructuredData(productData) : null;

  return (
    <Helmet>
      {/* Standard Meta */}
      <title>{fullTitle}</title>
      <meta name="description" content={finalDesc} />
      <meta name="robots" content={robotsContent} />
      {finalUrl && <link rel="canonical" href={finalUrl} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDesc} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:type" content={type} />
      {finalUrl && <meta property="og:url" content={finalUrl} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDesc} />
      <meta name="twitter:image" content={finalImage} />

      {/* Structured Data (JSON-LD) for Products */}
      {productSchema && (
        <script type="application/ld+json">
          {JSON.stringify(productSchema)}
        </script>
      )}

      {/* Custom Structured Data (JSON-LD) */}
      {schemaData && (
        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      )}
    </Helmet>
  );
}
