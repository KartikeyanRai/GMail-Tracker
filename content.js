// // Content Script for Gmail Tracker Extension
// // Updated Content Script for Gmail Tracker Extension




//...................above claude's code....................

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
//           console.warn(
//             "[Gmail Tracker] Failed to load settings:",
//             chrome.runtime.lastError?.message || response?.error
//           );
//           return callback();
//         }

//         this.settings = response.settings || this.settings;

//         if (response.user) {
//           this.user = response.user;
//           callback();
//         } else {
//           // Fallback: try to get user profile info manually
//           chrome.identity.getProfileUserInfo((profile) => {
//             if (chrome.runtime.lastError) {
//               console.warn("[Gmail Tracker] identity.getProfileUserInfo failed:", chrome.runtime.lastError.message);
//             } else {
//               console.log("[Gmail Tracker] Fallback user info fetched:", profile);
//               this.user = profile || null;
//             }
//             callback();
//           });
//         }
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
//       await new Promise((resolve) =>
//         chrome.runtime.sendMessage({ action: "trackEmail", data }, resolve)
//       );
//     } catch (err) {
//       console.warn("[Gmail Tracker] Failed to send trackEmail:", err.message);
//     }
//   }

//   extractEmailData(compose) {
//   try {
//     const subject = compose.querySelector('input[name="subject"], [name="subjectbox"]')?.value || "No Subject";

//     // Gmail often uses span[email] or div[email] for recipient chips
//     const recipientChips = compose.querySelectorAll('span[email], div[email]');
//     const to = Array.from(recipientChips)
//       .map(el => el.getAttribute('email'))
//       .filter(Boolean);

//     if (to.length === 0) {
//       console.warn("[Gmail Tracker] No valid recipients found in compose window.");
//       return null;
//     }

//   return {
//     messageId: this.generateMessageId(),
//     to,
//     subject,
//     timestamp: Date.now(),
//     cc: [],
//     bcc: [],
//     userId:  this.user?.sub || this.user?.id || "unknown"
//   };

//   } catch (e) {
//     console.warn("[Gmail Tracker] extractEmailData error:", e.message);
//     return null;
//   }
// }
 
//   async injectTrackingPixel(compose, emailData) {
//     // const pixelUrl = `https://gmail-tracker-1-ia1l.onrender.com/track?mid=${emailData.messageId}`
//     // ;
//     const pixelUrl = `https://gmail-tracker-1-ia1l.onrender.com/track?mid=${emailData.messageId}&userId=${this.user?.sub || this.user?.id || "unknown"}`;


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


