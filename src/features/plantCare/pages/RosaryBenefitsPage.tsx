import { Link } from 'react-router-dom';

export default function RosaryBenefitsPage() {
  return (
    <section className="care-page-stack">
      <header className="care-page-heading"><p className="care-eyebrow">Verified purchases</p><h1>Rosary benefits</h1></header>
      <p className="care-page-intro">Plant Care is free for everyone. Rosary customers can also import verified purchases and receive enhanced care benefits.</p>
      <div className="care-benefit-grid">
        <article><p className="care-eyebrow">For everyone</p><h2>Care without a paywall</h2><ul><li>Private plant records</li><li>Season-aware observation windows</li><li>Progress journal</li></ul></article>
        <article className="rosary"><p className="care-eyebrow">Rosary customers</p><h2>Your purchases grow with you</h2><ul><li>Verified order imports</li><li>Unlimited Rosary plants</li><li>90 days of enhanced benefits after delivery</li></ul><Link className="care-primary-button" to="/account">Open account</Link></article>
      </div>
    </section>
  );
}
