import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../../context/AuthContext';
import { getPlanAccess } from '../domain/entitlements';
import { acceptRosaryImport, loadRosaryBenefits, syncRosaryBenefits, type RosaryImport } from '../integrations/rosary/rosaryFunctions';
import { usePlantCare } from '../PlantCareProvider';

export default function RosaryBenefitsPage() {
  const { user, signInWithGoogle } = useAuth() as { user: { uid: string } | null; signInWithGoogle(): Promise<unknown> };
  const { locations, refresh } = usePlantCare();
  const [imports, setImports] = useState<RosaryImport[]>([]);
  const [expiresAt, setExpiresAt] = useState<string>();
  const [locationId, setLocationId] = useState('');
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!user) return;
    const state = await loadRosaryBenefits(user.uid);
    setImports(state.imports);
    setExpiresAt(state.entitlement?.expiresAt);
    if (!locationId && locations[0]) setLocationId(locations[0].id);
  }

  useEffect(() => { void load().catch(() => setMessage('Rosary benefits could not be loaded.')); }, [user?.uid]);

  async function checkOrders() {
    try {
      setBusy(true);
      const result = await syncRosaryBenefits();
      await load();
      setMessage(result.importCount ? `Found ${result.importCount} verified plant purchase${result.importCount === 1 ? '' : 's'}.` : 'No eligible plant purchases were found yet.');
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Rosary orders could not be checked.');
    } finally { setBusy(false); }
  }

  async function addImport(plantImport: RosaryImport) {
    if (!locationId) { setMessage('Add an indoor or balcony place before importing this plant.'); return; }
    try {
      setBusy(true);
      await acceptRosaryImport(plantImport.id, locationId);
      await Promise.all([load(), refresh()]);
      setMessage(`${plantImport.nickname} is now in My Garden.`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'This Rosary plant could not be imported.');
    } finally { setBusy(false); }
  }

  if (!user) return (
    <section className="care-page-stack">
      <header className="care-page-heading"><p className="care-eyebrow">Verified purchases</p><h1>Rosary benefits</h1></header>
      <p className="care-page-intro">Anyone can use Plant Care. Sign in with the Google account attached to a Rosary order to unlock customer extras.</p>
      <button className="care-primary-button" onClick={() => void signInWithGoogle()}>Continue with Google</button>
    </section>
  );

  const access = getPlanAccess(expiresAt ? { expiresAt } : undefined);
  return (
    <section className="care-page-stack">
      <header className="care-page-heading care-split-heading"><div><p className="care-eyebrow">Verified purchases</p><h1>Rosary benefits</h1></div><button className="care-primary-button" disabled={busy} onClick={() => void checkOrders()}>Check my orders</button></header>
      <p className="care-page-intro">Only server-verified confirmed, shipped, or delivered orders appear here. Plant Care cannot grant itself Rosary customer status.</p>
      {message && <p className="care-notice" role="status">{message}</p>}
      {access.rosaryPlusActive && <article className="care-entitlement"><p className="care-eyebrow">Rosary Plus active</p><h2>Enhanced benefits through {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(expiresAt!))}</h2></article>}
      {locations.length ? <label className="care-field care-import-location">Add purchases to<select value={locationId || locations[0].id} onChange={(event) => setLocationId(event.target.value)}>{locations.map((location) => <option value={location.id} key={location.id}>{location.name}</option>)}</select></label> : <p className="care-notice"><Link to="/care/add">Create a growing place</Link> before importing a purchase.</p>}
      <div className="care-imports-list">
        {imports.filter((item) => item.status === 'available').map((item) => <article key={item.id}><span className={`care-species-dot ${item.category}`} aria-hidden="true" /><div><p className="care-eyebrow">Order {item.orderId}</p><h2>{item.nickname}</h2></div><button className="care-secondary-button" disabled={busy || !locations.length} onClick={() => void addImport(item)}>Add to garden</button></article>)}
        {!imports.some((item) => item.status === 'available') && <article className="care-empty-card"><h2>No plants waiting to import.</h2><p>Check your Rosary orders after they are confirmed.</p></article>}
      </div>
    </section>
  );
}
