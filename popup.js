class GmailTrackerPopup {
  constructor() {
    this.isAuthenticated = false;
    this.user = null;
    this.stats = { sent: 0, read: 0, readRate: 0 };
    this.settings = {
      enableTracking: true,
      showNotifications: true,
      showTicks: true,
    };

    this.init();
  }

  async init() {
    await this.loadStoredData();
    this.setupEventListeners();
    this.checkAuthStatus();
    this.updateUI();
  }

  async loadStoredData() {
    try {
      const data = await chrome.storage.local.get([
        "user",
        "isAuthenticated",
        "settings",
        "stats",
      ]);
      this.isAuthenticated = data.isAuthenticated || false;
      this.user = data.user || null;
      this.stats = data.stats || { sent: 0, read: 0, readRate: 0 };
      this.settings = data.settings || this.settings;
    } catch (error) {
      console.error("Error loading stored data:", error);
    }
  }

  setupEventListeners() {
    document
      .getElementById("loginBtn")
      ?.addEventListener("click", () => this.handleLogin());
    document
      .getElementById("logoutBtn")
      ?.addEventListener("click", () => this.handleLogout());

    ["enableTracking", "showNotifications", "showTicks"].forEach((setting) => {
      const checkbox = document.getElementById(setting);
      if (checkbox) {
        checkbox.addEventListener("change", (e) => {
          this.updateSetting(setting, e.target.checked);
        });
      }
    });

    chrome.storage.onChanged.addListener((changes) =>
      this.handleStorageChange(changes)
    );
  }

  async handleLogin() {
    const loginBtn = document.getElementById("loginBtn");
    if (!loginBtn) return;

    try {
      loginBtn.textContent = "Signing in...";
      loginBtn.disabled = true;

      const response = await chrome.runtime.sendMessage({
        action: "authenticate",
      });
      if (response.success) {
        this.isAuthenticated = true;
        this.user = response.user;
        await chrome.storage.local.set({
          isAuthenticated: true,
          user: this.user,
        });

        await this.fetchAndStoreStats();

        this.updateUI();
        this.showNotification("Successfully signed in!", "success");
      } else {
        throw new Error(response.error || "Authentication failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      this.showNotification("Sign in failed. Please try again.", "error");
    } finally {
      loginBtn.textContent = "Sign in with Google";
      loginBtn.disabled = false;
    }
  }

  async handleLogout() {
    try {
      await chrome.runtime.sendMessage({ action: "logout" });
      this.isAuthenticated = false;
      this.user = null;
      await chrome.storage.local.clear();
      this.updateUI();
      this.showNotification("Successfully signed out!", "success");
    } catch (error) {
      console.error("Logout error:", error);
      this.showNotification("Sign out failed. Please try again.", "error");
    }
  }

  async updateSetting(key, value) {
    try {
      this.settings[key] = value;
      await chrome.storage.local.set({ settings: this.settings });

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        if (activeTab?.url.includes("mail.google.com")) {
          chrome.tabs.sendMessage(activeTab.id, {
            action: "settingsChanged",
            settings: this.settings,
          });
        }
      });
    } catch (error) {
      console.error("Error updating setting:", error);
    }
  }

  checkAuthStatus() {
    chrome.runtime.sendMessage({ action: "checkAuth" }, (response) => {
      if (!response?.authenticated) {
        this.isAuthenticated = false;
        this.user = null;
        this.updateUI();
      }
    });
  }

  async fetchAndStoreStats() {
    try {
      const res = await chrome.runtime.sendMessage({ action: "getStats" });
      if (res.success && res.data) {
        this.stats = res.data;
        await chrome.storage.local.set({ stats: res.data });
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err.message);
    }
  }

  updateUI() {
    const authSection = document.getElementById("authSection");
    const dashboard = document.getElementById("dashboard");

    if (this.isAuthenticated && this.user) {
      if (authSection) authSection.style.display = "none";
      if (dashboard) dashboard.style.display = "block";

      const userNameEl = document.getElementById("userName");
      const userEmailEl = document.getElementById("userEmail");
      if (userNameEl) userNameEl.textContent = this.user.name || "User";
      if (userEmailEl) userEmailEl.textContent = this.user.email || "";

      ["enableTracking", "showNotifications", "showTicks"].forEach(
        (setting) => {
          const checkbox = document.getElementById(setting);
          if (checkbox) checkbox.checked = this.settings[setting];
        }
      );

      this.loadRecentActivity();
      this.renderTrackedEmailTable();
    } else {
      if (authSection) authSection.style.display = "block";
      if (dashboard) dashboard.style.display = "none";
    }
  }

  async renderTrackedEmailTable() {
    try {
      const { trackedEmailList = [] } = await chrome.storage.local.get(
        "trackedEmailList"
      );
      const container = document.getElementById("trackedEmailTable");
      if (!container) return;

      if (trackedEmailList.length === 0) {
        container.innerHTML = `
        <div style="
          background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); 
          border: 2px solid #d1fae5; 
          border-radius: 12px; 
          padding: 2rem; 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          color: #065f46;
          text-align: center;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        ">
          <div style="font-size: 2.5rem; margin-bottom: 1rem;">📭</div>
          <h3 style="margin: 0 0 0.5rem 0; font-weight: 600; font-size: 1.2rem; color: #065f46;">No Tracked Emails</h3>
          <p style="margin: 0; color: #6b7280; font-size: 0.95rem;">Start sending emails to see tracking data here!</p>
        </div>`;
        return;
      }

      container.innerHTML = `
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
        border: 2px solid #d1fae5; border-radius: 12px; padding: 1.25rem;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #065f46; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);">
        <h3 style="margin: 0 0 1rem 0; font-weight: 600; font-size: 1.2rem;
          border-bottom: 2px solid #d1fae5; padding-bottom: 0.75rem;
          color: #065f46; display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 1.3rem;">📊</span> Tracked Emails
        </h3>
        <div style="max-height: 250px; overflow-y: auto; border-radius: 8px;
          background: white; border: 1px solid #d1fae5;">
          <table style="width: 100%; font-size: 0.85rem; border-collapse: collapse; background: white;">
            <thead>
              <tr style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
                color: #065f46; position: sticky; top: 0; z-index: 1;">
                <th style="padding: 12px 10px; border-bottom: 2px solid #d1fae5;
                  text-align: left; font-weight: 600; font-size: 0.8rem;
                  text-transform: uppercase; letter-spacing: 0.5px;">Subject</th>
                <th style="padding: 12px 10px; border-bottom: 2px solid #d1fae5;
                  text-align: left; font-weight: 600; font-size: 0.8rem;
                  text-transform: uppercase; letter-spacing: 0.5px;">To</th>
                <th style="padding: 12px 10px; border-bottom: 2px solid #d1fae5;
                  text-align: left; font-weight: 600; font-size: 0.8rem;
                  text-transform: uppercase; letter-spacing: 0.5px;">Sent At</th>
                <th style="padding: 12px 10px; border-bottom: 2px solid #d1fae5;
                  text-align: left; font-weight: 600; font-size: 0.8rem;
                  text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${trackedEmailList
                .map(
                  (email, index) => `
                <tr class="tracked-email-row" data-index="${index}" style="
                  transition: background-color 0.2s ease;
                  ${
                    index % 2 === 0
                      ? "background-color: #fafafa;"
                      : "background-color: white;"
                  }">
                  <td style="padding: 12px 10px; border-bottom: 1px solid #e0f2f1;
                    color: #065f46; font-weight: 500; max-width: 120px;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                    title="${email.subject || "—"}">${email.subject || "—"}</td>
                  <td style="padding: 12px 10px; border-bottom: 1px solid #e0f2f1;
                    color: #374151; font-size: 0.8rem; max-width: 100px;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                    title="${(email.to || []).join(", ")}">${(
                    email.to || []
                  ).join(", ")}</td>
                  <td style="padding: 12px 10px; border-bottom: 1px solid #e0f2f1;
                    color: #6b7280; font-size: 0.8rem; white-space: nowrap;">
                    ${this.formatDate(email.sentAt)}</td>
                  <td style="padding: 12px 10px; border-bottom: 1px solid #e0f2f1;
                    font-weight: 600; font-size: 0.85rem;">
                    <span style="display: inline-flex; align-items: center; gap: 0.25rem;
                      padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.8rem;
                      ${
                        email.readCount > 0
                          ? "background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0;"
                          : "background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;"
                      }">
                      ${email.readCount > 0 ? "✅ Read" : "📤 Sent"}
                    </span>
                  </td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>`;

      // ✅ Add hover effect via JS (safe under CSP)
      const rows = container.querySelectorAll(".tracked-email-row");
      rows.forEach((tr, index) => {
        tr.addEventListener("mouseover", () => {
          tr.style.backgroundColor = "#f0fdf4";
        });
        tr.addEventListener("mouseout", () => {
          tr.style.backgroundColor = index % 2 === 0 ? "#fafafa" : "white";
        });
      });
    } catch (e) {
      console.error("Failed to render tracked email table:", e);
    }
  }

  // async renderTrackedEmailTable() {
  //   try {
  //     const { trackedEmailList = [] } = await chrome.storage.local.get(
  //       "trackedEmailList"
  //     );
  //     const container = document.getElementById("trackedEmailTable");
  //     if (!container) return;

  //     if (trackedEmailList.length === 0) {
  //       container.innerHTML = `
  //       <div style="
  //         background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  //         border: 2px solid #d1fae5;
  //         border-radius: 12px;
  //         padding: 2rem;
  //         font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  //         color: #065f46;
  //         text-align: center;
  //         box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  //       ">
  //         <div style="font-size: 2.5rem; margin-bottom: 1rem;">📭</div>
  //         <h3 style="margin: 0 0 0.5rem 0; font-weight: 600; font-size: 1.2rem; color: #065f46;">No Tracked Emails</h3>
  //         <p style="margin: 0; color: #6b7280; font-size: 0.95rem;">Start sending emails to see tracking data here!</p>
  //       </div>`;
  //       return;
  //     }

  //     container.innerHTML = `
  //     <div style="
  //       background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  //       border: 2px solid #d1fae5;
  //       border-radius: 12px;
  //       padding: 1.25rem;
  //       font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  //       color: #065f46;
  //       box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  //     ">
  //       <h3 style="
  //         margin: 0 0 1rem 0;
  //         font-weight: 600;
  //         font-size: 1.2rem;
  //         border-bottom: 2px solid #d1fae5;
  //         padding-bottom: 0.75rem;
  //         color: #065f46;
  //         display: flex;
  //         align-items: center;
  //         gap: 0.5rem;
  //       ">
  //         <span style="font-size: 1.3rem;">📊</span>
  //         Tracked Emails
  //       </h3>
  //       <div style="
  //         max-height: 250px;
  //         overflow-y: auto;
  //         border-radius: 8px;
  //         background: white;
  //         border: 1px solid #d1fae5;
  //       ">
  //         <table style="
  //           width: 100%;
  //           font-size: 0.85rem;
  //           border-collapse: collapse;
  //           background: white;
  //         ">
  //           <thead>
  //             <tr style="
  //               background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  //               color: #065f46;
  //               position: sticky;
  //               top: 0;
  //               z-index: 1;
  //             ">
  //               <th style="
  //                 padding: 12px 10px;
  //                 border-bottom: 2px solid #d1fae5;
  //                 text-align: left;
  //                 font-weight: 600;
  //                 font-size: 0.8rem;
  //                 text-transform: uppercase;
  //                 letter-spacing: 0.5px;
  //               ">Subject</th>
  //               <th style="
  //                 padding: 12px 10px;
  //                 border-bottom: 2px solid #d1fae5;
  //                 text-align: left;
  //                 font-weight: 600;
  //                 font-size: 0.8rem;
  //                 text-transform: uppercase;
  //                 letter-spacing: 0.5px;
  //               ">To</th>
  //               <th style="
  //                 padding: 12px 10px;
  //                 border-bottom: 2px solid #d1fae5;
  //                 text-align: left;
  //                 font-weight: 600;
  //                 font-size: 0.8rem;
  //                 text-transform: uppercase;
  //                 letter-spacing: 0.5px;
  //               ">Sent At</th>
  //               <th style="
  //                 padding: 12px 10px;
  //                 border-bottom: 2px solid #d1fae5;
  //                 text-align: left;
  //                 font-weight: 600;
  //                 font-size: 0.8rem;
  //                 text-transform: uppercase;
  //                 letter-spacing: 0.5px;
  //               ">Status</th>
  //             </tr>
  //           </thead>
  //           <tbody>
  //             ${trackedEmailList
  //               .map(
  //                 (email, index) => `
  //                   <tr style="
  //                     transition: background-color 0.2s ease;
  //                     ${index % 2 === 0 ? 'background-color: #fafafa;' : 'background-color: white;'}
  //                   "
  //                   onmouseover="this.style.backgroundColor='#f0fdf4'"
  //                   onmouseout="this.style.backgroundColor='${index % 2 === 0 ? '#fafafa' : 'white'}'">
  //                     <td style="
  //                       padding: 12px 10px;
  //                       border-bottom: 1px solid #e0f2f1;
  //                       color: #065f46;
  //                       font-weight: 500;
  //                       max-width: 120px;
  //                       overflow: hidden;
  //                       text-overflow: ellipsis;
  //                       white-space: nowrap;
  //                     " title="${email.subject || '—'}">${
  //                   email.subject || "—"
  //                 }</td>
  //                     <td style="
  //                       padding: 12px 10px;
  //                       border-bottom: 1px solid #e0f2f1;
  //                       color: #374151;
  //                       font-size: 0.8rem;
  //                       max-width: 100px;
  //                       overflow: hidden;
  //                       text-overflow: ellipsis;
  //                       white-space: nowrap;
  //                     " title="${(email.to || []).join(", ")}">${(
  //                   email.to || []
  //                 ).join(", ")}</td>
  //                     <td style="
  //                       padding: 12px 10px;
  //                       border-bottom: 1px solid #e0f2f1;
  //                       color: #6b7280;
  //                       font-size: 0.8rem;
  //                       white-space: nowrap;
  //                     ">${this.formatDate(email.sentAt)}</td>
  //                     <td style="
  //                       padding: 12px 10px;
  //                       border-bottom: 1px solid #e0f2f1;
  //                       font-weight: 600;
  //                       font-size: 0.85rem;
  //                     ">
  //                       <span style="
  //                         display: inline-flex;
  //                         align-items: center;
  //                         gap: 0.25rem;
  //                         padding: 0.25rem 0.5rem;
  //                         border-radius: 6px;
  //                         font-size: 0.8rem;
  //                         ${email.readCount > 0
  //                           ? 'background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0;'
  //                           : 'background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;'
  //                         }
  //                       ">
  //                         ${email.readCount > 0 ? "✅ Read" : "📤 Sent"}
  //                       </span>
  //                     </td>
  //                   </tr>
  //                 `
  //               )
  //               .join("")}
  //           </tbody>
  //         </table>
  //       </div>
  //     </div>
  //     `;
  //   } catch (e) {
  //     console.error("Failed to render tracked email table:", e);
  //   }
  // }

  formatDate(dateStr) {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  }

  async loadRecentActivity() {
    try {
      const data = await chrome.storage.local.get(["recentActivity"]);
      const activities = data.recentActivity || [];
      const activityList = document.getElementById("activityList");

      if (!activityList) return;

      activityList.innerHTML =
        activities.length === 0
          ? '<div class="activity-item"><div class="activity-icon">📤</div><div class="activity-text">No recent activity</div><div class="activity-time">--</div></div>'
          : activities
              .slice(0, 5)
              .map(
                (a) => `
                    <div class="activity-item">
                        <div class="activity-icon">${
                          a.type === "sent" ? "📤" : "👁️"
                        }</div>
                        <div class="activity-text">${a.subject || "Email"} ${
                  a.type === "sent" ? "sent" : "read"
                }</div>
                        <div class="activity-time">${this.formatTime(
                          a.timestamp
                        )}</div>
                    </div>`
              )
              .join("");
    } catch (error) {
      console.error("Error loading recent activity:", error);
    }
  }

  formatTime(timestamp) {
    const now = Date.now();
    const diff = now - new Date(timestamp);
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  handleStorageChange(changes) {
    if (changes.stats?.newValue) {
      this.stats = changes.stats.newValue;
      this.updateUI();
    }
    if (changes.recentActivity) {
      this.loadRecentActivity();
    }
    if (changes.isAuthenticated && !changes.isAuthenticated.newValue) {
      this.isAuthenticated = false;
      this.user = null;
      this.updateUI();
    }
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  }
}

document.addEventListener("DOMContentLoaded", () => new GmailTrackerPopup());
window.addEventListener("beforeunload", () => {
  chrome.runtime.sendMessage({ action: "popupClosed" });
});
