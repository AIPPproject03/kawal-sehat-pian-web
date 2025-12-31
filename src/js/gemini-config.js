// Import API keys from separate config file
import { CONFIG } from "./config.js";

// ========================================
// GOOGLE GEMINI AI CONFIGURATION
// ========================================

export const GEMINI_API_KEY = CONFIG.GEMINI_API_KEY;
export const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

// Validation
if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
  console.error("⚠️ GEMINI_API_KEY not configured! Check src/js/config.js");
}

// ========================================
// GENERATE AI SUMMARY
// ========================================

export async function generateConsultationSummary(
  messages,
  patientName,
  consultationType
) {
  try {
    const chatHistory = messages
      .filter((msg) => !msg.isSystemMessage && msg.text)
      .map((msg) => `${msg.senderName}: ${msg.text}`)
      .join("\n");

    if (chatHistory.trim().length === 0) {
      return {
        success: true,
        summary: createFallbackSummary(messages, patientName, consultationType),
        generatedAt: new Date().toISOString(),
        usedFallback: true,
      };
    }

    const prompt = `Kamu adalah asisten medis yang membantu merangkum konsultasi kesehatan.

INFORMASI KONSULTASI:
- Pasien: ${patientName}
- Jenis: ${consultationType === "chat" ? "Chat" : "Telepon"}

PERCAKAPAN:
${chatHistory}

Buatkan ringkasan dalam format berikut (gunakan teks biasa):

1. KELUHAN UTAMA
[Jelaskan keluhan pasien secara ringkas]

2. GEJALA YANG DIALAMI
[List gejala yang disebutkan]

3. SARAN BIDAN
[Rangkum saran dan nasihat dari bidan]

4. TINDAKAN YANG DISARANKAN
[Langkah yang harus dilakukan pasien]

5. CATATAN PENTING
[Hal penting yang perlu diperhatikan]

Gunakan bahasa Indonesia yang mudah dipahami. Buat ringkasan maksimal 250 kata.`;

    console.log("📡 Calling Gemini API...");

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Gemini API Error:", errorText);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Gemini API Response received");

    const summary =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      createFallbackSummary(messages, patientName, consultationType);

    return {
      success: true,
      summary: summary,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("⚠️ Generate summary error:", error);
    return {
      success: true,
      summary: createFallbackSummary(messages, patientName, consultationType),
      generatedAt: new Date().toISOString(),
      usedFallback: true,
    };
  }
}

// ========================================
// FALLBACK SUMMARY CREATOR
// ========================================

function createFallbackSummary(messages, patientName, consultationType) {
  const chatMessages = messages.filter(
    (msg) => !msg.isSystemMessage && msg.text
  );

  if (chatMessages.length === 0) {
    return (
      `RINGKASAN KONSULTASI ${consultationType.toUpperCase()}\n\n` +
      `Pasien: ${patientName}\n` +
      `Tanggal: ${new Date().toLocaleDateString("id-ID")}\n\n` +
      `Tidak ada percakapan yang tercatat.`
    );
  }

  const patientMessages = chatMessages.filter(
    (msg) => msg.senderName === patientName
  );
  const bidanMessages = chatMessages.filter(
    (msg) => msg.senderName !== patientName && msg.senderName !== "Tamu"
  );

  const keluhan =
    patientMessages.length > 0
      ? patientMessages[0].text
      : "Tidak ada keluhan spesifik";
  const saran =
    bidanMessages.length > 0
      ? bidanMessages[bidanMessages.length - 1].text
      : "Tidak ada saran tercatat";

  return (
    `RINGKASAN KONSULTASI ${consultationType.toUpperCase()}\n\n` +
    `Pasien: ${patientName}\n` +
    `Tanggal: ${new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}\n` +
    `Total Pesan: ${chatMessages.length}\n\n` +
    `1. KELUHAN UTAMA\n${keluhan}\n\n` +
    `2. GEJALA YANG DIALAMI\n` +
    `Pasien menyampaikan keluhan melalui ${chatMessages.length} pesan dalam konsultasi ini.\n\n` +
    `3. SARAN BIDAN\n${saran}\n\n` +
    `4. TINDAKAN YANG DISARANKAN\n` +
    `Pasien disarankan untuk mengikuti arahan yang diberikan oleh bidan selama konsultasi.\n\n` +
    `5. CATATAN PENTING\n` +
    `Konsultasi telah selesai. Jika ada keluhan lebih lanjut, segera hubungi kembali.\n\n` +
    `Ringkasan dibuat secara otomatis oleh sistem.`
  );
}

// ========================================
// EXPORT TO PDF
// ========================================

export async function exportSummaryToPDF(summaryData, consultationInfo) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    document.head.appendChild(script);

    script.onload = () => {
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.setTextColor(74, 144, 226);
        doc.text("Kawal Sehat Pian", 105, 15, { align: "center" });

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Ringkasan Konsultasi Kesehatan", 105, 23, {
          align: "center",
        });

        doc.setLineWidth(0.5);
        doc.setDrawColor(74, 144, 226);
        doc.line(20, 27, 190, 27);

        // Info
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(`Pasien: ${consultationInfo.patientName}`, 20, 35);
        doc.text(
          `Tanggal: ${new Date(consultationInfo.date).toLocaleDateString(
            "id-ID",
            { day: "numeric", month: "long", year: "numeric" }
          )}`,
          20,
          41
        );
        doc.text(
          `Jenis: ${
            consultationInfo.type === "chat" ? "Chat" : "Telepon"
          } Konsultasi`,
          20,
          47
        );

        doc.setLineWidth(0.3);
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 51, 190, 51);

        // Summary
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);

        const lines = doc.splitTextToSize(summaryData.summary, 170);
        let yPosition = 57;

        lines.forEach((line) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          doc.text(line, 20, yPosition);
          yPosition += 5;
        });

        // Footer
        const pageHeight = doc.internal.pageSize.height;
        doc.setLineWidth(0.3);
        doc.line(20, pageHeight - 25, 190, pageHeight - 25);

        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Dokumen dibuat otomatis oleh sistem", 105, pageHeight - 20, {
          align: "center",
        });
        doc.text(
          `Dihasilkan: ${new Date(summaryData.generatedAt).toLocaleString(
            "id-ID"
          )}`,
          105,
          pageHeight - 15,
          { align: "center" }
        );

        if (summaryData.usedFallback) {
          doc.text(
            "(Ringkasan manual - AI tidak tersedia)",
            105,
            pageHeight - 10,
            { align: "center" }
          );
        }

        // Save
        const filename = `Ringkasan-${consultationInfo.patientName.replace(
          /\s+/g,
          "-"
        )}-${Date.now()}.pdf`;
        doc.save(filename);

        resolve({ success: true, filename });
      } catch (error) {
        reject(error);
      }
    };

    script.onerror = () => reject(new Error("Failed to load jsPDF"));
  });
}
