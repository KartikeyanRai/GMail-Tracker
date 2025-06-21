// // background.js
// class GmailTrackerBackground {
//   constructor() {
//     this.accessToken = null;
//     this.refreshToken = null;
//     this.user = null;
//     this.isAuthenticated = false;

//     this.API_BASE_URL = 'http://localhost:5000/api/emails';
//     this.API_CONFIG = {
//       headers: {
//         'Content-Type': 'application/json'
//       }
//     };

//     this.init();
//   }

//   init() {
//     this.setupMessageListeners();
//     this.setupAlarms();
//     this.loadStoredAuth();
//   }

//   getApiHeaders() {
//     const headers = { ...this.API_CONFIG.headers };
//     if (this.user?.id) {
//       headers.Authorization = this.user.id;
//     }
//     return headers;
//   }

//   async loadStoredAuth() {
//     try {
//       const data = await chrome.storage.local.get([
//         'accessToken', 'refreshToken', 'user', 'isAuthenticated'
//       ]);

//       this.accessToken = data.accessToken;
//       this.refreshToken = data.refreshToken;
//       this.user = data.user;
//       this.isAuthenticated = data.isAuthenticated || false;

//       if (this.isAuthenticated && this.accessToken) {
//         await this.validateToken();
//       }
//     } catch (error) {
//       console.error('Error loading stored auth:', error);
//     }
//   }

//   setupMessageListeners() {
//     chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//       this.handleMessage(message, sender, sendResponse);
//       return true;
//     });

//     chrome.runtime.onInstalled.addListener((details) => {
//       if (details.reason === 'install') {
//         this.handleInstall();
//       }
//     });

//     chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//       if (
//         changeInfo.status === 'complete' &&
//         tab.url?.includes('mail.google.com')
//       ) {
//         this.injectTracker(tabId);
//       }
//     });
//   }

//   async handleMessage(message, sender, sendResponse) {
//     try {
//       switch (message.action) {
//         case 'authenticate':
//           sendResponse(await this.authenticate());
//           break;
//         case 'logout':
//           await this.logout();
//           sendResponse({ success: true });
//           break;
//         case 'checkAuth':
//           sendResponse({ authenticated: this.isAuthenticated });
//           break;
//         case 'getAccessToken':
//           sendResponse(this.accessToken ? { token: this.accessToken } : { error: 'No access token' });
//           break;
//         case 'trackEmail':
//           sendResponse(await this.trackEmail(message.data));
//           break;
//         case 'emailRead':
//           sendResponse(await this.handleEmailRead(message.data));
//           break;
//         case 'getStats':
//           sendResponse(await this.getStatsFromBackend());
//           break;
//         case 'getTrackedEmails':
//           sendResponse(await this.getTrackedEmailsFromBackend());
//           break;
//         case 'popupClosed':
//           sendResponse({ success: true });
//           break;
//         default:
//           sendResponse({ error: 'Unknown action' });
//       }
//     } catch (error) {
//       console.error('handleMessage error:', error);
//       sendResponse({ error: error.message });
//     }
//   }

//   authenticate() {
//     return new Promise((resolve) => {
//       chrome.identity.getAuthToken({ interactive: true }, async (token) => {
//         if (chrome.runtime.lastError || !token) {
//           return resolve({ success: false, error: chrome.runtime.lastError?.message || 'Token fetch failed' });
//         }

//         this.accessToken = token;
//         try {
//           this.user = await this.getUserInfo(token);
//           this.isAuthenticated = true;

//           await chrome.storage.local.set({
//             accessToken: token,
//             user: this.user,
//             isAuthenticated: true
//           });

//           resolve({ success: true, user: this.user });
//         } catch (error) {
//           resolve({ success: false, error: error.message });
//         }
//       });
//     });
//   }

//   async getUserInfo(token) {
//     const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
//       headers: { Authorization: `Bearer ${token}` }
//     });

