// ============================================
// IRO — Firebase configuration
// Replace the values below with your own Firebase
// project config (Project settings → General →
// Your apps → SDK setup and configuration).
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBXKBrA9A4QBl4qjKuLys-K0LhsC8SWJpY",
  authDomain: "iroweb-d1st.firebaseapp.com",
  projectId: "iroweb-d1st",
  storageBucket: "iroweb-d1st.firebasestorage.app",
  messagingSenderId: "338649710441",
  appId: "1:338649710441:web:325fd82a60c287fb1247f8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);