//..............................
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
    this.lastMessageIdMap = new WeakMap();
 // ⬅️ Added to track messageIds per compose
    

    this.init();
  }

  observeSentFolder() {
    const target = document.querySelector('[role="main"] .ae4');
    if (!target || this.sentEmailsObserver) return;

    this.sentEmailsObserver = new MutationObserver(() => this.addTickIndicators());
    this.sentEmailsObserver.observe(target, { childList: true, subtree: true });
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
        console.warn(
          "[Gmail Tracker] Failed to load settings:",
          chrome.runtime.lastError?.message || response?.error
        );
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
    this.observeComposeWindows(); // ⬅️ Inject pixel early
    this.addTickIndicators();
    setTimeout(() => this.startPeriodicUpdates(), 2000);
  }

  observeComposeWindows() {
    const observer = new MutationObserver(() => {
      const composeWindows = document.querySelectorAll(".M9:not([data-tracker-injected])");
      composeWindows.forEach(compose => {
        compose.setAttribute("data-tracker-injected", "true");

        const messageId = this.generateMessageId();
        const emailData = {
          messageId,
          to: [],
          subject: "",
          timestamp: Date.now(),
          userId: this.user?.sub || this.user?.id || "unknown"
        };

        this.lastMessageIdMap.set(compose, messageId);
        this.injectTrackingPixel(compose, emailData);
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
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
    if (!compose) return;

    // Ensure user is loaded before proceeding
    if (!this.user || (!this.user.id && !this.user.sub)) {
      console.warn("[Gmail Tracker] User info missing. Attempting to reload...");
      await new Promise((resolve) => this.loadSettings(resolve));

      if (!this.user || (!this.user.id && !this.user.sub)) {
        console.error("[Gmail Tracker] ❌ Cannot inject pixel: user ID is still undefined.");
        return;
      }
    }

    const messageId = this.lastMessageIdMap?.get?.(compose) || this.generateMessageId();
    const data = this.extractEmailData(compose);
    if (!data) return;

    data.messageId = messageId;
    data.userId = this.user?.id || this.user?.sub || "unknown";  // Force-set correct userId

    console.log("[Gmail Tracker] Current user ID before injection:", data.userId);

    const injectionSuccess = await this.injectTrackingPixel(compose, data);
    if (!injectionSuccess) {
      console.warn("[Gmail Tracker] ⚠️ Pixel injection may have failed!");
    }

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
      const recipientChips = compose.querySelectorAll('span[email], div[email]');
      const to = Array.from(recipientChips).map(el => el.getAttribute('email')).filter(Boolean);
      if (to.length === 0) {
        console.warn("[Gmail Tracker] No valid recipients found in compose window.");
        return null;
      }
      return {
        messageId: this.generateMessageId(),
        to,
        subject,
        timestamp: Date.now(),
        cc: [],
        bcc: []
      };
    } catch (e) {
      console.warn("[Gmail Tracker] extractEmailData error:", e.message);
      return null;
    }
  }
 
  // async injectTrackingPixel(compose, emailData) {
  //   // const pixelUrl = `https://gmail-tracker-1-ia1l.onrender.com/track?mid=${emailData.messageId}`
  //   // ;
  //   if (!this.user || (!this.user.id && !this.user. sub)) {
  //     console.warn("[Gmail Tracker] injectTrackingPixel: user not loaded. Retrying...");
  //     await new Promise((resolve) => this.loadSettings(resolve));

  //     if (!this.user || (!this.user.id && !this.user.sub)) {
  //       console.error("[Gmail Tracker] ❌ Cannot inject pixel: user ID is still undefined.");
  //       return false;
  //     }
  //   }

  //   console.log("[Gmail Tracker] USER BEFORE PIXEL:", this.user);
  //   const pixelUrl = `https://gmail-tracker-1-ia1l.onrender.com/track?mid=${emailData.messageId}&userId=${this.user?.sub || this.user?.id || "unknown"}`;


  //   let injectionSuccess = false;
  //   let injectionMethods = [];

  //   try {
  //     // First try to find the form element that contains the compose fields
  //     // Gmail typically uses forms with specific classes or data attributes
  //     let targetForm = compose.querySelector('form[enctype="multipart/form-data"]');
      
  //     // If the multipart form isn't found, try other form selectors
  //     if (!targetForm) {
  //       targetForm = compose.querySelector('form[method="POST"]');
  //     }
      
  //     // If no form found, try to find the main compose container
  //     if (!targetForm) {
  //       targetForm = compose.querySelector('.aoD.hl') || compose.querySelector('.M9') || compose;
  //     }

  //     if (targetForm) {
  //       // Check if we already injected a pixel to avoid duplicates
  //       const existingPixel = targetForm.querySelector('.gmail-tracker-pixel');
  //       if (existingPixel) {
  //         console.log("[Gmail Tracker] ✅ Pixel already exists, updating URL.");
  //         existingPixel.src = pixelUrl;
  //         return this.verifyPixelInjection(compose, emailData.messageId);
  //       }

  //       // Create the tracking pixel as a hidden input (similar to MailSuite approach)
  //       const pixelInput = document.createElement("input");
  //       pixelInput.type = "hidden";
  //       pixelInput.name = "gmail_tracker_pixel";
  //       pixelInput.value = pixelUrl;
  //       pixelInput.className = "gmail-tracker-pixel";
  //       pixelInput.dataset.messageId = emailData.messageId;
        
  //       // Also create an img element as backup
  //       const pixelImg = document.createElement("img");
  //       pixelImg.src = pixelUrl;
  //       pixelImg.width = 1;
  //       pixelImg.height = 1;
  //       pixelImg.style.cssText = "display:none !important; position:absolute; width:1px; height:1px; opacity:0;";
  //       pixelImg.className = "gmail-tracker-pixel";
  //       pixelImg.dataset.messageId = emailData.messageId;
        
  //       // Create a container div to hold both elements
  //       const pixelContainer = document.createElement("div");
  //       pixelContainer.style.cssText = "display:none !important; position:absolute; width:0; height:0; overflow:hidden;";
  //       pixelContainer.className = "gmail-tracker-pixel-container";
  //       pixelContainer.dataset.messageId = emailData.messageId;
        
  //       // Add both elements to the container
  //       pixelContainer.appendChild(pixelInput);
  //       pixelContainer.appendChild(pixelImg);
        
  //       // Append to the form element
  //       targetForm.appendChild(pixelContainer);

  //       injectionMethods.push("form-level");
  //       injectionSuccess = true;
  //       console.log("[Gmail Tracker] ✅ Pixel injected into form element using MailSuite approach.");
  //     }
      
  //     // Also try to inject into the message body as a fallback
  //     const bodyDiv = compose.querySelector('[aria-label="Message Body"][contenteditable="true"]') || 
  //                    compose.querySelector('[contenteditable="true"]') ||
  //                    compose.querySelector('.Am.Al.editable');

  //     if (bodyDiv && !bodyDiv.querySelector('.gmail-tracker-pixel')) {
  //       const bodyPixel = document.createElement("img");
  //       bodyPixel.src = pixelUrl;
  //       bodyPixel.width = 1;
  //       bodyPixel.height = 1;
  //       bodyPixel.style.cssText = "display:none !important; position:absolute; width:1px; height:1px; opacity:0;";
  //       bodyPixel.className = "gmail-tracker-pixel";
  //       bodyPixel.dataset.messageId = emailData.messageId;
        
  //       // Insert at the beginning of the body content
  //       if (bodyDiv.firstChild) {
  //         bodyDiv.insertBefore(bodyPixel, bodyDiv.firstChild);
  //       } else {
  //         bodyDiv.appendChild(bodyPixel);
  //       }
        
  //       injectionMethods.push("message-body");
  //       injectionSuccess = true;
  //       console.log("[Gmail Tracker] ✅ Backup pixel also injected into message body.");
  //     }

  //     if (!injectionSuccess) {
  //       console.warn("[Gmail Tracker] No suitable form or container found for pixel injection.");
        
  //       // Final fallback: try to inject anywhere in the compose window
  //       const fallbackPixel = document.createElement("img");
  //       fallbackPixel.src = pixelUrl;
  //       fallbackPixel.width = 1;
  //       fallbackPixel.height = 1;
  //       fallbackPixel.style.cssText = "display:none !important; position:absolute; width:1px; height:1px; opacity:0;";
  //       fallbackPixel.className = "gmail-tracker-pixel";
  //       fallbackPixel.dataset.messageId = emailData.messageId;
        
  //       compose.appendChild(fallbackPixel);
  //       injectionMethods.push("fallback");
  //       injectionSuccess = true;
  //       console.log("[Gmail Tracker] ✅ Fallback pixel injection completed.");
  //     }

  //     // Verify injection after a short delay
  //     setTimeout(() => {
  //       this.verifyPixelInjection(compose, emailData.messageId);
  //     }, 500);

  //     // Log injection summary
  //     console.log(`[Gmail Tracker] Injection Summary:`, {
  //       success: injectionSuccess,
  //       methods: injectionMethods,
  //       messageId: emailData.messageId,
  //       pixelUrl: pixelUrl
  //     });

  //     return injectionSuccess;

  //   } catch (e) {
  //     console.error("[Gmail Tracker] ❌ injectTrackingPixel error:", e.message);
  //     return false;
  //   }
  // }

  // ✅ UPDATED injectTrackingPixel() using MailSuite-compatible safe markup
  async injectTrackingPixel(compose, emailData) {
    const pixelUrl = `https://gmail-tracker-1-ia1l.onrender.com/track?mid=${emailData.messageId}&userId=${emailData.userId || this.user?.sub || this.user?.id || "unknown"}`;

    try {
      // Avoid duplicate injection
      const existing = compose.querySelector(`img[src*="${emailData.messageId}"]`);
      if (existing) {
        console.log("[Gmail Tracker] ✅ Pixel already exists");
        return true;
      }

      // Safe wrapper div
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "height:1px;width:1px;overflow:hidden;";
      wrapper.className = "pixel-wrapper";

      // Safer pixel img (no suspicious keywords)
      const pixelImg = document.createElement("img");
      pixelImg.src = pixelUrl;
      pixelImg.width = 1;
      pixelImg.height = 1;
      pixelImg.style.cssText = "border:0;";
      pixelImg.referrerPolicy = "no-referrer";
      pixelImg.setAttribute("aria-hidden", "true");

      wrapper.appendChild(pixelImg);

      // Inject into body content
      const bodyDiv =
        compose.querySelector('[aria-label="Message Body"][contenteditable="true"]') ||
        compose.querySelector('.Am.Al.editable');

      if (bodyDiv) {
        bodyDiv.appendChild(wrapper);
        console.log("[Gmail Tracker] ✅ Pixel injected into message body (safe style)");
        return true;
      } else {
        console.warn("[Gmail Tracker] ⚠️ Could not find message body to inject pixel.");
        return false;
      }
    } catch (e) {
      console.error("[Gmail Tracker] ❌ Pixel injection failed:", e.message);
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

// 🔄 React to URL changes
let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    if (window.gmailTracker?.addTickIndicators) {
      window.gmailTracker.addTickIndicators();
    }
  }
}, 1000);

