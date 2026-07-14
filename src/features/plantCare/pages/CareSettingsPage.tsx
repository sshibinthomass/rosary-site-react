import { useState } from 'react';
import { Link } from 'react-router-dom';

import { createNotificationDriver } from '../integrations/notifications/createNotificationDriver';
import { reconcileNotifications, requestPermissionAfterFirstTask } from '../integrations/notifications/NotificationScheduler';
import { usePlantCare } from '../PlantCareProvider';

export default function CareSettingsPage() {
  const { plants, locations, tasks, syncState } = usePlantCare();
  const [message, setMessage] = useState<string>();
  const [remindersEnabled, setRemindersEnabled] = useState(() => localStorage.getItem('plant-care-reminders') === 'enabled');
  const syncLabel = syncState === 'synced' ? 'Garden synced' : syncState === 'syncing' ? 'Syncing garden' : syncState === 'error' ? 'Sync needs attention' : 'Saved on this device';

  async function enableReminders() {
    const driver = await createNotificationDriver();
    const permission = await requestPermissionAfterFirstTask(driver);
    if (permission !== 'granted') {
      setMessage('Reminders are off. You can continue using every care feature without them.');
      return;
    }
    await reconcileNotifications(tasks, plants, driver, 9);
    localStorage.setItem('plant-care-reminders', 'enabled');
    setRemindersEnabled(true);
    setMessage('Inspection reminders are scheduled for 9:00 AM local time.');
  }

  return (
    <section className="care-page-stack">
      <header className="care-page-heading"><p className="care-eyebrow">Your care preferences</p><h1>Plant Care settings</h1></header>
      <p className="care-page-intro">Your Rosary account remains the one account for shopping and plant care. These settings only control the care experience.</p>
      {message && <p className="care-notice" role="status">{message}</p>}
      <div className="care-benefit-grid">
        <article><p className="care-eyebrow">Garden storage</p><h2>{syncLabel}</h2><p>{plants.length} plants across {locations.length} growing places.</p><Link className="care-text-link" to="/account">Manage Rosary account →</Link></article>
        <article><p className="care-eyebrow">Gentle reminders</p><h2>Prompts to check, never commands to water</h2><p>Optional inspection reminders are requested only when you choose to enable them.</p><button className="care-secondary-button" onClick={() => void enableReminders()}>{remindersEnabled ? 'Reschedule reminders' : 'Enable reminders'}</button></article>
        <article className="rosary"><p className="care-eyebrow">Customer extras</p><h2>Connect verified Rosary purchases</h2><p>Use your existing Rosary account to unlock order imports and customer care benefits.</p><Link className="care-primary-button" to="/care/benefits">View benefits</Link></article>
      </div>
    </section>
  );
}
