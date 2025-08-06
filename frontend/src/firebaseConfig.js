import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCL9T-jBIuwU11HIE1wIOciup5D0WUJoNk",
  authDomain: "gilbarco-tes.firebaseapp.com",
  projectId: "gilbarco-tes",
  storageBucket: "gilbarco-tes.firebasestorage.app",
  messagingSenderId: "725957585639",
  appId: "1:725957585639:web:7068f4b77f879be5211042",
  measurementId: "G-DX2JCH4W79"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);