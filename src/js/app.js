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
// TODO: Replace with your Firebase config
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

// DOM Elements
const sections = {
  landing: document.getElementById("landing-section"),
  memberLogin: document.getElementById("member-login-section"),
  memberRegister: document.getElementById("member-register-section"),
  adminLogin: document.getElementById("admin-login-section"),
  patientDashboard: document.getElementById("patient-dashboard-section"),
  adminDashboard: document.getElementById("admin-dashboard-section"),
  chatRoom: document.getElementById("chat-room-section"),
};

const loadingOverlay = document.getElementById("loading-overlay");
const userInfo = document.getElementById("user-info");
const userNameDisplay = document.getElementById("user-name-display");

// Utility Functions - OPTIMIZED
function showLoading() {
  const overlay = document.getElementById("loading-overlay");
  overlay.style.display = "flex";
  document.body.classList.add("loading");

  // Auto-hide after 10 seconds (fallback)
  setTimeout(() => {
    if (overlay.style.display === "flex") {
      console.warn("Loading timeout - auto-hiding");
      hideLoading();
    }
  }, 10000);
}

function hideLoading() {
  const overlay = document.getElementById("loading-overlay");
  overlay.style.display = "none";
  document.body.classList.remove("loading");
}

function showSection(sectionName) {
  Object.values(sections).forEach((section) => {
    section.classList.remove("active");
  });
  if (sections[sectionName]) {
    sections[sectionName].classList.add("active");
  }
}

// Toast Notification System with Icon
function showNotification(message, type = "info", title = null) {
  toast.show(message, type, 4000, title);
}

// Modal Payment Logic
let selectedService = null;
let selectedPrice = 0;

// Service Card Click Handler
document.querySelectorAll(".service-card-mobile").forEach((card) => {
  card.addEventListener("click", function () {
    // Remove selected from all
    document
      .querySelectorAll(".service-card-mobile")
      .forEach((c) => c.classList.remove("selected"));

    // Add selected to clicked
    this.classList.add("selected");

    // Store selection
    selectedService = this.dataset.service;
    selectedPrice = parseInt(this.dataset.price);

    // Wait a bit then show modal
    setTimeout(() => {
      showPaymentModal();
    }, 300);
  });
});

// Show Payment Modal
function showPaymentModal() {
  const modal = document.getElementById("payment-modal");
  const serviceName =
    selectedService === "chat" ? "Chat Konsultasi" : "Telepon Konsultasi";
  const priceFormatted = `Rp ${selectedPrice.toLocaleString("id-ID")}`;

  document.getElementById("selected-service-name").textContent = serviceName;
  document.getElementById("selected-service-price").textContent =
    priceFormatted;

  modal.classList.add("active");

  // Reset to step 1
  showPaymentStep(1);

  // Reset payment method to QRIS
  document
    .querySelectorAll(".payment-tab")
    .forEach((tab) => tab.classList.remove("active"));
  document.querySelector('[data-method="qris"]').classList.add("active");
  showPaymentContent("qris");
}

// Close Payment Modal
document.getElementById("close-payment-modal").addEventListener("click", () => {
  document.getElementById("payment-modal").classList.remove("active");
  // Deselect service
  document
    .querySelectorAll(".service-card-mobile")
    .forEach((c) => c.classList.remove("selected"));
});

// Payment Method Tabs
document.querySelectorAll(".payment-tab").forEach((tab) => {
  tab.addEventListener("click", function () {
    document
      .querySelectorAll(".payment-tab")
      .forEach((t) => t.classList.remove("active"));
    this.classList.add("active");

    const method = this.dataset.method;
    showPaymentContent(method);
  });
});

// Show Payment Content
function showPaymentContent(method) {
  document
    .querySelectorAll(".payment-content")
    .forEach((content) => content.classList.remove("active"));

  if (method === "qris") {
    document.getElementById("qris-content").classList.add("active");
  } else {
    document.getElementById("transfer-content").classList.add("active");
  }
}

