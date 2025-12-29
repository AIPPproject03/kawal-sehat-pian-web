/* filepath: src/js/pasien.js */
// Firebase v9 Modular SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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

// Import toast manager
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

// DOM Elements
const sections = {
  login: document.getElementById("pasien-login-section"),
  register: document.getElementById("pasien-register-section"),
  dashboard: document.getElementById("pasien-dashboard-section"),
  chatRoom: document.getElementById("chat-room-section"),
};

const loadingOverlay = document.getElementById("loading-overlay");
const userInfo = document.getElementById("user-info");
const userNameDisplay = document.getElementById("user-name-display");

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
  console.log("Showing section:", sectionName);
  Object.values(sections).forEach((section) => {
    if (section) {
      section.classList.remove("active");
      section.style.display = "none";
    }
  });
  if (sections[sectionName]) {
    sections[sectionName].classList.add("active");
    sections[sectionName].style.display = "block";
  }
}

function showNotification(message, type = "info", title = null) {
  if (window.toast) {
    toast.show(message, type, 4000, title);
  } else {
    console.log(`${type}: ${message}`);
  }
}

// ========================================
// MODAL PAYMENT LOGIC
// ========================================

let selectedService = null;
let selectedPrice = 0;

// Service Card Click Handler
document.querySelectorAll(".service-card-mobile").forEach((card) => {
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

// Show Payment Modal
function showPaymentModal() {
  const modal = document.getElementById("payment-modal");
  const serviceName =
    selectedService === "chat" ? "Chat Konsultasi" : "Telepon Konsultasi";
  const priceFormatted = `Rp ${selectedPrice.toLocaleString("id-ID")}`;

  document.getElementById("selected-service-name").textContent = serviceName;
  document.getElementById("selected-service-price").textContent =
    priceFormatted;
  document.getElementById("transfer-amount").textContent = priceFormatted;

  modal.classList.add("active");
  showPaymentStep(1);

  document
    .querySelectorAll(".payment-tab")
    .forEach((tab) => tab.classList.remove("active"));
  document.querySelector('[data-method="qris"]').classList.add("active");
  showPaymentContent("qris");
}

// Close Payment Modal
const closeModalBtn = document.getElementById("close-payment-modal");
if (closeModalBtn) {
  closeModalBtn.addEventListener("click", () => {
    document.getElementById("payment-modal").classList.remove("active");
    document
      .querySelectorAll(".service-card-mobile")
      .forEach((c) => c.classList.remove("selected"));
  });
}

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
    const accountNumber = document.getElementById("account-number").textContent;
    navigator.clipboard.writeText(accountNumber).then(() => {
      this.classList.add("copied");
      showNotification("Nomor rekening berhasil disalin!", "success");

      setTimeout(() => {
        this.classList.remove("copied");
      }, 2000);
    });
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
        const previewContainer = document.getElementById("preview-container");
        const previewImage = document.getElementById("preview-image");
        const uploadLabel = document.querySelector(".file-upload-label");

        previewImage.src = e.target.result;
        previewContainer.style.display = "block";
        uploadLabel.style.display = "none";
      };
      reader.readAsDataURL(file);
    }
  });
}

// Remove Preview
const removePreviewBtn = document.getElementById("remove-preview");
if (removePreviewBtn) {
  removePreviewBtn.addEventListener("click", () => {
    const previewContainer = document.getElementById("preview-container");
    const uploadLabel = document.querySelector(".file-upload-label");
    const paymentProof = document.getElementById("payment-proof");

    previewContainer.style.display = "none";
    uploadLabel.style.display = "flex";
    paymentProof.value = "";
  });
}

