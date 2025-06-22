// // Content Script for Gmail Tracker Extension
// // Updated Content Script for Gmail Tracker Extension

// class GmailTracker {
//     constructor() {
//         this.isInitialized = false;
//         this.user = null;
//         this.settings = {
//             enableTracking: true,
//             showNotifications: true,
//             showTicks: true
//         };
//         this.sentEmailsObserver = null;
//         this.composeObserver = null;

//         this.init();
//     }

//     async init() {
//         if (this.isInitialized) return;

//         console.log('Gmail Tracker: Initializing...');

//         await this.waitForGmail();
//         await this.loadSettings();
//         this.setupMessageListener();
//         this.initializeTracking();

//         this.isInitialized = true;
//         window.gmailTracker = this;

//         console.log('Gmail Tracker: Initialized');
//     }

//     async waitForGmail() {
//         return new Promise((resolve) => {
//             const checkGmail = () => {
//                 if (document.querySelector('[role="main"]')) resolve();
//                 else setTimeout(checkGmail, 1000);
//             };
//             checkGmail();
//         });
//     }

//     async loadSettings() {
//         try {
//             const data = await chrome.storage.local.get(['settings', 'user']);
//             this.settings = data.settings || this.settings;
//             this.user = data.user;
//         } catch (err) {
//             console.error('Failed to load settings:', err);
//         }
//     }

//     setupMessageListener() {
//         chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//             if (msg.action === 'initializeTracker') {
//                 this.user = msg.user;
//                 this.initializeTracking();
//                 sendResponse({ success: true });
//             } else if (msg.action === 'settingsChanged') {
//                 this.settings = msg.settings;
//                 this.updateTrackingDisplay();
//                 sendResponse({ success: true });
//             }
//         });
//     }

//     initializeTracking() {
//         if (!this.settings.enableTracking) return;
//         this.observeSentFolder();
//         this.monitorCompose();
//         this.addTickIndicators();
//         this.startPeriodicUpdates();
//     }

//     observeSentFolder() {
//         const target = document.querySelector('[role="main"] .ae4');
//         if (!target || this.sentEmailsObserver) return;

//         this.sentEmailsObserver = new MutationObserver(() => this.addTickIndicators());
//         this.sentEmailsObserver.observe(target, { childList: true, subtree: true });
//     }

//     monitorCompose() {
//         document.addEventListener('click', e => {
//             if (e.target.closest('[data-tooltip="Send"]')) {
//                 this.handleSendClick(e);
//             }
//         });
//     }

//     async handleSendClick(event) {
//         if (!this.settings.enableTracking) return;
//         const compose = document.querySelector('.M9');
//         const data = this.extractEmailData(compose);

//         if (!data) return;
//         await this.injectTrackingPixel(compose, data);
//         chrome.runtime.sendMessage({ action: 'trackEmail', data });
//     }

//     extractEmailData(compose) {
//         try {
//             const recipient = compose.querySelector('input[name="to"], [email]')?.value || '';
//             const subject = compose.querySelector('input[name="subject"], [name="subjectbox"]')?.value || 'No Subject';
//             return {
//                 messageId: this.generateMessageId(),
//                 recipient,
//                 subject,
//                 timestamp: Date.now()
//             };
//         } catch (e) {
//             console.error('Error extracting email data:', e);
//             return null;
//         }
//     }

//     async injectTrackingPixel(compose, emailData) {
//         const bodyField = compose.querySelector('[aria-label="Message Body"]');
//         if (bodyField && bodyField.innerHTML !== undefined) {
//             const pixelUrl = `https://yourserver.com/track?mid=${emailData.messageId}`;
//             bodyField.innerHTML += `<img src="${pixelUrl}" width="1" height="1" style="display:none" />`;
//             console.log('Tracking pixel added.');
//         }
//     }

//     async addTickIndicators() {
//         if (!this.settings.showTicks || !location.href.includes('#sent')) return;
//         const tracked = await this.getTrackedEmails();
//         document.querySelectorAll('[role="main"] .zA').forEach(row => {
//             if (row.dataset.trackerProcessed) return;
//             const id = this.getMessageIdFromRow(row);
//             const isRead = tracked[id]?.isRead;
//             const tick = document.createElement('div');
//             tick.className = 'gmail-tracker-tick';
//             tick.innerHTML = isRead ? '<span class="tick double">✓✓</span>' : '<span class="tick single">✓</span>';
//             tick.title = isRead ? 'Read' : 'Sent';

//             const insertPoint = row.querySelector('.bog, .y6, .xY');
//             if (insertPoint && !row.querySelector('.gmail-tracker-tick')) {
//                 insertPoint.appendChild(tick);
//             }
//             row.dataset.trackerProcessed = 'true';
//         });
//     }

//     async getTrackedEmails() {
//         const data = await chrome.storage.local.get(['trackedEmails']);
//         return data.trackedEmails || {};
//     }

//     generateMessageId() {
//         return 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
//     }

//     updateTrackingDisplay() {
//         if (!this.settings.showTicks) {
//             document.querySelectorAll('.gmail-tracker-tick').forEach(e => e.remove());
//         } else {
//             this.addTickIndicators();
//         }
//     }

//     startPeriodicUpdates() {
//         setInterval(() => {
//             if (this.settings.showTicks && location.href.includes('#sent')) {
//                 this.updateTickStatus();
//             }
//         }, 30000);
//     }

//     async updateTickStatus() {
//         const tracked = await this.getTrackedEmails();
//         document.querySelectorAll('.gmail-tracker-tick').forEach(tick => {
//             const row = tick.closest('.zA');
//             const id = this.getMessageIdFromRow(row);
//             const data = tracked[id];
//             if (data?.isRead) {
//                 tick.innerHTML = '<span class="tick double">✓✓</span>';
//                 tick.title = 'Read';
//             }
//         });
//     }

//     getMessageIdFromRow(row) {
//         return row.getAttribute('id') || row.dataset.threadId || 'unknown_' + Date.now();
//     }
// }

// // Start Tracker
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', () => new GmailTracker());
// } else {
//     new GmailTracker();
// }

// // React to SPA URL changes
// let lastUrl = location.href;
// setInterval(() => {
//     if (location.href !== lastUrl) {
//         lastUrl = location.href;
//         if (window.gmailTracker) {
//             window.gmailTracker.addTickIndicators();
//         }
//     }
// }, 1000);

//...........................................

// class GmailTracker {
//     constructor() {
//         this.isInitialized = false;
//         this.user = null;
//         this.settings = {
//             enableTracking: true,
//             showNotifications: true,
//             showTicks: true
//         };
//         this.sentEmailsObserver = null;
//         this.composeObserver = null;

//         this.init();
//     }

//     async init() {
//         if (this.isInitialized) return;

//         console.log('Gmail Tracker: Initializing...');

//         await this.waitForGmail();
//         await this.loadSettings();
//         this.setupMessageListener();
//         this.initializeTracking();

//         this.isInitialized = true;
//         window.gmailTracker = this;

//         console.log('Gmail Tracker: Initialized');
//     }

//     async waitForGmail() {
//         return new Promise((resolve) => {
//             const checkGmail = () => {
//                 if (document.querySelector('[role="main"]')) resolve();
//                 else setTimeout(checkGmail, 1000);
//             };
//             checkGmail();
//         });
//     }

//     async loadSettings() {
//         try {
//             const data = await chrome.storage.local.get(['settings', 'user']);
//             this.settings = data.settings || this.settings;
//             this.user = data.user;
//         } catch (err) {
//             console.error('Failed to load settings:', err);
//         }
//     }

//     setupMessageListener() {
//         chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//             if (msg.action === 'initializeTracker') {
//                 this.user = msg.user;
//                 this.initializeTracking();
//                 sendResponse({ success: true });
//             } else if (msg.action === 'settingsChanged') {
//                 this.settings = msg.settings;
//                 this.updateTrackingDisplay();
//                 sendResponse({ success: true });
//             }
//         });
//     }

//     initializeTracking() {
//         if (!this.settings.enableTracking) return;
//         this.observeSentFolder();
//         this.monitorCompose();
//         this.addTickIndicators();
//         this.startPeriodicUpdates();
//     }

//     observeSentFolder() {
//         const target = document.querySelector('[role="main"] .ae4');
//         if (!target || this.sentEmailsObserver) return;

//         this.sentEmailsObserver = new MutationObserver(() => this.addTickIndicators());
//         this.sentEmailsObserver.observe(target, { childList: true, subtree: true });
//     }

//     monitorCompose() {
//         document.addEventListener('click', e => {
//             if (e.target.closest('[data-tooltip="Send"]')) {
//                 this.handleSendClick(e);
//             }
//         });
//     }

//     async handleSendClick(event) {
//         if (!this.settings.enableTracking) return;
//         const compose = document.querySelector('.M9');
//         const data = this.extractEmailData(compose);

//         if (!data) return;
//         await this.injectTrackingPixel(compose, data);
//         this.safeSendMessage({ action: 'trackEmail', data });
//     }

//     extractEmailData(compose) {
//         try {
//             const recipient = compose.querySelector('input[name="to"], [email]')?.value || '';
//             const subject = compose.querySelector('input[name="subject"], [name="subjectbox"]')?.value || 'No Subject';
//             return {
//                 messageId: this.generateMessageId(),
//                 recipient,
//                 subject,
//                 timestamp: Date.now()
//             };
//         } catch (e) {
//             console.error('Error extracting email data:', e);
//             return null;
//         }
//     }

//     async injectTrackingPixel(compose, emailData) {
//         const bodyField = compose.querySelector('[aria-label="Message Body"]');
//         if (bodyField && bodyField.innerHTML !== undefined) {
//             const pixelUrl = `https://yourserver.com/track?mid=${emailData.messageId}`;
//             bodyField.innerHTML += `<img src="${pixelUrl}" width="1" height="1" style="display:none" />`;
//             console.log('Tracking pixel added.');
//         }
//     }

//     async addTickIndicators() {
//         if (!this.settings.showTicks || !location.href.includes('#sent')) return;
//         const tracked = await this.getTrackedEmails();
//         document.querySelectorAll('[role="main"] .zA').forEach(row => {
//             if (row.dataset.trackerProcessed) return;
//             const id = this.getMessageIdFromRow(row);
//             const isRead = tracked[id]?.isRead;
//             const tick = document.createElement('div');
//             tick.className = 'gmail-tracker-tick';
//             tick.innerHTML = isRead ? '<span class="tick double">✓✓</span>' : '<span class="tick single">✓</span>';
//             tick.title = isRead ? 'Read' : 'Sent';

