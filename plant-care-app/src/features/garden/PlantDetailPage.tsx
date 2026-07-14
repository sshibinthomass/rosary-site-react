import { Link, useParams } from 'react-router-dom';

import { getPublishedSpecies } from '../../data/speciesCatalog';
import { useGarden } from './GardenProvider';

export default function PlantDetailPage() {
  const { plantId } = useParams();
  const { plants, locations, tasks, events, loading } = useGarden();
  const plant = plants.find((item) => item.id === plantId);
  const profile = getPublishedSpecies().find((item) => item.id === plant?.speciesId);
  const location = locations.find((item) => item.id === plant?.locationId);
  const nextTask = tasks.find((task) => task.plantId === plantId && task.status === 'open');

  if (loading) return <p className="loading-line">Opening plant record…</p>;
  if (!plant) return <section className="empty-care-card"><h1>Plant not found</h1><Link to="/garden">Return to My Garden</Link></section>;

  return (
    <section className="page-stack plant-detail">
      <Link className="back-link" to="/garden">← My Garden</Link>
      <header className="plant-hero">
        <span className={`plant-silhouette large ${plant.category}`} aria-hidden="true"><i /><i /><i /></span>
        <div><p className="eyebrow">{location?.name ?? 'Saved location'}</p><h1>{plant.nickname}</h1><p>{profile?.scientificName || plant.category}</p></div>
      </header>
      {nextTask && <article className="next-task-card"><p className="eyebrow">Next observation</p><h2>{nextTask.prompt}</h2><p>{nextTask.explanation}</p><Link className="primary-button" to="/today">Open care desk <span aria-hidden="true">→</span></Link></article>}
      {profile && <div className="care-facts">
        <article><p className="eyebrow">Light</p><h2>{profile.sunlight || 'Bright, suitable light'}</h2></article>
        <article><p className="eyebrow">Mix</p><h2>{profile.soil || 'A free-draining mix'}</h2></article>
        <article><p className="eyebrow">India note</p><h2>{profile.southIndiaNote || profile.northIndiaNote || profile.watering}</h2></article>
      </div>}
      <section><p className="eyebrow">Recent observations</p><div className="event-list">{events.filter((event) => event.plantId === plant.id).map((event) => <p key={event.id}><strong>{event.type.replaceAll('_', ' ')}</strong><span>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(event.occurredAt))}</span></p>)}</div></section>
    </section>
  );
}