// Upload Proof Form Submit
const uploadProofForm = document.getElementById("upload-proof-form");
if (uploadProofForm) {
  uploadProofForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoading();

    const paymentProofFile = document.getElementById("payment-proof").files[0];

    if (!paymentProofFile) {
      showNotification("Pilih file bukti pembayaran", "error");
      hideLoading();
      return;
    }

    if (paymentProofFile.size > 1024 * 1024) {
      showNotification("Ukuran file terlalu besar. Maksimal 1MB", "error");
      hideLoading();
      return;
    }

    try {
      const paymentProofBase64 = await fileToBase64(paymentProofFile);

      await addDoc(collection(db, "consultations"), {
        patientId: currentUser.uid,
        patientName: currentUserData.name || "Pasien",
        patientEmail: currentUserData.email || "",
        serviceType: selectedService,
        price: selectedPrice,
        status: "pending",
        paymentProofUrl: paymentProofBase64,
        paymentProofType: paymentProofFile.type,
        createdAt: serverTimestamp(),
      });

      showNotification(
        "✓ Permintaan konsultasi berhasil diajukan! Menunggu persetujuan bidan.",
        "success",
        "Berhasil"
      );

      document.getElementById("payment-modal").classList.remove("active");
      document.getElementById("upload-proof-form").reset();
      document.getElementById("preview-container").style.display = "none";
      document.querySelector(".file-upload-label").style.display = "flex";

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

// ========================================
// PATIENT DASHBOARD FUNCTIONS
// ========================================

// Load Patient Dashboard - ENHANCED WITH REAL-TIME
async function loadPatientDashboard() {
  const consultationsList = document.getElementById(
    "pasien-consultations-list"
  );
  if (!consultationsList) return;

  consultationsList.innerHTML = '<p class="empty-state">Memuat...</p>';

  try {
    const q = query(
      collection(db, "consultations"),
      where("patientId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    // Real-time listener
    onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          consultationsList.innerHTML =
            '<p class="empty-state">Belum ada konsultasi. Pilih layanan di atas untuk memulai!</p>';
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

        // Check for newly approved consultations
        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified") {
            const consultation = change.doc.data();
            if (consultation.status === "active") {
              showNotification(
                "✅ Konsultasi Anda telah disetujui! Klik 'Buka Chat' untuk memulai.",
                "success",
                "Konsultasi Disetujui"
              );
            }
          }
        });
      },
      (error) => {
        console.error("Load consultations error:", error);
        consultationsList.innerHTML = '<p class="error">Gagal memuat data</p>';
      }
    );
  } catch (error) {
    console.error("Load consultations error:", error);
    consultationsList.innerHTML = '<p class="error">Gagal memuat data</p>';
  }
}

// Create Consultation Card - ENHANCED
function createConsultationCard(id, consultation, userType) {
  const card = document.createElement("div");
  card.className = "consultation-card";
  card.style.animation = "fadeInScale 0.4s ease";

  const statusBadge = {
    pending: "⏳ Menunggu Persetujuan",
    active: "✅ Aktif - Siap Konsultasi",
    finished: "✔️ Selesai",
    rejected: "❌ Ditolak",
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

  card.innerHTML = `
    <div class="consultation-header">
      <h4>${serviceLabel} Konsultasi</h4>
      <span class="status-badge status-${
        consultation.status
      }">${statusBadge}</span>
    </div>
    <div class="consultation-details">
      <p><strong>💰 Harga:</strong> Rp ${consultation.price.toLocaleString(
        "id-ID"
      )}</p>
      <p><strong>📅 Dibuat:</strong> ${dateFormatted}</p>
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
      ${
        consultation.status === "rejected" && consultation.rejectionReason
          ? `<p class="rejection-reason"><strong>❌ Alasan:</strong> ${consultation.rejectionReason}</p>`
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
          onclick="openPaymentProofModal('${consultation.paymentProofUrl}')"
          loading="lazy"
          style="cursor: pointer;"
        >
      </div>
    `
        : ""
    }
    <div class="consultation-actions">
      ${
        consultation.status === "pending"
          ? `
        <p class="waiting-message">⏳ Menunggu persetujuan dari bidan...</p>
      `
          : ""
      }
      ${
        consultation.status === "active"
          ? `
        <button class="btn btn-primary open-chat-btn" data-id="${id}" data-name="Bidan">
          <span>💬</span> Buka Chat - Mulai Konsultasi
        </button>
      `
          : ""
      }
      ${
        consultation.status === "finished"
          ? `
        <button class="btn btn-outline view-history-btn" data-id="${id}" data-name="Bidan">
          <span>👁️</span> Lihat Riwayat Chat
        </button>
      `
          : ""
      }
      ${
        consultation.status === "rejected"
          ? `
        <p class="rejected-message">❌ Konsultasi ditolak. Silakan ajukan kembali dengan bukti pembayaran yang benar.</p>
      `
          : ""
      }
    </div>
  `;

  // Add event listeners
  const openChatBtn = card.querySelector(".open-chat-btn");
  if (openChatBtn) {
    openChatBtn.addEventListener("click", () => {
      openChatRoom(id, "Bidan");
    });
  }

  const viewHistoryBtn = card.querySelector(".view-history-btn");
  if (viewHistoryBtn) {
    viewHistoryBtn.addEventListener("click", () => {
      openChatRoom(id, "Bidan", true);
    });
  }

  return card;
}

// Open Chat Room - ENHANCED
function openChatRoom(consultationId, bidanName, readOnly = false) {
  currentConsultationId = consultationId;

  const chatRoomTitle = document.getElementById("chat-room-title");
  const chatRoomSubtitle = document.getElementById("chat-room-subtitle");

  if (chatRoomTitle) {
    chatRoomTitle.textContent = `💬 Chat dengan ${bidanName}`;
  }
  if (chatRoomSubtitle) {
    chatRoomSubtitle.textContent = readOnly
      ? "Riwayat Konsultasi (Selesai)"
      : "Konsultasi Aktif";
  }

  // Disable input if read-only
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
          '<p class="empty-state">💬 Belum ada pesan. Mulai konsultasi dengan mengirim pesan!</p>';
        return;
      }

      snapshot.forEach((doc) => {
        const message = doc.data();
        const messageElement = createMessageElement(message);
        messagesContainer.appendChild(messageElement);
      });

      // Auto-scroll to bottom
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

  const imageHtml = message.imageUrl
    ? `
    <div class="message-image-container">
      <img src="${message.imageUrl}" 
           alt="Image" 
           class="message-image" 
           onclick="openImageModal('${message.imageUrl}')"
           loading="lazy">
    </div>
  `
    : "";

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
    ${
      message.text
        ? `<div class="message-text">${escapeHtml(message.text)}</div>`
        : ""
    }
    ${imageHtml}
  `;

  return div;
}

