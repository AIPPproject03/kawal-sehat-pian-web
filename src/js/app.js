// Firebase v9 Modular SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import toast from "./toast.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyA00JIvQxqKIkTI_9w14_NRgHZMunFked8",
  authDomain: "kawal-sehat-pian.firebaseapp.com",
  projectId: "kawal-sehat-pian",
  storageBucket: "kawal-sehat-pian.firebasestorage.app",
  messagingSenderId: "691975475378",
  appId: "1:691975475378:web:5fc357ef751aa993f679ab",
  measurementId: "G-ZQC0V56E04",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global State
let currentUser = null;
let currentUserData = null;
let currentConsultationId = null;
let messagesUnsubscribe = null;

// Detect which page we're on
const isIndexPage =
  window.location.pathname.endsWith("index.html") ||
  window.location.pathname === "/" ||
  window.location.pathname.endsWith("/src/");
const isAdminPage = window.location.pathname.includes("admin.html");
const isPasienPage = window.location.pathname.includes("pasien.html");
const isTamuPage = window.location.pathname.includes("tamu.html");

console.log("Page detected:", {
  isIndexPage,
  isAdminPage,
  isPasienPage,
  isTamuPage,
});

// DOM Elements - SMART DETECTION
const sections = {};

// Index page sections
if (isIndexPage) {
  sections.landing = document.getElementById("landing-section");
  sections.memberLogin = document.getElementById("member-login-section");
  sections.memberRegister = document.getElementById("member-register-section");
  sections.patientDashboard = document.getElementById(
    "patient-dashboard-section"
  );
  sections.chatRoom = document.getElementById("chat-room-section");
}

// Admin page sections
if (isAdminPage) {
  sections.adminLogin = document.getElementById("admin-login-section");
  sections.adminDashboard = document.getElementById("admin-dashboard-section");
  sections.chatRoom = document.getElementById("chat-room-section");
}

// Pasien page sections (handled by pasien.js)
// Tamu page sections (handled by tamu.js)

const loadingOverlay = document.getElementById("loading-overlay");
const userInfo = document.getElementById("user-info");
const userNameDisplay = document.getElementById("user-name-display");

console.log("Detected sections:", Object.keys(sections));

// Utility Functions
function showLoading() {
  if (loadingOverlay) {
    loadingOverlay.style.display = "flex";
    document.body.classList.add("loading");

    setTimeout(() => {
      if (loadingOverlay.style.display === "flex") {
        console.warn("Loading timeout - auto-hiding");
        hideLoading();
      }
    }, 10000);
  }
}

function hideLoading() {
  if (loadingOverlay) {
    loadingOverlay.style.display = "none";
    document.body.classList.remove("loading");
  }
}

function showSection(sectionName) {
  console.log("Attempting to show section:", sectionName);

  // Hide all sections
  Object.values(sections).forEach((section) => {
    if (section) {
      section.classList.remove("active");
      section.style.display = "none";
    }
  });

  // Show requested section
  if (sections[sectionName]) {
    sections[sectionName].classList.add("active");
    sections[sectionName].style.display = "block";
    console.log("✓ Section displayed:", sectionName);
  } else {
    console.error(
      "✗ Section not found:",
      sectionName,
      "Available:",
      Object.keys(sections)
    );

    // Fallback: show first available section
    const firstSection = Object.keys(sections)[0];
    if (firstSection && sections[firstSection]) {
      console.log("Fallback to first section:", firstSection);
      sections[firstSection].classList.add("active");
      sections[firstSection].style.display = "block";
    }
  }
}

function showNotification(message, type = "info", title = null) {
  if (window.toast) {
    toast.show(message, type, 4000, title);
  } else {
    console.log(`${type}: ${message}`);
  }
}

// Navigate to appropriate page
function navigateToDefaultPage(role) {
  if (role === "admin") {
    if (!isAdminPage) {
      window.location.href = "pages/admin.html";
    }
  } else if (role === "member") {
    if (!isPasienPage && !isIndexPage) {
      window.location.href = "pages/pasien.html";
    }
  } else if (role === "guest") {
    if (!isTamuPage && !isIndexPage) {
      window.location.href = "pages/tamu.html";
    }
  }
}

// ========================================
// MODAL PAYMENT LOGIC (Only for index.html)
// ========================================

// Modal Payment Logic
let selectedService = null;
let selectedPrice = 0;

