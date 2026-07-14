import { Link } from 'react-router-dom';

import { usePlantCare } from '../PlantCareProvider';

export default function CareSettingsPage() {
  const { plants, locations, syncState } = usePlantCare();
  const syncLabel = syncState === 'synced' ? 'Garden synced' : syncState === 'syncing' ? 'Syncing garden' : syncState === 'error' ? 'Sync needs attention' : 'Saved on this device';
  return (
    <section className="care-page-stack">
      <header className="care-page-heading"><p className="care-eyebrow">Your care preferences</p><h1>Plant Care settings</h1></header>
      <p className="care-page-intro">Your Rosary account remains the one account for shopping and plant care. These settings only control the care experience.</p>
      <div className="care-benefit-grid">
        <article><p className="care-eyebrow">Garden storage</p><h2>{syncLabel}</h2><p>{plants.length} plants across {locations.length} growing places.</p><Link className="care-text-link" to="/account">Manage Rosary account →</Link></article>
        <article><p className="care-eyebrow">Gentle reminders</p><h2>Prompts to check, never commands to water</h2><p>Optional inspection reminders will be requested only when you choose to enable them.</p></article>
        <article className="rosary"><p className="care-eyebrow">Customer extras</p><h2>Connect verified Rosary purchases</h2><p>Use your existing Rosary account to unlock order imports and customer care benefits.</p><Link className="care-primary-button" to="/care/benefits">View benefits</Link></article>
      </div>
    </section>
  );
}