//     if (!res.ok) throw new Error('Failed to fetch user info');
//     return await res.json();
//   }

//   async logout() {
//     try {
//       if (this.accessToken) {
//         await chrome.identity.removeCachedAuthToken({ token: this.accessToken });
//       }
//       await chrome.storage.local.clear();
//       this.accessToken = null;
//       this.user = null;
//       this.isAuthenticated = false;
//     } catch (e) {
//       console.error('Logout error:', e);
//     }
//   }

//   async validateToken() {
//     try {
//       const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${this.accessToken}`);
//       if (!res.ok) throw new Error('Token invalid');
//     } catch (e) {
//       console.warn('Token validation failed:', e);
//       this.isAuthenticated = false;
//       await chrome.storage.local.set({ isAuthenticated: false });
//     }
//   }

//   async trackEmail(emailData) {
//     try {
//       const response = await fetch(`${this.API_BASE_URL}/track`, {
//         method: 'POST',
//         headers: this.getApiHeaders(),
//         body: JSON.stringify({
//           ...emailData,
//           userId: this.user.id,
//           sentAt: new Date()
//         })
//       });
//       if (!response.ok) throw new Error('Track failed');

//       const result = await response.json();
//       await this.storeEmailLocally(emailData);

//       const settings = await chrome.storage.local.get('settings');
//       if (settings.settings?.showNotifications) {
//         this.showNotification('Email Tracked', `Subject: ${emailData.subject}`);
//       }
//       return { success: true, data: result };
//     } catch (err) {
//       return { success: false, error: err.message };
//     }
//   }

//   async handleEmailRead({ messageId }) {
//     try {
//       const response = await fetch(`${this.API_BASE_URL}/read/${messageId}`, {
//         method: 'PUT',
//         headers: this.getApiHeaders(),
//         body: JSON.stringify({ readAt: new Date() })
//       });
//       if (!response.ok) throw new Error('Read update failed');

//       await this.updateLocalReadStatus(messageId);
//       return { success: true };
//     } catch (err) {
//       return { success: false, error: err.message };
//     }
//   }

//   async getStatsFromBackend() {
//     try {
//       const res = await fetch(`${this.API_BASE_URL}/stats`, { headers: this.getApiHeaders() });
//       if (!res.ok) throw new Error('Stats fetch failed');

//       const data = await res.json();
//       await chrome.storage.local.set({
//         cachedStats: data.stats,
//         cachedRecentActivity: data.recentActivity
//       });
//       return { success: true, data };
//     } catch (e) {
//       console.error('Stats error:', e);
//       return { success: false, error: e.message };
//     }
//   }

//   async getTrackedEmailsFromBackend() {
//     try {
//       const res = await fetch(`${this.API_BASE_URL}/tracked`, { headers: this.getApiHeaders() });
//       if (!res.ok) throw new Error('Tracked fetch failed');
//       return { success: true, data: await res.json() };
//     } catch (e) {
//       return { success: false, error: e.message };
//     }
//   }

//   async storeEmailLocally(emailData) {
//     const data = await chrome.storage.local.get(['trackedEmails']);
//     const trackedEmails = data.trackedEmails || {};
//     trackedEmails[emailData.messageId] = { ...emailData, isRead: false, storedAt: Date.now() };
//     await chrome.storage.local.set({ trackedEmails });
//   }

//   async updateLocalReadStatus(messageId) {
//     const data = await chrome.storage.local.get(['trackedEmails']);
//     const trackedEmails = data.trackedEmails || {};
//     if (trackedEmails[messageId]) {
//       trackedEmails[messageId].isRead = true;
//       trackedEmails[messageId].readTime = Date.now();
//       await chrome.storage.local.set({ trackedEmails });
//     }
//   }

//   setupAlarms() {
//     chrome.alarms.create('syncWithBackend', { periodInMinutes: 30 });
//     chrome.alarms.onAlarm.addListener((alarm) => {
//       if (alarm.name === 'syncWithBackend') {
//         this.syncWithBackend();
//       }
//     });
//   }