// Service Card Click Handler - Check if exists
const serviceCards = document.querySelectorAll(".service-card-mobile");
if (serviceCards.length > 0) {
  serviceCards.forEach((card) => {
    card.addEventListener("click", function () {
      document
        .querySelectorAll(".service-card-mobile")
        .forEach((c) => c.classList.remove("selected"));

      this.classList.add("selected");
      selectedService = this.dataset.service;
      selectedPrice = parseInt(this.dataset.price);

      setTimeout(() => {
        showPaymentModal();
      }, 300);
    });
  });
}

// Show Payment Modal
function showPaymentModal() {
  const modal = document.getElementById("payment-modal");
  if (!modal) return;

  const serviceName =
    selectedService === "chat" ? "Chat Konsultasi" : "Telepon Konsultasi";
  const priceFormatted = `Rp ${selectedPrice.toLocaleString("id-ID")}`;

  const serviceNameEl = document.getElementById("selected-service-name");
  const servicePriceEl = document.getElementById("selected-service-price");
  const transferAmountEl = document.getElementById("transfer-amount");

  if (serviceNameEl) serviceNameEl.textContent = serviceName;
  if (servicePriceEl) servicePriceEl.textContent = priceFormatted;
  if (transferAmountEl) transferAmountEl.textContent = priceFormatted;

  modal.classList.add("active");
  showPaymentStep(1);

  document
    .querySelectorAll(".payment-tab")
    .forEach((tab) => tab.classList.remove("active"));
  const qrisTab = document.querySelector('[data-method="qris"]');
  if (qrisTab) qrisTab.classList.add("active");
  showPaymentContent("qris");
}

// Close Payment Modal
const closeModalBtn = document.getElementById("close-payment-modal");
if (closeModalBtn) {
  closeModalBtn.addEventListener("click", () => {
    const modal = document.getElementById("payment-modal");
    if (modal) modal.classList.remove("active");
    document
      .querySelectorAll(".service-card-mobile")
      .forEach((c) => c.classList.remove("selected"));
  });
}

// Payment Method Tabs
const paymentTabs = document.querySelectorAll(".payment-tab");
if (paymentTabs.length > 0) {
  paymentTabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      document
        .querySelectorAll(".payment-tab")
        .forEach((t) => t.classList.remove("active"));
      this.classList.add("active");

      const method = this.dataset.method;
      showPaymentContent(method);
    });
  });
}

// Show Payment Content
function showPaymentContent(method) {
  const allContents = document.querySelectorAll(".payment-content");
  allContents.forEach((content) => content.classList.remove("active"));

  if (method === "qris") {
    const qrisContent = document.getElementById("qris-content");
    if (qrisContent) qrisContent.classList.add("active");
  } else {
    const transferContent = document.getElementById("transfer-content");
    if (transferContent) transferContent.classList.add("active");
  }
}

// Payment Step Navigation
function showPaymentStep(step) {
  const allSteps = document.querySelectorAll(".payment-step");
  allSteps.forEach((s) => s.classList.remove("active"));
  const stepEl = document.getElementById(`payment-step-${step}`);
  if (stepEl) stepEl.classList.add("active");
}

// Confirm QRIS Payment
const confirmQrisBtn = document.getElementById("confirm-qris-payment");
if (confirmQrisBtn) {
  confirmQrisBtn.addEventListener("click", () => {
    showPaymentStep(2);
  });
}

// Confirm Transfer Payment
const confirmTransferBtn = document.getElementById("confirm-transfer-payment");
if (confirmTransferBtn) {
  confirmTransferBtn.addEventListener("click", () => {
    showPaymentStep(2);
  });
}

// Back to Payment
const backToPaymentBtn = document.getElementById("back-to-payment");
if (backToPaymentBtn) {
  backToPaymentBtn.addEventListener("click", () => {
    showPaymentStep(1);
  });
}

// Copy Account Number
const copyAccountBtn = document.getElementById("copy-account-number");
if (copyAccountBtn) {
  copyAccountBtn.addEventListener("click", function () {
    const accountNumberEl = document.getElementById("account-number");
    if (accountNumberEl) {
      const accountNumber = accountNumberEl.textContent;
      navigator.clipboard.writeText(accountNumber).then(() => {
        this.classList.add("copied");
        showNotification("Nomor rekening berhasil disalin!", "success");

        setTimeout(() => {
          this.classList.remove("copied");
        }, 2000);
      });
    }
  });
}

// File Upload Preview
const paymentProofInput = document.getElementById("payment-proof");
if (paymentProofInput) {
  paymentProofInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        showNotification("Ukuran file terlalu besar. Maksimal 1MB", "error");
        this.value = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        const previewImage = document.getElementById("preview-image");
        const previewContainer = document.getElementById("preview-container");
        const uploadLabel = document.querySelector(".file-upload-label");

        if (previewImage && previewContainer && uploadLabel) {
          previewImage.src = e.target.result;
          previewContainer.style.display = "block";
          uploadLabel.style.display = "none";
        }
      };
      reader.readAsDataURL(file);
    }
  });
}