// Payment Step Navigation
function showPaymentStep(step) {
  document
    .querySelectorAll(".payment-step")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(`payment-step-${step}`).classList.add("active");
}

// Confirm QRIS Payment
document
  .getElementById("confirm-qris-payment")
  .addEventListener("click", () => {
    showPaymentStep(2);
  });

// Confirm Transfer Payment
document
  .getElementById("confirm-transfer-payment")
  .addEventListener("click", () => {
    showPaymentStep(2);
  });

// Back to Payment
document.getElementById("back-to-payment").addEventListener("click", () => {
  showPaymentStep(1);
});

// Copy Account Number
document
  .getElementById("copy-account-number")
  .addEventListener("click", function () {
    const accountNumber = document.getElementById("account-number").textContent;
    navigator.clipboard.writeText(accountNumber).then(() => {
      this.classList.add("copied");
      showNotification("Nomor rekening berhasil disalin!", "success");

      setTimeout(() => {
        this.classList.remove("copied");
      }, 2000);
    });
  });

// File Upload Preview
document
  .getElementById("payment-proof")
  .addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      // Validate size
      if (file.size > 1024 * 1024) {
        showNotification("Ukuran file terlalu besar. Maksimal 1MB", "error");
        this.value = "";
        return;
      }

      // Show preview
      const reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById("preview-image").src = e.target.result;
        document.getElementById("preview-container").style.display = "block";
        document.querySelector(".file-upload-label").style.display = "none";
      };
      reader.readAsDataURL(file);
    }
  });

// Remove Preview
document.getElementById("remove-preview").addEventListener("click", () => {
  document.getElementById("payment-proof").value = "";
  document.getElementById("preview-container").style.display = "none";
  document.querySelector(".file-upload-label").style.display = "flex";
});

