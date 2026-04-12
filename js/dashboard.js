const Dashboard = {
  init() {
    this.bindEvents();
    this.checkTheme();

    const isCollapsed = localStorage.getItem("sidebar_collapsed") === "true";
    if (isCollapsed && window.innerWidth > 768) {
      document.getElementById("sidebar").classList.add("collapsed");
    }
  },

  bindEvents() {
    const toggleBtn = document.getElementById("toggleSidebar");
    const sidebar = document.getElementById("sidebar");
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener("click", () => {
        sidebar.classList.toggle("collapsed");
        localStorage.setItem(
          "sidebar_collapsed",
          sidebar.classList.contains("collapsed"),
        );
      });
    }

    const themeBtn = document.getElementById("themeToggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        document.documentElement.classList.toggle("dark");
        const isDark = document.documentElement.classList.contains("dark");
        localStorage.setItem("theme", isDark ? "dark" : "light");
        themeBtn.textContent = isDark ? "☀️" : "🌙";
      });
    }

    const menuItems = document.querySelectorAll(".menu-item");
    menuItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        const target = e.currentTarget.getAttribute("data-target");
        this.switchModule(target);

        menuItems.forEach((i) => i.classList.remove("active"));
        e.currentTarget.classList.add("active");

        if (window.innerWidth <= 768) {
          sidebar.classList.remove("collapsed");
        }
      });
    });

    document
      .getElementById("closeModalBtn")
      .addEventListener("click", () => this.closeModal());
    document
      .getElementById("cancelModalBtn")
      .addEventListener("click", () => this.closeModal());
  },

  checkTheme() {
    const isDark = localStorage.getItem("theme") === "dark";
    if (isDark) {
      document.documentElement.classList.add("dark");
      const themeBtn = document.getElementById("themeToggle");
      if (themeBtn) themeBtn.textContent = "☀️";
    }
  },

  switchModule(targetId) {
    document.querySelectorAll(".module-view").forEach((mod) => {
      mod.classList.remove("active");
    });
    const targetView = document.getElementById("module-" + targetId);
    if (targetView) {
      targetView.classList.add("active");
      const pageTitle = document.getElementById("pageTitle");
      if (pageTitle) {
        pageTitle.textContent =
          targetId.charAt(0).toUpperCase() +
          targetId.slice(1).replace("_", " ");
      }

      const event = new CustomEvent("moduleSwitched", { detail: targetId });
      document.dispatchEvent(event);
    }
  },

  showModal(title, contentHtml, onSave) {
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalBody").innerHTML = contentHtml;
    const modal = document.getElementById("formModal");
    modal.classList.add("active");

    const saveBtn = document.getElementById("saveModalBtn");

    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

    newSaveBtn.addEventListener("click", () => {
      if (onSave()) {
        this.closeModal();
      }
    });
  },

  closeModal() {
    document.getElementById("formModal").classList.remove("active");
  },

  showToast(message, type = "success") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    let icon = type === "success" ? "✅" : "❌";
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  },
};

document.addEventListener("DOMContentLoaded", () => Dashboard.init());