// Remove Preview
const removePreviewBtn = document.getElementById("remove-preview");
if (removePreviewBtn) {
  removePreviewBtn.addEventListener("click", () => {
    const paymentProof = document.getElementById("payment-proof");
    const previewContainer = document.getElementById("preview-container");
    const uploadLabel = document.querySelector(".file-upload-label");

    if (paymentProof) paymentProof.value = "";
    if (previewContainer) previewContainer.style.display = "none";
    if (uploadLabel) uploadLabel.style.display = "flex";
  });
}

// Upload Proof Form Submit
const uploadProofForm = document.getElementById("upload-proof-form");
if (uploadProofForm) {
  uploadProofForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoading();

    const paymentProofFile = document.getElementById("payment-proof");
    if (!paymentProofFile || !paymentProofFile.files[0]) {
      showNotification("Silakan upload bukti pembayaran", "error");
      hideLoading();
      return;
    }

    const file = paymentProofFile.files[0];

    if (file.size > 1024 * 1024) {
      showNotification("Ukuran file terlalu besar. Maksimal 1MB", "error");
      hideLoading();
      return;
    }

    try {
      const paymentProofBase64 = await fileToBase64(file);

      await addDoc(collection(db, "consultations"), {
        patientId: currentUser.uid,
        patientName: currentUserData.name || "Tamu",
        serviceType: selectedService,
        price: selectedPrice,
        status: "pending",
        paymentProofUrl: paymentProofBase64,
        paymentProofType: file.type,
        createdAt: serverTimestamp(),
      });

      showNotification(
        "Permintaan konsultasi berhasil diajukan! Menunggu persetujuan admin.",
        "success"
      );

      const modal = document.getElementById("payment-modal");
      if (modal) modal.classList.remove("active");

      if (uploadProofForm) uploadProofForm.reset();

      const previewContainer = document.getElementById("preview-container");
      const uploadLabel = document.querySelector(".file-upload-label");
      if (previewContainer) previewContainer.style.display = "none";
      if (uploadLabel) uploadLabel.style.display = "flex";

      document
        .querySelectorAll(".service-card-mobile")
        .forEach((c) => c.classList.remove("selected"));

      loadPatientDashboard();
    } catch (error) {
      console.error("Create consultation error:", error);
      showNotification(
        "Gagal mengajukan konsultasi: " + error.message,
        "error"
      );
    }

    hideLoading();
  });
}

// Load Patient Dashboard
async function loadPatientDashboard() {
  const consultationsList = document.getElementById(
    "patient-consultations-list"
  );
  if (!consultationsList) return;

  consultationsList.innerHTML = "<p>Memuat...</p>";

  try {
    const q = query(
      collection(db, "consultations"),
      where("patientId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        consultationsList.innerHTML =
          '<p class="empty-state">Belum ada konsultasi</p>';
        return;
      }

      consultationsList.innerHTML = "";

      snapshot.forEach((doc) => {
        const consultation = doc.data();
        const consultationCard = createConsultationCard(
          doc.id,
          consultation,
          "patient"
        );
        consultationsList.appendChild(consultationCard);
      });
    });
  } catch (error) {
    console.error("Load consultations error:", error);
    consultationsList.innerHTML = '<p class="error">Gagal memuat data</p>';
  }
}

// ========================================
// ADMIN DASHBOARD FUNCTIONS
// ========================================

// Load Admin Dashboard - COMPLETE
async function loadAdminDashboard() {
  console.log("Loading admin dashboard...");

  try {
    const pendingList = document.getElementById("pending-consultations-list");
    const activeList = document.getElementById("active-consultations-list");
    const finishedList = document.getElementById("finished-consultations-list");

    if (!pendingList || !activeList || !finishedList) {
      console.error("Dashboard elements not found");
      return;
    }

    // Show loading state
    pendingList.innerHTML = '<p class="empty-state">Memuat...</p>';
    activeList.innerHTML = '<p class="empty-state">Memuat...</p>';
    finishedList.innerHTML = '<p class="empty-state">Memuat...</p>';

    // Load consultations with real-time updates
    loadConsultationsByStatus("pending", "pending-consultations-list");
    loadConsultationsByStatus("active", "active-consultations-list");
    loadConsultationsByStatus("finished", "finished-consultations-list");

    // Update statistics
    updateStatistics();

    console.log("✓ Admin dashboard loaded successfully");
  } catch (error) {
    console.error("✗ Load admin dashboard error:", error);
    showNotification("Gagal memuat dashboard", "error");
  }
}

