import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const SETTINGS_DOC = doc(db, 'settings', 'siteConfig');

const DEFAULTS = {
  showPlantDescription: true,
  promoCodesEnabled: true,
  popup: {
    enabled: false,
    title: 'Special Offer!',
    message: 'Check out our latest collection.',
    emoji: '🎉',
    imageUrl: '',
    buttonText: '',
    buttonLink: '',
    bgColor: '#2d6a4f',
    textColor: '#ffffff',
    showOnce: true,
  },
};

export async function getSettings() {
  try {
    const snap = await getDoc(SETTINGS_DOC);
    if (snap.exists()) {
      return { ...DEFAULTS, ...snap.data() };
    }
    return DEFAULTS;
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULTS;
  }
}

export async function updateSettings(partial) {
  try {
    await setDoc(SETTINGS_DOC, partial, { merge: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}
