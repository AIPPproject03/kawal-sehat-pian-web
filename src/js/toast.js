/* filepath: src/js/toast.js */
/* eslint-disable no-unused-vars */
// Minimalist Professional Toast Notification System

class ToastManager {
  constructor() {
    this.container = null;
    this.activeToasts = [];
    this.queue = [];
    this.maxToasts = 3;
    this.init();
  }

  init() {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }
    this.container = container;
  }

  show(message, type = "info", duration = 3500, title = null) {
    // Queue management
    if (this.activeToasts.length >= this.maxToasts) {
      this.queue.push({ message, type, duration, title });
      return;
    }

    const toast = this.createToast(message, type, duration, title);
    this.container.appendChild(toast);
    this.activeToasts.push(toast);

    // Trigger show animation
    requestAnimationFrame(() => {
      toast.classList.add("show");
    });

    // Auto dismiss
    const timeoutId = setTimeout(() => {
      this.dismiss(toast);
    }, duration);

    toast.dataset.timeoutId = timeoutId;
  }

  createToast(message, type, duration, title) {
    const toast = document.createElement("div");
    toast.className = `toast-notification ${type}`;

    // Minimalist icons
    const icons = {
      success: "✓",
      error: "✕",
      warning: "!",
      info: "i",
    };

    // Default titles
    const titles = {
      success: title || "Berhasil",
      error: title || "Error",
      warning: title || "Perhatian",
      info: title || "Info",
    };

    // Build HTML
    toast.innerHTML = `
      <div class="toast-icon">${icons[type]}</div>
      <div class="toast-content">
        <div class="toast-title">${this.escapeHtml(titles[type])}</div>
        <div class="toast-message">${this.escapeHtml(message)}</div>
      </div>
      <button class="toast-close" aria-label="Close">×</button>
      <div class="toast-progress" style="animation: toastProgress ${duration}ms linear"></div>
    `;

    // Close button handler
    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.addEventListener("click", () => {
      this.dismiss(toast);
    });

    return toast;
  }

  dismiss(toast) {
    // Clear timeout
    if (toast.dataset.timeoutId) {
      clearTimeout(parseInt(toast.dataset.timeoutId));
    }

    // Hide animation
    toast.classList.add("hide");
    toast.classList.remove("show");

    // Remove from active list
    const index = this.activeToasts.indexOf(toast);
    if (index > -1) {
      this.activeToasts.splice(index, 1);
    }

    // Remove from DOM
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }

      // Process queue
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        this.show(next.message, next.type, next.duration, next.title);
      }
    }, 300);
  }

  dismissAll() {
    [...this.activeToasts].forEach((toast) => {
      this.dismiss(toast);
    });
    this.queue = [];
  }

  // Shorthand methods
  success(message, title) {
    this.show(message, "success", 3000, title);
  }

  error(message, title) {
    this.show(message, "error", 4500, title);
  }

  warning(message, title) {
    this.show(message, "warning", 4000, title);
  }

  info(message, title) {
    this.show(message, "info", 3000, title);
  }

  // HTML escape utility
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create singleton instance
const toast = new ToastManager();

// Export for modules
export default toast;

// Global access
if (typeof window !== "undefined") {
  window.toast = toast;
}