// Update Statistics - REAL-TIME
async function updateStatistics() {
  try {
    const pendingCount = document.getElementById("pending-count");
    const activeCount = document.getElementById("active-count");
    const finishedCount = document.getElementById("finished-count");

    if (!pendingCount || !activeCount || !finishedCount) return;

    // Pending consultations
    const pendingQuery = query(
      collection(db, "consultations"),
      where("status", "==", "pending")
    );
    const pendingSnapshot = await getDocs(pendingQuery);
    pendingCount.textContent = pendingSnapshot.size;

    // Active consultations
    const activeQuery = query(
      collection(db, "consultations"),
      where("status", "==", "active")
    );
    const activeSnapshot = await getDocs(activeQuery);
    activeCount.textContent = activeSnapshot.size;

    // Finished today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const finishedQuery = query(
      collection(db, "consultations"),
      where("status", "==", "finished")
    );
    const finishedSnapshot = await getDocs(finishedQuery);

    const finishedToday = finishedSnapshot.docs.filter((doc) => {
      const data = doc.data();
      if (data.finishedAt) {
        const finishedDate = data.finishedAt.toDate();
        return finishedDate >= today;
      }
      return false;
    });

    finishedCount.textContent = finishedToday.length;
  } catch (error) {
    console.error("Update statistics error:", error);
  }
}

// Load Consultations by Status - REAL-TIME LISTENER
async function loadConsultationsByStatus(status, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '<p class="empty-state">Memuat...</p>';

  try {
    const q = query(
      collection(db, "consultations"),
      where("status", "==", status),
      orderBy("createdAt", "desc")
    );

    // Real-time listener
    onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          container.innerHTML = `
            <div class="empty-state">
              <p>Tidak ada konsultasi ${
                status === "pending"
                  ? "pending"
                  : status === "active"
                  ? "aktif"
                  : "selesai"
              }</p>
            </div>
          `;
          return;
        }

        container.innerHTML = "";

        snapshot.forEach((doc) => {
          const consultation = doc.data();
          const consultationCard = createConsultationCard(
            doc.id,
            consultation,
            "admin"
          );
          container.appendChild(consultationCard);
        });

        // Update statistics after loading
        updateStatistics();
      },
      (error) => {
        console.error("Load consultations error:", error);
        container.innerHTML = '<p class="error">Gagal memuat data</p>';
      }
    );
  } catch (error) {
    console.error("Load consultations error:", error);
    container.innerHTML = '<p class="error">Gagal memuat data</p>';
  }
}

