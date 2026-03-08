import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, image, type = 'website', url, productData, schemaData }) {
  const siteTitle = 'Rosary Plant House';
  const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const defaultDesc = 'Beautiful succulents, cacti & indoor plants from Nilgiris, Coonoor. Shop online and get plants delivered across India.';
  const finalDesc = description || defaultDesc;
  const defaultImage = '/og-image.jpg'; // fallback
  const finalImage = image || defaultImage;

  return (
    <Helmet>
      {/* Standard Meta */}
      <title>{fullTitle}</title>
      <meta name="description" content={finalDesc} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDesc} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:type" content={type} />
      {url && <meta property="og:url" content={url} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDesc} />
      <meta name="twitter:image" content={finalImage} />

      {/* Structured Data (JSON-LD) for Products */}
      {productData && (
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: productData.name || productData.title,
            image: finalImage,
            description: finalDesc,
            offers: {
              '@type': 'Offer',
              priceCurrency: 'INR',
              price: productData.price,
              availability: productData.available 
                ? 'https://schema.org/InStock' 
                : 'https://schema.org/OutOfStock'
            }
          })}
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
