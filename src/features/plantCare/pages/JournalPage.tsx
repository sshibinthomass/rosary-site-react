import { useEffect, useRef, useState, type FormEvent } from 'react';

import type { PlantPhoto } from '../domain/models';
import { compressPlantPhoto } from '../journal/imageCompression';
import { photoObjectUrl } from '../journal/photoService';
import { usePlantCare } from '../PlantCareProvider';

function PhotoPreview({ photo, plantName }: { photo: PlantPhoto; plantName: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    void photoObjectUrl(photo).then((next) => { objectUrl = next; if (active) setUrl(next); }).catch(() => undefined);
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [photo]);
  return <article className="care-photo-card">{url ? <img src={url} alt={`${plantName} progress on ${new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(photo.createdAt))}`} /> : <div className="care-photo-loading">Opening private photo…</div>}<div><p className="care-eyebrow">{plantName}</p><h2>{photo.note || 'Progress photo'}</h2><span>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(photo.createdAt))}</span></div></article>;
}

export default function JournalPage() {
  const { plants, photos, addPhoto } = usePlantCare();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [plantId, setPlantId] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    const selectedPlant = plantId || plants[0]?.id;
    if (!file || !selectedPlant) { setMessage('Choose a plant and photo first.'); return; }
    try {
      setBusy(true);
      await addPhoto(selectedPlant, await compressPlantPhoto(file), note);
      setFile(undefined);
      setNote('');
      if (input.current) input.current.value = '';
      setMessage('Progress photo saved privately.');
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'This photo could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="care-page-stack care-journal-page">
      <header className="care-page-heading"><p className="care-eyebrow">Progress, not perfection</p><h1>Journal</h1></header>
      <p className="care-page-intro">A private visual record makes slow changes easier to notice. Guest photos stay on this device; signed-in photos use private storage.</p>
      {message && <p className="care-notice" role="status">{message}</p>}
      {plants.length ? <form className="care-journal-form" onSubmit={save}><label className="care-field">Plant<select value={plantId || plants[0].id} onChange={(event) => setPlantId(event.target.value)}>{plants.map((plant) => <option value={plant.id} key={plant.id}>{plant.nickname}</option>)}</select></label><label className="care-field">Observation<input value={note} onChange={(event) => setNote(event.target.value)} placeholder="A new leaf is opening" /></label><input ref={input} className="care-visually-hidden" id="plant-photo" type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0])} /><button className="care-secondary-button" type="button" onClick={() => input.current?.click()}>Add progress photo</button><span className="care-selected-file">{file?.name ?? 'No photo selected'}</span><button className="care-primary-button" type="submit" disabled={busy || !file}>Save photo</button></form> : <article className="care-empty-card"><h2>Add a plant before starting the journal.</h2></article>}
      <div className="care-photo-grid">{photos.map((photo) => <PhotoPreview key={photo.id} photo={photo} plantName={plants.find((plant) => plant.id === photo.plantId)?.nickname ?? 'Plant'} />)}</div>
    </section>
  );
}
