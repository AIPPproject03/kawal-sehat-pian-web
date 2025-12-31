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
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

import toast from "./toast.js";
import { exportSummaryToPDF } from "./gemini-config.js";
import { CONFIG } from "./config.js"; // ✅ ADD THIS

// Firebase Configuration
const firebaseConfig = {
  apiKey: CONFIG.FIREBASE_API_KEY,
  authDomain: CONFIG.FIREBASE_AUTH_DOMAIN,
  projectId: CONFIG.FIREBASE_PROJECT_ID,
  storageBucket: CONFIG.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: CONFIG.FIREBASE_MESSAGING_SENDER_ID,
  appId: CONFIG.FIREBASE_APP_ID,
  measurementId: CONFIG.FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ========================================
// GLOBAL STATE
// ========================================
let currentUser = null;
let currentUserData = null;
let currentConsultationId = null;
let messagesUnsubscribe = null;
let hasCreatedConsultation = false;

const sections = {
  guestInfo: document.getElementById("guest-info-section"),
  dashboard: document.getElementById("guest-dashboard-section"),
  chatRoom: document.getElementById("chat-room-section"),
};

const loadingOverlay = document.getElementById("loading-overlay");

// ========================================
// UTILITY FUNCTIONS
// ========================================
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

// ========================================
// MODAL PAYMENT LOGIC
// ========================================
let selectedService = null;
let selectedPrice = 0;

// Service Card Click Handler (Chat Only)
document
  .querySelectorAll(".service-card-mobile:not(.service-locked)")
  .forEach((card) => {
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

// Show Register Prompt for Locked Service
function showRegisterPrompt() {
  const confirmed = confirm(
    "📞 Telepon Konsultasi hanya tersedia untuk pasien terdaftar.\n\n" +
      "✅ Keuntungan Daftar:\n" +
      "• Riwayat konsultasi tersimpan\n" +
      "• Akses telepon konsultasi\n" +
      "• Data kesehatan terintegrasi\n\n" +
      "Daftar sekarang?"
  );

  if (confirmed) {
    window.location.href = "pasien.html";
  }
}

// Make function global for onclick
window.showRegisterPrompt = showRegisterPrompt;

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
  document.querySelectorAll(".payment-content").forEach((content) => {
    content.classList.remove("active");
  });
  document.getElementById(`${method}-content`).classList.add("active");
}

function showPaymentStep(step) {
  document.querySelectorAll(".payment-step").forEach((stepEl) => {
    stepEl.classList.remove("active");
  });
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

      console.log("✓ Image processed and preview shown");
    } catch (error) {
      console.error("Error processing image:", error);
      showNotification("Gagal memproses gambar", "error");
      this.value = "";
    }
  });
}

// ✅ FIX: Remove Preview Button
const removePreviewBtn = document.getElementById("remove-preview");
if (removePreviewBtn) {
  removePreviewBtn.addEventListener("click", function (e) {
    e.preventDefault(); // Prevent any default action
    e.stopPropagation(); // Stop event bubbling

    console.log("Remove preview clicked");

    const previewContainer = document.getElementById("preview-container");
    const uploadLabel = document.querySelector(".file-upload-label");
    const paymentProof = document.getElementById("payment-proof");
    const previewImage = document.getElementById("preview-image");

    // Hide preview
    if (previewContainer) {
      previewContainer.style.display = "none";
      console.log("✓ Preview container hidden");
    }

    // Show upload label
    if (uploadLabel) {
      uploadLabel.style.display = "flex";
      console.log("✓ Upload label shown");
    }

    // Clear file input
    if (paymentProof) {
      paymentProof.value = "";
      delete paymentProof.dataset.processedFile;
      console.log("✓ File input cleared");
    }

    // Clear preview image
    if (previewImage) {
      previewImage.src = "";
      console.log("✓ Preview image cleared");
    }

    showNotification("Foto dihapus. Silakan pilih foto baru.", "info");
  });
}

