import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { searchSpecies, type PlantSpeciesProfile } from '../data/speciesCatalog';
import type { IndiaClimateZone, LocationKind } from '../domain/models';
import { usePlantCare } from '../PlantCareProvider';

const climateOptions: Array<{ value: IndiaClimateZone; label: string }> = [
  { value: 'north', label: 'North India plains' },
  { value: 'south', label: 'South India' },
  { value: 'humid-coastal', label: 'Humid coast' },
  { value: 'dry-interior', label: 'Dry interior' },
  { value: 'hill', label: 'Hill climate' },
];

export default function AddPlantPage() {
  const { locations, addLocation, addPlant } = usePlantCare();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const results = useMemo(() => searchSpecies(query).slice(0, query ? 16 : 8), [query]);

  async function createLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      setBusy(true);
      const kind = String(data.get('kind')) as LocationKind;
      const location = await addLocation({
        name: String(data.get('name')).trim(),
        kind,
        exposure: kind === 'balcony' ? String(data.get('exposure')) as 'covered' | 'exposed' : 'covered',
        climateZone: String(data.get('climateZone')) as IndiaClimateZone,
        city: String(data.get('city')).trim(),
      });
      setSelectedLocation(location.id);
      setMessage(`${location.name} is ready.`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'This location could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function choosePlant(profile: PlantSpeciesProfile) {
    const locationId = selectedLocation || locations[0]?.id;
    if (!locationId) {
      setMessage('Create an indoor or balcony location first.');
      return;
    }
    try {
      setBusy(true);
      const plant = await addPlant({ speciesId: profile.id, nickname: profile.name, category: profile.category, locationId, provenance: { kind: 'catalogue' } });
      navigate(`/care/plants/${plant.id}`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'This plant could not be added.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="care-page-stack care-add-page">
      <header className="care-page-heading"><p className="care-eyebrow">Verified plant guide</p><h1>Add a plant</h1></header>
      <p className="care-page-intro">Start with where the plant grows. That context makes every later check safer and more useful.</p>
      {message && <p className="care-notice" role="status">{message}</p>}
      <div className="care-add-layout">
        <aside className="care-location-panel">
          <p className="care-eyebrow">1 · Growing place</p>
          {locations.length > 0 && <label className="care-field">Use a saved place<select value={selectedLocation || locations[0].id} onChange={(event) => setSelectedLocation(event.target.value)}>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>}
          {locations.length < 2 && (
            <form onSubmit={createLocation} className="care-location-form">
              <label className="care-field">Place name<input name="name" required placeholder="Living room" /></label>
              <label className="care-field">City<input name="city" required placeholder="Bengaluru" /></label>
              <label className="care-field">Place type<select name="kind"><option value="indoor">Indoor</option><option value="balcony">Balcony</option></select></label>
              <label className="care-field">Balcony exposure<select name="exposure"><option value="covered">Covered</option><option value="exposed">Open to rain</option></select></label>
              <label className="care-field">Climate<select name="climateZone">{climateOptions.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
              <button className="care-secondary-button" disabled={busy} type="submit">Save growing place</button>
            </form>
          )}
        </aside>
        <div className="care-catalogue-panel">
          <p className="care-eyebrow">2 · Choose a plant</p>
          <label className="care-search-field">Search plants<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Aloe, fern, cactus…" /></label>
          <div className="care-catalogue-list">
            {results.map((profile) => <article className="care-catalogue-row" key={profile.id}><span className={`care-species-dot ${profile.category}`} aria-hidden="true" /><div><h2>{profile.name}</h2><p>{profile.scientificName || profile.category} · {profile.difficulty}</p></div><button disabled={busy} onClick={() => void choosePlant(profile)} aria-label={`Add ${profile.name}`}>Add</button></article>)}
          </div>
        </div>
      </div>
    </section>
  );
}