//             const insertPoint = row.querySelector('.bog, .y6, .xY');
//             if (insertPoint && !row.querySelector('.gmail-tracker-tick')) {
//                 insertPoint.appendChild(tick);
//             }
//             row.dataset.trackerProcessed = 'true';
//         });
//     }

//     async getTrackedEmails() {
//         try {
//             const data = await chrome.storage.local.get(['trackedEmails']);
//             return data.trackedEmails || {};
//         } catch (err) {
//             console.error('⚠️ Failed to get tracked emails:', error);
//             console.warn('getTrackedEmails error:', err);
//             return {};
//         }
//     }

//     generateMessageId() {
//         return 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
//     }

//     updateTrackingDisplay() {
//         if (!this.settings.showTicks) {
//             document.querySelectorAll('.gmail-tracker-tick').forEach(e => e.remove());
//         } else {
//             this.addTickIndicators();
//         }
//     }

//     startPeriodicUpdates() {
//         setInterval(() => {
//             if (this.settings.showTicks && location.href.includes('#sent')) {
//                 this.updateTickStatus();
//             }
//         }, 30000);
//     }

//     async updateTickStatus() {
//         const tracked = await this.getTrackedEmails();
//         document.querySelectorAll('.gmail-tracker-tick').forEach(tick => {
//             const row = tick.closest('.zA');
//             const id = this.getMessageIdFromRow(row);
//             const data = tracked[id];
//             if (data?.isRead) {
//                 tick.innerHTML = '<span class="tick double">✓✓</span>';
//                 tick.title = 'Read';
//             }
//         });
//     }

//     getMessageIdFromRow(row) {
//         return row.getAttribute('id') || row.dataset.threadId || 'unknown_' + Date.now();
//     }

//     async safeSendMessage(message) {
//         return new Promise((resolve, reject) => {
//             if (!chrome?.runtime?.id) {
//                 return reject(new Error('Extension context invalid'));
//             }
//             try {
//                 chrome.runtime.sendMessage(message, (response) => {
//                     if (chrome.runtime.lastError) {
//                         console.warn('Message send failed:', chrome.runtime.lastError.message);
//                         reject(new Error(chrome.runtime.lastError.message));
//                     } else {
//                         resolve(response);
//                     }
//                 });
//             } catch (err) {
//                 console.warn('Safe send error:', err);
//                 reject(err);
//             }
//         });
//     }
// }

// // Start Tracker
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', () => new GmailTracker());
// } else {
//     new GmailTracker();
// }

// // React to SPA URL changes
// let lastUrl = location.href;
// setInterval(() => {
//     if (location.href !== lastUrl) {
//         lastUrl = location.href;
//         if (window.gmailTracker) {
//             window.gmailTracker.addTickIndicators();
//         }
//     }
// }, 1000);

//...............................................................

// Fully updated content.js with context-checking, error handling, and Gmail SPA robustness

// class GmailTracker {
//   constructor() {
//     this.isInitialized = false;
//     this.user = null;
//     this.settings = {
//       enableTracking: true,
//       showNotifications: true,
//       showTicks: true,
//     };
//     this.sentEmailsObserver = null;
//     this.composeObserver = null;

//     this.init();
//   }

//   async init() {
//     if (this.isInitialized) return;

//     console.log("Gmail Tracker: Initializing...");
//     await this.waitForGmail();
//     await this.loadSettings();
//     this.setupMessageListener();
//     this.initializeTracking();

//     this.isInitialized = true;
//     window.gmailTracker = this;

//     console.log("Gmail Tracker: Initialized");
//   }

//   async waitForGmail() {
//     return new Promise((resolve) => {
//       const checkGmail = () => {
//         if (document.querySelector('[role="main"]')) resolve();
//         else setTimeout(checkGmail, 1000);
//       };
//       checkGmail();
//     });
//   }

//   async loadSettings() {
//     try {
//       if (!chrome.runtime?.id) return;
//       const data = await chrome.storage.local.get(["settings", "user"]);
//       this.settings = data.settings || this.settings;
//       this.user = data.user;
//     } catch (err) {
//       console.error("Failed to load settings:", err);
//     }
//   }

//   setupMessageListener() {
//     chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//       if (msg.action === "initializeTracker") {
//         this.user = msg.user;
//         this.initializeTracking();
//         sendResponse({ success: true });
//       } else if (msg.action === "settingsChanged") {
//         this.settings = msg.settings;
//         this.updateTrackingDisplay();
//         sendResponse({ success: true });
//       }
//     });
//   }

//   initializeTracking() {
//     if (!this.settings.enableTracking) return;
//     this.observeSentFolder();
//     this.monitorCompose();
//     this.addTickIndicators();
//     this.startPeriodicUpdates();
//   }

//   observeSentFolder() {
//     const target = document.querySelector('[role="main"] .ae4');
//     if (!target || this.sentEmailsObserver) return;

//     this.sentEmailsObserver = new MutationObserver(() => this.addTickIndicators());
//     this.sentEmailsObserver.observe(target, { childList: true, subtree: true });
//   }

//   monitorCompose() {
//     document.addEventListener("click", (e) => {
//       if (e.target.closest('[data-tooltip="Send"]')) {
//         this.handleSendClick(e);
//       }
//     });
//   }

//   async handleSendClick(event) {
//     if (!this.settings.enableTracking) return;
//     const compose = document.querySelector(".M9");
//     const data = this.extractEmailData(compose);

//     if (!data) return;
//     await this.injectTrackingPixel(compose, data);
//     if (chrome.runtime?.id) {
//       chrome.runtime.sendMessage({ action: "trackEmail", data });
//     }
//   }

//   extractEmailData(compose) {
//     try {
//       const recipient = compose.querySelector("input[name='to'], [email]")?.value || "";
//       const subject =
//         compose.querySelector("input[name='subject'], [name='subjectbox']")?.value || "No Subject";
//       return {
//         messageId: this.generateMessageId(),
//         recipient,
//         subject,
//         timestamp: Date.now(),
//       };
//     } catch (e) {
//       console.error("Error extracting email data:", e);
//       return null;
//     }
//   }

//   async injectTrackingPixel(compose, emailData) {
//     const bodyField = compose.querySelector('[aria-label="Message Body"]');
//     if (bodyField && bodyField.innerHTML !== undefined) {
//       const pixelUrl = `https://yourserver.com/track?mid=${emailData.messageId}`;
//       bodyField.innerHTML += `<img src="${pixelUrl}" width="1" height="1" style="display:none" />`;
//       console.log("Tracking pixel added.");
//     }
//   }

//   async addTickIndicators() {
//     if (!this.settings.showTicks || !location.href.includes("#sent")) return;
//     const tracked = await this.getTrackedEmails();

//     document.querySelectorAll('[role="main"] .zA').forEach((row) => {
//       if (row.dataset.trackerProcessed) return;
//       const id = this.getMessageIdFromRow(row);
//       const isRead = tracked[id]?.isRead;

//       const tick = document.createElement("div");
//       tick.className = "gmail-tracker-tick";
//       tick.innerHTML = isRead ? '<span class="tick double">✓✓</span>' : '<span class="tick single">✓</span>';
//       tick.title = isRead ? "Read" : "Sent";

//       const insertPoint = row.querySelector(".bog, .y6, .xY");
//       if (insertPoint && !row.querySelector(".gmail-tracker-tick")) {
//         insertPoint.appendChild(tick);
//       }
//       row.dataset.trackerProcessed = "true";
//     });
//   }

//   async getTrackedEmails() {
//     try {
//       if (!chrome.runtime?.id) throw new Error("Extension context lost");
//       const data = await chrome.storage.local.get(["trackedEmails"]);
//       return data.trackedEmails || {};
//     } catch (e) {
//       console.warn("Failed to get tracked emails:", e);
//       return {};
//     }
//   }

//   generateMessageId() {
//     return "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
//   }

//   updateTrackingDisplay() {
//     if (!this.settings.showTicks) {
//       document.querySelectorAll(".gmail-tracker-tick").forEach((e) => e.remove());
//     } else {
//       this.addTickIndicators();
//     }
//   }

//   startPeriodicUpdates() {
//     setInterval(async () => {
//       if (!chrome.runtime?.id) return;
//       if (this.settings.showTicks && location.href.includes("#sent")) {
//         try {
//           await this.updateTickStatus();
//         } catch (e) {
//           console.warn("updateTickStatus failed:", e);
//         }
//       }
//     }, 30000);
//   }

// //   async updateTickStatus() {
// //     const tracked = await this.getTrackedEmails();
// //     document.querySelectorAll(".gmail-tracker-tick").forEach((tick) => {
// //       const row = tick.closest(".zA");
// //       const id = this.getMessageIdFromRow(row);
// //       const data = tracked[id];
// //       if (data?.isRead) {
// //         tick.innerHTML = '<span class="tick double">✓✓</span>';
// //         tick.title = "Read";
// //       }
// //     });
// //   }
// async updateTickStatus() {
//   try {
//     const tracked = await this.getTrackedEmails();
//     if (!tracked) return;

//     document.querySelectorAll('.gmail-tracker-tick').forEach(tick => {
//       const row = tick.closest('.zA');
//       const id = this.getMessageIdFromRow(row);
//       const data = tracked[id];
//       if (data?.isRead) {
//         tick.innerHTML = '<span class="tick double">✓✓</span>';
//         tick.title = 'Read';
//       }
//     });
//   } catch (err) {
//     console.warn('updateTickStatus failed:', err.message);
//   }
// }

//   getMessageIdFromRow(row) {
//     return row.getAttribute("id") || row.dataset.threadId || "unknown_" + Date.now();
//   }
// }

// if (document.readyState === "loading") {
//   document.addEventListener("DOMContentLoaded", () => new GmailTracker());
// } else {
//   new GmailTracker();
// }

// // SPA Route change support
// let lastUrl = location.href;
// setInterval(() => {
//   if (location.href !== lastUrl) {
//     lastUrl = location.href;
//     if (window.gmailTracker) {
//       window.gmailTracker.addTickIndicators();
//     }
//   }
// }, 1000);

//....................................

