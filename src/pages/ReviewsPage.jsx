import { useState } from 'react';
import reviewsData from '../data/reviews.json';
import SEO from '../components/SEO';

export default function ReviewsPage() {
  // Calculate average rating for AggregateRating schema
  const averageRating = reviewsData.reduce((acc, rev) => acc + rev.rating, 0) / reviewsData.length;

  const reviewSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Rosary Plant House Shopping Experience",
    "image": "https://rosaryplanthouse.com/hero-bg.jpg",
    "description": "Customer reviews and feedback for Rosary Plant House, Coonoor.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": averageRating.toFixed(1),
      "reviewCount": reviewsData.length
    },
    "review": reviewsData.map(rev => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": rev.author
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": rev.rating,
        "bestRating": "5"
      },
      "reviewBody": rev.text
    }))
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in">
      <SEO 
        title="Customer Reviews" 
        description="Read what our plant lovers say about Rosary Plant House. 5-star rated nursery from Coonoor, Nilgiris packing rare succulents for safety." 
        schemaData={reviewSchema}
      />
      <div className="flex flex-col items-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-3">Customer Reviews</h1>
        <div className="w-24 h-1 bg-[var(--color-terracotta)] rounded-full mb-4"></div>
        <p className="text-[var(--text-secondary)] text-center max-w-2xl">
          Hear what our lovely customers have to say about their experience with Rosary Plant House.
        </p>
      </div>
      
      <div className="grid gap-6">
        {reviewsData.map((review, index) => (
          <div key={index} className="glass p-6 md:p-8 rounded-2xl border border-[var(--border-color)] hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[var(--color-terracotta)] text-white flex items-center justify-center font-bold text-xl shadow-sm">
                  {review.author.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-[var(--text-primary)]">{review.author}</h3>
                </div>
              </div>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-5 h-5 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
            <p className="text-[var(--text-primary)] leading-relaxed italic">
              "{review.text}"
            </p>
            {review.images && review.images.length > 0 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {review.images.map((img, i) => (
                  <img key={i} src={img} alt={`Review photo ${i + 1}`} className="h-24 w-24 md:h-32 md:w-32 object-cover rounded-lg shadow-sm shrink-0" />
                ))}
              </div>
            )}
            {review.link && (
              <div className="mt-4">
                <a href={review.link} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-[var(--color-forest)] hover:underline inline-flex items-center gap-1">
                  View full review
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
