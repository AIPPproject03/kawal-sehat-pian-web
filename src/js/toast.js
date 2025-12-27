/* filepath: src/js/toast.js */
/* eslint-disable no-unused-vars */
// Professional Toast Notification System (FIXED)

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

  show(message, type = "info", duration = 4000, title = null) {
    // Queue if too many
    if (this.activeToasts.length >= this.maxToasts) {
      this.queue.push({ message, type, duration, title });
      return;
    }

    const toast = this.createToast(message, type, duration, title);
    this.container.appendChild(toast);
    this.activeToasts.push(toast);

    // Trigger show animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add("show");
      });
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

    const icons = {
      success: "✓",
      error: "✕",
      warning: "⚠",
      info: "ℹ",
    };

    const titles = {
      success: title || "Berhasil",
      error: title || "Error",
      warning: title || "Peringatan",
      info: title || "Info",
    };

    toast.innerHTML = `
      <div class="toast-icon">${icons[type]}</div>
      <div class="toast-content">
        <div class="toast-title">${this.escapeHtml(titles[type])}</div>
        <div class="toast-message">${this.escapeHtml(message)}</div>
      </div>
      <button class="toast-close" aria-label="Close">×</button>
      <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
    `;

    const closeBtn = toast.querySelector(".toast-close");
    closeBtn.addEventListener("click", () => {
      this.dismiss(toast);
    });

    return toast;
  }

  dismiss(toast) {
    if (toast.dataset.timeoutId) {
      clearTimeout(parseInt(toast.dataset.timeoutId));
    }

    toast.classList.add("hide");
    toast.classList.remove("show");

    const index = this.activeToasts.indexOf(toast);
    if (index > -1) {
      this.activeToasts.splice(index, 1);
    }

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }

      // Process queue
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        this.show(next.message, next.type, next.duration, next.title);
      }
    }, 400);
  }

  dismissAll() {
    [...this.activeToasts].forEach((toast) => {
      this.dismiss(toast);
    });
    this.queue = [];
  }

  success(message, title) {
    this.show(message, "success", 3500, title);
  }

  error(message, title) {
    this.show(message, "error", 5000, title);
  }

  warning(message, title) {
    this.show(message, "warning", 4500, title);
  }

  info(message, title) {
    this.show(message, "info", 3500, title);
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Export singleton
const toast = new ToastManager();

export default toast;

// Global access
if (typeof window !== "undefined") {
  window.toast = toast;
}
