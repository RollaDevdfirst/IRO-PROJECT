import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("reportForm");
const messageBox = document.getElementById("reportMessage");
const submitBtn = document.getElementById("reportSubmitBtn");

let currentUser = null;
let currentUserName = "";

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  currentUser = user;

  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));
    if (userSnap.exists()) {
      currentUserName = userSnap.data().fullName || "";
    }
  } catch (err) {
    // Non-fatal — report can still be submitted without a cached name
    currentUserName = "";
  }
});

function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = `form-message ${type}`;
}

function clearMessage() {
  messageBox.className = "form-message";
  messageBox.textContent = "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();

  if (!currentUser) {
    showMessage("You need to be logged in to submit a report.", "error");
    return;
  }

  const title = document.getElementById("reportTitle").value.trim();
  const category = document.getElementById("reportCategory").value;
  const community = document.getElementById("reportCommunity").value;
  const description = document.getElementById("reportDescription").value.trim();

  if (!title || !category || !community || !description) {
    showMessage("Please fill in every field before submitting.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting...";

  try {
    await addDoc(collection(db, "reports"), {
      userId: currentUser.uid,
      userName: currentUserName,
      title,
      category,
      community,
      description,
      status: "pending",
      createdAt: serverTimestamp(),
    });

    showMessage(
      "Report submitted. Redirecting you to My Reports...",
      "success",
    );
    form.reset();

    setTimeout(() => {
      const myReportsTab = document.querySelector(
        '.nav-item[data-tab="my-reports"]',
      );
      if (myReportsTab) myReportsTab.click();
      clearMessage();
    }, 1100);
  } catch (err) {
    console.error("Failed to submit report:", err);
    showMessage(
      "Couldn't submit your report right now. Please try again.",
      "error",
    );
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit report";
  }
});
