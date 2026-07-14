function EmptyPreview({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <section className="empty-preview">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{body}</p>
    </section>
  );
}

export function TodayPreview() {
  return (
    <section className="today-preview">
      <div className="hero-copy">
        <p className="eyebrow">Tuesday · July 14</p>
        <h1>Know what each plant needs today.</h1>
        <p>Observe first. Act only when your plant confirms it.</p>
      </div>
      <div className="soil-dial" aria-label="No plant checks due yet">
        <span className="dial-leaf" aria-hidden="true" />
        <strong>0</strong>
        <small>checks due</small>
      </div>
      <article className="starter-card">
        <span className="card-rule" aria-hidden="true" />
        <p className="eyebrow">Begin your garden</p>
        <h2>Your plants will set the rhythm.</h2>
        <p>Add your first plant and we’ll create a careful inspection schedule for your home and season.</p>
        <NavButton />
      </article>
    </section>
  );
}

function NavButton() {
  return <a className="primary-button" href="/add">Add your first plant <span aria-hidden="true">→</span></a>;
}

export function GardenPreview() {
  return <EmptyPreview eyebrow="My collection" title="Your garden, one plant at a time." body="Plants you add will live here, with their care history close by." />;
}

export function AddPreview() {
  return <EmptyPreview eyebrow="Verified plant guide" title="Find your plant." body="Search Rosary’s curated catalogue of plants grown for Indian homes and balconies." />;
}

export function JournalPreview() {
  return <EmptyPreview eyebrow="Progress, not perfection" title="A visual diary for every leaf." body="Photos and observations will make slow changes easier to notice." />;
}

export function ProfilePreview() {
  return <EmptyPreview eyebrow="Your care settings" title="Care that fits your home." body="Set your city, reminders, and connect Rosary purchases when you are ready." />;
}