// Upload Proof Form Submit
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

    // Check if user is logged in
    if (!currentUser) {
      showNotification("Silakan login terlebih dahulu", "error");
      hideLoading();
      return;
    }

    // ✅ VALIDATION: Guest can only use chat service
    if (selectedService !== "chat") {
      showNotification(
        "❌ Tamu hanya bisa Chat Konsultasi. Daftar sebagai pasien untuk Telepon Konsultasi.",
        "error"
      );
      hideLoading();
      return;
    }

    try {
      // Use already processed file from dataset
      let paymentProofBase64 = paymentProofInput.dataset.processedFile;

      // If not processed yet, process now
      if (!paymentProofBase64) {
        const file = paymentProofInput.files[0];
        let processedFile = file;

        if (file.size > 1024 * 1024) {
          showNotification("🔄 Mengompres gambar...", "info");
          processedFile = await compressImage(file, 0.9);
        }

        paymentProofBase64 = await fileToBase64(processedFile);
      }

      // Create consultation
      const consultationRef = await addDoc(collection(db, "consultations"), {
        patientId: currentUser.uid,
        patientName: currentUserData?.name || "Tamu",
        serviceType: selectedService,
        price: selectedPrice,
        status: "pending",
        paymentProofUrl: paymentProofBase64,
        paymentProofType: "image/jpeg",
        isGuest: true,
        guestSession: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      // Mark that consultation was created (preserve user data)
      hasCreatedConsultation = true;

      // Update user document to mark has consultation
      await updateDoc(doc(db, "users", currentUser.uid), {
        hasConsultation: true,
        consultationId: consultationRef.id,
        lastActive: serverTimestamp(),
      });

      console.log("✓ Guest consultation created:", consultationRef.id);

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

      // Show success notification
      showNotification(
        "✅ Konsultasi berhasil diajukan! Menunggu persetujuan bidan.",
        "success"
      );

      // Reload consultation
      loadGuestConsultation();
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
// LOAD GUEST CONSULTATION
// ========================================
async function loadGuestConsultation() {
  const consultationContainer = document.getElementById(
    "guest-current-consultation"
  );
  if (!consultationContainer) return;

  consultationContainer.innerHTML = '<p class="empty-state">Memuat...</p>';

  try {
    const q = query(
      collection(db, "consultations"),
      where("patientId", "==", currentUser.uid),
      where("isGuest", "==", true),
      orderBy("createdAt", "desc")
    );

    // Real-time listener
    onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          consultationContainer.innerHTML =
            '<p class="empty-state">Belum ada konsultasi aktif. Pilih layanan di atas untuk memulai!</p>';
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

        // Check for status changes
        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified") {
            const consultation = change.doc.data();
            if (consultation.status === "active") {
              showNotification(
                "✅ Konsultasi Anda telah disetujui! Klik 'Buka Chat' untuk memulai.",
                "success",
                "Konsultasi Disetujui"
              );
            } else if (consultation.status === "finished") {
              showNotification(
                "✔️ Konsultasi telah selesai. Terima kasih!",
                "success",
                "Konsultasi Selesai"
              );
            } else if (consultation.status === "rejected") {
              showNotification(
                "❌ Konsultasi ditolak. Silakan ajukan kembali.",
                "error",
                "Konsultasi Ditolak"
              );
            }
          }
        });
      },
      (error) => {
        console.error("Load consultation error:", error);
        consultationContainer.innerHTML =
          '<p class="error">Gagal memuat data</p>';
      }
    );
  } catch (error) {
    console.error("Load consultation error:", error);
    consultationContainer.innerHTML = '<p class="error">Gagal memuat data</p>';
  }
}

