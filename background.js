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

// let state = {
//   accessToken: null,
//   refreshToken: null,
//   user: null,
//   isAuthenticated: false
// };

// const API_BASE_URL = "https://gmail-tracker-1-ia1l.onrender.com/api/emails";

// // Keep-alive workaround for MV3 service worker
// let keepAliveInterval = null;
// function keepServiceWorkerAlive() {
//   if (!keepAliveInterval) {
//     keepAliveInterval = setInterval(() => {
//       chrome.runtime.getPlatformInfo(() => {});
//     }, 25 * 1000);
//   }
// }

// chrome.runtime.onInstalled.addListener(() => {
//   console.log("✅ Gmail Tracker installed!");
//   chrome.storage.local.set({
//     settings: {
//       enableTracking: true,
//       showNotifications: true,
//       showTicks: true
//     }
//   });
//   keepServiceWorkerAlive();
// });

// chrome.runtime.onStartup.addListener(() => {
//   chrome.storage.local.get(["accessToken", "refreshToken", "user", "isAuthenticated"], (data) => {
//     state = { ...state, ...data };
//     if (state.accessToken && state.isAuthenticated) {
//       validateToken(state.accessToken);
//     }
//   });
//   keepServiceWorkerAlive();
// });

// // Message handler
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   try {
//     if (message.action === "authenticate") {
//       authenticate().then(sendResponse);
//     } else if (message.action === "logout") {
//       logout().then(() => sendResponse({ success: true }));
//     } else if (message.action === "checkAuth") {
//       sendResponse({ authenticated: state.isAuthenticated });
//     } else if (message.action === "trackEmail") {
//       trackEmail(message.data).then(sendResponse);
//     } else if (message.action === "getStats") {
//       getStats().then(sendResponse);
//     } else if (message.action === "getSettings") {
//       chrome.storage.local.get(["settings", "user"], (data) => {
//         if (chrome.runtime.lastError) {
//           sendResponse({
//             success: false,
//             error: chrome.runtime.lastError.message
//           });
//         } else {
//           sendResponse({
//             success: true,
//             settings: data.settings || {},
//             user: data.user || null
//           });
//         }
//       });
//       return true;
//     } else if (message.action === "getTrackedEmails") {
//       chrome.storage.local.get(["trackedEmails"], (data) => {
//         if (chrome.runtime.lastError) {
//           sendResponse({
//             success: false,
//             error: chrome.runtime.lastError.message
//           });
//         } else {
//           sendResponse({ success: true, data: data.trackedEmails || {} });
//         }
//       });
//       return true;
//     }
//     return true;
//   } catch (err) {
//     console.warn("[Gmail Tracker] background error:", err.message);
//     sendResponse({ success: false, error: err.message });
//     return true;
//   }
// });

// // Authentication logic
// async function authenticate() {
//   return new Promise((resolve) => {
//     chrome.identity.getAuthToken({ interactive: true }, async (token) => {
//       if (chrome.runtime.lastError || !token) {
//         return resolve({
//           success: false,
//           error: chrome.runtime.lastError?.message || "Token fetch failed"
//         });
//       }

//       try {
//         const user = await getUserInfo(token);
//         state.accessToken = token;
//         state.user = user;
//         state.isAuthenticated = true;

//         chrome.storage.local.set({
//           accessToken: token,
//           user,
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
//   const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
//     headers: { Authorization: `Bearer ${token}` }
//   });
//   if (!res.ok) throw new Error("User info fetch failed");
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
//     "Content-Type": "application/json",
//     Authorization: state.user?.id || "test-user-123"
//   };

//   const res = await fetch(`${API_BASE_URL}/track`, {
//     method: "POST",
//     headers,
//     body: JSON.stringify({
//       ...data,
//       userId: state.user?.id,
//       sentAt: new Date()
//     })
//   });

//   if (!res.ok) return { success: false, error: "Failed to track email" };
//   const json = await res.json();
//   console.log("📨 Sending to backend:", data);
//   return { success: true, data: json };
// }

// async function getStats() {
//   const res = await fetch(`${API_BASE_URL}/stats`, {
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: state.user?.id
//     }
//   });
//   if (!res.ok) return { success: false, error: "Failed to fetch stats" };
//   return { success: true, data: await res.json() };
// }

//.......................................

// let state = {
//   accessToken: null,
//   refreshToken: null,
//   user: null,
//   isAuthenticated: false
// };

// const API_BASE_URL = "https://gmail-tracker-1-ia1l.onrender.com/api/emails";

// // Keep-alive workaround for MV3 service worker
// let keepAliveInterval = null;
// function keepServiceWorkerAlive() {
//   if (!keepAliveInterval) {
//     keepAliveInterval = setInterval(() => {
//       chrome.runtime.getPlatformInfo(() => {});
//     }, 25 * 1000);
//   }
// }

// chrome.runtime.onInstalled.addListener(() => {
//   console.log("✅ Gmail Tracker installed!");
//   chrome.storage.local.set({
//     settings: {
//       enableTracking: true,
//       showNotifications: true,
//       showTicks: true
//     }
//   });
//   keepServiceWorkerAlive();
// });

// chrome.runtime.onStartup.addListener(() => {
//   chrome.storage.local.get(["accessToken", "refreshToken", "user", "isAuthenticated"], (data) => {
//     state = { ...state, ...data };
//     if (state.accessToken && state.isAuthenticated) {
//       validateToken(state.accessToken);
//     }
//   });
//   keepServiceWorkerAlive();
// });

// // Message handler
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   try {
//     if (message.action === "authenticate") {
//       authenticate().then(sendResponse);
//     } else if (message.action === "logout") {
//       logout().then(() => sendResponse({ success: true }));
//     } else if (message.action === "checkAuth") {
//       sendResponse({ authenticated: state.isAuthenticated });
//     } else if (message.action === "trackEmail") {
//       trackEmail(message.data).then(sendResponse);
//     } else if (message.action === "getStats") {
//       getStats().then(sendResponse);
//     }else if (message.action === "getSettings") {
//   if (state.user) {
//     console.log("[Gmail Tracker] getSettings from state:", state.user);
//     sendResponse({
//       success: true,
//       settings: state.settings || {},
//       user: state.user
//     });
//     return true;
//   }

//   // Fallback to storage if state is not ready
//   chrome.storage.local.get(["settings", "user"], (data) => {
//     console.log("[Gmail Tracker] getSettings from storage:", data.user);
//     if (chrome.runtime.lastError) {
//       sendResponse({
//         success: false,
//         error: chrome.runtime.lastError.message
//       });
//     } else {
//       sendResponse({
//         success: true,
//         settings: data.settings || {},
//         user: data.user || null
//       });
//     }
//   });
//   return true;
// }
//  else if (message.action === "getTrackedEmails") {
//       chrome.storage.local.get(["trackedEmails"], (data) => {
//         if (chrome.runtime.lastError) {
//           sendResponse({
//             success: false,
//             error: chrome.runtime.lastError.message
//           });
//         } else {
//           sendResponse({ success: true, data: data.trackedEmails || {} });
//         }
//       });
//       return true;
//     }
//     return true;
//   } catch (err) {
//     console.warn("[Gmail Tracker] background error:", err.message);
//     sendResponse({ success: false, error: err.message });
//     return true;
//   }
// });

// // Authentication logic
// // async function authenticate() {
// //   return new Promise((resolve) => {
// //     chrome.identity.getAuthToken({ interactive: true }, async (token) => {
// //       if (chrome.runtime.lastError || !token) {
// //         return resolve({
// //           success: false,
// //           error: chrome.runtime.lastError?.message || "Token fetch failed"
// //         });
// //       }

// //       try {
// //         const user = await getUserInfo(token);
// //         state.accessToken = token;
// //         state.user = user;
// //         state.isAuthenticated = true;

// //         chrome.storage.local.set({
// //           accessToken: token,
// //           user,
// //           isAuthenticated: true
// //         });

// //         resolve({ success: true, user });
// //       } catch (e) {
// //         resolve({ success: false, error: e.message });
// //       }
// //     });
// //   });
// // }
// async function authenticate() {
//   return new Promise((resolve) => {
//     chrome.identity.getAuthToken({ interactive: true }, async (token) => {
//       if (chrome.runtime.lastError || !token) {
//         return resolve({
//           success: false,
//           error: chrome.runtime.lastError?.message || "Token fetch failed"
//         });
//       }

//       try {
//         const user = await getUserInfo(token);

//         if (!user || !user.id) {
//           console.warn("[Gmail Tracker] Invalid user object returned:", user);
//           return resolve({
//             success: false,
//             error: "Invalid user info"
//           });
//         }

//         state.accessToken = token;
//         state.user = user;
//         state.isAuthenticated = true;

//         chrome.storage.local.set({
//           accessToken: token,
//           user: { ...user, id: user.sub },
//           isAuthenticated: true
//         }, () => {
//           console.log("[Gmail Tracker] User and token saved:", user);
//         });

//         resolve({ success: true, user });
//       } catch (e) {
//         console.error("[Gmail Tracker] Error fetching user info:", e);
//         resolve({ success: false, error: e.message });
//       }
//     });
//   });
// }

// async function getUserInfo(token) {
//   const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
//     headers: { Authorization: `Bearer ${token}` }
//   });
//   if (!res.ok) throw new Error("User info fetch failed");
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
//   const token = state.accessToken;
//   const authHeader = token ? `Bearer ${token}` : "test-user-123";

//   console.log("📨 Sending to backend:", data); // Console log before sending

//   const res = await fetch(`${API_BASE_URL}/track`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: authHeader
//     },
//     body: JSON.stringify({
//       ...data,
//       userId: state.user?.id || "test-user-123",
//       sentAt: new Date()
//     })
//   });

//   if (!res.ok) {
//     console.warn("[Gmail Tracker] backend track failed:", await res.text());
//     return { success: false, error: "Failed to track email" };
//   }

//   const json = await res.json();
//   return { success: true, data: json };
// }

// async function getStats() {
//   const res = await fetch(`${API_BASE_URL}/stats`, {
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: state.accessToken ? `Bearer ${state.accessToken}` : ""
//     }
//   });

//   if (!res.ok) return { success: false, error: "Failed to fetch stats" };
//   return { success: true, data: await res.json() };
// }

// // background.js
// let state = {
//   accessToken: null,
//   refreshToken: null,
//   user: null,
//   isAuthenticated: false,
//   settings: {
//     enableTracking: true,
//     showNotifications: true,
//     showTicks: true,
//   },
//   trackedEmailsInterval: null,
// };

// const API_BASE_URL = "https://gmail-tracker-1-ia1l.onrender.com/api/emails";

// // Keep-alive workaround for MV3 service worker
// let keepAliveInterval = null;
// function keepServiceWorkerAlive() {
//   if (!keepAliveInterval) {
//     keepAliveInterval = setInterval(() => {
//       chrome.runtime.getPlatformInfo(() => {});
//     }, 25 * 1000);
//   }
// }

// chrome.runtime.onInstalled.addListener(() => {
//   console.log("✅ Gmail Tracker installed!");
//   chrome.storage.local.set({
//     settings: state.settings,
//   });
//   keepServiceWorkerAlive();
// });



// async function syncTrackedEmails() {
//   if (!state.user?.id) return;
//   try {
//     const res = await fetch(`${API_BASE_URL}/tracked?limit=200`, {
//       headers: { Authorization: state.accessToken ? `Bearer ${state.accessToken}` : '' }
//     });
//     if (!res.ok) throw new Error(await res.text());
//     const json = await res.json();
//     const emails = Array.isArray(json.emails) ? json.emails : [];
//     const trackedMap = emails.reduce((map, e) => {
//       map[e.messageId] = { isRead: e.readCount > 0, readCount: e.readCount };
//       return map;
//     }, {});
//     chrome.storage.local.set({ trackedEmails: trackedMap });
//   } catch (e) {
//     console.warn("[Gmail Tracker] syncTrackedEmails failed:", e.message);
//   }
// }


// chrome.runtime.onStartup.addListener(() => {
//   chrome.storage.local.get(
//     ["accessToken", "refreshToken", "user", "isAuthenticated", "settings"],
//     (data) => {
//       state = { ...state, ...data };
//       if (state.accessToken && state.isAuthenticated) {
//         validateToken(state.accessToken);
//       }
//     }
//   );
//   keepServiceWorkerAlive();
// });


// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   try {
//     if (message.action === "authenticate") {
//       authenticate()
//         .then(sendResponse)
//         .catch((err) => {
//           console.warn("[Gmail Tracker] authenticate error:", err.message);
//           sendResponse({ success: false, error: err.message });
//         });
//       return true;
//     }

//     if (message.action === "logout") {
//       logout()
//         .then(() => sendResponse({ success: true }))
//         .catch((err) => {
//           console.warn("[Gmail Tracker] logout error:", err.message);
//           sendResponse({ success: false, error: err.message });
//         });
//       return true;
//     }

//     if (message.action === "checkAuth") {
//       sendResponse({ authenticated: state.isAuthenticated });
//       return true;
//     }

//     if (message.action === "trackEmail") {
//       trackEmail(message.data)
//         .then(sendResponse)
//         .catch((err) => {
//           console.warn("[Gmail Tracker] trackEmail error:", err.message);
//           sendResponse({ success: false, error: err.message });
//         });
//       return true;
//     }

//     if (message.action === "getStats") {
//       getStats()
//         .then(sendResponse)
//         .catch((err) => {
//           console.warn("[Gmail Tracker] getStats error:", err.message);
//           sendResponse({ success: false, error: err.message });
//         });
//       return true;
//     }

//     if (message.action === "getSettings") {
//       chrome.storage.local.get(["settings", "user"], (data) => {
//         if (chrome.runtime.lastError) {
//           sendResponse({
//             success: false,
//             error: chrome.runtime.lastError.message,
//           });
//           return;
//         }

//         const fallbackUser = state.user;
//         const userFromStorage = data.user || fallbackUser;

//         console.log("[Gmail Tracker] getSettings from storage:", data.user);
//         console.log("[Gmail Tracker] getSettings from state:", fallbackUser);

//         sendResponse({
//           success: true,
//           settings: data.settings || state.settings,
//           user: userFromStorage || null,
//         });
//       });
//       return true;
//     }
//     if (message.action === "getTrackedEmails") {
//       syncTrackedEmails().finally(() => {
//         chrome.storage.local.get(["trackedEmails"], data => {
//           sendResponse({ success: true, data: data.trackedEmails || {} });
//         });
//       });
//       return true;
//     }
   
//     else if (message.action === "syncTrackedEmails") {
//       syncTrackedEmails().then(sendResponse);
//       return true;
//     }

//     return false; // Explicit fallback for unknown actions
//   } catch (err) {
//     console.warn("[Gmail Tracker] background error:", err.message);
//     sendResponse({ success: false, error: err.message });
//     return true;
//   }
// });



// async function authenticate() {
//   return new Promise((resolve) => {
//     chrome.identity.getAuthToken({ interactive: true }, async (token) => {
//       if (chrome.runtime.lastError || !token) {
//         return resolve({
//           success: false,
//           error: chrome.runtime.lastError?.message || "Token fetch failed",
//         });
//       }

//       try {
//         const user = await getUserInfo(token);

//         if (!user || !user.id) {
//           console.warn("[Gmail Tracker] Invalid user object returned:", user);
//           return resolve({
//             success: false,
//             error: "Invalid user info",
//           });
//         }

//         state.accessToken = token;
//         state.user = user;
//         state.isAuthenticated = true;

//         chrome.storage.local.set(
//           {
//             accessToken: token,
//             user: { ...user, id: user.sub },
//             isAuthenticated: true,
//             settings: state.settings,
//           },
//           () => {
//             console.log("[Gmail Tracker] User and token saved:", user);
//           }
//         );

//         // ✅ Trigger initial sync
//         syncTrackedEmails();

//         // ✅ Set up periodic sync every 1 minute
//         if (!state.trackedEmailsInterval) {
//           state.trackedEmailsInterval = setInterval(syncTrackedEmails, 60 * 1000);
//         }

//         resolve({ success: true, user });
//       } catch (e) {
//         console.error("[Gmail Tracker] Error fetching user info:", e);
//         resolve({ success: false, error: e.message });
//       }
//     });
//   });
// }


// async function getUserInfo(token) {
//   const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
//     headers: { Authorization: `Bearer ${token}` },
//   });
//   if (!res.ok) throw new Error("User info fetch failed");
//   return res.json();
// }

// async function validateToken(token) {
//   const res = await fetch(
//     `https://oauth2.googleapis.com/tokeninfo?access_token=${token}`
//   );
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
//     isAuthenticated: false,
//     settings: {
//       enableTracking: true,
//       showNotifications: true,
//       showTicks: true,
//     },
//   };
// }

// async function trackEmail(data) {
//   const token = state.accessToken;
//   const authHeader = token ? `Bearer ${token}` : null;

//    if (!authHeader || !state.user?.id) {
//     console.warn("[Gmail Tracker] Cannot track email: Missing auth or user");
//     return { success: false, error: "Not authenticated" };
//   }

//   console.log("📨 Sending to backend:", data);

//   const res = await fetch(`${API_BASE_URL}/track`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: authHeader,
//     },
//     body: JSON.stringify({
//       ...data,
//       userId: state.user?.id,
//       sentAt: new Date(),
//     }),
//   });

//   if (!res.ok) {
//     console.warn("[Gmail Tracker] backend track failed:", await res.text());
//     return { success: false, error: "Failed to track email" };
//   }

//   const json = await res.json();
//   return { success: true, data: json };
// }

// async function getStats() {
//   const res = await fetch(`${API_BASE_URL}/stats`, {
//     headers: {
//       "Content-Type": "application/json",
//       Authorization: state.accessToken ? `Bearer ${state.accessToken}` : "",
//     },
//   });

//   if (!res.ok) return { success: false, error: "Failed to fetch stats" };
//   return { success: true, data: await res.json() };
// }


// background.js
let state = {
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

const API_BASE_URL = "https://gmail-tracker-1-ia1l.onrender.com/api/emails";

// Keep-alive workaround for MV3 service worker
let keepAliveInterval = null;
function keepServiceWorkerAlive() {
  if (!keepAliveInterval) {
    keepAliveInterval = setInterval(() => {
      chrome.runtime.getPlatformInfo(() => {});
    }, 25 * 1000);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("✅ Gmail Tracker installed!");
  chrome.storage.local.set({ settings: state.settings });
  keepServiceWorkerAlive();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get([
    "accessToken",
    "refreshToken",
    "user",
    "isAuthenticated",
    "settings",
  ], (data) => {
    state = { ...state, ...data };
    if (state.accessToken && state.isAuthenticated) {
      validateToken(state.accessToken);
      syncTrackedEmails();
      if (!state.trackedEmailsInterval) {
        state.trackedEmailsInterval = setInterval(syncTrackedEmails, 60 * 1000);
      }
    }
  });
  keepServiceWorkerAlive();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.action === "authenticate") {
      authenticate().then(sendResponse).catch((err) => {
        console.warn("[Gmail Tracker] authenticate error:", err.message);
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    if (message.action === "logout") {
      logout().then(() => sendResponse({ success: true })).catch((err) => {
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
      trackEmail(message.data).then((res) => {
        syncTrackedEmails();
        sendResponse(res);
      }).catch((err) => {
        console.warn("[Gmail Tracker] trackEmail error:", err.message);
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    if (message.action === "getStats") {
      getStats().then(sendResponse).catch((err) => {
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

        chrome.storage.local.set({
          accessToken: token,
          user: { ...user, id: user.sub },
          isAuthenticated: true,
          settings: state.settings,
        }, () => {
          console.log("[Gmail Tracker] User and token saved:", user);
        });

        syncTrackedEmails();
        if (!state.trackedEmailsInterval) {
          state.trackedEmailsInterval = setInterval(syncTrackedEmails, 60 * 1000);
        }

        resolve({ success: true, user });
      } catch (e) {
        console.error("[Gmail Tracker] Error fetching user info:", e);
        resolve({ success: false, error: e.message });
      }
    });
  });
}

// async function syncTrackedEmails() {
//   if (!state.user?.id) return;
//   try {
//     const res = await fetch(`${API_BASE_URL}/tracked?limit=200`, {
//       headers: { Authorization: state.accessToken ? `Bearer ${state.accessToken}` : '' }
//     });
//     if (!res.ok) throw new Error(await res.text());
//     const json = await res.json();
//     const emails = Array.isArray(json.emails) ? json.emails : [];
//     const trackedMap = emails.reduce((map, e) => {
//       map[e.messageId] = { isRead: e.readCount > 0, readCount: e.readCount };
//       return map;
//     }, {});
//     chrome.storage.local.set({ trackedEmails: trackedMap });
//     console.log("✅ Synced trackedEmails:", Object.keys(trackedMap).length);
//   } catch (e) {
//     console.warn("[Gmail Tracker] syncTrackedEmails failed:", e.message);
//   }
// }
async function syncTrackedEmails() {
  if (!state.user?.id) {
    console.warn("[Gmail Tracker] ❌ No user ID. Skipping sync.");
    return;
  }

  console.log("[Gmail Tracker] 🔄 Syncing tracked emails for user:", state.user.id);

  try {
    const res = await fetch(`${API_BASE_URL}/tracked?limit=200`, {
      headers: {
        Authorization: state.accessToken ? `Bearer ${state.accessToken}` : ""
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Gmail Tracker] ❌ Backend returned error:", errText);
      throw new Error(errText);
    }

    const json = await res.json();
    console.log("[Gmail Tracker] 📥 Raw response from /tracked:", json);

    const emails = Array.isArray(json.emails) ? json.emails : [];
    console.log(`[Gmail Tracker] 📊 Emails received from backend: ${emails.length}`);

    const trackedMap = emails.reduce((map, e) => {
      map[e.messageId] = {
        isRead: e.readCount > 0,
        readCount: e.readCount
      };
      return map;
    }, {});

    chrome.storage.local.set({ trackedEmails: trackedMap }, () => {
      if (chrome.runtime.lastError) {
        console.error("[Gmail Tracker] ❌ Failed to save trackedEmails to local storage:", chrome.runtime.lastError.message);
      } else {
        console.log("✅ trackedEmails saved to chrome.storage.local:", Object.keys(trackedMap).length);
      }
    });
  } catch (e) {
    console.warn("[Gmail Tracker] syncTrackedEmails failed:", e.message);
  }
}


async function getUserInfo(token) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
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
  const token = state.accessToken;
  const authHeader = token ? `Bearer ${token}` : null;
  if (!authHeader || !state.user?.id) {
    console.warn("[Gmail Tracker] Cannot track email: Missing auth or user");
    return { success: false, error: "Not authenticated" };
  }

  console.log("📨 Sending to backend:", data);
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
    console.warn("[Gmail Tracker] backend track failed:", await res.text());
    return { success: false, error: "Failed to track email" };
  }

  const json = await res.json();
  return { success: true, data: json };
}

async function getStats() {
  const res = await fetch(`${API_BASE_URL}/stats`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: state.accessToken ? `Bearer ${state.accessToken}` : "",
    },
  });
  if (!res.ok) return { success: false, error: "Failed to fetch stats" };
  return { success: true, data: await res.json() };
}
