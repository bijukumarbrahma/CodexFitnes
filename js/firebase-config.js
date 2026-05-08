/* Firebase configuration for Codex Fitness */
const firebaseConfig = {
  apiKey: "AIzaSyBzKo6pH6sCjh3M9TyOKO6F1ek4ejzsppQ",
  authDomain: "fitness-tracker-2c003.firebaseapp.com",
  projectId: "fitness-tracker-2c003",
  storageBucket: "fitness-tracker-2c003.firebasestorage.app",
  messagingSenderId: "892853719584",
  appId: "1:892853719584:web:649341e0143a091fa3a245",
  measurementId: "G-8ZFW145LDV"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