// Send Message - ENHANCED
const messageForm = document.getElementById("message-form");
if (messageForm) {
  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const messageInput = document.getElementById("message-input");
    const text = messageInput.value.trim();

    if (!text && !selectedImage) return;

    if (!currentConsultationId) {
      showNotification("Tidak ada konsultasi aktif", "error");
      return;
    }

    if (messageInput.disabled) {
      showNotification("Konsultasi telah selesai", "warning");
      return;
    }

    try {
      const messageData = {
        senderId: currentUser.uid,
        senderName: currentUserData.name || currentUserData.email || "Pasien",
        timestamp: serverTimestamp(),
        isSystemMessage: false,
      };

      if (text) {
        messageData.text = text;
      }

      if (selectedImage) {
        messageData.imageUrl = selectedImage;
        messageData.hasImage = true;
      }

      await addDoc(
        collection(db, "consultations", currentConsultationId, "messages"),
        messageData
      );

      messageInput.value = "";
      removeImagePreview();

      if (emojiPicker) emojiPicker.style.display = "none";

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
    showSection("dashboard");

    console.log("✓ Back to dashboard");
  });
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Utility Functions
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ========================================
// AUTHENTICATION STATE
// ========================================

onAuthStateChanged(auth, async (user) => {
  showLoading();

  if (user) {
    currentUser = user;

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().role === "member") {
        currentUserData = userDoc.data();

        if (userInfo) userInfo.style.display = "flex";
        if (userNameDisplay)
          userNameDisplay.textContent =
            currentUserData.name || currentUserData.email;

        showSection("dashboard");
        loadPatientDashboard();

        console.log("✓ Patient logged in:", currentUserData.name);
      } else {
        await signOut(auth);
        showNotification("Akun tidak valid untuk pasien", "error");
        showSection("login");
      }
    } catch (error) {
      console.error("Load user data error:", error);
      showNotification("Gagal memuat data pengguna", "error");
      showSection("login");
    }
  } else {
    currentUser = null;
    currentUserData = null;
    if (userInfo) userInfo.style.display = "none";
    showSection("login");
  }

  hideLoading();
});

// ========================================
// LOGIN & REGISTER
// ========================================

// Login Form
const loginForm = document.getElementById("pasien-login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoading();

    const email = document.getElementById("pasien-email").value.trim();
    const password = document.getElementById("pasien-password").value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      showNotification("Login berhasil!", "success");
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Login gagal";

      if (error.code === "auth/user-not-found") {
        errorMessage = "Email tidak terdaftar";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Password salah";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Format email tidak valid";
      } else if (error.code === "auth/invalid-credential") {
        errorMessage = "Email atau password salah";
      }

      showNotification(errorMessage, "error");
      hideLoading();
    }
  });
}