// Create Consultation Card - ENHANCED
function createConsultationCard(id, consultation, userType) {
  const card = document.createElement("div");
  card.className = "consultation-card";

  // Add animation
  card.style.animation = "fadeInScale 0.4s ease";

  const statusBadge = {
    pending: "⏳ Menunggu",
    active: "✅ Aktif",
    finished: "✔️ Selesai",
  }[consultation.status];

  const serviceLabel =
    consultation.serviceType === "chat" ? "💬 Chat" : "📞 Telepon";

  const dateFormatted = consultation.createdAt
    ? new Date(consultation.createdAt.toDate()).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Baru saja";

  const isGuest = consultation.isGuest || consultation.patientName === "Tamu";

  card.innerHTML = `
    <div class="consultation-header">
      <h4>
        ${consultation.patientName || "Pasien"}
        ${isGuest ? '<span class="guest-tag">👤 Tamu</span>' : ""}
      </h4>
      <span class="status-badge status-${
        consultation.status
      }">${statusBadge}</span>
    </div>
    <div class="consultation-details">
      <p><strong>📋 Layanan:</strong> ${serviceLabel}</p>
      <p><strong>💰 Harga:</strong> Rp ${consultation.price.toLocaleString(
        "id-ID"
      )}</p>
      <p><strong>📅 Tanggal:</strong> ${dateFormatted}</p>
      ${
        consultation.approvedAt
          ? `<p><strong>✅ Disetujui:</strong> ${new Date(
              consultation.approvedAt.toDate()
            ).toLocaleString("id-ID")}</p>`
          : ""
      }
      ${
        consultation.finishedAt
          ? `<p><strong>✔️ Selesai:</strong> ${new Date(
              consultation.finishedAt.toDate()
            ).toLocaleString("id-ID")}</p>`
          : ""
      }
    </div>
    ${
      consultation.paymentProofUrl
        ? `
      <div class="payment-proof-section">
        <p><strong>📷 Bukti Pembayaran:</strong></p>
        <img 
          src="${consultation.paymentProofUrl}" 
          alt="Bukti Pembayaran" 
          class="payment-proof-preview" 
          onclick="window.open('${consultation.paymentProofUrl}', '_blank')"
          loading="lazy"
        >
      </div>
    `
        : ""
    }
    <div class="consultation-actions">
      ${
        userType === "admin" && consultation.status === "pending"
          ? `
        <button class="btn btn-primary approve-btn" data-id="${id}">
          <span>✓</span> Setujui Konsultasi
        </button>
        <button class="btn btn-danger reject-btn" data-id="${id}">
          <span>✗</span> Tolak
        </button>
      `
          : ""
      }
      ${
        consultation.status === "active"
          ? `
        <button class="btn btn-secondary open-chat-btn" data-id="${id}" data-name="${
              consultation.patientName || "Pasien"
            }">
          <span>💬</span> Buka Chat
        </button>
        ${
          userType === "admin"
            ? `
          <button class="btn btn-success finish-now-btn" data-id="${id}">
            <span>✓</span> Selesaikan
          </button>
        `
            : ""
        }
      `
          : ""
      }
      ${
        consultation.status === "finished"
          ? `
        <button class="btn btn-outline view-history-btn" data-id="${id}" data-name="${
              consultation.patientName || "Pasien"
            }">
          <span>👁️</span> Lihat Riwayat
        </button>
      `
          : ""
      }
    </div>
  `;

  // Add event listeners
  const approveBtn = card.querySelector(".approve-btn");
  if (approveBtn) {
    approveBtn.addEventListener("click", () => {
      approveConsultation(id);
    });
  }

  const rejectBtn = card.querySelector(".reject-btn");
  if (rejectBtn) {
    rejectBtn.addEventListener("click", () => {
      rejectConsultation(id);
    });
  }

  const openChatBtn = card.querySelector(".open-chat-btn");
  if (openChatBtn) {
    openChatBtn.addEventListener("click", () => {
      openChatRoom(id, openChatBtn.dataset.name);
    });
  }

  const finishNowBtn = card.querySelector(".finish-now-btn");
  if (finishNowBtn) {
    finishNowBtn.addEventListener("click", () => {
      finishConsultationFromCard(id);
    });
  }

  const viewHistoryBtn = card.querySelector(".view-history-btn");
  if (viewHistoryBtn) {
    viewHistoryBtn.addEventListener("click", () => {
      openChatRoom(id, viewHistoryBtn.dataset.name, true);
    });
  }

  return card;
}

// Approve Consultation - ENHANCED
async function approveConsultation(consultationId) {
  if (!confirm("✓ Setujui permintaan konsultasi ini?")) return;

  showLoading();

  try {
    // Update consultation status
    await updateDoc(doc(db, "consultations", consultationId), {
      status: "active",
      approvedAt: serverTimestamp(),
      approvedBy: currentUser.uid,
    });

    // Send system message
    await addDoc(collection(db, "consultations", consultationId, "messages"), {
      text: "✅ Konsultasi Anda telah disetujui oleh bidan. Silakan mulai konsultasi dengan mengirim pesan.",
      senderId: "system",
      senderName: "Sistem",
      timestamp: serverTimestamp(),
      isSystemMessage: true,
    });

    showNotification("✓ Konsultasi berhasil disetujui!", "success");

    console.log("✓ Consultation approved:", consultationId);
  } catch (error) {
    console.error("✗ Approve consultation error:", error);
    showNotification("Gagal menyetujui konsultasi: " + error.message, "error");
  }

  hideLoading();
}

// Reject Consultation - NEW
async function rejectConsultation(consultationId) {
  const reason = prompt("Alasan penolakan (opsional):");
  if (reason === null) return; // User cancelled

  showLoading();

  try {
    await updateDoc(doc(db, "consultations", consultationId), {
      status: "rejected",
      rejectedAt: serverTimestamp(),
      rejectedBy: currentUser.uid,
      rejectionReason: reason || "Tidak ada alasan",
    });

    // Send system message
    await addDoc(collection(db, "consultations", consultationId, "messages"), {
      text: `❌ Konsultasi ditolak. Alasan: ${reason || "Tidak disebutkan"}`,
      senderId: "system",
      senderName: "Sistem",
      timestamp: serverTimestamp(),
      isSystemMessage: true,
    });

    showNotification("Konsultasi ditolak", "warning");
  } catch (error) {
    console.error("Reject consultation error:", error);
    showNotification("Gagal menolak konsultasi", "error");
  }

  hideLoading();
}

