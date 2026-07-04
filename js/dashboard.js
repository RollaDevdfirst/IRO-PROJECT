import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const greetingName = document.getElementById("greetingName");
const communityBadge = document.getElementById("communityBadge");
const statTotal = document.getElementById("statTotal");
const statPending = document.getElementById("statPending");
const statResolved = document.getElementById("statResolved");
const logoutBtn = document.getElementById("logoutBtn");
const navItems = document.querySelectorAll(".nav-item[data-tab]");
const panels = document.querySelectorAll(".tab-panel");

// ---------- Route guard + load user info ----------

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));

    if (!userSnap.exists()) {
      window.location.href = "login.html";
      return;
    }

    const userData = userSnap.data();

    if (userData.active === false) {
      await signOut(auth);
      window.location.href = "login.html";
      return;
    }

    if (userData.role === "admin") {
      window.location.href = "admin-dashboard.html";
      return;
    }

    greetingName.textContent = userData.fullName
      ? userData.fullName.split(" ")[0]
      : "there";
    communityBadge.textContent = userData.community || "Community not set";

    await loadUserReports(user.uid);
  } catch (err) {
    console.error("Failed to load dashboard:", err);
    greetingName.textContent = "there";
  }
});

// ---------- Live reports: stats + My Reports list ----------

const myReportsList = document.getElementById("myReportsList");

const categoryLabels = {
  Security: "Security",
  Power: "Power",
  Water: "Water",
  Roads: "Roads",
  Other: "Other",
};

const statusLabels = {
  pending: "Pending",
  "in-review": "In review",
  resolved: "Resolved",
};

function formatDate(timestamp) {
  if (!timestamp || !timestamp.toDate) return "";
  return timestamp.toDate().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function renderReportCard(report, id) {
  const status = report.status || "pending";
  const statusClass = `status-${status}`;
  const statusLabel = statusLabels[status] || status;

  return `
    <div class="report-card">
      <div class="report-card-top">
        <span class="report-card-title">${escapeHtml(report.title)}</span>
        <span class="badge ${statusClass}">${statusLabel}</span>
      </div>
      <p class="report-card-desc">${escapeHtml(report.description)}</p>
      <div class="report-card-meta">
        <span class="badge tag">${escapeHtml(categoryLabels[report.category] || report.category)}</span>
        <span class="badge tag">${escapeHtml(report.community)}</span>
        <span class="report-card-date">${formatDate(report.createdAt)}</span>
      </div>
      <button class="track-btn" data-id="${id}">Track this report</button>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

let reportsCache = {};

function loadUserReports(uid) {
  const reportsQuery = query(
    collection(db, "reports"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc"),
  );

  onSnapshot(
    reportsQuery,
    (snapshot) => {
      let pending = 0;
      let resolved = 0;
      const reports = [];
      reportsCache = {};

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        reportsCache[docSnap.id] = data;
        reports.push({ id: docSnap.id, data });
        if (data.status === "resolved") resolved++;
        else pending++;
      });

      statTotal.textContent = snapshot.size;
      statPending.textContent = pending;
      statResolved.textContent = resolved;

      if (reports.length === 0) {
        myReportsList.innerHTML = `
        <div class="empty-state" id="myReportsEmpty">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M6 4h9l3 3v13H6z"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>
          <p>You haven't submitted any reports yet. Once you do, they'll show up here.</p>
        </div>
      `;
      } else {
        myReportsList.innerHTML = reports
          .map((r) => renderReportCard(r.data, r.id))
          .join("");
      }
    },
    (err) => {
      console.error("Failed to load reports:", err);
    },
  );
}

// ---------- Track Status: stepper view for a single report ----------

const trackContent = document.getElementById("trackContent");

const statusSteps = ["pending", "in-review", "resolved"];
const statusStepLabels = {
  pending: "Submitted",
  "in-review": "In review",
  resolved: "Resolved",
};

function renderTrackView(report) {
  const currentStatus = report.status || "pending";
  const currentIndex = statusSteps.indexOf(currentStatus);

  const stepsHtml = statusSteps
    .map((step, i) => {
      const isDone = i <= currentIndex;
      const isCurrent = i === currentIndex;
      const lineDone = i < currentIndex ? "done" : "";
      const line =
        i < statusSteps.length - 1
          ? `<div class="step-line ${lineDone}"></div>`
          : "";
      return `
      <div class="step ${isDone ? "done" : ""} ${isCurrent ? "current" : ""}">
        <div class="step-dot"></div>
        <div class="step-label">${statusStepLabels[step]}</div>
      </div>
      ${line}
    `;
    })
    .join("");

  trackContent.innerHTML = `
    <div class="track-report-header">
      <span class="report-card-title">${escapeHtml(report.title)}</span>
      <span class="badge tag">${escapeHtml(categoryLabels[report.category] || report.category)}</span>
      <span class="badge tag">${escapeHtml(report.community)}</span>
    </div>
    <p class="report-card-desc">${escapeHtml(report.description)}</p>
    <div class="stepper">${stepsHtml}</div>
    <p class="field-hint" style="text-align:center; margin-top:18px;">Submitted on ${formatDate(report.createdAt)}</p>
  `;
}

myReportsList.addEventListener("click", (e) => {
  const btn = e.target.closest(".track-btn");
  if (!btn) return;

  const id = btn.dataset.id;
  const report = reportsCache[id];
  if (!report) return;

  renderTrackView(report);

  const trackTab = document.querySelector('.nav-item[data-tab="track"]');
  if (trackTab) trackTab.click();
});

// ---------- Tab switching ----------

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const target = item.dataset.tab;

    navItems.forEach((i) => i.classList.remove("active"));
    item.classList.add("active");

    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === `panel-${target}`);
    });
  });
});

// ---------- Logout ----------

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "login.html";
  } catch (err) {
    console.error("Logout failed:", err);
  }
});