// Register Form
const registerForm = document.getElementById("pasien-register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoading();

    const name = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const dob = document.getElementById("register-dob").value;
    const gender = document.getElementById("register-gender").value;
    const password = document.getElementById("register-password").value;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

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
}

// Show Register Section
const showRegisterBtn = document.getElementById("show-register");
if (showRegisterBtn) {
  showRegisterBtn.addEventListener("click", () => {
    showSection("register");
  });
}

// Back to Login
const backToLoginBtn = document.getElementById("back-to-login");
if (backToLoginBtn) {
  backToLoginBtn.addEventListener("click", () => {
    showSection("login");
  });
}

// Logout Button
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    if (!confirm("Yakin ingin keluar?")) return;

    showLoading();

    try {
      await signOut(auth);
      showNotification("Berhasil keluar", "success");
    } catch (error) {
      console.error("Logout error:", error);
      showNotification("Gagal keluar", "error");
      hideLoading();
    }
  });
}

// ========================================
// EMOJI & IMAGE CHAT ENHANCEMENT
// ========================================

// Emoji list
const emojis = [
  "😊",
  "😂",
  "🥰",
  "😍",
  "🤗",
  "👍",
  "👏",
  "🙏",
  "❤️",
  "💕",
  "😢",
  "😭",
  "😅",
  "😃",
  "😄",
  "😁",
  "😆",
  "🤣",
  "😇",
  "🙂",
  "😉",
  "😌",
  "😔",
  "😪",
  "😴",
  "🤔",
  "🤨",
  "😐",
  "😑",
  "😶",
  "🙄",
  "😏",
  "😣",
  "😥",
  "😮",
  "🤐",
  "😯",
  "😲",
  "🥱",
  "😴",
  "🤧",
  "🤒",
  "🤕",
  "🤢",
  "🤮",
  "🥵",
  "🥶",
  "😎",
  "🤓",
  "🧐",
  "👶",
  "👧",
  "🧒",
  "👦",
  "👩",
  "🧑",
  "👨",
  "🧕",
  "👳",
  "👲",
  "🦰",
  "🦱",
  "🦳",
  "🦲",
  "💪",
  "👋",
  "🤚",
  "🖐️",
  "✋",
  "🖖",
  "🙌",
  "👐",
  "🤲",
  "🤝",
  "🙏",
  "✍️",
  "💅",
  "🤳",
  "💃",
  "🕺",
  "🎉",
  "🎊",
  "🎈",
  "🎁",
  "🏆",
  "🥇",
  "🥈",
  "🥉",
  "⭐",
  "🌟",
  "✨",
  "💫",
  "💥",
  "💢",
  "💦",
  "💨",
  "🔥",
  "⚡",
  "☀️",
  "🌈",
];

let selectedImage = null;
let selectedImageFile = null;

// Initialize Emoji Picker
function initializeEmojiPicker() {
  const emojiGrid = document.getElementById("emoji-grid");
  if (!emojiGrid) return;

  emojiGrid.innerHTML = "";
  emojis.forEach((emoji) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "emoji-item";
    button.textContent = emoji;
    button.onclick = () => insertEmoji(emoji);
    emojiGrid.appendChild(button);
  });
}

// Insert Emoji
function insertEmoji(emoji) {
  const messageInput = document.getElementById("message-input");
  if (!messageInput) return;

  const start = messageInput.selectionStart;
  const end = messageInput.selectionEnd;
  const text = messageInput.value;

  messageInput.value = text.substring(0, start) + emoji + text.substring(end);
  messageInput.selectionStart = messageInput.selectionEnd =
    start + emoji.length;
  messageInput.focus();
}

// Toggle Emoji Picker
const btnEmoji = document.getElementById("btn-emoji");
const emojiPicker = document.getElementById("emoji-picker");
const btnCloseEmoji = document.getElementById("btn-close-emoji");

if (btnEmoji && emojiPicker) {
  btnEmoji.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = emojiPicker.style.display === "block";
    emojiPicker.style.display = isVisible ? "none" : "block";

    if (!isVisible) {
      initializeEmojiPicker();
    }
  });
}

if (btnCloseEmoji) {
  btnCloseEmoji.addEventListener("click", () => {
    emojiPicker.style.display = "none";
  });
}