// Upload Proof Form Submit
document
  .getElementById("upload-proof-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoading();

    const paymentProofFile = document.getElementById("payment-proof").files[0];

    if (!paymentProofFile) {
      showNotification("Silakan upload bukti pembayaran", "error");
      hideLoading();
      return;
    }

    // Validate file size
    if (paymentProofFile.size > 1024 * 1024) {
      showNotification("Ukuran file terlalu besar. Maksimal 1MB", "error");
      hideLoading();
      return;
    }

    try {
      // Convert image to base64
      const paymentProofBase64 = await fileToBase64(paymentProofFile);

      // Create consultation document
      await addDoc(collection(db, "consultations"), {
        patientId: currentUser.uid,
        patientName: currentUserData.name || "Tamu",
        serviceType: selectedService,
        price: selectedPrice,
        status: "pending",
        paymentProofUrl: paymentProofBase64,
        paymentProofType: paymentProofFile.type,
        createdAt: serverTimestamp(),
      });

      showNotification(
        "Permintaan konsultasi berhasil diajukan! Menunggu persetujuan admin.",
        "success"
      );

      // Close modal and reset
      document.getElementById("payment-modal").classList.remove("active");
      document.getElementById("upload-proof-form").reset();
      document.getElementById("preview-container").style.display = "none";
      document.querySelector(".file-upload-label").style.display = "flex";

      // Deselect service
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

// Load Patient Dashboard
async function loadPatientDashboard() {
  const consultationsList = document.getElementById(
    "patient-consultations-list"
  );
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

// Load Admin Dashboard
async function loadAdminDashboard() {
  loadConsultationsByStatus("pending", "pending-consultations-list");
  loadConsultationsByStatus("active", "active-consultations-list");
  loadConsultationsByStatus("finished", "finished-consultations-list");
}

async function loadConsultationsByStatus(status, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "<p>Memuat...</p>";

  try {
    const q = query(
      collection(db, "consultations"),
      where("status", "==", status),
      orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        container.innerHTML = '<p class="empty-state">Tidak ada data</p>';
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
    });
  } catch (error) {
    console.error("Load consultations error:", error);
    container.innerHTML = '<p class="error">Gagal memuat data</p>';
  }
}

// Create Consultation Card
function createConsultationCard(id, consultation, userType) {
  const card = document.createElement("div");
  card.className = "consultation-card";

  const statusBadge = {
    pending: "⏳ Menunggu",
    active: "✅ Aktif",
    finished: "✔️ Selesai",
  }[consultation.status];

  const serviceLabel =
    consultation.serviceType === "chat" ? "💬 Chat" : "📞 Telepon";

  card.innerHTML = `
        <div class="consultation-header">
            <h4>${consultation.patientName}</h4>
            <span class="status-badge status-${
              consultation.status
            }">${statusBadge}</span>
        </div>
        <p><strong>Layanan:</strong> ${serviceLabel}</p>
        <p><strong>Harga:</strong> Rp ${consultation.price.toLocaleString(
          "id-ID"
        )}</p>
        <p><strong>Tanggal:</strong> ${
          consultation.createdAt
            ? new Date(consultation.createdAt.toDate()).toLocaleString("id-ID")
            : "Baru"
        }</p>
        ${
          consultation.paymentProofUrl
            ? `<p><img src="${consultation.paymentProofUrl}" alt="Bukti Pembayaran" class="payment-proof-preview" onclick="window.open('${consultation.paymentProofUrl}', '_blank')"></p>`
            : ""
        }
        <div class="consultation-actions">
            ${
              userType === "admin" && consultation.status === "pending"
                ? `<button class="btn btn-primary approve-btn" data-id="${id}">Setujui</button>`
                : ""
            }
            ${
              consultation.status === "active"
                ? `<button class="btn btn-primary open-chat-btn" data-id="${id}" data-name="${consultation.patientName}">Buka Chat</button>`
                : ""
            }
        </div>
    `;

  // Add event listeners
  const approveBtn = card.querySelector(".approve-btn");
  if (approveBtn) {
    approveBtn.addEventListener("click", () => approveConsultation(id));
  }

  const openChatBtn = card.querySelector(".open-chat-btn");
  if (openChatBtn) {
    openChatBtn.addEventListener("click", () => {
      openChatRoom(id, openChatBtn.dataset.name);
    });
  }

  return card;
}

// Approve Consultation
async function approveConsultation(consultationId) {
  if (!confirm("Setujui permintaan konsultasi ini?")) return;

  showLoading();

  try {
    await updateDoc(doc(db, "consultations", consultationId), {
      status: "active",
      approvedAt: serverTimestamp(),
    });

    showNotification("Konsultasi disetujui!", "success");
  } catch (error) {
    console.error("Approve consultation error:", error);
    showNotification("Gagal menyetujui konsultasi", "error");
  }

  hideLoading();
}

// Open Chat Room
function openChatRoom(consultationId, patientName) {
  currentConsultationId = consultationId;

  document.getElementById(
    "chat-room-title"
  ).textContent = `Chat dengan ${patientName}`;
  document.getElementById(
    "chat-room-subtitle"
  ).textContent = `ID: ${consultationId}`;

  // Show finish button for admin
  if (currentUserData.role === "admin") {
    document.getElementById("finish-consultation-btn").style.display = "block";
  }

  showSection("chatRoom");
  loadMessages(consultationId);
}

// Load Messages
function loadMessages(consultationId) {
  const messagesContainer = document.getElementById("messages-container");
  messagesContainer.innerHTML = "<p>Memuat pesan...</p>";

  // Unsubscribe from previous listener
  if (messagesUnsubscribe) {
    messagesUnsubscribe();
  }

  const q = query(
    collection(db, "consultations", consultationId, "messages"),
    orderBy("timestamp", "asc")
  );

  messagesUnsubscribe = onSnapshot(q, (snapshot) => {
    messagesContainer.innerHTML = "";

    if (snapshot.empty) {
      messagesContainer.innerHTML =
        '<p class="empty-state">Belum ada pesan. Mulai percakapan!</p>';
      return;
    }

    snapshot.forEach((doc) => {
      const message = doc.data();
      const messageElement = createMessageElement(message);
      messagesContainer.appendChild(messageElement);
    });

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });
}

// Create Message Element
function createMessageElement(message) {
  const div = document.createElement("div");
  const isOwnMessage = message.senderId === currentUser.uid;
  div.className = `message ${isOwnMessage ? "message-own" : "message-other"}`;

  div.innerHTML = `
        <div class="message-header">
            <strong>${message.senderName}</strong>
            <span class="message-time">${
              message.timestamp
                ? new Date(message.timestamp.toDate()).toLocaleTimeString(
                    "id-ID"
                  )
                : "Mengirim..."
            }</span>
        </div>
        <div class="message-text">${escapeHtml(message.text)}</div>
    `;

  return div;
}

// Send Message
document
  .getElementById("message-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const messageInput = document.getElementById("message-input");
    const text = messageInput.value.trim();

    if (!text || !currentConsultationId) return;

    try {
      await addDoc(
        collection(db, "consultations", currentConsultationId, "messages"),
        {
          text: text,
          senderId: currentUser.uid,
          senderName: currentUserData.name || currentUserData.email || "Tamu",
          timestamp: serverTimestamp(),
        }
      );

      messageInput.value = "";
    } catch (error) {
      console.error("Send message error:", error);
      showNotification("Gagal mengirim pesan", "error");
    }
  });

// Back to Dashboard
document.getElementById("back-to-dashboard").addEventListener("click", () => {
  if (messagesUnsubscribe) {
    messagesUnsubscribe();
    messagesUnsubscribe = null;
  }

  currentConsultationId = null;

  if (currentUserData.role === "admin") {
    showSection("adminDashboard");
  } else {
    showSection("patientDashboard");
  }
});

// Finish Consultation
document
  .getElementById("finish-consultation-btn")
  .addEventListener("click", async () => {
    if (!confirm("Tandai konsultasi ini sebagai selesai?")) return;

    showLoading();

    try {
      await updateDoc(doc(db, "consultations", currentConsultationId), {
        status: "finished",
        finishedAt: serverTimestamp(),
      });

      showNotification("Konsultasi selesai!", "success");

      if (currentUserData.role === "admin") {
        showSection("adminDashboard");
      } else {
        showSection("patientDashboard");
      }
    } catch (error) {
      console.error("Finish consultation error:", error);
      showNotification("Gagal menyelesaikan konsultasi", "error");
    }

    hideLoading();
  });

// Utility: Escape HTML
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
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
// AUTHENTICATION STATE MANAGEMENT
// ========================================

// Auth State Listener dengan loading optimization
onAuthStateChanged(auth, async (user) => {
  showLoading();

  if (user) {
    currentUser = user;

    try {
      // Load user data from Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        currentUserData = userDoc.data();

        // Show user info
        userInfo.style.display = "flex";
        userNameDisplay.textContent =
          currentUserData.name || currentUserData.email;

        // Route based on role
        if (currentUserData.role === "admin") {
          showSection("adminDashboard");
          loadAdminDashboard();
        } else {
          showSection("patientDashboard");
          loadPatientDashboard();
        }
      } else {
        // Anonymous or Guest user
        currentUserData = {
          uid: user.uid,
          email: user.email || "Tamu",
          name: "Tamu",
          role: "guest",
        };

        userInfo.style.display = "flex";
        userNameDisplay.textContent = "Tamu";

        showSection("patientDashboard");
        loadPatientDashboard();
      }
    } catch (error) {
      console.error("Load user data error:", error);
      showNotification("Gagal memuat data pengguna", "error");
    }
  } else {
    // No user logged in
    currentUser = null;
    currentUserData = null;
    userInfo.style.display = "none";
    showSection("landing");
  }

  hideLoading();
});

