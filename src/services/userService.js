import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Get user profile
export async function getUserProfile(userId) {
  try {
    const docRef = doc(db, 'users', userId, 'profile', 'info');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}

// Save user profile
export async function saveUserProfile(userId, profileData) {
  try {
    const docRef = doc(db, 'users', userId, 'profile', 'info');
    await setDoc(docRef, {
      ...profileData,
      updatedAt: new Date()
    }, { merge: true });
    return profileData;
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
}

// Lookup state and district from pincode using India Post API
export async function lookupPincode(pincode) {
  if (!pincode || pincode.length !== 6) {
    return null;
  }
  
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await response.json();
    
    if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
      const postOffice = data[0].PostOffice[0];
      return {
        state: postOffice.State,
        district: postOffice.District,
        area: postOffice.Name
      };
    }
    return null;
  } catch (error) {
    console.error('Error looking up pincode:', error);
    return null;
  }
}