// ✅ Updated content.js with stable error handling and message-passing fallback

// STABLE version of GmailTracker using background.js for storage access
// === FINAL content.js (Gmail Tracker) ===

// class GmailTracker {
//   constructor() {
//     this.isInitialized = false;
//     this.user = null;
//     this.settings = {
//       enableTracking: true,
//       showNotifications: true,
//       showTicks: true
//     };
//     this.updateInterval = null;

//     this.init();
//   }

//   init() {
//     if (this.isInitialized) return;
//     console.log("[Gmail Tracker] Initializing...");

//     this.waitForGmail(() => {
//       this.setupMessageListener();
//       this.loadSettings(() => {
//         this.initializeTracking();
//         this.isInitialized = true;
//         window.gmailTracker = this;
//         console.log("[Gmail Tracker] Initialized");
//       });
//     });
//   }

//   waitForGmail(callback) {
//     const check = () => {
//       const main = document.querySelector('[role="main"]');
//       if (main) callback();
//       else setTimeout(check, 1000);
//     };
//     check();
//   }

//   loadSettings(callback) {
//     try {
//       if (!chrome?.runtime?.sendMessage) return callback();

//       chrome.runtime.sendMessage({ action: "getSettings" }, (response) => {
//         if (chrome.runtime.lastError || !response?.success) {
//           console.warn("[Gmail Tracker] Failed to load settings:", chrome.runtime.lastError?.message || response?.error);
//           return callback();
//         }
//         this.settings = response.settings || this.settings;
//         this.user = response.user || null;
//         callback();
//       });
//     } catch (e) {
//       console.warn("[Gmail Tracker] loadSettings exception:", e.message);
//       callback();
//     }
//   }

//   setupMessageListener() {
//     chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//       if (msg.action === "initializeTracker") {
//         this.user = msg.user;
//         this.initializeTracking();
//         sendResponse({ success: true });
//       } else if (msg.action === "settingsChanged") {
//         this.settings = msg.settings;
//         this.updateTrackingDisplay();
//         sendResponse({ success: true });
//       }
//     });
//   }

//   initializeTracking() {
//     if (!this.settings.enableTracking) return;
//     this.observeSentFolder();
//     this.monitorCompose();
//     this.addTickIndicators();
//     setTimeout(() => this.startPeriodicUpdates(), 2000);
//   }

//   observeSentFolder() {
//     const target = document.querySelector('[role="main"] .ae4');
//     if (!target || this.sentEmailsObserver) return;

//     this.sentEmailsObserver = new MutationObserver(() => this.addTickIndicators());
//     this.sentEmailsObserver.observe(target, { childList: true, subtree: true });
//   }

//   monitorCompose() {
//     document.addEventListener("click", (e) => {
//       if (e.target.closest('[data-tooltip="Send"]')) {
//         this.handleSendClick();
//       }
//     });
//   }

//   async handleSendClick() {
//     if (!this.settings.enableTracking) return;
//     const compose = document.querySelector(".M9");
//     const data = this.extractEmailData(compose);
//     if (!data) return;
//     await this.injectTrackingPixel(compose, data);

//     try {
//       chrome.runtime.sendMessage({ action: "trackEmail", data });
//     } catch (err) {
//       console.warn("[Gmail Tracker] Failed to send trackEmail:", err.message);
//     }
//   }

//   extractEmailData(compose) {
//     try {
//       const recipient = compose.querySelector('input[name="to"], [email]')?.value || "";
//       const subject = compose.querySelector('input[name="subject"], [name="subjectbox"]')?.value || "No Subject";
//       return {
//         messageId: this.generateMessageId(),
//         recipient,
//         subject,
//         timestamp: Date.now()
//       };
//     } catch (e) {
//       console.warn("[Gmail Tracker] extractEmailData error:", e.message);
//       return null;
//     }
//   }

//   async injectTrackingPixel(compose, emailData) {
//     const bodyField = compose.querySelector('[aria-label="Message Body"]');
//     if (bodyField) {
//       const pixelUrl = `https://yourserver.com/track?mid=${emailData.messageId}`;
//       bodyField.innerHTML += `<img src="${pixelUrl}" width="1" height="1" style="display:none" />`;
//     }
//   }

//  getTrackedEmails(callback, retries = 3) {
//   try {
//     // Ensure chrome APIs are available
//     if (
//       typeof chrome === "undefined" ||
//       typeof chrome.runtime === "undefined" ||
//       typeof chrome.runtime.sendMessage !== "function" ||
//       typeof chrome.storage === "undefined" ||
//       typeof chrome.storage.local === "undefined"
//     ) {
//       console.warn("[Gmail Tracker] Runtime unavailable. Using fallback.");
//       return callback({});
//     }

//     chrome.runtime.sendMessage({ action: "getTrackedEmails" }, (response) => {
//       if (chrome.runtime.lastError || !response || !response.success) {
//         if (retries > 0) {
//           console.warn("[Gmail Tracker] Retrying getTrackedEmails...");
//           return setTimeout(() => this.getTrackedEmails(callback, retries - 1), 1000);
//         }

//         // Final fallback after all retries
//         chrome.storage.local.get(["trackedEmails"], (data) => {
//           callback(data?.trackedEmails || {});
//         });
//       } else {
//         callback(response.data || {});
//       }
//     });
//   } catch (err) {
//     console.warn("[Gmail Tracker] getTrackedEmails exception:", err.message);
//     try {
//       chrome?.storage?.local?.get(["trackedEmails"], (data) => {
//         callback(data?.trackedEmails || {});
//       });
//     } catch (fallbackErr) {
//       console.warn("[Gmail Tracker] storage fallback failed:", fallbackErr.message);
//       callback({});
//     }
//   }
// }


//   addTickIndicators() {
//     if (!this.settings.showTicks || !location.href.includes("#sent")) return;
//     const mainContainer = document.querySelector('[role="main"]');
//     if (!mainContainer) return;

//     this.getTrackedEmails((tracked) => {
//       mainContainer.querySelectorAll(".zA").forEach((row) => {
//         if (row.dataset.trackerProcessed) return;

//         const id = this.getMessageIdFromRow(row);
//         const trackedData = tracked[id];
//         const isRead = trackedData?.isRead;

//         const tick = document.createElement("div");
//         tick.className = "gmail-tracker-tick";
//         tick.innerHTML = isRead ? "<span class='tick double'>✓✓</span>" : "<span class='tick single'>✓</span>";
//         tick.title = isRead ? "Read" : "Sent";

//         const insertPoint = row.querySelector(".bog, .y6, .xY");
//         if (insertPoint) insertPoint.appendChild(tick);
//         row.dataset.trackerProcessed = "true";
//       });
//     });
//   }

//   startPeriodicUpdates() {
//     if (this.updateInterval) clearInterval(this.updateInterval);
//     this.updateInterval = setInterval(() => {
//       if (!this.settings.showTicks || !location.href.includes("#sent")) return;
//       const main = document.querySelector('[role="main"]');
//       if (!main) return;

//       this.getTrackedEmails((tracked) => {
//         main.querySelectorAll(".gmail-tracker-tick").forEach((tick) => {
//           const row = tick.closest(".zA");
//           const id = this.getMessageIdFromRow(row);
//           const data = tracked[id];
//           if (data?.isRead && !tick.innerHTML.includes("✓✓")) {
//             tick.innerHTML = "<span class='tick double'>✓✓</span>";
//             tick.title = "Read";
//           }
//         });
//       });
//     }, 30000);
//   }

//   generateMessageId() {
//     return "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
//   }

//   getMessageIdFromRow(row) {
//     return row.getAttribute("id") || row.dataset.threadId || "unknown_" + Date.now();
//   }

//   updateTrackingDisplay() {
//     document.querySelectorAll(".gmail-tracker-tick").forEach((e) => e.remove());
//     if (this.settings.showTicks) this.addTickIndicators();
//   }
// }

// if (document.readyState === "loading") {
//   document.addEventListener("DOMContentLoaded", () => new GmailTracker());
// } else {
//   new GmailTracker();
// }

// let lastUrl = location.href;
// setInterval(() => {
//   if (location.href !== lastUrl) {
//     lastUrl = location.href;
//     if (window.gmailTracker?.addTickIndicators) {
//       window.gmailTracker.addTickIndicators();
//     }
//   }
// }, 1000);

// content.js (Gmail Tracker)
// class GmailTracker {
//   constructor() {
//     this.isInitialized = false;
//     this.user = null;
//     this.settings = {
//       enableTracking: true,
//       showNotifications: true,
//       showTicks: true
//     };
//     this.updateInterval = null;

//     this.init();
//   }

//   init() {
//     if (this.isInitialized) return;
//     console.log("[Gmail Tracker] Initializing...");

//     this.waitForGmail(() => {
//       this.setupMessageListener();
//       this.loadSettings(() => {
//         this.initializeTracking();
//         this.isInitialized = true;
//         window.gmailTracker = this;
//         console.log("[Gmail Tracker] Initialized");
//       });
//     });
//   }

//   waitForGmail(callback) {
//     const check = () => {
//       const main = document.querySelector('[role="main"]');
//       if (main) callback();
//       else setTimeout(check, 1000);
//     };
//     check();
//   }

//   loadSettings(callback) {
//     try {
//       if (!chrome?.runtime?.sendMessage) return callback();

//       chrome.runtime.sendMessage({ action: "getSettings" }, (response) => {
//         if (chrome.runtime.lastError || !response?.success) {
//           console.warn("[Gmail Tracker] Failed to load settings:", chrome.runtime.lastError?.message || response?.error);
//           return callback();
//         }
//         this.settings = response.settings || this.settings;
//         this.user = response.user || null;
//         callback();
//       });
//     } catch (e) {
//       console.warn("[Gmail Tracker] loadSettings exception:", e.message);
//       callback();
//     }
//   }

//   setupMessageListener() {
//     chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//       if (msg.action === "initializeTracker") {
//         this.user = msg.user;
//         this.initializeTracking();
//         sendResponse({ success: true });
//       } else if (msg.action === "settingsChanged") {
//         this.settings = msg.settings;
//         this.updateTrackingDisplay();
//         sendResponse({ success: true });
//       }
//     });
//   }

//   initializeTracking() {
//     if (!this.settings.enableTracking) return;
//     this.observeSentFolder();
//     this.monitorCompose();
//     this.addTickIndicators();
//     setTimeout(() => this.startPeriodicUpdates(), 2000);
//   }

