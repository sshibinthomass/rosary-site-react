import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { EmptyState, Eyebrow, ListRow, PageBar } from '../components/storefront';

const SUGGESTIONS = [
  { title: 'All succulents', to: '/category/Succulent' },
  { title: 'Care guides', to: '/guides' },
  { title: 'Track an order', to: '/orders' },
];

export default function NotFoundPage() {
  return (
    <div className="animate-fade-in mx-auto max-w-2xl pb-8">
      <SEO title="Page Not Found" description="The page you're looking for doesn't exist." noindex />

      <PageBar title="Page not found" />

      <EmptyState
        icon="sprout"
        tone="sage"
        title="This one is not on the bench"
        description="The page you were after has moved or never existed. The plants are all still here."
      >
        <div className="flex flex-wrap justify-center gap-2.5">
          <Link to="/shop" className="btn btn-primary">
            Browse the bench
          </Link>
          <Link to="/" className="btn btn-secondary">
            Go home
          </Link>
        </div>
      </EmptyState>

      <div className="mt-10">
        <Eyebrow className="mb-3">People usually want</Eyebrow>
        <div className="space-y-2.5">
          {SUGGESTIONS.map((item) => (
            <ListRow key={item.to} title={item.title} to={item.to} />
          ))}
        </div>
      </div>
    </div>
  );
}
