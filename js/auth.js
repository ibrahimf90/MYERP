document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const usernameInput = document.getElementById("username").value;
      localStorage.setItem("erp_logged_in", "true");
      localStorage.setItem("erp_user", usernameInput);
      window.location.href = "dashboard.html";
    });
  }

  const isDashboard = window.location.pathname.includes("dashboard.html");
  const isLoggedIn = localStorage.getItem("erp_logged_in") === "true";

  if (!isLoggedIn && isDashboard) {
    window.location.href = "login.html";
  }

  if (isDashboard && isLoggedIn) {
    const usernameDisplay = document.getElementById("userNameDisplay");
    const userInitial = document.querySelector(".topbar-right div");
    const loggedUser = localStorage.getItem("erp_user") || "Admin";

    if (usernameDisplay) {
      usernameDisplay.textContent = loggedUser.split("@")[0];
    }
    if (userInitial && loggedUser) {
      userInitial.textContent = loggedUser.charAt(0).toUpperCase();
    }
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("erp_logged_in");
      localStorage.removeItem("erp_user");
      window.location.href = "login.html";
    });
  }
});