//   async syncWithBackend() {
//     if (this.isAuthenticated) {
//       await this.getStatsFromBackend();
//     }
//   }

//   async injectTracker(tabId) {
//     try {
//       chrome.tabs.sendMessage(tabId, {
//         action: 'initializeTracker',
//         user: this.user,
//         apiBaseUrl: this.API_BASE_URL
//       });
//     } catch (e) {
//       console.error('Inject tracker error:', e);
//     }
//   }

//   showNotification(title, message) {
//     chrome.notifications.create({
//       type: 'basic',
//       iconUrl: 'icons/icon48.png',
//       title,
//       message
//     });
//   }

//   handleInstall() {
//     chrome.storage.local.set({
//       settings: {
//         enableTracking: true,
//         showNotifications: true,
//         showTicks: true
//       }
//     });
//   }
// }

// new GmailTrackerBackground();

// let state = {
//   accessToken: null,
//   refreshToken: null,
//   user: null,
//   isAuthenticated: false
// };

// const API_BASE_URL = 'http://localhost:5000/api/emails';

// chrome.runtime.onInstalled.addListener(() => {
//   console.log('✅ Gmail Tracker installed!');
//   chrome.storage.local.set({
//     settings: {
//       enableTracking: true,
//       showNotifications: true,
//       showTicks: true
//     }
//   });
// });

