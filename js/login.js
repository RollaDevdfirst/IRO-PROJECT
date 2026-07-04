import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("loginForm");
const messageBox = document.getElementById("formMessage");
const submitBtn = document.getElementById("loginBtn");

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `form-message ${type}`;
}

function clearMessage() {
  messageBox.className = "form-message";
  messageBox.textContent = "";
}

function friendlyError(code) {
  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password. Please try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Couldn't log you in right now. Please try again.";
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showMessage("Please enter both your email and password.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Logging in...";

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    const userSnap = await getDoc(doc(db, "users", uid));

    if (!userSnap.exists()) {
      showMessage(
        "We couldn't find your account details. Please contact support.",
        "error",
      );
      submitBtn.disabled = false;
      submitBtn.textContent = "Log in";
      return;
    }

    const userData = userSnap.data();

    if (userData.active === false) {
      showMessage(
        "This account has been deactivated. Contact an admin for help.",
        "error",
      );
      await signOut(auth);
      submitBtn.disabled = false;
      submitBtn.textContent = "Log in";
      return;
    }

    if (userData.role === "admin") {
      window.location.href = "admin-dashboard.html";
    } else {
      window.location.href = "user-dashboard.html";
    }
  } catch (err) {
    showMessage(friendlyError(err.code), "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Log in";
  }
});