//   observeSentFolder() {
//     const target = document.querySelector('[role="main"] .ae4');
//     if (!target || this.sentEmailsObserver) return;

//     this.sentEmailsObserver = new MutationObserver(() => this.addTickIndicators());
//     this.sentEmailsObserver.observe(target, { childList: true, subtree: true });
//   }

//   monitorCompose() {
//     document.addEventListener("click", (e) => {
//       if (e.target.closest('[data-tooltip="Send"]')) {
//         this.handleSendClick();
//       }
//     });
//   }

//   async handleSendClick() {
//     if (!this.settings.enableTracking) return;
//     const compose = document.querySelector(".M9");
//     const data = this.extractEmailData(compose);
//     if (!data) return;
//     await this.injectTrackingPixel(compose, data);

//     try {
//       chrome.runtime.sendMessage({ action: "trackEmail", data });
//     } catch (err) {
//       console.warn("[Gmail Tracker] Failed to send trackEmail:", err.message);
//     }
//   }

//   extractEmailData(compose) {
//     try {
//       const recipient = compose.querySelector('input[name="to"], [email]')?.value || "";
//       const subject = compose.querySelector('input[name="subject"], [name="subjectbox"]')?.value || "No Subject";
//       return {
//         messageId: this.generateMessageId(),
//         recipient,
//         subject,
//         timestamp: Date.now()
//       };
//     } catch (e) {
//       console.warn("[Gmail Tracker] extractEmailData error:", e.message);
//       return null;
//     }
//   }

//   async injectTrackingPixel(compose, emailData) {
//     const bodyField = compose.querySelector('[aria-label="Message Body"]');
//     if (bodyField) {
//       const pixelUrl = `https://yourserver.com/track?mid=${emailData.messageId}`;
//       bodyField.innerHTML += `<img src="${pixelUrl}" width="1" height="1" style="display:none" />`;
//     }
//   }

//   getTrackedEmails(callback, retries = 3) {
//     const fallback = () => {
//       try {
//         if (chrome?.storage?.local?.get) {
//           chrome.storage.local.get(["trackedEmails"], (data) => {
//             callback(data?.trackedEmails || {});
//           });
//         } else {
//           callback({});
//         }
//       } catch (err) {
//         console.warn("[Gmail Tracker] Fallback storage read failed:", err.message);
//         callback({});
//       }
//     };

//     if (
//       !chrome?.runtime?.id ||
//       typeof chrome.runtime.sendMessage !== "function"
//     ) {
//       console.warn("[Gmail Tracker] Runtime unavailable. Using fallback.");
//       return fallback();
//     }

//     try {
//       chrome.runtime.sendMessage({ action: "getTrackedEmails" }, (response) => {
//         if (chrome.runtime.lastError || !response || !response.success) {
//           console.warn("[Gmail Tracker] sendMessage failed:", chrome.runtime.lastError?.message || response?.error);
//           if (retries > 0) {
//             return setTimeout(() => this.getTrackedEmails(callback, retries - 1), 1000);
//           }
//           return fallback();
//         }
//         callback(response.data || {});
//       });
//     } catch (err) {
//       console.warn("[Gmail Tracker] getTrackedEmails exception:", err.message);
//       return fallback();
//     }
//   }

//   addTickIndicators() {
//     if (!this.settings.showTicks || !location.href.includes("#sent")) return;
//     const mainContainer = document.querySelector('[role="main"]');
//     if (!mainContainer) return;

//     this.getTrackedEmails((tracked) => {
//       mainContainer.querySelectorAll(".zA").forEach((row) => {
//         if (row.dataset.trackerProcessed) return;

//         const id = this.getMessageIdFromRow(row);
//         const trackedData = tracked[id];
//         const isRead = trackedData?.isRead;

//         const tick = document.createElement("div");
//         tick.className = "gmail-tracker-tick";
//         tick.innerHTML = isRead ? "<span class='tick double'>✓✓</span>" : "<span class='tick single'>✓</span>";
//         tick.title = isRead ? "Read" : "Sent";

//         const insertPoint = row.querySelector(".bog, .y6, .xY");
//         if (insertPoint) insertPoint.appendChild(tick);
//         row.dataset.trackerProcessed = "true";
//       });
//     });
//   }

//   startPeriodicUpdates() {
//     if (this.updateInterval) clearInterval(this.updateInterval);
//     this.updateInterval = setInterval(() => {
//       if (!this.settings.showTicks || !location.href.includes("#sent")) return;
//       const main = document.querySelector('[role="main"]');
//       if (!main) return;

//       this.getTrackedEmails((tracked) => {
//         main.querySelectorAll(".gmail-tracker-tick").forEach((tick) => {
//           const row = tick.closest(".zA");
//           const id = this.getMessageIdFromRow(row);
//           const data = tracked[id];
//           if (data?.isRead && !tick.innerHTML.includes("✓✓")) {
//             tick.innerHTML = "<span class='tick double'>✓✓</span>";
//             tick.title = "Read";
//           }
//         });
//       });
//     }, 30000);
//   }

//   generateMessageId() {
//     return "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
//   }

//   getMessageIdFromRow(row) {
//     return row.getAttribute("id") || row.dataset.threadId || "unknown_" + Date.now();
//   }

//   updateTrackingDisplay() {
//     document.querySelectorAll(".gmail-tracker-tick").forEach((e) => e.remove());
//     if (this.settings.showTicks) this.addTickIndicators();
//   }
// }

// if (document.readyState === "loading") {
//   document.addEventListener("DOMContentLoaded", () => new GmailTracker());
// } else {
//   new GmailTracker();
// }

// let lastUrl = location.href;
// setInterval(() => {
//   if (location.href !== lastUrl) {
//     lastUrl = location.href;
//     if (window.gmailTracker?.addTickIndicators) {
//       window.gmailTracker.addTickIndicators();
//     }
//   }
// }, 1000);


//..............................


// class GmailTracker {
//   constructor() {
//     this.isInitialized = false;
//     this.user = null;
//     this.settings = {
//       enableTracking: true,
//       showNotifications: true,
//       showTicks: true
//     };
//     this.updateInterval = null;

//     this.init();
//   }

//   init() {
//     if (this.isInitialized) return;
//     console.log("[Gmail Tracker] Initializing...");

//     this.waitForGmail(() => {
//       this.setupMessageListener();
//       this.loadSettings(() => {
//         this.initializeTracking();
//         this.isInitialized = true;
//         window.gmailTracker = this;
//         console.log("[Gmail Tracker] Initialized");
//       });
//     });
//   }

//   waitForGmail(callback) {
//     const check = () => {
//       const main = document.querySelector('[role="main"]');
//       if (main) callback();
//       else setTimeout(check, 1000);
//     };
//     check();
//   }

//   loadSettings(callback) {
//     try {
//       if (!chrome?.runtime?.sendMessage) return callback();

//       chrome.runtime.sendMessage({ action: "getSettings" }, (response) => {
//         if (chrome.runtime.lastError || !response?.success) {
//           console.warn("[Gmail Tracker] Failed to load settings:", chrome.runtime.lastError?.message || response?.error);
//           return callback();
//         }
//         this.settings = response.settings || this.settings;
//         this.user = response.user || null;
//         callback();
//       });
//     } catch (e) {
//       console.warn("[Gmail Tracker] loadSettings exception:", e.message);
//       callback();
//     }
//   }

//   setupMessageListener() {
//     chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//       if (msg.action === "initializeTracker") {
//         this.user = msg.user;
//         this.initializeTracking();
//         sendResponse({ success: true });
//       } else if (msg.action === "settingsChanged") {
//         this.settings = msg.settings;
//         this.updateTrackingDisplay();
//         sendResponse({ success: true });
//       }
//     });
//   }

//   initializeTracking() {
//     if (!this.settings.enableTracking) return;
//     this.observeSentFolder();
//     this.monitorCompose();
//     this.addTickIndicators();
//     setTimeout(() => this.startPeriodicUpdates(), 2000);
//   }

//   observeSentFolder() {
//     const target = document.querySelector('[role="main"] .ae4');
//     if (!target || this.sentEmailsObserver) return;

//     this.sentEmailsObserver = new MutationObserver(() => this.addTickIndicators());
//     this.sentEmailsObserver.observe(target, { childList: true, subtree: true });
//   }

//   monitorCompose() {
//     document.addEventListener("click", (e) => {
//       const sendButton = e.target.closest('[data-tooltip="Send"], [aria-label="Send ‪(Ctrl-Enter)‬"]');
//       if (sendButton) {
//         this.handleSendClick();
//       }
//     });
//   }

//   async handleSendClick() {
//     if (!this.settings.enableTracking) return;
//     const compose = document.querySelector(".M9");
//     const data = this.extractEmailData(compose);
//     if (!data) return;
//     await this.injectTrackingPixel(compose, data);

//     try {
//       console.log("[Gmail Tracker] Sending trackEmail data:", data);
//       chrome.runtime.sendMessage({ action: "trackEmail", data });
//     } catch (err) {
//       console.warn("[Gmail Tracker] Failed to send trackEmail:", err.message);
//     }
//   }

//   extractEmailData(compose) {
//     try {
//       const recipient = compose.querySelector('input[name="to"], [email]')?.value || "";
//       const subject = compose.querySelector('input[name="subject"], [name="subjectbox"]')?.value || "No Subject";
//       return {
//         messageId: this.generateMessageId(),
//         recipient,
//         subject,
//         timestamp: Date.now()
//       };
//     } catch (e) {
//       console.warn("[Gmail Tracker] extractEmailData error:", e.message);
//       return null;
//     }
//   }

//   async injectTrackingPixel(compose, emailData) {
//   const pixelUrl = `https://gmail-tracker-1-ia1l.onrender.com/track?mid=${emailData.messageId}`;

//   try {
//     // Find the rich text editor div (Gmail's actual editor)
//     const bodyDiv = compose.querySelector('[aria-label="Message Body"][contenteditable="true"]');

//     if (bodyDiv) {
//       const img = document.createElement("img");
//       img.src = pixelUrl;
//       img.width = 1;
//       img.height = 1;
//       img.style.display = "none";
//       bodyDiv.appendChild(img);

