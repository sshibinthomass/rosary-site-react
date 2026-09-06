import { Link } from 'react-router-dom';
import { getProductRelatedSeoLinks } from '../utils/contentHubs';

function LinkGroup({ title, links }) {
  if (!Array.isArray(links) || links.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2.5 font-display text-[21px] text-[var(--text-primary)]">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="inline-flex rounded-full border border-[var(--border-color)] px-3.5 py-2 text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--color-terracotta)] hover:text-[var(--color-accent-700)] dark:hover:text-[var(--color-accent-300)]"
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
    <section className="mt-7 grid gap-6" aria-label="Related plant pages and guides">
      <LinkGroup title="Related plants" links={links.plants} />
      <LinkGroup title="Related care guides" links={links.careGuides} />
      <LinkGroup title="Related problem guides" links={links.problemGuides} />
      <LinkGroup title="Related products" links={links.products} />
    </section>
  );
}
