// Authentication state
let currentUser = null;
let authToken = null;

document.addEventListener("DOMContentLoaded", () => {
  const loginContainer = document.getElementById("login-container");
  const capabilitiesWrapper = document.getElementById("capabilities-wrapper");
  const capabilitiesList = document.getElementById("capabilities-list");
  const capabilitySelect = document.getElementById("capability");
  const registerForm = document.getElementById("register-form");
  const messageDiv = document.getElementById("message");
  const loginForm = document.getElementById("login-form");
  const loginMessageDiv = document.getElementById("login-message");
  const userMenu = document.getElementById("user-menu");
  const logoutBtn = document.getElementById("logout-btn");

  // Check for stored token on page load
  const storedToken = localStorage.getItem("authToken");
  if (storedToken) {
    authToken = storedToken;
    checkAuthAndLoadUser();
  }

  // Login form handler
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok) {
        authToken = result.access_token;
        currentUser = result.user;
        localStorage.setItem("authToken", authToken);
        
        loginMessageDiv.textContent = `Welcome, ${currentUser.name}!`;
        loginMessageDiv.className = "success";
        loginMessageDiv.classList.remove("hidden");
        
        // Show capabilities, hide login
        setTimeout(() => {
          loginContainer.classList.add("hidden");
          capabilitiesWrapper.classList.remove("hidden");
          updateUserMenu();
          fetchCapabilities();
        }, 1000);
      } else {
        loginMessageDiv.textContent = result.detail || "Login failed";
        loginMessageDiv.className = "error";
        loginMessageDiv.classList.remove("hidden");
      }
    } catch (error) {
      loginMessageDiv.textContent = "Login failed. Please try again.";
      loginMessageDiv.className = "error";
      loginMessageDiv.classList.remove("hidden");
      console.error("Login error:", error);
    }
  });

  // Logout handler
  logoutBtn.addEventListener("click", () => {
    authToken = null;
    currentUser = null;
    localStorage.removeItem("authToken");
    
    loginContainer.classList.remove("hidden");
    capabilitiesWrapper.classList.add("hidden");
    userMenu.classList.add("hidden");
    
    // Clear forms
    loginForm.reset();
    registerForm.reset();
    loginMessageDiv.classList.add("hidden");
  });

  // Check authentication and load user
  async function checkAuthAndLoadUser() {
    try {
      const response = await fetch("/auth/me", {
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        currentUser = await response.json();
        loginContainer.classList.add("hidden");
        capabilitiesWrapper.classList.remove("hidden");
        updateUserMenu();
        fetchCapabilities();
      } else {
        // Token invalid, clear it
        localStorage.removeItem("authToken");
        authToken = null;
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("authToken");
      authToken = null;
    }
  }

  // Update user menu
  function updateUserMenu() {
    if (currentUser) {
      document.getElementById("user-name").textContent = currentUser.name;
      document.getElementById("user-role").textContent = currentUser.role.toUpperCase();
      document.getElementById("user-role").className = `role-badge role-${currentUser.role}`;
      userMenu.classList.remove("hidden");
    }
  }

  // Function to fetch capabilities from API
  async function fetchCapabilities() {
    try {
      const response = await fetch("/capabilities");
      const capabilities = await response.json();

      // Clear loading message
      capabilitiesList.innerHTML = "";
      capabilitySelect.innerHTML = '<option value="">-- Select a capability --</option>';

      // Populate capabilities list
      Object.entries(capabilities).forEach(([name, details]) => {
        const capabilityCard = document.createElement("div");
        capabilityCard.className = "capability-card";

        const availableCapacity = details.capacity || 0;
        const currentConsultants = details.consultants ? details.consultants.length : 0;

        // Create consultants HTML with delete icons (only for admins)
        const consultantsHTML =
          details.consultants && details.consultants.length > 0
            ? `<div class="consultants-section">
              <h5>Registered Consultants:</h5>
              <ul class="consultants-list">
                ${details.consultants
                  .map(
                    (email) =>
                      `<li>
                        <span class="consultant-email">${email}</span>
                        ${currentUser && currentUser.role === "admin" 
                          ? `<button class="delete-btn" data-capability="${name}" data-email="${email}">❌</button>`
                          : ''
                        }
                      </li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No consultants registered yet</em></p>`;

        capabilityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Practice Area:</strong> ${details.practice_area}</p>
          <p><strong>Industry Verticals:</strong> ${details.industry_verticals ? details.industry_verticals.join(', ') : 'Not specified'}</p>
          <p><strong>Capacity:</strong> ${availableCapacity} hours/week available</p>
          <p><strong>Current Team:</strong> ${currentConsultants} consultants</p>
          <div class="consultants-container">
            ${consultantsHTML}
          </div>
        `;

        capabilitiesList.appendChild(capabilityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        capabilitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons (admin only)
      if (currentUser && currentUser.role === "admin") {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      capabilitiesList.innerHTML =
        "<p>Failed to load capabilities. Please try again later.</p>";
      console.error("Error fetching capabilities:", error);
    }
  }

  // Handle unregister functionality (admin only)
  async function handleUnregister(event) {
    const button = event.target;
    const capability = button.getAttribute("data-capability");
    const email = button.getAttribute("data-email");

    if (!confirm(`Are you sure you want to unregister ${email} from ${capability}?`)) {
      return;
    }

    try {
      const response = await fetch(
        `/capabilities/${encodeURIComponent(capability)}/unregister`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            email: email,
            capability_name: capability
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");

        // Refresh capabilities list to show updated consultants
        fetchCapabilities();

        // Hide message after 3 seconds
        setTimeout(() => {
          messageDiv.classList.add("hidden");
        }, 3000);
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
      }
    } catch (error) {
      messageDiv.textContent = "Failed to unregister consultant";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Register form submission
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const capability = document.getElementById("capability").value;

    // Pre-fill with current user's email if consultant
    if (currentUser && currentUser.role === "consultant") {
      document.getElementById("email").value = currentUser.email;
    }

    try {
      const response = await fetch(
        `/capabilities/${encodeURIComponent(capability)}/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            email: email,
            capability_name: capability
          }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        messageDiv.classList.remove("hidden");

        // Clear form
        registerForm.reset();

        // Refresh capabilities list
        fetchCapabilities();

        // Hide message after 3 seconds
        setTimeout(() => {
          messageDiv.classList.add("hidden");
        }, 3000);
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
      }
    } catch (error) {
      messageDiv.textContent = "Failed to register for capability";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error registering:", error);
    }
  });
});
