function EmptyPreview({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <section className="empty-preview">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{body}</p>
    </section>
  );
}

export function JournalPreview() {
  return <EmptyPreview eyebrow="Progress, not perfection" title="A visual diary for every leaf." body="Photos and observations will make slow changes easier to notice." />;
}

export function ProfilePreview() {
  return <EmptyPreview eyebrow="Your care settings" title="Care that fits your home." body="Set your city, reminders, and connect Rosary purchases when you are ready." />;
}
