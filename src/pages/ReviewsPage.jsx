import { useState } from 'react';
import reviewsData from '../data/reviews.json';

export default function ReviewsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in">
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
                  <p className="text-sm text-[var(--text-secondary)]">{review.time}</p>
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
          </div>
        ))}
      </div>
    </div>
  );
}
