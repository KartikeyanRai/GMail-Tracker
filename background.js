
let state = {
  accessToken: null,
  user: null,
  isAuthenticated: false,
  settings: {
    enableTracking: true,
    showNotifications: true,
    showTicks: true,
  },
  trackedEmailsInterval: null,
};

const API_BASE_URL = "https://gmail-tracker-1-ia1l.onrender.com/api/emails";

let keepAliveInterval = null;
function keepServiceWorkerAlive() {
  if (!keepAliveInterval) {
    keepAliveInterval = setInterval(() => {
      chrome.runtime.getPlatformInfo(() => {});
    }, 25 * 1000);
  }
}

function withFreshToken(interactive = false) {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError || !token) {
        console.warn(
          "[Gmail Tracker] Token fetch failed:",
          chrome.runtime.lastError?.message
        );
        return resolve(null);
      }
      state.accessToken = token;
      chrome.storage.local.set({ accessToken: token });
      resolve(token);
    });
  });
}

// Sync tracked emails with backend
async function syncTrackedEmails() {
  if (!state.user?.id) return;
  console.log(
    "[Gmail Tracker] 🔄 Syncing tracked emails for user:",
    state.user.id
  );

  const token = await withFreshToken(false);
  if (!token)
    return console.warn("[Gmail Tracker]  No valid token—sync aborted");

  try {
    const res = await fetch(`${API_BASE_URL}/tracked?limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const raw = await res.text();

    if (!res.ok) throw new Error(raw);

    const json = JSON.parse(raw);
    const emails = Array.isArray(json.emails) ? json.emails : [];
    console.log("[Gmail Tracker]  Emails received:", emails.length);

    const trackedMap = {};
    emails.forEach((e) => {
      trackedMap[e.messageId] = {
        isRead: e.readCount > 0,
        readCount: e.readCount,
      };
    });


    chrome.storage.local.set(
      {
        trackedEmails: trackedMap,
        trackedEmailList: emails, 
      },
      () => {
        console.log(" Local storage updated with emails:", emails.length);
      }
    );
  } catch (e) {
    console.warn("[Gmail Tracker] syncTrackedEmails failed:", e.message);
  }
}

async function authenticate() {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        return resolve({
          success: false,
          error: chrome.runtime.lastError?.message || "Token fetch failed",
        });
      }

      try {
        const user = await getUserInfo(token);
        if (!user || !user.id) {
          console.warn("[Gmail Tracker] Invalid user object returned:", user);
          return resolve({
            success: false,
            error: "Invalid user info",
          });
        }

        state.accessToken = token;
        state.user = user;
        state.isAuthenticated = true;

        chrome.storage.local.set(
          {
            accessToken: token,
            user: { ...user, id: user.sub },
            isAuthenticated: true,
            settings: state.settings,
          },
          () => {
            console.log("[Gmail Tracker] User and token saved:", user);
          }
        );

        syncTrackedEmails();
        if (!state.trackedEmailsInterval) {
          state.trackedEmailsInterval = setInterval(
            syncTrackedEmails,
            60 * 1000
          );
        }

        resolve({ success: true, user });
      } catch (e) {
        console.error("[Gmail Tracker] Error fetching user info:", e);
        resolve({ success: false, error: e.message });
      }
    });
  });
}

async function getUserInfo(token) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("User info fetch failed");
  return res.json();
}

async function logout() {
  if (state.accessToken) {
    chrome.identity.removeCachedAuthToken({ token: state.accessToken });
  }
  chrome.storage.local.clear();
  state = {
    accessToken: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
    settings: {
      enableTracking: true,
      showNotifications: true,
      showTicks: true,
    },
    trackedEmailsInterval: null,
  };
}

async function trackEmail(data) {
  const token = await withFreshToken(false);
  const authHeader = token ? `Bearer ${token}` : null;
  if (!authHeader || !state.user?.id) {
    console.warn("[Gmail Tracker] Cannot track email: Missing auth or user");
    return { success: false, error: "Not authenticated" };
  }

  console.log(" Sending to backend:", data);
  const res = await fetch(`${API_BASE_URL}/track`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      ...data,
      userId: state.user?.id,
      sentAt: new Date(),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn("[Gmail Tracker] backend track failed:", errText);
    return { success: false, error: "Failed to track email" };
  }

  const json = await res.json();
  return { success: true, data: json };
}

async function getStats() {
  const token = await withFreshToken(false);
  if (!token) return { success: false, error: "No valid token" };

  const res = await fetch(`${API_BASE_URL}/stats`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return { success: false, error: "Failed to fetch stats" };
  return { success: true, data: await res.json() };
}

chrome.runtime.onInstalled.addListener(() => {
  console.log(" Gmail Tracker installed!");
  chrome.storage.local.set({ settings: state.settings });
  keepServiceWorkerAlive();
});

chrome.runtime.onStartup.addListener(async () => {
  const data = await new Promise((r) =>
    chrome.storage.local.get(
      ["accessToken", "user", "isAuthenticated", "settings"],
      r
    )
  );
  Object.assign(state, data);
  if (state.isAuthenticated) {
    await syncTrackedEmails();
    state.trackedEmailsInterval = setInterval(syncTrackedEmails, 60 * 1000);
  }
  keepServiceWorkerAlive();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.action === "authenticate") {
      authenticate()
        .then(sendResponse)
        .catch((err) => {
          console.warn("[Gmail Tracker] authenticate error:", err.message);
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }

    if (message.action === "logout") {
      logout()
        .then(() => sendResponse({ success: true }))
        .catch((err) => {
          console.warn("[Gmail Tracker] logout error:", err.message);
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }

    if (message.action === "checkAuth") {
      sendResponse({ authenticated: state.isAuthenticated });
      return true;
    }

    if (message.action === "trackEmail") {
      trackEmail(message.data)
        .then((res) => {
          syncTrackedEmails();
          sendResponse(res);
        })
        .catch((err) => {
          console.warn("[Gmail Tracker] trackEmail error:", err.message);
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }

    if (message.action === "getStats") {
      getStats()
        .then(sendResponse)
        .catch((err) => {
          console.warn("[Gmail Tracker] getStats error:", err.message);
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }

    if (message.action === "getSettings") {
      chrome.storage.local.get(["settings", "user"], (data) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message,
          });
          return;
        }

        const fallbackUser = state.user;
        const userFromStorage = data.user || fallbackUser;

        console.log("[Gmail Tracker] getSettings from storage:", data.user);
        console.log("[Gmail Tracker] getSettings from state:", fallbackUser);

        sendResponse({
          success: true,
          settings: data.settings || state.settings,
          user: userFromStorage || null,
        });
      });
      return true;
    }

    if (message.action === "getTrackedEmails") {
      syncTrackedEmails().finally(() => {
        chrome.storage.local.get(["trackedEmails"], (data) => {
          sendResponse({ success: true, data: data.trackedEmails || {} });
        });
      });
      return true;
    }

    if (message.action === "syncTrackedEmails") {
      syncTrackedEmails().then(sendResponse);
      return true;
    }

    return false;
  } catch (err) {
    console.warn("[Gmail Tracker] background error:", err.message);
    sendResponse({ success: false, error: err.message });
    return true;
  }
});