function createGuestConsultationCard(id, consultation) {
  const card = document.createElement("div");
  card.className = "consultation-card";

  const statusBadge = {
    pending: "⏳ Menunggu",
    active: "✅ Aktif",
    finished: "✔️ Selesai",
    rejected: "❌ Ditolak",
  }[consultation.status];

  // Guest should only have chat service
  const serviceLabel = "💬 Chat";

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
    <p><strong>Status:</strong> ${statusBadge}</p>
    <div class="guest-reminder" style="margin-top: 1rem; padding: 0.75rem; background: #fff3cd; border-radius: 8px;">
      <small style="color: #856404;">⚠️ Riwayat tidak tersimpan. <a href="pasien.html" style="color: #4a90e2; font-weight: 600;">Daftar sekarang</a> untuk akses telepon & riwayat!</small>
    </div>
    <div class="consultation-actions">
      ${
        consultation.status === "pending"
          ? `<p class="waiting-message" style="text-align: center; color: #856404; background: #fff3cd; padding: 0.75rem; border-radius: 8px; margin: 0.5rem 0;">⏳ Menunggu persetujuan bidan...</p>`
          : ""
      }
      
      ${
        consultation.status === "active"
          ? `<button class="btn btn-primary open-chat-btn" data-id="${id}">
               <span>💬</span> Buka Chat
             </button>`
          : ""
      }
      
      ${
        consultation.status === "finished"
          ? `
            <p style="text-align: center; color: var(--text-light); margin-top: 1rem;">
              Konsultasi selesai. Data akan hilang saat logout.
            </p>
            <button onclick="window.location.href='pasien.html'" class="btn btn-accent btn-block" style="margin-top: 0.5rem;">
              <span>📝</span> Daftar untuk Telepon Konsultasi
            </button>
          `
          : ""
      }
      
      ${
        consultation.status === "rejected"
          ? `<p class="rejected-message" style="text-align: center; color: #721c24; background: #f8d7da; padding: 0.75rem; border-radius: 8px; margin: 0.5rem 0;">❌ Konsultasi ditolak. Silakan ajukan kembali.</p>`
          : ""
      }
    </div>
  `;

  // Event listener for chat only
  const openChatBtn = card.querySelector(".open-chat-btn");
  if (openChatBtn) {
    openChatBtn.addEventListener("click", () => {
      openChatRoom(id);
    });
  }

  return card;
}

// ========================================
// CHAT FUNCTIONS
// ========================================
function openChatRoom(consultationId) {
  currentConsultationId = consultationId;

  document.getElementById("chat-room-title").textContent = "Chat dengan Bidan";
  document.getElementById("chat-room-subtitle").textContent =
    "Mode Tamu - Tidak Tersimpan";

  showSection("chatRoom");
  loadMessages(consultationId);
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
          '<p class="empty-state">💬 Belum ada pesan. Mulai percakapan!</p>';
        return;
      }

      snapshot.forEach((doc) => {
        const message = doc.data();
        const messageElement = createMessageElement(message, doc.id); // ✅ Pass doc.id
        messagesContainer.appendChild(messageElement);
      });

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

// Create Message Element - WITH AI SUMMARY SUPPORT
function createMessageElement(message, messageId) {
  const div = document.createElement("div");
  div.style.animation = "slideIn 0.3s ease";
  div.dataset.messageId = messageId;

  // ✅ AI Summary Message (Special Style)
  if (message.isAiSummary) {
    div.className = "message message-system ai-summary-message";
    div.innerHTML = `
      <div class="ai-summary-header">
        <span class="ai-icon">🤖</span>
        <h4>Ringkasan Konsultasi (AI)</h4>
      </div>
      <div class="message-text ai-summary-content">${escapeHtml(message.text)
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>")}</div>
      <div class="ai-summary-actions">
        <button class="btn-download-summary" onclick="downloadAiSummaryPDF('${messageId}')">
          <span>📄</span> Download PDF
        </button>
        <button class="btn-copy-summary" onclick="copyAiSummary('${messageId}')">
          <span>📋</span> Salin Teks
        </button>
      </div>
      <span class="message-time">${
        message.timestamp
          ? new Date(message.timestamp.toDate()).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : ""
      }</span>
    `;
    return div;
  }

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

  // Regular message (existing code...)
  const isOwnMessage = currentUser && message.senderId === currentUser.uid;
  div.className = `message ${isOwnMessage ? "message-own" : "message-other"}`;

  const imageHtml = message.imageUrl
    ? `
    <div class="message-image-container">
      <img src="${message.imageUrl}" 
           alt="Image" 
           class="message-image" 
           onclick="openImageModal('${message.imageUrl}')"
           loading="lazy"
           style="cursor: pointer;">
    </div>
  `
    : "";

  div.innerHTML = `
    <div class="message-header">
      <strong>${message.senderName || "Tamu"}</strong>
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

// Send Message
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

    try {
      await addDoc(
        collection(db, "consultations", currentConsultationId, "messages"),
        {
          text: text || "",
          senderId: currentUser.uid,
          senderName: currentUserData?.name || "Tamu",
          imageUrl: selectedImage || null,
          timestamp: serverTimestamp(),
        }
      );

      messageInput.value = "";
      selectedImage = null;
      selectedImageFile = null;

      const imagePreview = document.getElementById("image-preview-container");
      if (imagePreview) imagePreview.style.display = "none";

      console.log("✓ Message sent");
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

// ========================================
// UTILITY FUNCTIONS
// ========================================
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
// LOGOUT WITH CLEANUP
// ========================================
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    if (
      !confirm(
        "Yakin ingin keluar? Riwayat akan hilang jika belum berkonsultasi."
      )
    )
      return;

    showLoading();

    try {
      if (currentUser && !hasCreatedConsultation) {
        try {
          await deleteDoc(doc(db, "users", currentUser.uid));
          console.log("✓ Guest user cleaned up (no consultation)");
        } catch (cleanupError) {
          console.error("Cleanup error:", cleanupError);
        }
      } else {
        console.log("✓ Guest user preserved (has consultation)");
      }

      await signOut(auth);
      showNotification("Berhasil keluar. Terima kasih!", "success");

      setTimeout(() => {
        window.location.href = "../index.html";
      }, 1000);
    } catch (error) {
      console.error("Logout error:", error);
      showNotification("Gagal keluar", "error");
      hideLoading();
    }
  });
}