// Open Chat Room - ENHANCED
function openChatRoom(consultationId, patientName, readOnly = false) {
  currentConsultationId = consultationId;

  const chatRoomTitle = document.getElementById("chat-room-title");
  const chatRoomSubtitle = document.getElementById("chat-room-subtitle");

  if (chatRoomTitle) {
    chatRoomTitle.textContent = `💬 Chat dengan ${patientName || "Pasien"}`;
  }
  if (chatRoomSubtitle) {
    chatRoomSubtitle.textContent = readOnly
      ? "Riwayat Konsultasi (Selesai)"
      : `ID: ${consultationId.substring(0, 8)}...`;
  }

  // Show/hide finish button
  const finishBtn = document.getElementById("finish-consultation-btn");
  if (finishBtn) {
    if (currentUserData && currentUserData.role === "admin" && !readOnly) {
      finishBtn.style.display = "inline-block";
    } else {
      finishBtn.style.display = "none";
    }
  }

  // Disable message input if read-only
  const messageForm = document.getElementById("message-form");
  const messageInput = document.getElementById("message-input");
  if (messageForm && messageInput) {
    if (readOnly) {
      messageInput.disabled = true;
      messageInput.placeholder = "Konsultasi telah selesai";
      messageForm.style.opacity = "0.6";
    } else {
      messageInput.disabled = false;
      messageInput.placeholder = "Ketik pesan...";
      messageForm.style.opacity = "1";
    }
  }

  showSection("chatRoom");
  loadMessages(consultationId);

  console.log("✓ Chat room opened:", consultationId);
}

// Load Messages - REAL-TIME
function loadMessages(consultationId) {
  const messagesContainer = document.getElementById("messages-container");
  if (!messagesContainer) return;

  messagesContainer.innerHTML = '<p class="empty-state">Memuat pesan...</p>';

  // Unsubscribe from previous listener
  if (messagesUnsubscribe) {
    messagesUnsubscribe();
  }

  const q = query(
    collection(db, "consultations", consultationId, "messages"),
    orderBy("timestamp", "asc")
  );

  messagesUnsubscribe = onSnapshot(
    q,
    (snapshot) => {
      messagesContainer.innerHTML = "";

      if (snapshot.empty) {
        messagesContainer.innerHTML =
          '<p class="empty-state">💬 Belum ada pesan. Mulai percakapan!</p>';
        return;
      }

      snapshot.forEach((doc) => {
        const message = doc.data();
        const messageElement = createMessageElement(message);
        messagesContainer.appendChild(messageElement);
      });

      // Auto-scroll to bottom with smooth animation
      setTimeout(() => {
        messagesContainer.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    },
    (error) => {
      console.error("Load messages error:", error);
      messagesContainer.innerHTML = '<p class="error">Gagal memuat pesan</p>';
    }
  );
}

// Create Message Element - ENHANCED
function createMessageElement(message) {
  const div = document.createElement("div");
  div.style.animation = "fadeIn 0.3s ease";

  // System message
  if (message.isSystemMessage) {
    div.className = "message message-system";
    div.innerHTML = `
      <div class="message-text system-message">${escapeHtml(message.text)}</div>
      <span class="message-time">${
        message.timestamp
          ? new Date(message.timestamp.toDate()).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Mengirim..."
      }</span>
    `;
    return div;
  }

  // Regular message
  const isOwnMessage = currentUser && message.senderId === currentUser.uid;
  div.className = `message ${isOwnMessage ? "message-own" : "message-other"}`;

  div.innerHTML = `
    <div class="message-header">
      <strong>${message.senderName || "User"}</strong>
      <span class="message-time">${
        message.timestamp
          ? new Date(message.timestamp.toDate()).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Mengirim..."
      }</span>
    </div>
    <div class="message-text">${escapeHtml(message.text)}</div>
  `;

  return div;
}

// Send Message - ENHANCED
const messageForm = document.getElementById("message-form");
if (messageForm) {
  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const messageInput = document.getElementById("message-input");
    if (!messageInput) return;

    const text = messageInput.value.trim();

    if (!text || !currentConsultationId) return;

    if (messageInput.disabled) {
      showNotification("Konsultasi telah selesai", "warning");
      return;
    }

    try {
      await addDoc(
        collection(db, "consultations", currentConsultationId, "messages"),
        {
          text: text,
          senderId: currentUser.uid,
          senderName: currentUserData.name || currentUserData.email || "Admin",
          timestamp: serverTimestamp(),
          isSystemMessage: false,
        }
      );

      messageInput.value = "";
      console.log("✓ Message sent");
    } catch (error) {
      console.error("✗ Send message error:", error);
      showNotification("Gagal mengirim pesan", "error");
    }
  });
}