//       console.log("[Gmail Tracker] Pixel injected into rich text body.");
//     } else {
//       console.warn("[Gmail Tracker] Rich text body not found. Injection failed.");
//     }
//   } catch (e) {
//     console.error("[Gmail Tracker] injectTrackingPixel error:", e.message);
//   }
// }


//   getTrackedEmails(callback, retries = 3) {
//     const fallback = () => {
//       try {
//         if (chrome?.storage?.local?.get) {
//           chrome.storage.local.get(["trackedEmails"], (data) => {
//             callback(data?.trackedEmails || {});
//           });
//         } else {
//           callback({});
//         }
//       } catch (err) {
//         console.warn("[Gmail Tracker] Fallback storage read failed:", err.message);
//         callback({});
//       }
//     };

//     if (!chrome?.runtime?.id || typeof chrome.runtime.sendMessage !== "function") {
//       console.warn("[Gmail Tracker] Runtime unavailable. Using fallback.");
//       return fallback();
//     }

//     try {
//       chrome.runtime.sendMessage({ action: "getTrackedEmails" }, (response) => {
//         if (chrome.runtime.lastError) {
//           console.warn("[Gmail Tracker] lastError:", chrome.runtime.lastError.message);
//         }
//         if (!response || !response.success) {
//           console.warn("[Gmail Tracker] sendMessage failed:", response?.error);
//           if (retries > 0) {
//             return setTimeout(() => this.getTrackedEmails(callback, retries - 1), 1000);
//           }
//           return fallback();
//         }
//         callback(response.data || {});
//       });
//     } catch (err) {
//       console.warn("[Gmail Tracker] getTrackedEmails exception:", err.message);
//       return fallback();
//     }
//   }

//   addTickIndicators() {
//     if (!this.settings.showTicks || !location.href.includes("#sent")) return;
//     const mainContainer = document.querySelector('[role="main"]');
//     if (!mainContainer) return;

//     this.getTrackedEmails((tracked) => {
//       mainContainer.querySelectorAll(".zA").forEach((row) => {
//         if (row.dataset.trackerProcessed) return;

//         const id = this.getMessageIdFromRow(row);
//         const trackedData = tracked[id];
//         const isRead = trackedData?.isRead;

//         const tick = document.createElement("div");
//         tick.className = "gmail-tracker-tick";
//         tick.innerHTML = isRead ? "<span class='tick double'>✓✓</span>" : "<span class='tick single'>✓</span>";
//         tick.title = isRead ? "Read" : "Sent";

//         const insertPoint = row.querySelector(".bog, .y6, .xY");
//         if (insertPoint) insertPoint.appendChild(tick);
//         row.dataset.trackerProcessed = "true";
//       });
//     });
//   }

//   startPeriodicUpdates() {
//     if (this.updateInterval) clearInterval(this.updateInterval);
//     this.updateInterval = setInterval(() => {
//       if (!this.settings.showTicks || !location.href.includes("#sent")) return;
//       const main = document.querySelector('[role="main"]');
//       if (!main) return;

//       this.getTrackedEmails((tracked) => {
//         main.querySelectorAll(".gmail-tracker-tick").forEach((tick) => {
//           const row = tick.closest(".zA");
//           const id = this.getMessageIdFromRow(row);
//           const data = tracked[id];
//           if (data?.isRead && !tick.innerHTML.includes("✓✓")) {
//             tick.innerHTML = "<span class='tick double'>✓✓</span>";
//             tick.title = "Read";
//           }
//         });
//       });
//     }, 30000);
//   }

//   generateMessageId() {
//     return "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
//   }

//   getMessageIdFromRow(row) {
//     return row.getAttribute("id") || row.dataset.threadId || "unknown_" + Date.now();
//   }

//   updateTrackingDisplay() {
//     document.querySelectorAll(".gmail-tracker-tick").forEach((e) => e.remove());
//     if (this.settings.showTicks) this.addTickIndicators();
//   }
// }

// if (document.readyState === "loading") {
//   document.addEventListener("DOMContentLoaded", () => new GmailTracker());
// } else {
//   new GmailTracker();
// }

// let lastUrl = location.href;
// setInterval(() => {
//   if (location.href !== lastUrl) {
//     lastUrl = location.href;
//     if (window.gmailTracker?.addTickIndicators) {
//       window.gmailTracker.addTickIndicators();
//     }
//   }
// }, 1000);


//...............................

// class GmailTracker {
//   constructor() {
//     this.isInitialized = false;
//     this.user = null;
//     this.settings = {
//       enableTracking: true,
//       showNotifications: true,
//       showTicks: true
//     };
//     this.updateInterval = null;
//     this.pixelMonitorInterval = null;

//     this.init();
//   }

//   init() {
//     if (this.isInitialized) return;
//     console.log("[Gmail Tracker] Initializing...");

//     this.waitForGmail(() => {
//       this.setupMessageListener();
//       this.loadSettings(() => {
//         this.initializeTracking();
//         this.isInitialized = true;
//         window.gmailTracker = this;
//         this.monitorPixelRequests();
//         this.startPixelMonitoring();
//         console.log("[Gmail Tracker] Initialized");
//       });
//     });
//   }

//   waitForGmail(callback) {
//     const check = () => {
//       const main = document.querySelector('[role="main"]');
//       if (main) callback();
//       else setTimeout(check, 1000);
//     };
//     check();
//   }

//   loadSettings(callback) {
//     try {
//       if (!chrome?.runtime?.sendMessage) return callback();

//       chrome.runtime.sendMessage({ action: "getSettings" }, (response) => {
//         if (chrome.runtime.lastError || !response?.success) {
//           console.warn("[Gmail Tracker] Failed to load settings:", chrome.runtime.lastError?.message || response?.error);
//           return callback();
//         }
//         this.settings = response.settings || this.settings;
//         this.user = response.user || null;
//         callback();
//       });
//     } catch (e) {
//       console.warn("[Gmail Tracker] loadSettings exception:", e.message);
//       callback();
//     }
//   }

//   setupMessageListener() {
//     chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
//       if (msg.action === "initializeTracker") {
//         this.user = msg.user;
//         this.initializeTracking();
//         sendResponse({ success: true });
//       } else if (msg.action === "settingsChanged") {
//         this.settings = msg.settings;
//         this.updateTrackingDisplay();
//         sendResponse({ success: true });
//       }
//     });
//   }

//   initializeTracking() {
//     if (!this.settings.enableTracking) return;
//     this.observeSentFolder();
//     this.monitorCompose();
//     this.addTickIndicators();
//     setTimeout(() => this.startPeriodicUpdates(), 2000);
//   }

//   observeSentFolder() {
//     const target = document.querySelector('[role="main"] .ae4');
//     if (!target || this.sentEmailsObserver) return;

//     this.sentEmailsObserver = new MutationObserver(() => this.addTickIndicators());
//     this.sentEmailsObserver.observe(target, { childList: true, subtree: true });
//   }

//   monitorCompose() {
//     document.addEventListener("click", (e) => {
//       const sendButton = e.target.closest('[data-tooltip="Send"], [aria-label="Send ‪(Ctrl-Enter)‬"]');
//       if (sendButton) {
//         this.handleSendClick();
//       }
//     });
//   }

//   async handleSendClick() {
//     if (!this.settings.enableTracking) return;
//     const compose = document.querySelector(".M9");
//     const data = this.extractEmailData(compose);
//     if (!data) return;

//     // Inject pixel and verify
//     const injectionSuccess = await this.injectTrackingPixel(compose, data);
    
//     if (!injectionSuccess) {
//       console.warn("[Gmail Tracker] ⚠️ Pixel injection may have failed!");
//     }

//     // Wait a moment then verify again
//     setTimeout(() => {
//       const verification = this.verifyPixelInjection(compose, data.messageId);
//       if (!verification.verificationPassed) {
//         console.error("[Gmail Tracker] ❌ Final verification failed - email may not be tracked!");
//       }
//     }, 1000);

//     try {
//       console.log("[Gmail Tracker] Sending trackEmail data:", data);
//       chrome.runtime.sendMessage({ action: "trackEmail", data });
//     } catch (err) {
//       console.warn("[Gmail Tracker] Failed to send trackEmail:", err.message);
//     }
//   }

//   extractEmailData(compose) {
//     try {
//       const recipient = compose.querySelector('input[name="to"], [email]')?.value || "";
//       const subject = compose.querySelector('input[name="subject"], [name="subjectbox"]')?.value || "No Subject";
//       return {
//         messageId: this.generateMessageId(),
//         recipient,
//         subject,
//         timestamp: Date.now()
//       };
//     } catch (e) {
//       console.warn("[Gmail Tracker] extractEmailData error:", e.message);
//       return null;
//     }
//   }

//   async injectTrackingPixel(compose, emailData) {
//     // const pixelUrl = `https://gmail-tracker-1-ia1l.onrender.com/track?mid=${emailData.messageId}`
//     // ;
//     const pixelUrl = `https://gmail-tracker-1-ia1l.onrender.com/track?mid=${emailData.messageId}&userId=${this.user?.id}`;

//     let injectionSuccess = false;
//     let injectionMethods = [];

//     try {
//       // First try to find the form element that contains the compose fields
//       // Gmail typically uses forms with specific classes or data attributes
//       let targetForm = compose.querySelector('form[enctype="multipart/form-data"]');
      
//       // If the multipart form isn't found, try other form selectors
//       if (!targetForm) {
//         targetForm = compose.querySelector('form[method="POST"]');
//       }
      
//       // If no form found, try to find the main compose container
//       if (!targetForm) {
//         targetForm = compose.querySelector('.aoD.hl') || compose.querySelector('.M9') || compose;
//       }

//       if (targetForm) {
//         // Check if we already injected a pixel to avoid duplicates
//         const existingPixel = targetForm.querySelector('.gmail-tracker-pixel');
//         if (existingPixel) {
//           console.log("[Gmail Tracker] ✅ Pixel already exists, updating URL.");
//           existingPixel.src = pixelUrl;
//           return this.verifyPixelInjection(compose, emailData.messageId);
//         }

//         // Create the tracking pixel as a hidden input (similar to MailSuite approach)
//         const pixelInput = document.createElement("input");
//         pixelInput.type = "hidden";
//         pixelInput.name = "gmail_tracker_pixel";
//         pixelInput.value = pixelUrl;
//         pixelInput.className = "gmail-tracker-pixel";
//         pixelInput.dataset.messageId = emailData.messageId;
        
