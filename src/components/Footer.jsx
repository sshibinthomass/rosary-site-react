import { NavLink } from 'react-router-dom';
import Icon from './Icon';
import logo from '../assets/logo.png';
import {
  FACEBOOK_URL,
  INSTAGRAM_URL,
  NURSERY_ADDRESS_LINES,
  NURSERY_EMAIL,
  NURSERY_HOURS,
  NURSERY_MAP_URL,
  NURSERY_PHONE_DISPLAY,
  YOUTUBE_URL,
} from '../config/constants';
import { buildWhatsAppLink } from '../utils/nurseryMessages';

const footerLinks = [
  { label: 'Shop', path: '/shop' },
  { label: 'About', path: '/about' },
  { label: 'Care Guides', path: '/guides' },
  { label: 'FAQ', path: '/faq' },
  { label: 'Policies', path: '/policies' },
  { label: 'Reviews', path: '/reviews' },
  { label: 'Contact', path: '/contact' },
];

const footerColumns = [
  {
    heading: 'Shop',
    links: [
      { label: 'All plants', path: '/shop' },
      { label: 'Succulents', path: '/category/Succulent' },
      { label: 'Cactus', path: '/category/Cactus' },
      { label: 'Limited drops', path: '/category/Limited' },
    ],
  },
  {
    heading: 'Learn',
    links: [
      { label: 'Care guides', path: '/guides' },
      { label: 'FAQ', path: '/faq' },
      { label: 'Reviews', path: '/reviews' },
    ],
  },
  {
    heading: 'Ordering',
    links: [
      { label: 'Policies', path: '/policies' },
      { label: 'Delivery', path: '/policies#delivery' },
      { label: 'Damage support', path: '/policies#damage' },
    ],
  },
  {
    heading: 'Nursery',
    links: [
      { label: 'About us', path: '/about' },
      { label: 'Contact', path: '/contact' },
      { label: 'Instagram stories', path: '/insta-reviews' },
    ],
  },
];

const socialLinks = [
  { name: 'WhatsApp', href: 'https://wa.me/917904050237', icon: 'whatsapp' },
  { name: 'Instagram', href: INSTAGRAM_URL, icon: 'instagram' },
  { name: 'Facebook', href: FACEBOOK_URL, icon: 'facebook' },
  { name: 'YouTube', href: YOUTUBE_URL, icon: 'youtube' },
];

export default function Footer() {
  return (
    <footer className="bg-[var(--bg-tertiary)]">
      <div className="mx-auto max-w-7xl px-5 pt-8 pb-28 md:py-12">
        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="" className="h-[30px] w-[30px] object-contain" />
              <span className="font-display text-[17px] text-[var(--text-primary)]">Rosary Plant House</span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              <a
                href={NURSERY_MAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-[var(--text-primary)]"
              >
                {NURSERY_ADDRESS_LINES[0]} &mdash; {NURSERY_ADDRESS_LINES[1]}
              </a>
            </p>
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              WhatsApp{' '}
              <a
                href={buildWhatsAppLink('Hello Rosary Plant House, I have a question.')}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap underline underline-offset-2 hover:text-[var(--text-primary)]"
              >
                {NURSERY_PHONE_DISPLAY}
              </a>
              , {NURSERY_HOURS.toLowerCase()}
              <br />
              <a
                href={`mailto:${NURSERY_EMAIL}`}
                className="underline underline-offset-2 hover:text-[var(--text-primary)]"
              >
                {NURSERY_EMAIL}
              </a>
            </p>
            <div className="mt-4 flex gap-2.5">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={social.name}
                  aria-label={social.name}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] transition-all hover:scale-110 hover:text-[var(--text-primary)]"
                >
                  <Icon name={social.icon} filled className="h-[17px] w-[17px]" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
            {footerColumns.map((column) => (
              <div key={column.heading}>
                <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                  {column.heading}
                </p>
                <div className="flex flex-col gap-1.5">
                  {column.links.map((link) => (
                    <NavLink
                      key={link.label}
                      to={link.path}
                      className="text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--color-accent-700)] dark:hover:text-[var(--color-accent-300)]"
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-color)] pt-5">
          <p className="text-xs text-[var(--text-secondary)]">
            &copy; {new Date().getFullYear()} Rosary Plant House. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-3">
            {footerLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className="text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