// Back to Dashboard
const backToDashboardBtn = document.getElementById("back-to-dashboard");
if (backToDashboardBtn) {
  backToDashboardBtn.addEventListener("click", () => {
    if (messagesUnsubscribe) {
      messagesUnsubscribe();
      messagesUnsubscribe = null;
    }

    currentConsultationId = null;

    if (currentUserData && currentUserData.role === "admin") {
      showSection("adminDashboard");
      loadAdminDashboard();
    } else {
      showSection("patientDashboard");
    }

    console.log("✓ Back to dashboard");
  });
}

// Finish Consultation - MAIN BUTTON
const finishConsultationBtn = document.getElementById(
  "finish-consultation-btn"
);
if (finishConsultationBtn) {
  finishConsultationBtn.addEventListener("click", () => {
    finishConsultationFromChat(currentConsultationId);
  });
}

// Finish Consultation from Card
async function finishConsultationFromCard(consultationId) {
  if (!confirm("✓ Tandai konsultasi ini sebagai selesai?")) return;

  showLoading();

  try {
    await updateDoc(doc(db, "consultations", consultationId), {
      status: "finished",
      finishedAt: serverTimestamp(),
      finishedBy: currentUser.uid,
    });

    await addDoc(collection(db, "consultations", consultationId, "messages"), {
      text: "✅ Konsultasi telah selesai. Terima kasih atas kepercayaan Anda! Semoga sehat selalu. 🙏",
      senderId: "system",
      senderName: "Sistem",
      timestamp: serverTimestamp(),
      isSystemMessage: true,
    });

    showNotification("✓ Konsultasi berhasil diselesaikan!", "success");

    console.log("✓ Consultation finished:", consultationId);
  } catch (error) {
    console.error("✗ Finish consultation error:", error);
    showNotification("Gagal menyelesaikan konsultasi", "error");
  }

  hideLoading();
}

// Finish Consultation from Chat
async function finishConsultationFromChat(consultationId) {
  if (!confirm("✓ Tandai konsultasi ini sebagai selesai?")) return;

  showLoading();

  try {
    await updateDoc(doc(db, "consultations", consultationId), {
      status: "finished",
      finishedAt: serverTimestamp(),
      finishedBy: currentUser.uid,
    });

    await addDoc(collection(db, "consultations", consultationId, "messages"), {
      text: "✅ Konsultasi telah selesai. Terima kasih atas kepercayaan Anda! Semoga sehat selalu. 🙏",
      senderId: "system",
      senderName: "Sistem",
      timestamp: serverTimestamp(),
      isSystemMessage: true,
    });

    showNotification("✓ Konsultasi berhasil diselesaikan!", "success");

    // Clean up
    if (messagesUnsubscribe) {
      messagesUnsubscribe();
      messagesUnsubscribe = null;
    }

    currentConsultationId = null;

    // Navigate back to dashboard
    if (currentUserData.role === "admin") {
      showSection("adminDashboard");
      loadAdminDashboard();
    } else {
      showSection("patientDashboard");
    }

    console.log("✓ Consultation finished:", consultationId);
  } catch (error) {
    console.error("✗ Finish consultation error:", error);
    showNotification("Gagal menyelesaikan konsultasi", "error");
  }

  hideLoading();
}

// Utility: Escape HTML
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "": "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Utility: Convert File to Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ========================================
// AUTHENTICATION STATE MANAGEMENT - IMPROVED
// ========================================

