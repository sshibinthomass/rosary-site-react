import { Link } from 'react-router-dom';
import { getProductRelatedSeoLinks } from '../utils/contentHubs';

function LinkGroup({ title, links }) {
  if (!Array.isArray(links) || links.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="inline-flex rounded-full border border-[var(--border-color)] px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--color-forest)] hover:text-[var(--color-forest)]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ProductRelatedLinks({ product }) {
  const links = getProductRelatedSeoLinks(product);
  const hasLinks = links.products.length > 0 || links.plants.length > 0 || links.careGuides.length > 0 || links.problemGuides.length > 0;

  if (!hasLinks) return null;

  return (
    <section className="mt-8 border-t border-[var(--border-color)] pt-6" aria-label="Related plant pages and guides">
      <h2 className="text-xl font-bold text-[var(--text-primary)]">Related plant pages and guides</h2>
      <div className="mt-4 grid gap-5">
        <LinkGroup title="Related products" links={links.products} />
        <LinkGroup title="Related plants" links={links.plants} />
        <LinkGroup title="Related care guides" links={links.careGuides} />
        <LinkGroup title="Related problem guides" links={links.problemGuides} />
      </div>
    </section>
  );
}
