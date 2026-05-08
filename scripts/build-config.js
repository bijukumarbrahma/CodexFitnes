/* Build script: generates js/firebase-config.js from environment variables */
/* Used by Netlify build command */
const fs = require('fs');
const path = require('path');

const config = `/* Firebase configuration - generated at build time */
const firebaseConfig = {
  apiKey: "${process.env.FIREBASE_API_KEY || ''}",
  authDomain: "${process.env.FIREBASE_AUTH_DOMAIN || ''}",
  projectId: "${process.env.FIREBASE_PROJECT_ID || ''}",
  storageBucket: "${process.env.FIREBASE_STORAGE_BUCKET || ''}",
  messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID || ''}",
  appId: "${process.env.FIREBASE_APP_ID || ''}",
  measurementId: "${process.env.FIREBASE_MEASUREMENT_ID || ''}"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
`;

fs.writeFileSync(path.join(__dirname, '..', 'js', 'firebase-config.js'), config);
console.log('✓ js/firebase-config.js generated from environment variables');