onAuthStateChanged(auth, async (user) => {
  console.log("Auth state changed:", user ? "Logged in" : "Logged out");
  showLoading();

  try {
    if (user) {
      currentUser = user;
      console.log("User ID:", user.uid);

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          currentUserData = userDoc.data();
          console.log("User role:", currentUserData.role);

          // Update UI
          if (userInfo) userInfo.style.display = "flex";
          if (userNameDisplay) {
            userNameDisplay.textContent =
              currentUserData.name || currentUserData.email;
          }

          // Route based on role and current page
          if (currentUserData.role === "admin") {
            console.log("Admin user detected");
            if (isAdminPage) {
              showSection("adminDashboard");
              await loadAdminDashboard();
            } else {
              navigateToDefaultPage("admin");
            }
          } else if (currentUserData.role === "member") {
            console.log("Member user detected");
            if (isPasienPage) {
              // Handled by pasien.js
            } else if (isIndexPage) {
              showSection("patientDashboard");
              await loadPatientDashboard();
            } else {
              navigateToDefaultPage("member");
            }
          }
        } else {
          // Guest user (anonymous)
          console.log("Guest user detected");
          currentUserData = {
            uid: user.uid,
            email: user.email || "Tamu",
            name: "Tamu",
            role: "guest",
          };

          if (userInfo) userInfo.style.display = "flex";
          if (userNameDisplay) userNameDisplay.textContent = "Tamu";

          if (isTamuPage) {
            // Handled by tamu.js
          } else if (isIndexPage) {
            showSection("patientDashboard");
            await loadPatientDashboard();
          } else {
            navigateToDefaultPage("guest");
          }
        }
      } catch (error) {
        console.error("Load user data error:", error);
        showNotification("Gagal memuat data pengguna", "error");

        // Redirect to appropriate login page
        if (isAdminPage) {
          showSection("adminLogin");
        } else {
          window.location.href = "../index.html";
        }
      }
    } else {
      // Not logged in
      console.log("No user logged in");
      currentUser = null;
      currentUserData = null;
      if (userInfo) userInfo.style.display = "none";

      // Show appropriate login section based on page
      if (isAdminPage) {
        showSection("adminLogin");
      } else if (isPasienPage) {
        // Handled by pasien.js
      } else if (isTamuPage) {
        // Handled by tamu.js
      } else if (isIndexPage) {
        showSection("landing");
      }
    }
  } catch (error) {
    console.error("Auth state change error:", error);
    showNotification("Terjadi kesalahan", "error");

    // Fallback
    if (isAdminPage) {
      showSection("adminLogin");
    } else if (isIndexPage) {
      showSection("landing");
    }
  } finally {
    hideLoading();
  }
});

// ========================================
// ADMIN LOGIN - ONLY ON ADMIN PAGE
// ========================================

if (isAdminPage) {
  const adminLoginForm = document.getElementById("admin-login-form");
  if (adminLoginForm) {
    console.log("✓ Admin login form found");

    adminLoginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("Admin login form submitted");
      showLoading();

      const emailInput = document.getElementById("admin-email");
      const passwordInput = document.getElementById("admin-password");

      if (!emailInput || !passwordInput) {
        console.error("Email or password input not found");
        showNotification("Form tidak lengkap", "error");
        hideLoading();
        return;
      }

      const email = emailInput.value.trim();
      const password = passwordInput.value;

      console.log("Attempting admin login with email:", email);

      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;
        console.log("✓ Login successful, user ID:", user.uid);

        // Check if user is admin
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log("✓ User data loaded, role:", userData.role);

          if (userData.role === "admin") {
            console.log("✓ Admin verified");
            showNotification("Login admin berhasil!", "success");
            // Auth state will handle navigation
          } else {
            console.warn("✗ User is not admin:", userData.role);
            await signOut(auth);
            showNotification("Anda bukan admin", "error");
            hideLoading();
          }
        } else {
          console.error("✗ User document not found");
          await signOut(auth);
          showNotification("Data pengguna tidak ditemukan", "error");
          hideLoading();
        }
      } catch (error) {
        console.error("✗ Admin login error:", error);
        let errorMessage = "Login gagal";

        if (error.code === "auth/user-not-found") {
          errorMessage = "Email tidak terdaftar";
        } else if (error.code === "auth/wrong-password") {
          errorMessage = "Password salah";
        } else if (error.code === "auth/invalid-email") {
          errorMessage = "Format email tidak valid";
        } else if (error.code === "auth/network-request-failed") {
          errorMessage = "Koneksi internet bermasalah";
        } else if (error.code === "auth/invalid-credential") {
          errorMessage = "Email atau password salah";
        }

        showNotification(errorMessage, "error");
        hideLoading();
      }
    });
  } else {
    console.error("✗ Admin login form NOT found");
  }
}

// ========================================
// LOGOUT - UNIVERSAL
// ========================================

const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    if (!confirm("Yakin ingin keluar?")) return;

    showLoading();

    try {
      await signOut(auth);
      showNotification("Berhasil keluar", "success");

      // Redirect to appropriate page
      if (isAdminPage || isPasienPage || isTamuPage) {
        window.location.href = "../index.html";
      }
    } catch (error) {
      console.error("Logout error:", error);
      showNotification("Gagal keluar", "error");
      hideLoading();
    }
  });
}

// ========================================
// INITIALIZE
// ========================================

console.log("✓ App initialized");
console.log("Current page:", {
  isIndexPage,
  isAdminPage,
  isPasienPage,
  isTamuPage,
});
console.log("Waiting for auth state...");
