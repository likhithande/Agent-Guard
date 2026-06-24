import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDgNLqEkXaSaavxhMcoJM3XghD_nYBjoSI",
  authDomain: "project-fff80.firebaseapp.com",
  projectId: "project-fff80",
  storageBucket: "project-fff80.firebasestorage.app",
  messagingSenderId: "135241802038",
  appId: "1:135241802038:web:73b85314dc7f544bc71397",
  measurementId: "G-F6MLN74XD7"
};

import { getFirestore } from "firebase/firestore";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
