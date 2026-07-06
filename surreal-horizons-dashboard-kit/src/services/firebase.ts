import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAnalytics } from "firebase/analytics";

// Configuración explícita proporcionada por el usuario
const firebaseConfig = {
  apiKey: "AIzaSyAMH4GgxG73vS8rI5fnSjKBXZvPe_g2G4E",
  authDomain: "login-aistudio.firebaseapp.com",
  projectId: "login-aistudio",
  storageBucket: "login-aistudio.firebasestorage.app",
  messagingSenderId: "51286524136",
  appId: "1:51286524136:web:0d399cfb57f79f7c8f895d",
  measurementId: "G-3RGQNM33SB"
};

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');
export const analytics = getAnalytics(app);
