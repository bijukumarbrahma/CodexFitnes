/* Firebase configuration for Codex Fitness */
const firebaseConfig = {
  apiKey: "AIzaSyD1_o5WlzeZQ4DZ1Bka1BG-mV3R6zvx37E",
  authDomain: "fittnesx-498da.firebaseapp.com",
  projectId: "fittnesx-498da",
  storageBucket: "fittnesx-498da.firebasestorage.app",
  messagingSenderId: "967013112846",
  appId: "1:967013112846:web:c63f79f9c7760367be705f",
  measurementId: "G-WL9HVZ7R3C"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
