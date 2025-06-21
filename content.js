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
      if (e.target.closest('[data-tooltip="Send"]')) {
        this.handleSendClick();
      }
    });
  }

  async handleSendClick() {
    if (!this.settings.enableTracking) return;
    const compose = document.querySelector(".M9");
    const data = this.extractEmailData(compose);
    if (!data) return;
    await this.injectTrackingPixel(compose, data);

    try {
      chrome.runtime.sendMessage({ action: "trackEmail", data });
    } catch (err) {
      console.warn("[Gmail Tracker] Failed to send trackEmail:", err.message);
    }
  }

  extractEmailData(compose) {
    try {
      const recipient = compose.querySelector('input[name="to"], [email]')?.value || "";
      const subject = compose.querySelector('input[name="subject"], [name="subjectbox"]')?.value || "No Subject";
      return {
        messageId: this.generateMessageId(),
        recipient,
        subject,
        timestamp: Date.now()
      };
    } catch (e) {
      console.warn("[Gmail Tracker] extractEmailData error:", e.message);
      return null;
    }
  }

  async injectTrackingPixel(compose, emailData) {
    const bodyField = compose.querySelector('[aria-label="Message Body"]');
    if (bodyField) {
      const pixelUrl = `https://yourserver.com/track?mid=${emailData.messageId}`;
      bodyField.innerHTML += `<img src="${pixelUrl}" width="1" height="1" style="display:none" />`;
    }
  }

  getTrackedEmails(callback, retries = 3) {
    if (!chrome?.runtime?.sendMessage) {
      console.warn("[Gmail Tracker] Runtime unavailable. Using fallback.");
      chrome.storage.local.get(["trackedEmails"], (data) => {
        callback(data.trackedEmails || {});
      });
      return;
    }

    try {
      chrome.runtime.sendMessage({ action: "getTrackedEmails" }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          if (retries > 0) {
            console.warn("[Gmail Tracker] Retrying getTrackedEmails...");
            return setTimeout(() => this.getTrackedEmails(callback, retries - 1), 1000);
          }
          chrome.storage.local.get(["trackedEmails"], (data) => {
            callback(data.trackedEmails || {});
          });
        } else {
          callback(response.data || {});
        }
      });
    } catch (e) {
      console.warn("[Gmail Tracker] getTrackedEmails exception:", e.message);
      chrome.storage.local.get(["trackedEmails"], (data) => {
        callback(data.trackedEmails || {});
      });
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


