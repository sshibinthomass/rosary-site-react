import { Link, useParams } from 'react-router-dom';

import { getPublishedSpecies } from '../data/speciesCatalog';
import { usePlantCare } from '../PlantCareProvider';

export default function PlantDetailPage() {
  const { plantId } = useParams();
  const { plants, locations, tasks, events, loading } = usePlantCare();
  const plant = plants.find((item) => item.id === plantId);
  const profile = getPublishedSpecies().find((item) => item.id === plant?.speciesId);
  const location = locations.find((item) => item.id === plant?.locationId);
  const nextTask = tasks.find((task) => task.plantId === plantId && task.status === 'open');

  if (loading) return <p className="care-loading-line">Opening plant record…</p>;
  if (!plant) return <section className="care-empty-card"><h1>Plant not found</h1><Link to="/care/garden">Return to My Garden</Link></section>;

  return (
    <section className="care-page-stack care-plant-detail">
      <Link className="care-back-link" to="/care/garden">← My Garden</Link>
      <header className="care-plant-hero"><span className={`care-plant-mark large ${plant.category}`} aria-hidden="true"><i /><i /><i /></span><div><p className="care-eyebrow">{location?.name ?? 'Saved location'}</p><h1>{plant.nickname}</h1><p>{profile?.scientificName || plant.category}</p></div></header>
      {nextTask && <article className="care-next-task"><p className="care-eyebrow">Next observation</p><h2>{nextTask.prompt}</h2><p>{nextTask.explanation}</p><Link className="care-primary-button" to="/care">Open care desk <span aria-hidden="true">→</span></Link></article>}
      {profile && <div className="care-facts"><article><p className="care-eyebrow">Light</p><h2>{profile.sunlight || 'Bright, suitable light'}</h2></article><article><p className="care-eyebrow">Mix</p><h2>{profile.soil || 'A free-draining mix'}</h2></article><article><p className="care-eyebrow">India note</p><h2>{profile.southIndiaNote || profile.northIndiaNote || profile.watering}</h2></article></div>}
      <section><p className="care-eyebrow">Recent observations</p><div className="care-event-list">{events.filter((event) => event.plantId === plant.id).map((event) => <p key={event.id}><strong>{event.type.replaceAll('_', ' ')}</strong><span>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(event.occurredAt))}</span></p>)}</div></section>
    </section>
  );
}