// // Restore authentication on startup
// chrome.runtime.onStartup.addListener(() => {
//   chrome.storage.local.get(['accessToken', 'refreshToken', 'user', 'isAuthenticated'], (data) => {
//     state = { ...state, ...data };
//     if (state.accessToken && state.isAuthenticated) {
//       validateToken(state.accessToken);
//     }
//   });
// });

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === 'authenticate') {
//     authenticate().then(sendResponse);
//   } else if (message.action === 'logout') {
//     logout().then(() => sendResponse({ success: true }));
//   } else if (message.action === 'checkAuth') {
//     sendResponse({ authenticated: state.isAuthenticated });
//   } else if (message.action === 'trackEmail') {
//     trackEmail(message.data).then(sendResponse);
//   } else if (message.action === 'getStats') {
//     getStats().then(sendResponse);
//   }
//   return true;
// });

// async function authenticate() {
//   return new Promise((resolve) => {
//     chrome.identity.getAuthToken({ interactive: true }, async (token) => {
//       if (chrome.runtime.lastError || !token) {
//         return resolve({ success: false, error: chrome.runtime.lastError?.message || 'Token fetch failed' });
//       }

//       try {
//         const user = await getUserInfo(token);
//         state.accessToken = token;
//         state.user = user;
//         state.isAuthenticated = true;

//         chrome.storage.local.set({
//           accessToken: token,
//           user: user,
//           isAuthenticated: true
//         });

//         resolve({ success: true, user });
//       } catch (e) {
//         resolve({ success: false, error: e.message });
//       }
//     });
//   });
// }

// async function getUserInfo(token) {
//   const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
//     headers: { Authorization: `Bearer ${token}` }
//   });
//   if (!res.ok) throw new Error('User info fetch failed');
//   return res.json();
// }

// async function validateToken(token) {
//   const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
//   if (!res.ok) {
//     state.isAuthenticated = false;
//     chrome.storage.local.set({ isAuthenticated: false });
//   }
// }

// async function logout() {
//   if (state.accessToken) {
//     chrome.identity.removeCachedAuthToken({ token: state.accessToken });
//   }
//   chrome.storage.local.clear();
//   state = {
//     accessToken: null,
//     refreshToken: null,
//     user: null,
//     isAuthenticated: false
//   };
// }

// async function trackEmail(data) {
//   const headers = {
//     'Content-Type': 'application/json',
//     Authorization: state.user?.id || 'test-user-123'
//   };

//   const res = await fetch(`${API_BASE_URL}/track`, {
//     method: 'POST',
//     headers,
//     body: JSON.stringify({
//       ...data,
//       userId: state.user?.id,
//       sentAt: new Date()
//     })
//   });

//   if (!res.ok) return { success: false, error: 'Failed to track email' };
//   const json = await res.json();
//   return { success: true, data: json };
// }

// async function getStats() {
//   const res = await fetch(`${API_BASE_URL}/stats`, {
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: state.user?.id
//     }
//   });
//   if (!res.ok) return { success: false, error: 'Failed to fetch stats' };
//   return { success: true, data: await res.json() };
// }

//................................
// === FINAL background.js (Gmail Tracker Backend Logic) ===

let state = {
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false
};

// const API_BASE_URL = "http://localhost:5000/api/emails";
const API_BASE_URL = "https://gmail-tracker-1-ia1l.onrender.com/api/emails";


chrome.runtime.onInstalled.addListener(() => {
  console.log("✅ Gmail Tracker installed!");
  chrome.storage.local.set({
    settings: {
      enableTracking: true,
      showNotifications: true,
      showTicks: true
    }
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get([
    "accessToken",
    "refreshToken",
    "user",
    "isAuthenticated"
  ], (data) => {
    state = { ...state, ...data };
    if (state.accessToken && state.isAuthenticated) {
      validateToken(state.accessToken);
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "authenticate") {
    authenticate().then(sendResponse);
  } else if (message.action === "logout") {
    logout().then(() => sendResponse({ success: true }));
  } else if (message.action === "checkAuth") {
    sendResponse({ authenticated: state.isAuthenticated });
  } else if (message.action === "trackEmail") {
    trackEmail(message.data).then(sendResponse);
  } else if (message.action === "getStats") {
    getStats().then(sendResponse);
  } else if (message.action === "getSettings") {
    chrome.storage.local.get(["settings", "user"], (data) => {
      if (chrome.runtime.lastError) {
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message
        });
      } else {
        sendResponse({
          success: true,
          settings: data.settings || {},
          user: data.user || null
        });
      }
    });
    return true;
  } else if (message.action === "getTrackedEmails") {
    chrome.storage.local.get(["trackedEmails"], (data) => {
      if (chrome.runtime.lastError) {
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message
        });
      } else {
        sendResponse({ success: true, data: data.trackedEmails || {} });
      }
    });
    return true;
  }
  return true; // Ensure async handling
});

async function authenticate() {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        return resolve({
          success: false,
          error: chrome.runtime.lastError?.message || "Token fetch failed"
        });
      }

      try {
        const user = await getUserInfo(token);
        state.accessToken = token;
        state.user = user;
        state.isAuthenticated = true;

        chrome.storage.local.set({
          accessToken: token,
          user,
          isAuthenticated: true
        });

        resolve({ success: true, user });
      } catch (e) {
        resolve({ success: false, error: e.message });
      }
    });
  });
}

async function getUserInfo(token) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("User info fetch failed");
  return res.json();
}

async function validateToken(token) {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${token}`
  );
  if (!res.ok) {
    state.isAuthenticated = false;
    chrome.storage.local.set({ isAuthenticated: false });
  }
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
    isAuthenticated: false
  };
}

async function trackEmail(data) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: state.user?.id || "test-user-123"
  };

  const res = await fetch(`${API_BASE_URL}/track`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...data,
      userId: state.user?.id,
      sentAt: new Date()
    })
  });

  if (!res.ok) return { success: false, error: "Failed to track email" };
  const json = await res.json();
  return { success: true, data: json };
}

async function getStats() {
  const res = await fetch(`${API_BASE_URL}/stats`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: state.user?.id
    }
  });
  if (!res.ok) return { success: false, error: "Failed to fetch stats" };
  return { success: true, data: await res.json() };
}
