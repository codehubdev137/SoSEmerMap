import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyAsxx-iPM-Zxh16IbrrVYgk7MZk3kRu1hc',
  authDomain: 'sosemermap.firebaseapp.com',
  projectId: 'sosemermap',
  databaseURL: 'https://sosemermap-default-rtdb.asia-southeast1.firebasedatabase.app',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);
