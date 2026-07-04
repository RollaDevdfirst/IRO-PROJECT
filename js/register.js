import { auth, db } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("registerForm");
const messageBox = document.getElementById("formMessage");
const submitBtn = document.getElementById("registerBtn");

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
    case "auth/email-already-in-use":
      return "That email is already registered. Try logging in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Something went wrong while creating your account. Please try again.";
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim();
  const community = document.getElementById("community").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!fullName || !email || !community || !password || !confirmPassword) {
    showMessage("Please fill in every field before continuing.", "error");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("Passwords don't match. Please re-enter them.", "error");
    return;
  }

  if (password.length < 6) {
    showMessage("Password should be at least 6 characters.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account...";

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = credential.user;

    await updateProfile(user, { displayName: fullName });

    await setDoc(doc(db, "users", user.uid), {
      fullName,
      email,
      community,
      role: "user",
      active: true,
      createdAt: serverTimestamp(),
    });

    showMessage("Account created. Redirecting you to log in...", "success");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 1200);
  } catch (err) {
    showMessage(friendlyError(err.code), "error");
    submitBtn.disabled = false;
    submitBtn.textContent = "Create account";
  }
});
