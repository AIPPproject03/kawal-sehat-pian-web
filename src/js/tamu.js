/* filepath: src/js/tamu.js */
/* filepath: src/js/tamu.js */
// Firebase v9 Modular SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
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
let currentConsultationId = null;
let messagesUnsubscribe = null;

// DOM Elements
const sections = {
  guestInfo: document.getElementById("guest-info-section"),
  dashboard: document.getElementById("guest-dashboard-section"),
  chatRoom: document.getElementById("chat-room-section"),
};

const loadingOverlay = document.getElementById("loading-overlay");

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

function showNotification(message, type = "info", title = null) {
  toast.show(message, type, 4000, title);
}

// Modal Payment Logic
let selectedService = null;
let selectedPrice = 0;

// Continue as Guest Button
const continueAsGuestBtn = document.getElementById("continue-as-guest");
if (continueAsGuestBtn) {
  continueAsGuestBtn.addEventListener("click", async () => {
    showLoading();

    try {
      await signInAnonymously(auth);
      showNotification("Login sebagai tamu berhasil!", "success");
    } catch (error) {
      console.error("Guest login error:", error);
      showNotification("Login gagal: " + error.message, "error");
      hideLoading();
    }
  });
}

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
        patientName: currentUserData.name || "Tamu",
        serviceType: selectedService,
        price: selectedPrice,
        status: "pending",
        paymentProofUrl: paymentProofBase64,
        paymentProofType: "image/jpeg",
        createdAt: serverTimestamp(),
      });

      showNotification(
        "Konsultasi berhasil diajukan! Menunggu persetujuan.",
        "success"
      );

      document.getElementById("payment-modal").classList.remove("active");
      document.getElementById("upload-proof-form").reset();
      document.getElementById("preview-container").style.display = "none";
      document.querySelector(".file-upload-label").style.display = "flex";

      // Clear processed file
      delete paymentProofInput.dataset.processedFile;

      document
        .querySelectorAll(".service-card-mobile")
        .forEach((c) => c.classList.remove("selected"));

      loadGuestConsultation();
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

// Load Guest Current Consultation (No History)
async function loadGuestConsultation() {
  const consultationContainer = document.getElementById(
    "guest-current-consultation"
  );
  if (!consultationContainer) return;

  consultationContainer.innerHTML = "<p>Memuat...</p>";

  try {
    const q = query(
      collection(db, "consultations"),
      where("patientId", "==", currentUser.uid),
      where("isGuest", "==", true),
      orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        consultationContainer.innerHTML =
          '<p class="empty-state">Belum ada konsultasi aktif</p>';
        return;
      }

      consultationContainer.innerHTML = "";

      // Only show the first (latest) consultation
      const doc = snapshot.docs[0];
      const consultation = doc.data();
      currentConsultationId = doc.id;

      const consultationCard = createGuestConsultationCard(
        doc.id,
        consultation
      );
      consultationContainer.appendChild(consultationCard);
    });
  } catch (error) {
    console.error("Load guest consultation error:", error);
    consultationContainer.innerHTML = '<p class="error">Gagal memuat data</p>';
  }
}

// Create Guest Consultation Card (Simplified)
function createGuestConsultationCard(id, consultation) {
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
      <h4>Konsultasi Tamu</h4>
      <span class="status-badge status-${
        consultation.status
      }">${statusBadge}</span>
    </div>
    <p><strong>Layanan:</strong> ${serviceLabel}</p>
    <p><strong>Harga:</strong> Rp ${consultation.price.toLocaleString(
      "id-ID"
    )}</p>
    <div class="guest-reminder" style="margin-top: 1rem; padding: 0.75rem; background: #fff3cd; border-radius: 8px;">
      <small style="color: #856404;">⚠️ Riwayat tidak tersimpan. <a href="pasien.html" style="color: #4a90e2; font-weight: 600;">Daftar sekarang</a></small>
    </div>
    <div class="consultation-actions">
      ${
        consultation.status === "active"
          ? `<button class="btn btn-primary open-chat-btn" data-id="${id}">Buka Chat</button>`
          : ""
      }
      ${
        consultation.status === "finished"
          ? `<p style="text-align: center; color: var(--text-light); margin-top: 1rem;">Konsultasi selesai. Data akan hilang saat logout.</p>`
          : ""
      }
    </div>
  `;

  const openChatBtn = card.querySelector(".open-chat-btn");
  if (openChatBtn) {
    openChatBtn.addEventListener("click", () => {
      openChatRoom(id);
    });
  }

  return card;
}

// Open Chat Room (Guest)
function openChatRoom(consultationId) {
  currentConsultationId = consultationId;

  document.getElementById("chat-room-title").textContent = "Chat dengan Bidan";
  document.getElementById("chat-room-subtitle").textContent =
    "Mode Tamu - Tidak Tersimpan";

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

// Create Message Element - SIMPLE
function createMessageElement(message) {
  const div = document.createElement("div");
  const isOwnMessage = message.senderId === currentUser.uid;
  const isSystemMessage = message.isSystemMessage;

  if (isSystemMessage) {
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
      <strong>${message.senderName}</strong>
      <span class="message-time">${
        message.timestamp
          ? new Date(message.timestamp.toDate()).toLocaleTimeString("id-ID")
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
          senderName: "Tamu",
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

// Authentication State (Guest)
onAuthStateChanged(auth, async (user) => {
  showLoading();

  if (user) {
    currentUser = user;
    showSection("dashboard");
    loadGuestConsultation();

    // Show reminder about not saving history
    setTimeout(() => {
      showNotification(
        "⚠️ Mode Tamu: Riwayat tidak akan tersimpan!",
        "warning"
      );
    }, 1000);
  } else {
    currentUser = null;
    showSection("guestInfo");
  }

  hideLoading();
});

console.log("Tamu app initialized");

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
  btnImage.addEventListener("click", () => {
    if (isMobileDevice()) {
      showImageSourceOptions();
    } else {
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

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

function showImageSourceOptions() {
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

  overlay
    .querySelector('[data-source="camera"]')
    .addEventListener("click", () => {
      imageInput.setAttribute("capture", "environment");
      imageInput.click();
      document.body.removeChild(overlay);
    });

  overlay
    .querySelector('[data-source="gallery"]')
    .addEventListener("click", () => {
      imageInput.removeAttribute("capture");
      imageInput.click();
      document.body.removeChild(overlay);
    });

  overlay.querySelector(".btn-cancel-source").addEventListener("click", () => {
    document.body.removeChild(overlay);
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
}

// ========================================
// AUTO-EXPANDING TEXTAREA
// ========================================

const messageInput = document.getElementById("message-input");

if (messageInput) {
  messageInput.addEventListener("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 120) + "px";
  });

  messageInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = document.getElementById("message-form");
      if (form) {
        form.dispatchEvent(
          new Event("submit", { cancelable: true, bubbles: true })
        );
      }
    }
  });

  const messageForm = document.getElementById("message-form");
  if (messageForm) {
    messageForm.addEventListener("submit", function () {
      setTimeout(() => {
        messageInput.style.height = "auto";
      }, 100);
    });
  }

  messageInput.addEventListener("paste", function (e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text");
    const start = this.selectionStart;
    const end = this.selectionEnd;
    const currentValue = this.value;

    this.value =
      currentValue.substring(0, start) + text + currentValue.substring(end);
    this.selectionStart = this.selectionEnd = start + text.length;
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

              if (blob.size > targetSize && currentQuality > 0.1) {
                tryCompress(currentQuality - 0.1);
              } else {
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
