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

// File Upload Preview - WITH COMPRESSION
const paymentProofInput = document.getElementById("payment-proof");
if (paymentProofInput) {
  paymentProofInput.addEventListener("change", async function (e) {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      showNotification("File harus berupa gambar", "error");
      this.value = "";
      return;
    }

    try {
      // Auto compress if larger than 1MB
      let processedFile = file;

      if (file.size > 1024 * 1024) {
        showNotification("🔄 Mengompres gambar...", "info");
        processedFile = await compressImage(file, 0.9);
        console.log(
          `Original: ${(file.size / 1024).toFixed(2)} KB → Compressed: ${(
            processedFile.size / 1024
          ).toFixed(2)} KB`
        );
      }

      // Show preview
      const reader = new FileReader();
      reader.onload = function (e) {
        const previewContainer = document.getElementById("preview-container");
        const previewImage = document.getElementById("preview-image");
        const uploadLabel = document.querySelector(".file-upload-label");

        if (previewImage && previewContainer && uploadLabel) {
          previewImage.src = e.target.result;
          previewContainer.style.display = "block";
          uploadLabel.style.display = "none";
        }
      };
      reader.readAsDataURL(processedFile);

      // Store processed file for submit
      paymentProofInput.dataset.processedFile = await fileToBase64(
        processedFile
      );
    } catch (error) {
      console.error("Error processing image:", error);
      showNotification("Gagal memproses gambar", "error");
      this.value = "";
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

// Upload Proof Form Submit - FIXED
const uploadProofForm = document.getElementById("upload-proof-form");
if (uploadProofForm) {
  uploadProofForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoading();

    const paymentProofInput = document.getElementById("payment-proof");

    if (!paymentProofInput || !paymentProofInput.files[0]) {
      showNotification("Pilih file bukti pembayaran", "error");
      hideLoading();
      return;
    }

    try {
      // Use already processed file from dataset
      let paymentProofBase64 = paymentProofInput.dataset.processedFile;

      // If not processed yet (shouldn't happen), process now
      if (!paymentProofBase64) {
        const file = paymentProofInput.files[0];
        let processedFile = file;

        if (file.size > 1024 * 1024) {
          showNotification("🔄 Mengompres gambar...", "info");
          processedFile = await compressImage(file, 0.9);
        }

        paymentProofBase64 = await fileToBase64(processedFile);
      }

      await addDoc(collection(db, "consultations"), {
        patientId: currentUser.uid,
        patientName: currentUserData.name || "Pasien",
        patientEmail: currentUserData.email || "",
        serviceType: selectedService,
        price: selectedPrice,
        status: "pending",
        paymentProofUrl: paymentProofBase64,
        paymentProofType: "image/jpeg",
        createdAt: serverTimestamp(),
      });

      // Success - Close modal and reset form
      const modal = document.getElementById("payment-modal");
      if (modal) modal.classList.remove("active");

      const form = document.getElementById("upload-proof-form");
      if (form) form.reset();

      const previewContainer = document.getElementById("preview-container");
      const uploadLabel = document.querySelector(".file-upload-label");
      if (previewContainer) previewContainer.style.display = "none";
      if (uploadLabel) uploadLabel.style.display = "flex";

      // Clear processed file
      delete paymentProofInput.dataset.processedFile;

      // Clear selected service
      document
        .querySelectorAll(".service-card-mobile")
        .forEach((c) => c.classList.remove("selected"));

      // Show success notification ONLY ONCE
      showNotification(
        "✅ Konsultasi berhasil diajukan! Menunggu persetujuan bidan.",
        "success"
      );

      console.log("✓ Consultation submitted successfully");

      // Dashboard will auto-update via real-time listener
      // No need to manually reload
    } catch (error) {
      console.error("✗ Submit consultation error:", error);
      showNotification(
        "Gagal mengajukan konsultasi. Silakan coba lagi.",
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
    </div>
    <div class="consultation-actions">
      ${
        consultation.status === "pending"
          ? `<p class="waiting-message">⏳ Menunggu persetujuan dari bidan...</p>`
          : ""
      }
      
      ${
        consultation.status === "active" && consultation.serviceType === "chat"
          ? `
        <button class="btn btn-primary open-chat-btn" data-id="${id}" data-name="Bidan">
          <span>💬</span> Buka Chat - Mulai Konsultasi
        </button>
      `
          : ""
      }
      
      ${
        consultation.status === "active" && consultation.serviceType === "phone"
          ? `
        <div class="phone-consultation-info">
          <h4>📞 Konsultasi Telepon</h4>
          <p>Konsultasi Anda telah disetujui!</p>
          <button class="btn btn-success call-whatsapp-btn" 
                  data-id="${id}" 
                  data-name="${consultation.patientName || "Pasien"}">
            <span>📞</span> Telepon via WhatsApp
          </button>
          <p class="phone-note">
            <small>📱 Klik tombol di atas untuk membuka WhatsApp dan melakukan panggilan dengan bidan</small>
          </p>
        </div>
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

  // Event listeners
  const openChatBtn = card.querySelector(".open-chat-btn");
  if (openChatBtn) {
    openChatBtn.addEventListener("click", () => {
      openChatRoom(id, "Bidan");
    });
  }

  const callWhatsAppBtn = card.querySelector(".call-whatsapp-btn");
  if (callWhatsAppBtn) {
    callWhatsAppBtn.addEventListener("click", () => {
      initiateWhatsAppCall(id, callWhatsAppBtn.dataset.name);
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

// Create Message Element - SIMPLE WITH LINE BREAKS
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
           alt="Gambar" 
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
    const text = messageInput.value.trim(); // GET PLAIN TEXT WITH LINE BREAKS

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
      await addDoc(
        collection(db, "consultations", currentConsultationId, "messages"),
        {
          text: text, // SEND WITH LINE BREAKS PRESERVED
          senderId: currentUser.uid,
          senderName: currentUserData.name || "Pasien",
          imageUrl: selectedImage || null,
          timestamp: serverTimestamp(),
        }
      );

      messageInput.value = "";
      selectedImage = null;
      selectedImageFile = null;

      const imagePreview = document.getElementById("image-preview-container");
      if (imagePreview) imagePreview.style.display = "none";
    } catch (error) {
      console.error("Send message error:", error);
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

// ========================================
// IMAGE UPLOAD - CAMERA OR GALLERY
// ========================================

const btnImage = document.getElementById("btn-image");
const imageInput = document.getElementById("image-input");

if (btnImage && imageInput) {
  // Show options when clicking image button
  btnImage.addEventListener("click", () => {
    // Check if device has camera
    if (isMobileDevice()) {
      showImageSourceOptions();
    } else {
      // Desktop: just open file picker
      imageInput.removeAttribute("capture");
      imageInput.click();
    }
  });

  imageInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showNotification("File harus berupa gambar", "error");
      imageInput.value = "";
      return;
    }

    try {
      // Compress image if larger than 1MB
      let processedFile = file;

      if (file.size > 1024 * 1024) {
        showNotification("🔄 Mengompres gambar...", "info");
        processedFile = await compressImage(file, 0.9);
        console.log(
          `Original: ${(file.size / 1024).toFixed(2)} KB → Compressed: ${(
            processedFile.size / 1024
          ).toFixed(2)} KB`
        );
      }

      selectedImageFile = processedFile;
      selectedImage = await fileToBase64(processedFile);
      showImagePreview(selectedImage, processedFile.name);
    } catch (error) {
      console.error("Error processing image:", error);
      showNotification("Gagal memproses gambar", "error");
      imageInput.value = "";
    }
  });
}

// Detect mobile device
function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Show image source options (camera or gallery)
function showImageSourceOptions() {
  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.className = "image-source-overlay";
  overlay.innerHTML = `
    <div class="image-source-modal">
      <h4>Pilih Sumber Gambar</h4>
      <div class="image-source-options">
        <button class="image-source-btn" data-source="camera">
          <span class="source-icon">📷</span>
          <span class="source-label">Kamera</span>
        </button>
        <button class="image-source-btn" data-source="gallery">
          <span class="source-icon">🖼️</span>
          <span class="source-label">Galeri</span>
        </button>
      </div>
      <button class="btn-cancel-source">Batal</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Handle camera option
  overlay
    .querySelector('[data-source="camera"]')
    .addEventListener("click", () => {
      imageInput.setAttribute("capture", "environment"); // Use back camera
      imageInput.click();
      document.body.removeChild(overlay);
    });

  // Handle gallery option
  overlay
    .querySelector('[data-source="gallery"]')
    .addEventListener("click", () => {
      imageInput.removeAttribute("capture");
      imageInput.click();
      document.body.removeChild(overlay);
    });

  // Handle cancel
  overlay.querySelector(".btn-cancel-source").addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  // Close on overlay click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
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

// ========================================
// AUTO-EXPANDING TEXTAREA
// ========================================

const messageInput = document.getElementById("message-input");

if (messageInput) {
  // Auto-expand textarea
  messageInput.addEventListener("input", function () {
    this.style.height = "auto"; // Reset height
    this.style.height = Math.min(this.scrollHeight, 120) + "px"; // Max 120px
  });

  // Handle Enter key (Shift+Enter for new line, Enter to send)
  messageInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // Prevent new line

      const form = document.getElementById("message-form");
      if (form) {
        // Trigger form submit
        form.dispatchEvent(
          new Event("submit", { cancelable: true, bubbles: true })
        );
      }
    }
  });

  // Reset height after send
  const messageForm = document.getElementById("message-form");
  if (messageForm) {
    messageForm.addEventListener("submit", function () {
      setTimeout(() => {
        messageInput.style.height = "auto";
      }, 100);
    });
  }

  // Paste handler - clean up formatting
  messageInput.addEventListener("paste", function (e) {
    e.preventDefault();

    // Get plain text only
    const text = (e.clipboardData || window.clipboardData).getData("text");

    // Insert at cursor position
    const start = this.selectionStart;
    const end = this.selectionEnd;
    const currentValue = this.value;

    this.value =
      currentValue.substring(0, start) + text + currentValue.substring(end);

    // Set cursor position
    this.selectionStart = this.selectionEnd = start + text.length;

    // Trigger input event to auto-expand
    this.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

// ========================================
// IMAGE COMPRESSION UTILITY
// ========================================

// Compress image to target size (default 1MB)
async function compressImage(file, maxSizeMB = 1, maxWidthOrHeight = 1920) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions (maintain aspect ratio)
        if (width > height) {
          if (width > maxWidthOrHeight) {
            height = (height * maxWidthOrHeight) / width;
            width = maxWidthOrHeight;
          }
        } else {
          if (height > maxWidthOrHeight) {
            width = (width * maxWidthOrHeight) / height;
            height = maxWidthOrHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Try different quality levels to get under maxSizeMB
        let quality = 0.9;
        const targetSize = maxSizeMB * 1024 * 1024;

        const tryCompress = (currentQuality) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Compression failed"));
                return;
              }

              console.log(
                `Compressed at quality ${currentQuality}: ${(
                  blob.size / 1024
                ).toFixed(2)} KB`
              );

              // If still too large and quality can be reduced further
              if (blob.size > targetSize && currentQuality > 0.1) {
                tryCompress(currentQuality - 0.1);
              } else {
                // Create File object from blob
                const compressedFile = new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              }
            },
            "image/jpeg",
            currentQuality
          );
        };

        tryCompress(quality);
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// ========================================
// WHATSAPP PHONE CALL
// ========================================

function initiateWhatsAppCall(consultationId, patientName) {
  // Nomor WhatsApp bidan (format: 62 + nomor tanpa 0)
  const bidanPhone = "6281352797722"; // 081352797722 → 6281352797722

  const message = encodeURIComponent(
    `Halo Bidan, saya ${
      patientName || "Pasien"
    } ingin konsultasi telepon.\n\n` +
      `ID Konsultasi: ${consultationId.substring(0, 8)}\n` +
      `Mohon hubungi saya untuk telepon konsultasi. Terima kasih! 🙏`
  );

  const whatsappUrl = `https://wa.me/${bidanPhone}?text=${message}`;

  // Buka WhatsApp di tab baru
  window.open(whatsappUrl, "_blank");

  // Tampilkan notifikasi
  showNotification(
    "WhatsApp terbuka! Klik tombol Call di chat untuk memulai telepon konsultasi.",
    "success",
    "📞 Siap Telepon"
  );

  console.log("✓ WhatsApp call initiated:", consultationId);
}

console.log("✓ Pasien app initialized");