//         // Also create an img element as backup
//         const pixelImg = document.createElement("img");
//         pixelImg.src = pixelUrl;
//         pixelImg.width = 1;
//         pixelImg.height = 1;
//         pixelImg.style.cssText = "display:none !important; position:absolute; width:1px; height:1px; opacity:0;";
//         pixelImg.className = "gmail-tracker-pixel";
//         pixelImg.dataset.messageId = emailData.messageId;
        
//         // Create a container div to hold both elements
//         const pixelContainer = document.createElement("div");
//         pixelContainer.style.cssText = "display:none !important; position:absolute; width:0; height:0; overflow:hidden;";
//         pixelContainer.className = "gmail-tracker-pixel-container";
//         pixelContainer.dataset.messageId = emailData.messageId;
        
//         // Add both elements to the container
//         pixelContainer.appendChild(pixelInput);
//         pixelContainer.appendChild(pixelImg);
        
//         // Append to the form element
//         targetForm.appendChild(pixelContainer);

//         injectionMethods.push("form-level");
//         injectionSuccess = true;
//         console.log("[Gmail Tracker] ✅ Pixel injected into form element using MailSuite approach.");
//       }
      
//       // Also try to inject into the message body as a fallback
//       const bodyDiv = compose.querySelector('[aria-label="Message Body"][contenteditable="true"]') || 
//                      compose.querySelector('[contenteditable="true"]') ||
//                      compose.querySelector('.Am.Al.editable');

//       if (bodyDiv && !bodyDiv.querySelector('.gmail-tracker-pixel')) {
//         const bodyPixel = document.createElement("img");
//         bodyPixel.src = pixelUrl;
//         bodyPixel.width = 1;
//         bodyPixel.height = 1;
//         bodyPixel.style.cssText = "display:none !important; position:absolute; width:1px; height:1px; opacity:0;";
//         bodyPixel.className = "gmail-tracker-pixel";
//         bodyPixel.dataset.messageId = emailData.messageId;
        
//         // Insert at the beginning of the body content
//         if (bodyDiv.firstChild) {
//           bodyDiv.insertBefore(bodyPixel, bodyDiv.firstChild);
//         } else {
//           bodyDiv.appendChild(bodyPixel);
//         }
        
//         injectionMethods.push("message-body");
//         injectionSuccess = true;
//         console.log("[Gmail Tracker] ✅ Backup pixel also injected into message body.");
//       }

//       if (!injectionSuccess) {
//         console.warn("[Gmail Tracker] No suitable form or container found for pixel injection.");
        
//         // Final fallback: try to inject anywhere in the compose window
//         const fallbackPixel = document.createElement("img");
//         fallbackPixel.src = pixelUrl;
//         fallbackPixel.width = 1;
//         fallbackPixel.height = 1;
//         fallbackPixel.style.cssText = "display:none !important; position:absolute; width:1px; height:1px; opacity:0;";
//         fallbackPixel.className = "gmail-tracker-pixel";
//         fallbackPixel.dataset.messageId = emailData.messageId;
        
//         compose.appendChild(fallbackPixel);
//         injectionMethods.push("fallback");
//         injectionSuccess = true;
//         console.log("[Gmail Tracker] ✅ Fallback pixel injection completed.");
//       }

//       // Verify injection after a short delay
//       setTimeout(() => {
//         this.verifyPixelInjection(compose, emailData.messageId);
//       }, 500);

//       // Log injection summary
//       console.log(`[Gmail Tracker] Injection Summary:`, {
//         success: injectionSuccess,
//         methods: injectionMethods,
//         messageId: emailData.messageId,
//         pixelUrl: pixelUrl
//       });

//       return injectionSuccess;

//     } catch (e) {
//       console.error("[Gmail Tracker] ❌ injectTrackingPixel error:", e.message);
//       return false;
//     }
//   }

//   // Comprehensive verification function
//   verifyPixelInjection(compose, messageId) {
//     console.log(`[Gmail Tracker] 🔍 Verifying pixel injection for message: ${messageId}`);
    
//     const results = {
//       messageId: messageId,
//       timestamp: new Date().toISOString(),
//       foundPixels: [],
//       totalPixels: 0,
//       verificationPassed: false
//     };

//     // Check all possible locations
//     const pixelSelectors = [
//       '.gmail-tracker-pixel',
//       '.gmail-tracker-pixel-container',
//       `[data-message-id="${messageId}"]`,
//       'input[name="gmail_tracker_pixel"]',
//       'img[src*="gmail-tracker"]'
//     ];

//     pixelSelectors.forEach(selector => {
//       const elements = compose.querySelectorAll(selector);
//       elements.forEach(el => {
//         const pixelInfo = {
//           selector: selector,
//           tagName: el.tagName,
//           className: el.className,
//           src: el.src || el.value || 'N/A',
//           location: this.getElementLocation(el),
//           visible: this.isElementVisible(el),
//           inDOM: document.contains(el)
//         };
//         results.foundPixels.push(pixelInfo);
//       });
//     });

//     results.totalPixels = results.foundPixels.length;
//     results.verificationPassed = results.totalPixels > 0;

//     // Enhanced logging
//     if (results.verificationPassed) {
//       console.log(`[Gmail Tracker] ✅ VERIFICATION PASSED: Found ${results.totalPixels} pixel(s)`);
//       results.foundPixels.forEach((pixel, index) => {
//         console.log(`[Gmail Tracker] Pixel ${index + 1}:`, pixel);
//       });
//     } else {
//       console.log(`[Gmail Tracker] ❌ VERIFICATION FAILED: No pixels found`);
//       this.debugComposeDOMStructure(compose);
//     }

//     return results;
//   }

//   // Helper function to get element location in DOM
//   getElementLocation(element) {
//     const path = [];
//     let current = element;
    
//     while (current && current !== document) {
//       let selector = current.tagName.toLowerCase();
//       if (current.id) selector += `#${current.id}`;
//       if (current.className) selector += `.${current.className.split(' ').join('.')}`;
//       path.unshift(selector);
//       current = current.parentElement;
//     }
    
//     return path.join(' > ');
//   }

//   // Check if element is actually visible
//   isElementVisible(element) {
//     const style = window.getComputedStyle(element);
//     return !(style.display === 'none' || 
//              style.visibility === 'hidden' || 
//              style.opacity === '0' ||
//              element.offsetWidth === 0 || 
//              element.offsetHeight === 0);
//   }

//   // Debug DOM structure when verification fails
//   debugComposeDOMStructure(compose) {
//     console.log("[Gmail Tracker] 🔧 DEBUG: Compose DOM Structure");
    
//     // Log main compose structure
//     console.log("Compose element:", compose);
//     console.log("Compose classes:", compose.className);
//     console.log("Compose children count:", compose.children.length);
    
//     // Log forms
//     const forms = compose.querySelectorAll('form');
//     console.log(`Found ${forms.length} form(s):`, forms);
    
//     // Log contenteditable elements
//     const editables = compose.querySelectorAll('[contenteditable="true"]');
//     console.log(`Found ${editables.length} contenteditable element(s):`, editables);
    
//     // Log all inputs
//     const inputs = compose.querySelectorAll('input');
//     console.log(`Found ${inputs.length} input(s):`, Array.from(inputs).map(i => ({
//       name: i.name,
//       type: i.type,
//       className: i.className
//     })));
//   }

//   // Real-time monitoring function
//   startPixelMonitoring() {
//     if (this.pixelMonitorInterval) {
//       clearInterval(this.pixelMonitorInterval);
//     }
    
//     this.pixelMonitorInterval = setInterval(() => {
//       const composeWindows = document.querySelectorAll('.M9');
//       composeWindows.forEach(compose => {
//         const pixels = compose.querySelectorAll('.gmail-tracker-pixel');
//         if (pixels.length > 0) {
//           pixels.forEach(pixel => {
//             const messageId = pixel.dataset.messageId;
//             if (messageId) {
//               console.log(`[Gmail Tracker] 📊 Monitoring pixel for message: ${messageId}`, {
//                 exists: true,
//                 inDOM: document.contains(pixel),
//                 src: pixel.src || pixel.value
//               });
//             }
//           });
//         }
//       });
//     }, 5000); // Check every 5 seconds
//   }

//   // Network monitoring to confirm pixel requests
//   monitorPixelRequests() {
//     // Override fetch to monitor pixel requests
//     const originalFetch = window.fetch;
//     window.fetch = function(...args) {
//       const url = args[0];
//       if (typeof url === 'string' && url.includes('gmail-tracker')) {
//         console.log('[Gmail Tracker] 🌐 Pixel request detected:', url);
//       }
//       return originalFetch.apply(this, args);
//     };
    
//     // Override XMLHttpRequest for older tracking methods
//     const originalXHR = window.XMLHttpRequest;
//     window.XMLHttpRequest = function() {
//       const xhr = new originalXHR();
//       const originalOpen = xhr.open;
//       xhr.open = function(method, url) {
//         if (typeof url === 'string' && url.includes('gmail-tracker')) {
//           console.log('[Gmail Tracker] 🌐 XHR pixel request detected:', url);
//         }
//         return originalOpen.apply(this, arguments);
//       };
//       return xhr;
//     };
//   }

//   getTrackedEmails(callback, retries = 3) {
//     const fallback = () => {
//       try {
//         if (chrome?.storage?.local?.get) {
//           chrome.storage.local.get(["trackedEmails"], (data) => {
//             callback(data?.trackedEmails || {});
//           });
//         } else {
//           callback({});
//         }
//       } catch (err) {
//         console.warn("[Gmail Tracker] Fallback storage read failed:", err.message);
//         callback({});
//       }
//     };

//     if (!chrome?.runtime?.id || typeof chrome.runtime.sendMessage !== "function") {
//       console.warn("[Gmail Tracker] Runtime unavailable. Using fallback.");
//       return fallback();
//     }

//     try {
//       chrome.runtime.sendMessage({ action: "getTrackedEmails" }, (response) => {
//         if (chrome.runtime.lastError) {
//           console.warn("[Gmail Tracker] lastError:", chrome.runtime.lastError.message);
//         }
//         if (!response || !response.success) {
//           console.warn("[Gmail Tracker] sendMessage failed:", response?.error);
//           if (retries > 0) {
//             return setTimeout(() => this.getTrackedEmails(callback, retries - 1), 1000);
//           }
//           return fallback();
//         }
//         callback(response.data || {});
//       });
//     } catch (err) {
//       console.warn("[Gmail Tracker] getTrackedEmails exception:", err.message);
//       return fallback();
//     }
//   }