// ========================================
// NAVIGATION HANDLERS
// ========================================

// Show Member Login
document.getElementById("show-member-login").addEventListener("click", () => {
  showSection("memberLogin");
});

// Show Member Register
document
  .getElementById("show-member-register")
  .addEventListener("click", () => {
    showSection("memberRegister");
  });

// Show Admin Login
document.getElementById("show-admin-login").addEventListener("click", () => {
  showSection("adminLogin");
});

// Back to Landing buttons
document.getElementById("back-to-landing").addEventListener("click", () => {
  showSection("landing");
});

document.getElementById("back-to-landing-2").addEventListener("click", () => {
  showSection("landing");
});

document.getElementById("back-to-landing-3").addEventListener("click", () => {
  showSection("landing");
});

// ========================================
// MEMBER LOGIN
// ========================================

document
  .getElementById("member-login-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoading();

    const email = document.getElementById("member-email").value.trim();
    const password = document.getElementById("member-password").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      showNotification("Login berhasil!", "success");
      // Auth state will handle navigation
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Login gagal";

      if (error.code === "auth/user-not-found") {
        errorMessage = "Email tidak terdaftar";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Password salah";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Format email tidak valid";
      }

      showNotification(errorMessage, "error");
      hideLoading();
    }
  });

// ========================================
// MEMBER REGISTER
// ========================================

