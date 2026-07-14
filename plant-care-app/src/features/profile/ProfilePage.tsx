import { useState } from 'react';
import { Link } from 'react-router-dom';

import { firebaseIsConfigured } from '../../integrations/firebaseConfig';
import { reconcileNotifications, requestPermissionAfterFirstTask } from '../../integrations/notifications/NotificationScheduler';
import { createNotificationDriver } from '../../integrations/notifications/createNotificationDriver';
import { useAuth } from '../auth/AuthProvider';
import { useGarden } from '../garden/GardenProvider';

export default function ProfilePage() {
  const { user, loading, error: authError, signInWithGoogle, signOut } = useAuth();
  const { plants, locations, tasks, syncState } = useGarden();
  const [message, setMessage] = useState<string>();
  const [remindersEnabled, setRemindersEnabled] = useState(() => localStorage.getItem('plant-care-reminders') === 'enabled');

  async function signIn() {
    try { await signInWithGoogle(); }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : 'Google sign-in could not start.'); }
  }

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
    <section className="page-stack profile-page">
      <header className="page-heading"><p className="eyebrow">Your care settings</p><h1>Profile</h1></header>
      <p className="page-intro">The app is public and useful as a guest. Sign in only when you want cloud backup and verified Rosary purchase benefits.</p>
      {(message || authError) && <p className="notice error" role="alert">{message || authError}</p>}
      <div className="profile-grid">
        <article className="account-card">
          <p className="eyebrow">Account</p>
          {loading ? <p>Checking account…</p> : user ? <>
            <h2>{user.displayName || 'Plant friend'}</h2><p>{user.email}</p>
            <span className={`sync-pill ${syncState}`}>{syncState === 'synced' ? 'Garden synced' : syncState === 'syncing' ? 'Syncing garden' : syncState === 'error' ? 'Sync needs attention' : 'Saved on this device'}</span>
            <button className="secondary-button" onClick={() => void signOut()}>Sign out</button>
          </> : <>
            <h2>Continue as a guest</h2>
            <p>{plants.length} plants and {locations.length} places are stored only on this device.</p>
            <button className="google-button" disabled={!firebaseIsConfigured} onClick={() => void signIn()}>Continue with Google</button>
            {!firebaseIsConfigured && <small>Firebase variables are not configured in this build. Guest care remains available.</small>}
          </>}
        </article>
        <article className="benefit-card">
          <p className="eyebrow">Included for everyone</p>
          <h2>Care without a paywall.</h2>
          <ul><li>Up to 10 non-Rosary plants</li><li>One indoor and one balcony place</li><li>Offline care history and seasonal guidance</li></ul>
        </article>
        <article className="benefit-card rosary">
          <p className="eyebrow">Rosary customer benefits</p>
          <h2>Your purchases grow with you.</h2>
          <ul><li>Unlimited verified Rosary plants</li><li>One-tap order imports</li><li>90 days of enhanced benefits after delivery</li></ul>
          {!user && <p className="fine-print">Sign in with the Google account used for your Rosary order to verify benefits.</p>}
          <Link className="text-link" to="/rosary">Open Rosary benefits →</Link>
        </article>
        <article className="benefit-card reminder-card">
          <p className="eyebrow">Gentle reminders</p>
          <h2>Prompts to check, never commands to water.</h2>
          <p>Reminder permission is optional and requested only when you choose it.</p>
          <button className="secondary-button" onClick={() => void enableReminders()}>{remindersEnabled ? 'Reschedule reminders' : 'Enable reminders'}</button>
        </article>
      </div>
    </section>
  );
}
