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
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

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
  }
}

function hideLoading() {
  if (loadingOverlay) {
    loadingOverlay.style.display = "none";
  }
}

function showSection(sectionName) {
  Object.values(sections).forEach((section) => {
    if (section) section.classList.remove("active");
  });
  if (sections[sectionName]) {
    sections[sectionName].classList.add("active");
  }
}

function showNotification(message, type = "info") {
  const toast = document.getElementById("toast-notification");
  const toastMessage = document.getElementById("toast-message");

  if (!toast || !toastMessage) return;

  const icons = {
    success: "✅",
    error: "❌",
    info: "ℹ️",
    warning: "⚠️",
  };

  toastMessage.textContent = `${icons[type] || icons.info} ${message}`;
  toast.className = `toast-notification show ${type}`;

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Modal Payment Logic
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
  });
}

// Payment Tab Switching
document.querySelectorAll(".payment-tab").forEach((tab) => {
  tab.addEventListener("click", function () {
    document
      .querySelectorAll(".payment-tab")
      .forEach((t) => t.classList.remove("active"));
    this.classList.add("active");
    showPaymentContent(this.dataset.method);
  });
});

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

function showPaymentStep(step) {
  document
    .querySelectorAll(".payment-step")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(`payment-step-${step}`).classList.add("active");
}

// Confirm Payment Buttons
const confirmQrisBtn = document.getElementById("confirm-qris-payment");
if (confirmQrisBtn) {
  confirmQrisBtn.addEventListener("click", () => {
    showPaymentStep(2);
  });
}

const confirmTransferBtn = document.getElementById("confirm-transfer-payment");
if (confirmTransferBtn) {
  confirmTransferBtn.addEventListener("click", () => {
    showPaymentStep(2);
  });
}

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
    const fileInput = document.getElementById("payment-proof");

    previewContainer.style.display = "none";
    uploadLabel.style.display = "flex";
    fileInput.value = "";
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

// Load Patient Dashboard
async function loadPatientDashboard() {
  const consultationsList = document.getElementById(
    "pasien-consultations-list"
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
        consultation.status === "active"
          ? `<button class="btn btn-primary open-chat-btn" data-id="${id}" data-name="${consultation.patientName}">Buka Chat</button>`
          : ""
      }
    </div>
  `;

  const openChatBtn = card.querySelector(".open-chat-btn");
  if (openChatBtn) {
    openChatBtn.addEventListener("click", () => {
      openChatRoom(id, consultation.patientName);
    });
  }

  return card;
}

// Open Chat Room
function openChatRoom(consultationId, patientName) {
  currentConsultationId = consultationId;

  document.getElementById("chat-room-title").textContent = `Chat dengan Bidan`;
  document.getElementById("chat-room-subtitle").textContent = `Konsultasi`;

  showSection("chatRoom");
  loadMessages(consultationId);
}

// Load Messages
function loadMessages(consultationId) {
  const messagesContainer = document.getElementById("messages-container");
  if (!messagesContainer) return;

  messagesContainer.innerHTML = "<p>Memuat pesan...</p>";

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
          ? new Date(message.timestamp.toDate()).toLocaleTimeString("id-ID")
          : "Mengirim..."
      }</span>
    </div>
    <div class="message-text">${escapeHtml(message.text)}</div>
  `;

  return div;
}

// Send Message
const messageForm = document.getElementById("message-form");
if (messageForm) {
  messageForm.addEventListener("submit", async (e) => {
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
          senderName: currentUserData.name || currentUserData.email || "Pasien",
          timestamp: serverTimestamp(),
        }
      );

      messageInput.value = "";
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
  });
}

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

// Authentication State
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
      } else {
        await signOut(auth);
        showNotification("Akun tidak valid untuk pasien", "error");
        showSection("login");
      }
    } catch (error) {
      console.error("Load user data error:", error);
      showNotification("Gagal memuat data pengguna", "error");
    }
  } else {
    currentUser = null;
    currentUserData = null;
    if (userInfo) userInfo.style.display = "none";
    showSection("login");
  }

  hideLoading();
});

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

console.log("Pasien app initialized");
