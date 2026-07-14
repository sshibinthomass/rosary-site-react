import { Link } from 'react-router-dom';

import { getPublishedSpecies } from '../data/speciesCatalog';
import { usePlantCare } from '../PlantCareProvider';

export default function GardenPage() {
  const { plants, locations, tasks, loading } = usePlantCare();
  const species = getPublishedSpecies();

  return (
    <section className="care-page-stack">
      <header className="care-page-heading care-split-heading">
        <div><p className="care-eyebrow">My collection</p><h1>My Garden</h1></div>
        <Link className="care-primary-button" to="/care/add">Add plant <span aria-hidden="true">+</span></Link>
      </header>
      <p className="care-page-intro">A private record of the plants sharing your home, their places, and what you have observed.</p>
      {loading ? <p className="care-loading-line">Opening your garden…</p> : plants.length === 0 ? (
        <article className="care-empty-card">
          <p className="care-eyebrow">Room to grow</p>
          <h2>Your first plant starts here.</h2>
          <p>Add a verified plant profile or create your own, then care for it by observation.</p>
          <Link className="care-primary-button" to="/care/add">Find a plant <span aria-hidden="true">→</span></Link>
        </article>
      ) : (
        <div className="care-plant-grid">
          {plants.map((plant) => {
            const profile = species.find((item) => item.id === plant.speciesId);
            const location = locations.find((item) => item.id === plant.locationId);
            const next = tasks.find((task) => task.plantId === plant.id && task.status === 'open');
            return (
              <Link className="care-plant-card" key={plant.id} to={`/care/plants/${plant.id}`}>
                <span className={`care-plant-mark ${plant.category}`} aria-hidden="true"><i /><i /><i /></span>
                <div>
                  <p className="care-eyebrow">{location?.name ?? 'Saved location'}</p>
                  <h2>{plant.nickname}</h2>
                  <p>{profile?.scientificName || plant.category}</p>
                  <span className="care-next-check">{next ? `Next check ${new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(next.earliestAt))}` : 'No open checks'}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