// Close emoji picker when clicking outside
document.addEventListener("click", (e) => {
  if (emojiPicker && !emojiPicker.contains(e.target) && e.target !== btnEmoji) {
    emojiPicker.style.display = "none";
  }
});

// Handle Image Selection
const btnImage = document.getElementById("btn-image");
const imageInput = document.getElementById("image-input");

if (btnImage && imageInput) {
  btnImage.addEventListener("click", () => {
    imageInput.click();
  });

  imageInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showNotification("File harus berupa gambar", "error");
      return;
    }

    if (file.size > 1024 * 1024) {
      showNotification("Ukuran gambar maksimal 1MB", "error");
      return;
    }

    try {
      selectedImageFile = file;
      selectedImage = await fileToBase64(file);
      showImagePreview(selectedImage, file.name);
    } catch (error) {
      console.error("Error reading image:", error);
      showNotification("Gagal memuat gambar", "error");
    }
  });
}

// Show Image Preview
function showImagePreview(base64, fileName) {
  const container = document.getElementById("image-preview-container");
  if (!container) return;

  container.innerHTML = `
    <div class="image-preview-wrapper">
      <img src="${base64}" alt="${fileName}" class="image-preview-thumb">
      <button type="button" class="btn-remove-image-preview" onclick="removeImagePreview()">×</button>
    </div>
  `;
  container.style.display = "flex";
}

// Remove Image Preview
function removeImagePreview() {
  const container = document.getElementById("image-preview-container");
  const imageInput = document.getElementById("image-input");

  if (container) container.style.display = "none";
  if (imageInput) imageInput.value = "";

  selectedImage = null;
  selectedImageFile = null;
}

window.removeImagePreview = removeImagePreview;

// Open Image Modal
function openImageModal(imageUrl) {
  const modal = document.getElementById("image-modal");
  const modalImg = document.getElementById("image-modal-content");

  if (modal && modalImg) {
    modalImg.src = imageUrl;
    modal.classList.add("active");
  }
}

window.openImageModal = openImageModal;

// Close Image Modal
const btnCloseImageModal = document.getElementById("btn-close-image-modal");
const imageModal = document.getElementById("image-modal");

if (btnCloseImageModal && imageModal) {
  btnCloseImageModal.addEventListener("click", () => {
    imageModal.classList.remove("active");
  });

  imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal) {
      imageModal.classList.remove("active");
    }
  });
}

// ========================================
// PAYMENT PROOF MODAL VIEWER
// ========================================

function openPaymentProofModal(imageUrl) {
  const modal = document.getElementById("payment-proof-modal");
  const img = document.getElementById("payment-proof-image");

  if (!modal || !img) return;

  img.src = imageUrl;
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closePaymentProofModal() {
  const modal = document.getElementById("payment-proof-modal");

  if (!modal) return;

  modal.classList.remove("active");
  document.body.style.overflow = "";
}

window.openPaymentProofModal = openPaymentProofModal;

const closePaymentProofBtn = document.getElementById("close-payment-proof");
const closePaymentProofBtnSecondary = document.getElementById(
  "close-payment-proof-btn"
);

if (closePaymentProofBtn) {
  closePaymentProofBtn.addEventListener("click", closePaymentProofModal);
}

if (closePaymentProofBtnSecondary) {
  closePaymentProofBtnSecondary.addEventListener(
    "click",
    closePaymentProofModal
  );
}

const paymentModal = document.getElementById("payment-proof-modal");
if (paymentModal) {
  paymentModal.addEventListener("click", (e) => {
    if (
      e.target === paymentModal ||
      e.target.classList.contains("payment-modal-overlay")
    ) {
      closePaymentProofModal();
    }
  });
}

const downloadPaymentProofBtn = document.getElementById(
  "download-payment-proof"
);
if (downloadPaymentProofBtn) {
  downloadPaymentProofBtn.addEventListener("click", () => {
    const img = document.getElementById("payment-proof-image");
    if (!img || !img.src) return;

    const link = document.createElement("a");
    link.href = img.src;
    link.download = `bukti-pembayaran-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification("Bukti pembayaran berhasil didownload!", "success");
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const modal = document.getElementById("payment-proof-modal");
    if (modal && modal.classList.contains("active")) {
      closePaymentProofModal();
    }
  }
});

console.log("✓ Pasien app initialized");