//   addTickIndicators() {
//     if (!this.settings.showTicks || !location.href.includes("#sent")) return;
//     const mainContainer = document.querySelector('[role="main"]');
//     if (!mainContainer) return;

//     this.getTrackedEmails((tracked) => {
//       mainContainer.querySelectorAll(".zA").forEach((row) => {
//         if (row.dataset.trackerProcessed) return;

//         const id = this.getMessageIdFromRow(row);
//         const trackedData = tracked[id];
//         const isRead = trackedData?.isRead;

//         const tick = document.createElement("div");
//         tick.className = "gmail-tracker-tick";
//         tick.innerHTML = isRead ? "<span class='tick double'>✓✓</span>" : "<span class='tick single'>✓</span>";
//         tick.title = isRead ? "Read" : "Sent";

//         const insertPoint = row.querySelector(".bog, .y6, .xY");
//         if (insertPoint) insertPoint.appendChild(tick);
//         row.dataset.trackerProcessed = "true";
//       });
//     });
//   }

//   startPeriodicUpdates() {
//     if (this.updateInterval) clearInterval(this.updateInterval);
//     this.updateInterval = setInterval(() => {
//       if (!this.settings.showTicks || !location.href.includes("#sent")) return;
//       const main = document.querySelector('[role="main"]');
//       if (!main) return;

//       this.getTrackedEmails((tracked) => {
//         main.querySelectorAll(".gmail-tracker-tick").forEach((tick) => {
//           const row = tick.closest(".zA");
//           const id = this.getMessageIdFromRow(row);
//           const data = tracked[id];
//           if (data?.isRead && !tick.innerHTML.includes("✓✓")) {
//             tick.innerHTML = "<span class='tick double'>✓✓</span>";
//             tick.title = "Read";
//           }
//         });
//       });
//     }, 30000);
//   }

//   generateMessageId() {
//     return "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
//   }

//   getMessageIdFromRow(row) {
//     return row.getAttribute("id") || row.dataset.threadId || "unknown_" + Date.now();
//   }

//   updateTrackingDisplay() {
//     document.querySelectorAll(".gmail-tracker-tick").forEach((e) => e.remove());
//     if (this.settings.showTicks) this.addTickIndicators();
//   }
// }

// if (document.readyState === "loading") {
//   document.addEventListener("DOMContentLoaded", () => new GmailTracker());
// } else {
//   new GmailTracker();
// }

// let lastUrl = location.href;
// setInterval(() => {
//   if (location.href !== lastUrl) {
//     lastUrl = location.href;
//     if (window.gmailTracker?.addTickIndicators) {
//       window.gmailTracker.addTickIndicators();
//     }
//   }
// }, 1000);

//...................above claude's code....................

class GmailTracker {
  constructor() {
    this.isInitialized = false;
    this.user = null;
    this.settings = {
      enableTracking: true,
      showNotifications: true,
      showTicks: true
    };
    this.updateInterval = null;
    this.pixelMonitorInterval = null;

    this.init();
  }

  init() {
    if (this.isInitialized) return;
    console.log("[Gmail Tracker] Initializing...");

    this.waitForGmail(() => {
      this.setupMessageListener();
      this.loadSettings(() => {
        this.initializeTracking();
        this.isInitialized = true;
        window.gmailTracker = this;
        this.monitorPixelRequests();
        this.startPixelMonitoring();
        console.log("[Gmail Tracker] Initialized");
      });
    });
  }

  waitForGmail(callback) {
    const check = () => {
      const main = document.querySelector('[role="main"]');
      if (main) callback();
      else setTimeout(check, 1000);
    };
    check();
  }

