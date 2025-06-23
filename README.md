## Creator- KARTIKEYAN RAI (23112049)
## DRIVE LINK FOR DEMO VIDEO - https://drive.google.com/drive/folders/1evzsD3HWg0QftakPc6wAhBrRZZ6JSyOx?usp=sharing

## This is not the final version ot the project as some changes in styling are yet to be made and functionality of ticks are to be corrected.

## 📧 Gmail Email Tracker Extension

A Chrome extension that tracks when your Gmail emails are opened using tracking pixels, updates their status directly in Gmail's **Sent** folder (✓ Sent / ✓✓ Read), and displays a log of tracked emails in the extension's popup UI.

Built using **OAuth 2.0, Express.js, MongoDB, and Chrome Extension APIs** for seamless integration with Gmail and efficient backend tracking.

---

### 🚀 Features

* ✅ **Track Sent Emails** from your Gmail account.
* ✅ **Show Read Receipts** (✓✓) for opened emails directly in Gmail.
* ✅ **Secure Google Sign-In** with OAuth 2.0.
* ✅ **Live Status Indicators**:

  * ✓ = Sent but not opened.
  * ✓✓ = Email has been read.
* ✅ **Email Tracking Table** inside the extension popup UI.
* ✅ Hosted backend on **Render** with MongoDB database.
* 🔒 OAuth-secured endpoints to protect user data.

---

### 🛠️ Tech Stack

| Frontend                | Backend           | Database           | Hosting    | Auth             |
| ----------------------- | ----------------- | ------------------ | ---------- | ---------------- |
| HTML, CSS, JS (Vanilla) | Node.js (Express) | MongoDB (Mongoose) | Render.com | Google OAuth 2.0 |

---

### 📂 Folder Structure

```
.
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── models/
│   └── controllers/
├── extension/
│   ├── popup.html
│   ├── popup.js
│   ├── styles.css
│   ├── content.js
│   └── manifest.json
├── README.md
```

---

### ⚙️ Setup Instructions

#### 1. **Clone the Repository**

```bash
git clone https://github.com/yourusername/gmail-tracker-extension.git
cd gmail-tracker-extension
```

#### 2. **Setup Backend**

Make sure you have Node.js and MongoDB installed locally (or setup MongoDB Atlas).

```bash
cd backend
npm install
```

Create a `.env` file:

```env
MONGO_URI=mongodb+srv://your-user:your-pass@cluster.mongodb.net/dbname
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
BASE_URL=https://yourbackend.render.app  # or http://localhost:3000 for local
```

Start the server:

```bash
node server.js
```

> Your Express backend should be running at `http://localhost:3000`.

---

#### 3. **Setup Chrome Extension**

1. Open **Chrome > Extensions > Manage Extensions**.
2. Enable **Developer Mode** (top-right).
3. Click **Load Unpacked**.
4. Select the `extension/` folder.
5. The extension should appear in your toolbar.

---

### 🔐 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project > OAuth Consent Screen.
3. Configure scopes (Gmail API if needed).
4. Create **OAuth 2.0 credentials**.
5. Add `https://yourbackend.render.com/auth/google/callback` to redirect URIs.
6. Paste your credentials into `.env`.

---

### ✉️ How It Works

1. **User signs in** via Google from the extension popup.
2. Extension injects a **tracking pixel** into outgoing emails.
3. The backend receives **pixel hits** when emails are opened.
4. Status updates are saved in MongoDB and retrieved later.
5. The Gmail 'Sent' page shows ✓/✓✓ indicators using injected DOM updates.
6. Extension popup UI fetches tracked email data and displays it in a table.

---

### 📸 Screenshots

> Add screenshots here (popup UI, Gmail Sent folder with ticks).

---

### 🧪 Testing

* Send test emails and check Gmail's Sent section for ticks.
* Open the extension popup and confirm email logs appear.
* Monitor your backend logs for tracking pixel hits and database updates.

---

### 📦 Deploying on Render

* Create a new **Web Service** on [Render](https://render.com).
* Connect it to your GitHub repo or push your backend code manually.
* Set environment variables in Render dashboard (`.env` values).
* Use your Render backend URL in your extension and OAuth setup.

---

### 🛡️ Security Notes

* OAuth tokens are securely stored using session cookies or access tokens.
* Tracking is limited to your own sent emails (no inbox monitoring).
* Backend validates all requests via auth middleware.

---

### 📌 Todo / Future Improvements

* 🔄 Refresh token handling
* 📊 Analytics dashboard
* 🌙 Dark mode toggle
* 🔔 Desktop notification support

---

### 🤝 Contributing

PRs are welcome! Please open issues for suggestions, bugs, or feature requests.

