const DEBUG_MODE = false;
class GmailTracker {
  constructor() {
    this.isInitialized = false;
    this.user = null;
    this.settings = {
      enableTracking: true,
      showNotifications: true,
      showTicks: true,
    };
    this.updateInterval = null;
    this.pixelMonitorInterval = null;
    this.lastMessageIdMap = new WeakMap();
    if (DEBUG_MODE) console.log("[Gmail Tracker] Instance created");
  }

  init() {
    if (DEBUG_MODE)
      console.log("[Gmail Tracker] content.js loaded at", new Date());
    if (this.isInitialized) return;

    this.isInitialized = true;
    if (DEBUG_MODE) console.log("[Gmail Tracker] Initializing...");

    window.gmailTracker = this;
    window.gmailTrackerReady = true;

    this.injectTickStyles();

    this.waitForGmail(() => {
      this.setupMessageListener();
      this.loadSettings(() => {
        this.initializeTracking();
        this.monitorPixelRequests();
        this.startPixelMonitoring();
        if (DEBUG_MODE)
          console.log("[Gmail Tracker] ✅ Initialized from content.js");
      });
    });

    this.observeNavigation();
  }

  injectTickStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .gmail-tracker-tick {
        margin-left: 8px;
        font-size: 13px;
        color: green;
        font-weight: bold;
      }
      .tick.single::after { content: '✓'; }
      .tick.double::after { content: '✓✓'; }
    `;
    document.head.appendChild(style);
  }

  observeNavigation() {
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        if (window.gmailTracker?.addTickIndicators) {
          if (DEBUG_MODE)
            console.log("[Gmail Tracker] Route changed, updating ticks");
          window.gmailTracker.addTickIndicators();
        }
      }
    }, 1000);
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
        if (response.user && (response.user.id || response.user.sub)) {
          this.user = response.user;
          return callback();
        }

        
        chrome.identity.getProfileUserInfo((profile) => {
          if (chrome.runtime.lastError) {
            console.warn(
              "[Gmail Tracker] identity.getProfileUserInfo failed:",
              chrome.runtime.lastError.message
            );
          }
          this.user = {
            id: profile?.id || profile?.userId || "unknown",
          };
          callback();
        });
      });
    } catch (e) {
      console.warn("[Gmail Tracker] loadSettings exception:", e.message);
      this.user = { id: "unknown" };
      callback();
    }
  }

  getGmailNativeId(row) {
    try {
      if (DEBUG_MODE) console.log("[Gmail Tracker] getGmailNativeId called");

      
      const legacyId = row.getAttribute("data-legacy-thread-id");
      if (legacyId) {
        const full = `#thread-a:${legacyId}`;
        if (DEBUG_MODE)
          console.log("✅ Found via data-legacy-thread-id:", full);
        return full;
      }

      
      const inner = row.querySelector("[data-thread-id]");
      if (inner) {
        let threadId = inner.getAttribute("data-thread-id");

        
        threadId = threadId.replace(/^#thread-[a-z]:/, "");
        const full = `#thread-a:${threadId}`;
        if (DEBUG_MODE)
          console.log("✅ Cleaned threadId from nested data-thread-id:", full);
        return full;
      }

      
      const potential = row.querySelector("[href*='#thread']");
      if (potential) {
        const href = potential.getAttribute("href");
        const match = href?.match(/#thread-[^:]+:r[^/]+/);
        if (match) {
          if (DEBUG_MODE) console.log("✅ Found via href match:", match[0]);
          return match[0];
        }
      }

      console.warn("❌ Could not extract Gmail native ID from row:", row);
      return null;
    } catch (e) {
      console.warn("[Gmail Tracker] Failed to extract threadId:", e);
      return null;
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
      } else if (msg.action === "trackedEmailsUpdated") {
        chrome.storage.local.get("trackedEmails", (data) => {
          const trackedMap = data.trackedEmails || {};
          this.updateGmailTicks(trackedMap);
        });
      }
    });
  }

  initializeTracking() {
    if (!this.settings.enableTracking) return;
    this.observeSentFolder();
    this.monitorCompose();
    this.observeComposeWindows();
    this.addTickIndicators();
    setTimeout(() => this.startPeriodicUpdates(), 2000);
  }

  isInSentFolder() {
    return (
      location.href.includes("/sent") ||
      document
        .querySelector('a[aria-current="page"]')
        ?.textContent?.toLowerCase()
        .includes("sent")
    );
  }

  observeSentFolder() {
    const target = document.querySelector('[role="main"] .ae4');
    if (!target || this.sentEmailsObserver) return;

    this.sentEmailsObserver = new MutationObserver(() =>
      this.addTickIndicators()
    );
    this.sentEmailsObserver.observe(target, { childList: true, subtree: true });
  }

  observeComposeWindows() {
    const observer = new MutationObserver(() => {
      const composeWindows = document.querySelectorAll(
        ".M9:not([data-tracker-injected])"
      );

      composeWindows.forEach((compose) => {
        compose.setAttribute("data-tracker-injected", "true");

        const messageId = this.getGmailMessageIdFromCompose(compose);
        if (!messageId) {
          console.warn(
            "[Gmail Tracker] No Gmail-native messageId found in compose."
          );
          return;
        }

        const emailData = {
          messageId,
          to: [],
          subject: "",
          timestamp: Date.now(),
          userId: this.user?.sub || this.user?.id || "unknown",
        };

        this.lastMessageIdMap.set(compose, messageId);
        this.injectTrackingPixel(compose, emailData);
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  monitorCompose() {
    document.addEventListener("click", (e) => {
      const sendButton = e.target.closest(
        '[data-tooltip="Send"], [aria-label="Send ‪(Ctrl-Enter)‬"]'
      );
      if (sendButton) {
        this.handleSendClick();
      }
    });
  }

  getGmailMessageIdFromCompose(compose) {
    const hiddenInputs = compose.querySelectorAll("input[name][value]");
    for (const input of hiddenInputs) {
      if (["rt", "th", "msgid"].includes(input.name)) {
        return input.value;
      }
    }
    return null;
  }

  async handleSendClick() {
    if (!this.settings.enableTracking) return;

    const compose = document.querySelector(".M9");
    if (!compose) return;

    if (!this.user || (!this.user.id && !this.user.sub)) {
      console.warn(
        "[Gmail Tracker] User info missing. Attempting to reload..."
      );
      await new Promise((resolve) => this.loadSettings(resolve));

      if (!this.user || (!this.user.id && !this.user.sub)) {
        console.error(
          "[Gmail Tracker]  Cannot inject pixel: user ID is still undefined."
        );
        return;
      }
    }

    const threadIdInput = compose.querySelector('input[name="rt"]');
    const messageIdInput = compose.querySelector('input[name="msgid"]');

    const messageId = this.getGmailMessageIdFromCompose(compose);
    if (!messageId) {
      console.warn(
        "[Gmail Tracker] Could not extract Gmail native message ID."
      );
      return;
    }

    const data = this.extractEmailData(compose);
    if (!data) return;

    data.messageId = messageId;
    data.userId = this.user?.id || this.user?.sub || "unknown"; // Force-set correct userId

    if (DEBUG_MODE)
      console.log(
        "[Gmail Tracker] Current user ID before injection:",
        data.userId
      );

    const injectionSuccess = await this.injectTrackingPixel(compose, data);
    if (!injectionSuccess) {
      console.warn("[Gmail Tracker]  Pixel injection may have failed!");
    }

    setTimeout(() => {
      const sentRows = document.querySelectorAll('[role="main"] .zA');
      for (const row of sentRows) {
        const nativeId = this.getGmailNativeId(row);
        if (nativeId && !row.getAttribute("data-msg-id")) {
          row.setAttribute("data-msg-id", nativeId);
          if (DEBUG_MODE)
            console.log(
              "[Gmail Tracker] Tagged row with native Gmail ID:",
              nativeId
            );
        }
      }

     
      const verification = this.verifyPixelInjection(compose, data.messageId);
      if (!verification.verificationPassed) {
        console.error(
          "[Gmail Tracker] Final verification failed - email may not be tracked!"
        );
      }
    }, 1000);

    
    try {
      if (DEBUG_MODE)
        console.log("[Gmail Tracker] Sending trackEmail data:", data);
      await new Promise((resolve) =>
        chrome.runtime.sendMessage({ action: "trackEmail", data }, resolve)
      );
    } catch (err) {
      console.warn("[Gmail Tracker] Failed to send trackEmail:", err.message);
    }

    chrome.storage.local.get("trackedEmails", (data) => {
      const trackedMap = data.trackedEmails || {};
      this.updateGmailTicks(trackedMap);
    });
  }
  extractEmailData(compose) {
    try {
      const subject =
        compose.querySelector('input[name="subject"], [name="subjectbox"]')
          ?.value || "No Subject";

      const recipientChips = compose.querySelectorAll(
        "span[email], div[email]"
      );
      const to = Array.from(recipientChips)
        .map((el) => el.getAttribute("email"))
        .filter(Boolean);

      if (to.length === 0) {
        console.warn(
          "[Gmail Tracker] No valid recipients found in compose window."
        );
        return null;
      }

      return {
        to,
        subject,
        timestamp: Date.now(),
        cc: [],
        bcc: [],
      };
    } catch (e) {
      console.warn("[Gmail Tracker] extractEmailData error:", e.message);
      return null;
    }
  }

  async injectTrackingPixel(compose, emailData) {
    const userId =
      emailData.userId || this.user?.id || this.user?.sub || "unknown";
    const pixelUrl = `https://gmail-tracker-1-ia1l.onrender.com/track?mid=${encodeURIComponent(
      emailData.messageId
    )}&userId=${encodeURIComponent(userId)}`;
    try {
      const existing = compose.querySelector(
        `img[src*="${emailData.messageId}"]`
      );
      if (existing) {
        if (DEBUG_MODE) console.log("[Gmail Tracker] Pixel already exists");
        return true;
      }

      const wrapper = document.createElement("div");
      wrapper.style.cssText = "height:1px;width:1px;overflow:hidden;";
      wrapper.className = "pixel-wrapper";

      const pixelImg = document.createElement("img");
      pixelImg.src = pixelUrl;
      pixelImg.width = 1;
      pixelImg.height = 1;
      pixelImg.style.cssText = "border:0;";
      pixelImg.referrerPolicy = "no-referrer";
      pixelImg.setAttribute("aria-hidden", "true");
      pixelImg.className = "gmail-tracker-pixel";
      pixelImg.setAttribute("data-message-id", emailData.messageId);

      wrapper.appendChild(pixelImg);

      const bodyDiv =
        compose.querySelector(
          '[aria-label="Message Body"][contenteditable="true"]'
        ) || compose.querySelector(".Am.Al.editable");

      if (bodyDiv) {
        bodyDiv.appendChild(wrapper);
        console.log(
          "[Gmail Tracker] Pixel injected into message body (safe style)"
        );
        return true;
      } else {
        console.warn(
          "[Gmail Tracker] Could not find message body to inject pixel."
        );
        return false;
      }
    } catch (e) {
      console.error("[Gmail Tracker] Pixel injection failed:", e.message);
      return false;
    }
  }

  verifyPixelInjection(compose, messageId) {
    if (DEBUG_MODE)
      console.log(
        `[Gmail Tracker] 🔍 Verifying pixel injection for message: ${messageId}`
      );

    const results = {
      messageId: messageId,
      timestamp: new Date().toISOString(),
      foundPixels: [],
      totalPixels: 0,
      verificationPassed: false,
    };

    const pixelSelectors = [
      ".gmail-tracker-pixel",
      ".gmail-tracker-pixel-container",
      `[data-message-id="${messageId}"]`,
      'input[name="gmail_tracker_pixel"]',
      'img[src*="gmail-tracker"]',
    ];

    pixelSelectors.forEach((selector) => {
      const elements = compose.querySelectorAll(selector);
      elements.forEach((el) => {
        const pixelInfo = {
          selector: selector,
          tagName: el.tagName,
          className: el.className,
          src: el.src || el.value || "N/A",
          location: this.getElementLocation(el),
          visible: this.isElementVisible(el),
          inDOM: document.contains(el),
        };
        results.foundPixels.push(pixelInfo);
      });
    });

    results.totalPixels = results.foundPixels.length;
    results.verificationPassed = results.totalPixels > 0;

    if (results.verificationPassed) {
      console.log(
        `[Gmail Tracker] VERIFICATION PASSED: Found ${results.totalPixels} pixel(s)`
      );
      results.foundPixels.forEach((pixel, index) => {
        console.log(`[Gmail Tracker] Pixel ${index + 1}:`, pixel);
      });
    } else {
      console.log(`[Gmail Tracker] VERIFICATION FAILED: No pixels found`);
      this.debugComposeDOMStructure(compose);
    }

    return results;
  }

  getElementLocation(element) {
    const path = [];
    let current = element;

    while (current && current !== document) {
      let selector = current.tagName.toLowerCase();
      if (current.id) selector += `#${current.id}`;
      if (current.className)
        selector += `.${current.className.split(" ").join(".")}`;
      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(" > ");
  }

  isElementVisible(element) {
    const style = window.getComputedStyle(element);
    return !(
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0" ||
      element.offsetWidth === 0 ||
      element.offsetHeight === 0
    );
  }

  debugComposeDOMStructure(compose) {
    if (DEBUG_MODE) console.log("[Gmail Tracker] DEBUG: Compose DOM Structure");
    if (DEBUG_MODE) console.log("Compose element:", compose);
    if (DEBUG_MODE) console.log("Compose classes:", compose.className);
    if (DEBUG_MODE)
      console.log("Compose children count:", compose.children.length);

    const forms = compose.querySelectorAll("form");
    if (DEBUG_MODE) console.log(`Found ${forms.length} form(s):`, forms);

    const editables = compose.querySelectorAll('[contenteditable="true"]');
    if (DEBUG_MODE)
      console.log(
        `Found ${editables.length} contenteditable element(s):`,
        editables
      );

    const inputs = compose.querySelectorAll("input");
    if (DEBUG_MODE)
      console.log(
        `Found ${inputs.length} input(s):`,
        Array.from(inputs).map((i) => ({
          name: i.name,
          type: i.type,
          className: i.className,
        }))
      );
  }

  startPixelMonitoring() {
    if (this.pixelMonitorInterval) {
      clearInterval(this.pixelMonitorInterval);
    }

    this.pixelMonitorInterval = setInterval(() => {
      const composeWindows = document.querySelectorAll(".M9");
      composeWindows.forEach((compose) => {
        const pixels = compose.querySelectorAll(".gmail-tracker-pixel");
        if (pixels.length > 0) {
          pixels.forEach((pixel) => {
            const messageId = pixel.dataset.messageId;
            if (messageId) {
              if (DEBUG_MODE)
                console.log(
                  `[Gmail Tracker] 📊 Monitoring pixel for message: ${messageId}`,
                  {
                    exists: true,
                    inDOM: document.contains(pixel),
                    src: pixel.src || pixel.value,
                  }
                );
            }
          });
        }
      });
    }, 5000);
  }

  monitorPixelRequests() {
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      const url = args[0];
      if (typeof url === "string" && url.includes("gmail-tracker")) {
        if (DEBUG_MODE)
          console.log("[Gmail Tracker] 🌐 Pixel request detected:", url);
      }
      return originalFetch.apply(this, args);
    };

    const originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function () {
      const xhr = new originalXHR();
      const originalOpen = xhr.open;
      xhr.open = function (method, url) {
        if (typeof url === "string" && url.includes("gmail-tracker")) {
          if (DEBUG_MODE)
            console.log("[Gmail Tracker] 🌐 XHR pixel request detected:", url);
        }
        return originalOpen.apply(this, arguments);
      };
      return xhr;
    };
  }

  getTrackedEmails(callback, retries = 3, forceSync = false) {
    const fallback = () => {
      try {
        if (chrome?.storage?.local?.get) {
          chrome.storage.local.get("trackedEmails", (data) => {
            const trackedMap = data.trackedEmails || {};
            
          });
        } else {
          callback({});
        }
      } catch (err) {
        console.warn(
          "[Gmail Tracker] Fallback storage read failed:",
          err.message
        );
        callback({});
      }
    };

    if (
      !chrome?.runtime?.id ||
      typeof chrome.runtime.sendMessage !== "function"
    ) {
      console.warn("[Gmail Tracker] Runtime unavailable. Using fallback.");
      return fallback();
    }

    const trySync = () => {
      chrome.runtime.sendMessage(
        { action: "syncTrackedEmails" },
        (response) => {
          if (chrome.runtime.lastError || !response?.success) {
            console.warn(
              "[Gmail Tracker] syncTrackedEmails failed:",
              chrome.runtime.lastError?.message || response?.error
            );
            return fallback();
          }
          callback(response.data || {});
        }
      );
    };

    try {
      chrome.runtime.sendMessage({ action: "getTrackedEmails" }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "[Gmail Tracker] lastError:",
            chrome.runtime.lastError.message
          );
        }

        if (!response || !response.success || forceSync) {
          console.warn(
            "[Gmail Tracker] sendMessage failed or forceSync:",
            response?.error
          );
          if (retries > 0) {
            return setTimeout(
              () => this.getTrackedEmails(callback, retries - 1, forceSync),
              1000
            );
          }
          return trySync();
        }

        callback(response.data || {});
      });
    } catch (err) {
      console.warn("[Gmail Tracker] getTrackedEmails exception:", err.message);
      return fallback();
    }
  }

  addTickIndicators() {
    if (!this.settings.showTicks || !this.isInSentFolder()) return;

    chrome.storage.local.get("trackedEmails", (data) => {
      if (DEBUG_MODE)
        console.log(
          "[Gmail Tracker] DEBUG: trackedEmails keys",
          Object.keys(data.trackedEmails || {})
        );
      const trackedMap = data.trackedEmails || {};
      if (DEBUG_MODE)
        console.log("[Gmail Tracker] Loaded trackedEmails:", trackedMap);
      this.updateGmailTicks(trackedMap);
    });
  }

  startPeriodicUpdates() {
    setTimeout(() => {
      chrome.storage.local.get("trackedEmails", (data) => {
        const tracked = data?.trackedEmails || {};
        if (DEBUG_MODE)
          console.log(
            "[Gmail Tracker] 🔍 trackedEmails keys in storage:",
            Object.keys(tracked)
          );
      });
    }, 3000);

    if (this.updateInterval) clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => this.addTickIndicators(), 30000);
  }

  showToast(message = "") {
    const toast = document.createElement("div");
    toast.className = "gmail-tracker-toast";
    toast.textContent = message;

    Object.assign(toast.style, {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      backgroundColor: "#10b981",
      color: "#ffffff",
      padding: "12px 18px",
      borderRadius: "8px",
      boxShadow: "0 8px 20px rgba(0, 0, 0, 0.15)",
      fontSize: "14px",
      fontFamily: "'Segoe UI', sans-serif",
      zIndex: 9999,
      opacity: "0",
      transition: "opacity 0.3s ease-in-out",
    });

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "1";
    }, 10);

    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  updateGmailTicks(trackedMap) {
    console.log(
      "[Gmail Tracker] Running updateGmailTicks...",
      Object.keys(trackedMap || {}).length,
      "tracked IDs"
    );

    document.querySelectorAll("[role='main'] .zA").forEach((row) => {
      const threadId = this.getGmailNativeId(row);
      if (DEBUG_MODE) console.log("🧪 Row threadId:", threadId);
      if (!threadId) return;

      const data = trackedMap[threadId];
      if (!data) return;

      
      let tick = row.querySelector(".gmail-tracker-tick");
      if (!tick) {
       
        const checkboxTd = row.querySelector("td.oZ-x3");
        if (!checkboxTd) return;

       
        const tickWrapper = document.createElement("span");
        tickWrapper.className = "gmail-tracker-tick";
        tickWrapper.textContent = data.isRead ? "✓✓" : "✓";
        tickWrapper.title = data.isRead ? "Read" : "Sent";

        
        tickWrapper.style.cssText = `
        display: inline-block;
        margin-left: 4px;
        color: ${data.isRead ? "green" : "gray"};
        font-size: 13px;
        font-weight: bold;
        vertical-align: middle;
      `;

       
        const checkbox = checkboxTd.querySelector("div[role='checkbox']");
        if (checkbox && checkbox.parentNode) {
          checkbox.parentNode.insertBefore(tickWrapper, checkbox.nextSibling);
        }
      } else {
        
        tick.textContent = data.isRead ? "✓✓" : "✓";
        tick.title = data.isRead ? "Read" : "Sent";
        tick.style.color = data.isRead ? "green" : "gray";
      }

      const sentByUser = data?.sentBy === "me"; 
      const justSent =
        data.sentAt && now - new Date(data.sentAt).getTime() < 3000;
      const justRead =
        data.readAt && now - new Date(data.readAt).getTime() < 5000;

      const wasAlreadyAlerted = row.dataset.readAlerted === "true";
      const previouslyUnread = row.dataset.lastIsRead !== "true";

      if (
        justRead &&
        previouslyUnread &&
        !wasAlreadyAlerted &&
        this.settings?.showNotifications &&
        !(sentByUser && justSent)
      ) {
        const subjectContainer = row.querySelector(".y6");
        const subjectSpan = subjectContainer?.querySelector("span");

        let subject =
          subjectSpan?.innerText?.trim() ||
          subjectContainer?.innerText?.trim() ||
          "An email";

        if (subject.length > 60) subject = subject.slice(0, 57) + "...";

        this.showToast(`📬 "${subject}" was read.`);
        row.dataset.readAlerted = "true";
      }

      // Always update the last seen read state
      row.dataset.lastIsRead = data.isRead ? "true" : "false";
    });

    Object.keys(trackedMap).forEach((key) =>
      console.log("🗂 Tracked key:", key)
    );
  }

  getMessageIdFromRow(row) {
    return (
      row.getAttribute("data-msg-id") ||
      row.getAttribute("id") ||
      row.dataset.threadId ||
      "unknown_" + Date.now()
    );
  }

  updateTrackingDisplay() {
    document.querySelectorAll(".gmail-tracker-tick").forEach((e) => e.remove());
    if (this.settings.showTicks) this.addTickIndicators();
  }
}

function initGmailTracker() {
  if (DEBUG_MODE) console.log("[Gmail Tracker] Checking Gmail DOM...");
  const tracker = new GmailTracker();
  tracker.init();
}

if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  initGmailTracker();
} else {
  window.addEventListener("DOMContentLoaded", initGmailTracker);
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