// ========================================
// AUTH STATE
// ========================================
onAuthStateChanged(auth, async (user) => {
  showLoading();

  if (user) {
    currentUser = user;

    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().role === "guest") {
        currentUserData = userDoc.data();

        const userInfo = document.getElementById("user-info");
        if (userInfo) userInfo.style.display = "flex";

        await updateDoc(userDocRef, {
          lastActive: serverTimestamp(),
        });

        console.log("✓ Guest session restored:", user.uid);

        showSection("dashboard");
        loadGuestConsultation();

        setTimeout(() => {
          showNotification(
            "⚠️ Mode Tamu: Riwayat tidak akan tersimpan setelah logout!",
            "warning"
          );
        }, 1500);
      } else {
        console.warn("Invalid guest session, signing out");
        await signOut(auth);
        showSection("guestInfo");
      }
    } catch (error) {
      console.error("Auth state error:", error);
      await signOut(auth);
      showSection("guestInfo");
    }
  } else {
    currentUser = null;
    currentUserData = null;
    hasCreatedConsultation = false;
    showSection("guestInfo");
  }

  hideLoading();
});

// ========================================
// CONTINUE AS GUEST BUTTON
// ========================================
const continueAsGuestBtn = document.getElementById("continue-as-guest");
if (continueAsGuestBtn) {
  continueAsGuestBtn.addEventListener("click", async () => {
    showLoading();

    try {
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: "Tamu",
        email: "",
        role: "guest",
        isGuest: true,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
      });

      currentUserData = {
        uid: user.uid,
        name: "Tamu",
        email: "",
        role: "guest",
        isGuest: true,
      };

      showNotification("Login sebagai tamu berhasil!", "success");
      console.log("✓ Guest logged in:", user.uid);
    } catch (error) {
      console.error("Guest login error:", error);
      showNotification("Login gagal: " + error.message, "error");
      hideLoading();
    }
  });
}

