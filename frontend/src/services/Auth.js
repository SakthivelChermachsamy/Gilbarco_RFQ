
import { auth } from '../firebaseConfig';
import { signOut as firebaseSignOut } from 'firebase/auth';

export const isAuthenticated = () => {
  return auth.currentUser !== null;
};

export const Logout = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};