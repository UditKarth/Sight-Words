// Firebase initialization file
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDKv6Zb0CcRNVx2ctq0eGkLiDEOd1fne4U",
    authDomain: "sight-word-app-8b3df.firebaseapp.com",
    projectId: "sight-word-app-8b3df",
    storageBucket: "sight-word-app-8b3df.firebasestorage.app",
    messagingSenderId: "833715737811",
    appId: "1:833715737811:web:d556f4cfe30ab8fa78b026",
    measurementId: "G-310KZKJ36J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// Export for use in other files
window.firebaseApp = app;
window.firebaseDB = db;
window.firebaseAuth = auth;
window.firebaseAnalytics = analytics;

// Sign in anonymously for teachers (optional - can be removed if you want explicit auth)
signInAnonymously(auth).catch((error) => {
    console.error("Anonymous authentication error:", error);
});

console.log("Firebase initialized successfully");