document
  .getElementById("member-register-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoading();

    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const dob = document.getElementById("register-dob").value;
    const gender = document.getElementById("register-gender").value;
    const password = document.getElementById("register-password").value;

    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Create Firestore document
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name,
        email: email,
        dob: dob,
        gender: gender,
        role: "member",
        createdAt: serverTimestamp(),
      });

      showNotification("Registrasi berhasil!", "success");
      // Auth state will handle navigation
    } catch (error) {
      console.error("Register error:", error);
      let errorMessage = "Registrasi gagal";

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Email sudah terdaftar";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password terlalu lemah (min. 6 karakter)";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Format email tidak valid";
      }

      showNotification(errorMessage, "error");
      hideLoading();
    }
  });

// ========================================
// ADMIN LOGIN
// ========================================

document
  .getElementById("admin-login-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoading();

    const email = document.getElementById("admin-email").value.trim();
    const password = document.getElementById("admin-password").value;

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Check if user is admin
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().role === "admin") {
        showNotification("Login admin berhasil!", "success");
        // Auth state will handle navigation
      } else {
        await signOut(auth);
        showNotification("Anda bukan admin", "error");
        hideLoading();
      }
    } catch (error) {
      console.error("Admin login error:", error);
      let errorMessage = "Login gagal";

      if (error.code === "auth/user-not-found") {
        errorMessage = "Email tidak terdaftar";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Password salah";
      }

      showNotification(errorMessage, "error");
      hideLoading();
    }
  });

// ========================================
// GUEST LOGIN
// ========================================

document
  .getElementById("guest-login-btn")
  .addEventListener("click", async () => {
    showLoading();

    try {
      await signInAnonymously(auth);
      showNotification("Login sebagai tamu berhasil!", "success");
      // Auth state will handle navigation
    } catch (error) {
      console.error("Guest login error:", error);
      showNotification("Login gagal: " + error.message, "error");
      hideLoading();
    }
  });

// ========================================
// LOGOUT
// ========================================

document.getElementById("logout-btn").addEventListener("click", async () => {
  if (!confirm("Yakin ingin keluar?")) return;

  showLoading();

  try {
    await signOut(auth);
    showNotification("Berhasil keluar", "success");
    // Auth state will handle navigation
  } catch (error) {
    console.error("Logout error:", error);
    showNotification("Gagal keluar", "error");
    hideLoading();
  }
});

// ========================================
// INITIALIZE - REMOVE INITIAL showLoading()
// ========================================

// Don't call showLoading() here - let auth state handle it
console.log("App initialized, waiting for auth state...");