  loadSettings(callback) {
    try {
      if (!chrome?.runtime?.sendMessage) return callback();

      chrome.runtime.sendMessage({ action: "getSettings" }, (response) => {
        if (chrome.runtime.lastError || !response?.success) {
          console.warn("[Gmail Tracker] Failed to load settings:", chrome.runtime.lastError?.message || response?.error);
          return callback();
        }
        this.settings = response.settings || this.settings;
        this.user = response.user || null;
        callback();
      });
    } catch (e) {
      console.warn("[Gmail Tracker] loadSettings exception:", e.message);
      callback();
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.action === "initializeTracker") {
        this.user = msg.user;
        this.initializeTracking();
        sendResponse({ success: true });
      } else if (msg.action === "settingsChanged") {
        this.settings = msg.settings;
        this.updateTrackingDisplay();
        sendResponse({ success: true });
      }
    });
  }

  initializeTracking() {
    if (!this.settings.enableTracking) return;
    this.observeSentFolder();
    this.monitorCompose();
    this.addTickIndicators();
    setTimeout(() => this.startPeriodicUpdates(), 2000);
  }

  observeSentFolder() {
    const target = document.querySelector('[role="main"] .ae4');
    if (!target || this.sentEmailsObserver) return;

    this.sentEmailsObserver = new MutationObserver(() => this.addTickIndicators());
    this.sentEmailsObserver.observe(target, { childList: true, subtree: true });
  }

  monitorCompose() {
    document.addEventListener("click", (e) => {
      const sendButton = e.target.closest('[data-tooltip="Send"], [aria-label="Send ‪(Ctrl-Enter)‬"]');
      if (sendButton) {
        this.handleSendClick();
      }
    });
  }

  async handleSendClick() {
    if (!this.settings.enableTracking) return;
    const compose = document.querySelector(".M9");
    const data = this.extractEmailData(compose);
    if (!data) return;

    // Inject pixel and verify
    const injectionSuccess = await this.injectTrackingPixel(compose, data);
    
    if (!injectionSuccess) {
      console.warn("[Gmail Tracker] ⚠️ Pixel injection may have failed!");
    }

    // Wait a moment then verify again
    setTimeout(() => {
      const verification = this.verifyPixelInjection(compose, data.messageId);
      if (!verification.verificationPassed) {
        console.error("[Gmail Tracker] ❌ Final verification failed - email may not be tracked!");
      }
    }, 1000);

    try {
      console.log("[Gmail Tracker] Sending trackEmail data:", data);
      await new Promise((resolve) =>
        chrome.runtime.sendMessage({ action: "trackEmail", data }, resolve)
      );
    } catch (err) {
      console.warn("[Gmail Tracker] Failed to send trackEmail:", err.message);
    }
  }

  extractEmailData(compose) {
  try {
    const subject = compose.querySelector('input[name="subject"], [name="subjectbox"]')?.value || "No Subject";

    // Gmail often uses span[email] or div[email] for recipient chips
    const recipientChips = compose.querySelectorAll('span[email], div[email]');
    const to = Array.from(recipientChips)
      .map(el => el.getAttribute('email'))
      .filter(Boolean);

    if (to.length === 0) {
      console.warn("[Gmail Tracker] No valid recipients found in compose window.");
      return null;
    }

    return {
      messageId: this.generateMessageId(),
      to,
      subject,
      timestamp: Date.now(),
      cc:[],
      bcc:[]
    };
  } catch (e) {
    console.warn("[Gmail Tracker] extractEmailData error:", e.message);
    return null;
  }
}
 
  async injectTrackingPixel(compose, emailData) {
    // const pixelUrl = `https://gmail-tracker-1-ia1l.onrender.com/track?mid=${emailData.messageId}`
    // ;
    const pixelUrl = `https://gmail-tracker-1-ia1l.onrender.com/track?mid=${emailData.messageId}&userId=${this.user?.userId || this.user?.sub}`;

    let injectionSuccess = false;
    let injectionMethods = [];

    try {
      // First try to find the form element that contains the compose fields
      // Gmail typically uses forms with specific classes or data attributes
      let targetForm = compose.querySelector('form[enctype="multipart/form-data"]');
      
      // If the multipart form isn't found, try other form selectors
      if (!targetForm) {
        targetForm = compose.querySelector('form[method="POST"]');
      }
      
      // If no form found, try to find the main compose container
      if (!targetForm) {
        targetForm = compose.querySelector('.aoD.hl') || compose.querySelector('.M9') || compose;
      }

      if (targetForm) {
        // Check if we already injected a pixel to avoid duplicates
        const existingPixel = targetForm.querySelector('.gmail-tracker-pixel');
        if (existingPixel) {
          console.log("[Gmail Tracker] ✅ Pixel already exists, updating URL.");
          existingPixel.src = pixelUrl;
          return this.verifyPixelInjection(compose, emailData.messageId);
        }

        // Create the tracking pixel as a hidden input (similar to MailSuite approach)
        const pixelInput = document.createElement("input");
        pixelInput.type = "hidden";
        pixelInput.name = "gmail_tracker_pixel";
        pixelInput.value = pixelUrl;
        pixelInput.className = "gmail-tracker-pixel";
        pixelInput.dataset.messageId = emailData.messageId;
        
        // Also create an img element as backup
        const pixelImg = document.createElement("img");
        pixelImg.src = pixelUrl;
        pixelImg.width = 1;
        pixelImg.height = 1;
        pixelImg.style.cssText = "display:none !important; position:absolute; width:1px; height:1px; opacity:0;";
        pixelImg.className = "gmail-tracker-pixel";
        pixelImg.dataset.messageId = emailData.messageId;
        
        // Create a container div to hold both elements
        const pixelContainer = document.createElement("div");
        pixelContainer.style.cssText = "display:none !important; position:absolute; width:0; height:0; overflow:hidden;";
        pixelContainer.className = "gmail-tracker-pixel-container";
        pixelContainer.dataset.messageId = emailData.messageId;
        
        // Add both elements to the container
        pixelContainer.appendChild(pixelInput);
        pixelContainer.appendChild(pixelImg);
        
        // Append to the form element
        targetForm.appendChild(pixelContainer);

        injectionMethods.push("form-level");
        injectionSuccess = true;
        console.log("[Gmail Tracker] ✅ Pixel injected into form element using MailSuite approach.");
      }
      
      // Also try to inject into the message body as a fallback
      const bodyDiv = compose.querySelector('[aria-label="Message Body"][contenteditable="true"]') || 
                     compose.querySelector('[contenteditable="true"]') ||
                     compose.querySelector('.Am.Al.editable');

      if (bodyDiv && !bodyDiv.querySelector('.gmail-tracker-pixel')) {
        const bodyPixel = document.createElement("img");
        bodyPixel.src = pixelUrl;
        bodyPixel.width = 1;
        bodyPixel.height = 1;
        bodyPixel.style.cssText = "display:none !important; position:absolute; width:1px; height:1px; opacity:0;";
        bodyPixel.className = "gmail-tracker-pixel";
        bodyPixel.dataset.messageId = emailData.messageId;
        
        // Insert at the beginning of the body content
        if (bodyDiv.firstChild) {
          bodyDiv.insertBefore(bodyPixel, bodyDiv.firstChild);
        } else {
          bodyDiv.appendChild(bodyPixel);
        }
        
        injectionMethods.push("message-body");
        injectionSuccess = true;
        console.log("[Gmail Tracker] ✅ Backup pixel also injected into message body.");
      }

      if (!injectionSuccess) {
        console.warn("[Gmail Tracker] No suitable form or container found for pixel injection.");
        
        // Final fallback: try to inject anywhere in the compose window
        const fallbackPixel = document.createElement("img");
        fallbackPixel.src = pixelUrl;
        fallbackPixel.width = 1;
        fallbackPixel.height = 1;
        fallbackPixel.style.cssText = "display:none !important; position:absolute; width:1px; height:1px; opacity:0;";
        fallbackPixel.className = "gmail-tracker-pixel";
        fallbackPixel.dataset.messageId = emailData.messageId;
        
        compose.appendChild(fallbackPixel);
        injectionMethods.push("fallback");
        injectionSuccess = true;
        console.log("[Gmail Tracker] ✅ Fallback pixel injection completed.");
      }

      // Verify injection after a short delay
      setTimeout(() => {
        this.verifyPixelInjection(compose, emailData.messageId);
      }, 500);

      // Log injection summary
      console.log(`[Gmail Tracker] Injection Summary:`, {
        success: injectionSuccess,
        methods: injectionMethods,
        messageId: emailData.messageId,
        pixelUrl: pixelUrl
      });

      return injectionSuccess;

    } catch (e) {
      console.error("[Gmail Tracker] ❌ injectTrackingPixel error:", e.message);
      return false;
    }
  }

  // Comprehensive verification function
  verifyPixelInjection(compose, messageId) {
    console.log(`[Gmail Tracker] 🔍 Verifying pixel injection for message: ${messageId}`);
    
    const results = {
      messageId: messageId,
      timestamp: new Date().toISOString(),
      foundPixels: [],
      totalPixels: 0,
      verificationPassed: false
    };

    // Check all possible locations
    const pixelSelectors = [
      '.gmail-tracker-pixel',
      '.gmail-tracker-pixel-container',
      `[data-message-id="${messageId}"]`,
      'input[name="gmail_tracker_pixel"]',
      'img[src*="gmail-tracker"]'
    ];

    pixelSelectors.forEach(selector => {
      const elements = compose.querySelectorAll(selector);
      elements.forEach(el => {
        const pixelInfo = {
          selector: selector,
          tagName: el.tagName,
          className: el.className,
          src: el.src || el.value || 'N/A',
          location: this.getElementLocation(el),
          visible: this.isElementVisible(el),
          inDOM: document.contains(el)
        };
        results.foundPixels.push(pixelInfo);
      });
    });

    results.totalPixels = results.foundPixels.length;
    results.verificationPassed = results.totalPixels > 0;

    // Enhanced logging
    if (results.verificationPassed) {
      console.log(`[Gmail Tracker] ✅ VERIFICATION PASSED: Found ${results.totalPixels} pixel(s)`);
      results.foundPixels.forEach((pixel, index) => {
        console.log(`[Gmail Tracker] Pixel ${index + 1}:`, pixel);
      });
    } else {
      console.log(`[Gmail Tracker] ❌ VERIFICATION FAILED: No pixels found`);
      this.debugComposeDOMStructure(compose);
    }

    return results;
  }

  // Helper function to get element location in DOM
  getElementLocation(element) {
    const path = [];
    let current = element;
    
    while (current && current !== document) {
      let selector = current.tagName.toLowerCase();
      if (current.id) selector += `#${current.id}`;
      if (current.className) selector += `.${current.className.split(' ').join('.')}`;
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }

  // Check if element is actually visible
  isElementVisible(element) {
    const style = window.getComputedStyle(element);
    return !(style.display === 'none' || 
             style.visibility === 'hidden' || 
             style.opacity === '0' ||
             element.offsetWidth === 0 || 
             element.offsetHeight === 0);
  }

  // Debug DOM structure when verification fails
  debugComposeDOMStructure(compose) {
    console.log("[Gmail Tracker] 🔧 DEBUG: Compose DOM Structure");
    
    // Log main compose structure
    console.log("Compose element:", compose);
    console.log("Compose classes:", compose.className);
    console.log("Compose children count:", compose.children.length);
    
    // Log forms
    const forms = compose.querySelectorAll('form');
    console.log(`Found ${forms.length} form(s):`, forms);
    
    // Log contenteditable elements
    const editables = compose.querySelectorAll('[contenteditable="true"]');
    console.log(`Found ${editables.length} contenteditable element(s):`, editables);
    
    // Log all inputs
    const inputs = compose.querySelectorAll('input');
    console.log(`Found ${inputs.length} input(s):`, Array.from(inputs).map(i => ({
      name: i.name,
      type: i.type,
      className: i.className
    })));
  }

  // Real-time monitoring function
  startPixelMonitoring() {
    if (this.pixelMonitorInterval) {
      clearInterval(this.pixelMonitorInterval);
    }
    
    this.pixelMonitorInterval = setInterval(() => {
      const composeWindows = document.querySelectorAll('.M9');
      composeWindows.forEach(compose => {
        const pixels = compose.querySelectorAll('.gmail-tracker-pixel');
        if (pixels.length > 0) {
          pixels.forEach(pixel => {
            const messageId = pixel.dataset.messageId;
            if (messageId) {
              console.log(`[Gmail Tracker] 📊 Monitoring pixel for message: ${messageId}`, {
                exists: true,
                inDOM: document.contains(pixel),
                src: pixel.src || pixel.value
              });
            }
          });
        }
      });
    }, 5000); // Check every 5 seconds
  }

  // Network monitoring to confirm pixel requests
  monitorPixelRequests() {
    // Override fetch to monitor pixel requests
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      if (typeof url === 'string' && url.includes('gmail-tracker')) {
        console.log('[Gmail Tracker] 🌐 Pixel request detected:', url);
      }
      return originalFetch.apply(this, args);
    };
    
    // Override XMLHttpRequest for older tracking methods
    const originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
      const xhr = new originalXHR();
      const originalOpen = xhr.open;
      xhr.open = function(method, url) {
        if (typeof url === 'string' && url.includes('gmail-tracker')) {
          console.log('[Gmail Tracker] 🌐 XHR pixel request detected:', url);
        }
        return originalOpen.apply(this, arguments);
      };
      return xhr;
    };
  }

  getTrackedEmails(callback, retries = 3) {
    const fallback = () => {
      try {
        if (chrome?.storage?.local?.get) {
          chrome.storage.local.get(["trackedEmails"], (data) => {
            callback(data?.trackedEmails || {});
          });
        } else {
          callback({});
        }
      } catch (err) {
        console.warn("[Gmail Tracker] Fallback storage read failed:", err.message);
        callback({});
      }
    };

    if (!chrome?.runtime?.id || typeof chrome.runtime.sendMessage !== "function") {
      console.warn("[Gmail Tracker] Runtime unavailable. Using fallback.");
      return fallback();
    }

    try {
      chrome.runtime.sendMessage({ action: "getTrackedEmails" }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn("[Gmail Tracker] lastError:", chrome.runtime.lastError.message);
        }
        if (!response || !response.success) {
          console.warn("[Gmail Tracker] sendMessage failed:", response?.error);
          if (retries > 0) {
            return setTimeout(() => this.getTrackedEmails(callback, retries - 1), 1000);
          }
          return fallback();
        }
        callback(response.data || {});
      });
    } catch (err) {
      console.warn("[Gmail Tracker] getTrackedEmails exception:", err.message);
      return fallback();
    }
  }

  addTickIndicators() {
    if (!this.settings.showTicks || !location.href.includes("#sent")) return;
    const mainContainer = document.querySelector('[role="main"]');
    if (!mainContainer) return;

    this.getTrackedEmails((tracked) => {
      mainContainer.querySelectorAll(".zA").forEach((row) => {
        if (row.dataset.trackerProcessed) return;

        const id = this.getMessageIdFromRow(row);
        const trackedData = tracked[id];
        const isRead = trackedData?.isRead;

        const tick = document.createElement("div");
        tick.className = "gmail-tracker-tick";
        tick.innerHTML = isRead ? "<span class='tick double'>✓✓</span>" : "<span class='tick single'>✓</span>";
        tick.title = isRead ? "Read" : "Sent";

        const insertPoint = row.querySelector(".bog, .y6, .xY");
        if (insertPoint) insertPoint.appendChild(tick);
        row.dataset.trackerProcessed = "true";
      });
    });
  }

  startPeriodicUpdates() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      if (!this.settings.showTicks || !location.href.includes("#sent")) return;
      const main = document.querySelector('[role="main"]');
      if (!main) return;

      this.getTrackedEmails((tracked) => {
        main.querySelectorAll(".gmail-tracker-tick").forEach((tick) => {
          const row = tick.closest(".zA");
          const id = this.getMessageIdFromRow(row);
          const data = tracked[id];
          if (data?.isRead && !tick.innerHTML.includes("✓✓")) {
            tick.innerHTML = "<span class='tick double'>✓✓</span>";
            tick.title = "Read";
          }
        });
      });
    }, 30000);
  }

  generateMessageId() {
    return "msg_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  getMessageIdFromRow(row) {
    return row.getAttribute("id") || row.dataset.threadId || "unknown_" + Date.now();
  }

  updateTrackingDisplay() {
    document.querySelectorAll(".gmail-tracker-tick").forEach((e) => e.remove());
    if (this.settings.showTicks) this.addTickIndicators();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new GmailTracker());
} else {
  new GmailTracker();
}

let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    if (window.gmailTracker?.addTickIndicators) {
      window.gmailTracker.addTickIndicators();
    }
  }
}, 1000);