// Cleanup on beforeunload
window.addEventListener("beforeunload", async () => {
  if (currentUser && !hasCreatedConsultation) {
    try {
      await deleteDoc(doc(db, "users", currentUser.uid));
      console.log("✓ Guest user cleaned up on exit");
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }
});

// ========================================
// IMAGE COMPRESSION (ONLY ONE DECLARATION!)
// ========================================
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

// ========================================
// EMOJI & IMAGE UPLOAD
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
  if (!emojiGrid || emojiGrid.children.length > 0) return;

  emojis.forEach((emoji) => {
    const span = document.createElement("span");
    span.className = "emoji-item";
    span.textContent = emoji;
    span.onclick = () => insertEmoji(emoji);
    emojiGrid.appendChild(span);
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

  const emojiPicker = document.getElementById("emoji-picker");
  if (emojiPicker) emojiPicker.style.display = "none";
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
// IMAGE UPLOAD
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

function removeImagePreview() {
  const container = document.getElementById("image-preview-container");
  const imageInput = document.getElementById("image-input");

  if (container) container.style.display = "none";
  if (imageInput) imageInput.value = "";

  selectedImage = null;
  selectedImageFile = null;
}

window.removeImagePreview = removeImagePreview;

function openImageModal(imageUrl) {
  const modal = document.getElementById("image-modal");
  const modalImg = document.getElementById("image-modal-content");

  if (modal && modalImg) {
    modalImg.src = imageUrl;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

window.openImageModal = openImageModal;

const btnCloseImageModal = document.getElementById("btn-close-image-modal");
const imageModal = document.getElementById("image-modal");

if (btnCloseImageModal && imageModal) {
  btnCloseImageModal.addEventListener("click", () => {
    imageModal.classList.remove("active");
    document.body.style.overflow = "";
  });

  imageModal.addEventListener("click", (e) => {
    if (e.target === imageModal) {
      imageModal.classList.remove("active");
      document.body.style.overflow = "";
    }
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const imageModal = document.getElementById("image-modal");
    if (imageModal && imageModal.classList.contains("active")) {
      imageModal.classList.remove("active");
      document.body.style.overflow = "";
    }
  }
});

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
// WHATSAPP PHONE CALL
// ========================================

function initiateWhatsAppCall(consultationId, guestName) {
  const bidanPhone = "6281352797722";

  const message = encodeURIComponent(
    `Halo Bidan, saya ${guestName || "Tamu"} ingin konsultasi telepon.\n\n` +
      `ID Konsultasi: ${consultationId.substring(0, 8)}\n` +
      `Mohon hubungi saya untuk telepon konsultasi. Terima kasih! 🙏`
  );

  const whatsappUrl = `https://wa.me/${bidanPhone}?text=${message}`;

  window.open(whatsappUrl, "_blank");

  showNotification(
    "WhatsApp terbuka! Klik tombol Call di chat untuk memulai telepon konsultasi.",
    "success",
    "📞 Siap Telepon"
  );

  console.log("✓ WhatsApp call initiated:", consultationId);
}

// ========================================
// AI SUMMARY ACTIONS (TAMU)
// ========================================

window.downloadAiSummaryPDF = async function (messageId) {
  if (!currentConsultationId) return;

  try {
    showLoading("Membuat PDF...");

    const consultationDoc = await getDoc(
      doc(db, "consultations", currentConsultationId)
    );
    const consultationData = consultationDoc.data();

    const summaryData = {
      summary: consultationData.aiSummary || "Ringkasan tidak tersedia",
      generatedAt:
        consultationData.aiSummaryGeneratedAt || new Date().toISOString(),
      usedFallback: consultationData.aiSummaryUsedFallback || false,
    };

    const consultationInfo = {
      patientName: consultationData.patientName || "Tamu",
      date: consultationData.finishedAt?.toDate() || new Date(),
      type: consultationData.serviceType || "chat",
    };

    const result = await exportSummaryToPDF(summaryData, consultationInfo);

    if (result.success) {
      showNotification(`✓ PDF berhasil diunduh: ${result.filename}`, "success");
    }
  } catch (error) {
    console.error("Download PDF error:", error);
    showNotification("Gagal membuat PDF: " + error.message, "error");
  } finally {
    hideLoading();
  }
};

window.copyAiSummary = async function (messageId) {
  try {
    const messageElement = document.querySelector(
      `[data-message-id="${messageId}"]`
    );
    if (!messageElement) {
      console.error("Message element not found:", messageId);
      showNotification("Elemen tidak ditemukan", "error");
      return;
    }

    const summaryContent = messageElement.querySelector(".ai-summary-content");
    if (!summaryContent) {
      console.error("Summary content not found");
      showNotification("Konten ringkasan tidak ditemukan", "error");
      return;
    }

    const summaryText = summaryContent.innerText || summaryContent.textContent;

    await navigator.clipboard.writeText(summaryText);
    showNotification("✓ Ringkasan berhasil disalin!", "success");
  } catch (error) {
    console.error("Copy error:", error);

    // Fallback: show prompt
    const messageElement = document.querySelector(
      `[data-message-id="${messageId}"]`
    );
    if (messageElement) {
      const summaryContent = messageElement.querySelector(
        ".ai-summary-content"
      );
      if (summaryContent) {
        const text = summaryContent.innerText || summaryContent.textContent;
        prompt("Salin teks berikut:", text);
      }
    }

    showNotification("Gagal menyalin. Gunakan Ctrl+C manual.", "warning");
  }
};

console.log("✓ Tamu app initialized");
