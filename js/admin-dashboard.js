import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const greetingName = document.getElementById("greetingName");
const statTotal = document.getElementById("statTotal");
const statPending = document.getElementById("statPending");
const statResolved = document.getElementById("statResolved");
const logoutBtn = document.getElementById("logoutBtn");
const navItems = document.querySelectorAll(".nav-item[data-tab]");
const panels = document.querySelectorAll(".tab-panel");
const adminReportsList = document.getElementById("adminReportsList");
const usersList = document.getElementById("usersList");
const filterChips = document.querySelectorAll(".filter-chip");

let currentAdminUid = null;
let allReports = [];
let activeFilter = "all";

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

function formatDate(timestamp) {
  if (!timestamp || !timestamp.toDate) return "";
  return timestamp
    .toDate()
    .toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
}

// ---------- Route guard ----------

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));

    if (!userSnap.exists() || userSnap.data().role !== "admin") {
      window.location.href = "user-dashboard.html";
      return;
    }

    currentAdminUid = user.uid;
    greetingName.textContent = userSnap.data().fullName
      ? userSnap.data().fullName.split(" ")[0]
      : "Admin";

    loadAllReports();
    loadAllUsers();
  } catch (err) {
    console.error("Failed to load admin dashboard:", err);
  }
});

// ---------- Reports: live list + status updates ----------

function loadAllReports() {
  const reportsQuery = query(
    collection(db, "reports"),
    orderBy("createdAt", "desc"),
  );

  onSnapshot(
    reportsQuery,
    (snapshot) => {
      allReports = [];
      let pending = 0;
      let resolved = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        allReports.push({ id: docSnap.id, ...data });
        if (data.status === "resolved") resolved++;
        else pending++;
      });

      statTotal.textContent = snapshot.size;
      statPending.textContent = pending;
      statResolved.textContent = resolved;

      renderReports();
    },
    (err) => {
      console.error("Failed to load reports:", err);
    },
  );
}

function renderReports() {
  const filtered =
    activeFilter === "all"
      ? allReports
      : allReports.filter((r) => (r.status || "pending") === activeFilter);

  if (filtered.length === 0) {
    adminReportsList.innerHTML = `
      <div class="empty-state" id="reportsEmpty">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M6 4h9l3 3v13H6z"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>
        <p>No reports match this filter.</p>
      </div>
    `;
    return;
  }

  adminReportsList.innerHTML = filtered
    .map((report) => {
      const status = report.status || "pending";
      return `
      <div class="report-card">
        <div class="report-card-top">
          <span class="report-card-title">${escapeHtml(report.title)}</span>
          <select class="status-select" data-id="${report.id}">
            <option value="pending" ${status === "pending" ? "selected" : ""}>Pending</option>
            <option value="in-review" ${status === "in-review" ? "selected" : ""}>In review</option>
            <option value="resolved" ${status === "resolved" ? "selected" : ""}>Resolved</option>
          </select>
        </div>
        <p class="report-card-desc">${escapeHtml(report.description)}</p>
        <div class="report-card-meta">
          <span class="badge tag">${escapeHtml(categoryLabels[report.category] || report.category)}</span>
          <span class="badge tag">${escapeHtml(report.community)}</span>
          <span class="badge tag">By ${escapeHtml(report.userName || "Unknown")}</span>
          <span class="report-card-date">${formatDate(report.createdAt)}</span>
        </div>
      </div>
    `;
    })
    .join("");
}

adminReportsList.addEventListener("change", async (e) => {
  const select = e.target.closest(".status-select");
  if (!select) return;

  const id = select.dataset.id;
  const newStatus = select.value;

  try {
    await updateDoc(doc(db, "reports", id), { status: newStatus });
  } catch (err) {
    console.error("Failed to update status:", err);
    alert("Couldn't update the status. Please try again.");
  }
});

filterChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    filterChips.forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    activeFilter = chip.dataset.filter;
    renderReports();
  });
});

// ---------- Users: live list + deactivate/reactivate ----------

function loadAllUsers() {
  const usersQuery = query(collection(db, "users"));

  onSnapshot(
    usersQuery,
    (snapshot) => {
      if (snapshot.empty) {
        usersList.innerHTML = `
        <div class="empty-state" id="usersEmpty">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="12" cy="9" r="3.2"/><path d="M5 19c1.2-3.6 3.9-5.6 7-5.6s5.8 2 7 5.6"/></svg>
          <p>No registered users yet.</p>
        </div>
      `;
        return;
      }

      const sortedDocs = [...snapshot.docs].sort((a, b) => {
        const nameA = (a.data().fullName || "").toLowerCase();
        const nameB = (b.data().fullName || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

      usersList.innerHTML = sortedDocs
        .map((docSnap) => {
          const u = docSnap.data();
          const uid = docSnap.id;
          const isActive = u.active !== false;
          const isAdmin = u.role === "admin";

          return `
        <div class="user-row">
          <div class="user-row-info">
            <span class="user-row-name">${escapeHtml(u.fullName || "Unnamed")}</span>
            <span class="user-row-email">${escapeHtml(u.email || "")}</span>
          </div>
          <span class="badge tag">${escapeHtml(u.community || "—")}</span>
          <span class="badge ${isAdmin ? "status-in-review" : "tag"}">${isAdmin ? "Admin" : "User"}</span>
          <span class="badge ${isActive ? "status-resolved" : "status-pending"}">${isActive ? "Active" : "Deactivated"}</span>
          ${
            isAdmin
              ? `<span class="field-hint">—</span>`
              : `<button class="track-btn deactivate-btn" data-uid="${uid}" data-active="${isActive}">${isActive ? "Deactivate" : "Reactivate"}</button>`
          }
        </div>
      `;
        })
        .join("");
    },
    (err) => {
      console.error("Failed to load users:", err);
    },
  );
}

usersList.addEventListener("click", async (e) => {
  const btn = e.target.closest(".deactivate-btn");
  if (!btn) return;

  const uid = btn.dataset.uid;
  const isActive = btn.dataset.active === "true";

  const confirmMsg = isActive
    ? "Deactivate this user? They won't be able to log in until reactivated."
    : "Reactivate this user? They'll be able to log in again.";

  if (!confirm(confirmMsg)) return;

  try {
    await updateDoc(doc(db, "users", uid), { active: !isActive });
  } catch (err) {
    console.error("Failed to update user:", err);
    alert("Couldn't update this user. Please try again.");
  }
});

// ---------- Tab switching ----------

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const target = item.dataset.tab;
    navItems.forEach((i) => i.classList.remove("active"));
    item.classList.add("active");
    panels.forEach((panel) =>
      panel.classList.toggle("active", panel.id === `panel-${target}`),
    );
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
