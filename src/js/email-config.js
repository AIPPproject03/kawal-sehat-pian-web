import { CONFIG } from "./config.js";

export const EMAIL_CONFIG = {
  SERVICE_ID: CONFIG.GMAIL_SERVICE_ID,
  TEMPLATE_ID: CONFIG.GMAIL_TEMPLATE_ID,
  PUBLIC_KEY: CONFIG.GMAIL_PUBLIC_KEY,
  ADMIN_EMAIL: "irlawinardi@gmail.com",
};

// Initialize EmailJS
export function initEmailJS() {
  if (typeof emailjs !== "undefined") {
    emailjs.init(EMAIL_CONFIG.PUBLIC_KEY);
    console.log("✓ EmailJS initialized");
    return true;
  } else {
    console.error("✗ EmailJS not loaded");
    return false;
  }
}

// Send Email for New Consultation Request ONLY
export async function sendNewConsultationEmail(consultationData) {
  try {
    if (typeof emailjs === "undefined") {
      throw new Error("EmailJS not loaded");
    }

    const serviceType =
      consultationData.serviceType === "chat"
        ? "Chat Konsultasi"
        : "Telepon Konsultasi";

    const response = await emailjs.send(
      EMAIL_CONFIG.SERVICE_ID,
      EMAIL_CONFIG.TEMPLATE_ID,
      {
        to_email: EMAIL_CONFIG.ADMIN_EMAIL,
        to_name: "Admin Kawal Sehat Pian",
        from_name: consultationData.patientName || "Tamu",
        subject: "🆕 Permintaan Konsultasi Baru",
        message:
          `Permintaan konsultasi baru dari ${
            consultationData.patientName || "Tamu"
          }.\n\n` +
          `Layanan: ${serviceType}\n` +
          `Harga: Rp ${consultationData.price.toLocaleString("id-ID")}\n` +
          `Waktu: ${new Date().toLocaleString("id-ID")}\n\n` +
          `Silakan login ke dashboard untuk menyetujui:\n` +
          `https://kawal-sehat-pian.netlify.app/pages/admin.html`,
      }
    );

    console.log("✓ Email sent successfully:", response);
    return { success: true, response };
  } catch (error) {
    console.error("✗ Email send error:", error);
    return { success: false, error };
  }
}
