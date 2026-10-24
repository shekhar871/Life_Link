# LifeLink — Community Blood and Essential Medicine Availability Network
### Cross-Platform Desktop Application (Electron + React 18 + Express.js)

LifeLink is a clinical-grade desktop application connecting regional trauma centers, community hospitals, blood banks, and donors with real-time blood component availability, essential medicine expiry tracking, AI medical triage, role-based security, and verified Emergency SLA Dispatch.

---

## Architecture

The entire codebase strictly follows the **Dual-Process Desktop Architecture**:
```
┌──────────────────────────────────────────────────────────┐
│                   Renderer (React + Vite)                │
│             http://localhost:5173 / dist/index.html      │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────┐
│                  Preload Bridge (preload.js)             │
│        contextBridge.exposeInMainWorld("lifelinkAPI")    │
│              (Context Isolation: ON, Node: OFF)          │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼  ipcRenderer.invoke / .on
┌──────────────────────────────────────────────────────────┐
│                   IPC Message Protocol                   │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼  ipcMain.handle / webContents.send
┌──────────────────────────────────────────────────────────┐
│                  Main Process (main.js)                  │
│       Window Lifecycle, Native OS Dialogs, SLA Timer,    │
│    desktopCapturer, before-input-event Interception,     │
│                 OS File System & userData                │
└────────────────────────────┬─────────────────────────────┘
                             │
                             ▼  HTTP Fetch (Browser/Renderer)
┌──────────────────────────────────────────────────────────┐
│              Express.js Backend (server.js:3000)         │
│          facilities.json, urgent_requests.json,          │
│               Role Passkeys, Data Sanitization           │
└──────────────────────────────────────────────────────────┘
```

---

## Quick Start Guide

### 1. Start Express Backend Server (Port 3000)
In Terminal 1:
```bash
npm run server
```
Server runs at `http://localhost:3000`.

### 2. Start Vite React Frontend (Port 5173)
In Terminal 2:
```bash
npm run dev
```
Vite runs at `http://localhost:5173`.

### 3. Launch Electron Desktop Shell
In Terminal 3:
```bash
npm run electron
```

Or run both backend and frontend concurrently:
```bash
npm start
```

---

## Role-Based Security Passkeys

The Express backend strictly validates role permissions and strips all internal approval keys before transmitting records to the renderer:

| Operational Role | Passkey | Permissions |
| :--- | :--- | :--- |
| **Community User** | *(None required)* | Search facilities, browse stock, register as donor |
| **Facility Staff** | `STAFF-MED-2026` | Live stock editing (+/-), review & approve clinical requests, audit verification |
| **Administrator** | `ADMIN-SUPER-SECURE-99` | Full stock control, request approvals, discard expired batches, system administration |

---

## Features & Verification Highlights

### 1. Local Persistence via Secure IPC (`userData` Storage)
- File stored at: `app.getPath("userData")/lifelink_inventory.json`
- `inventory:load`: reads file and parses array.
- `inventory:save`: writes updated state.
- **Race condition prevention**: React starts in `isLoading = true` and shows `"Loading LifeLink records..."`. The saving `useEffect` enforces `if (isLoading) return;` so empty React state never overwrites saved disk files on startup.

### 2. Express Backend Integration (GET /facilities/:id & GET /requests/:id)
- Single facility/request fetching with **Previous** (`id - 1`) and **Next** (`id + 1`) buttons.
- Search and filter bar for blood groups (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`), components (`Whole Blood`, `Packed RBCs`, `Platelets`, `Plasma`), and medicine names.
- Sensitive backend credentials (`backendSecretApprovalCode`, `dispatchKeyHash`) are stripped before sending to renderer.

### 3. Native OS Dialogs
- **Discard Expired Medicine**: Native dialog asking `"Confirm Deletion: Remove this expired medicine batch from inventory?"` with `["Delete", "Cancel"]`. Only index `0` removes item.
- **Emergency Dispatch Rules**: Native info dialog titled `"Emergency Dispatch & Verification Rules"` with `["Start Dispatch", "Cancel"]`.
- **Exit LifeLink Confirmation**: Prompted before quitting or closing window.
- **Welcome Dialog**: Triggered on startup with network connection information.

### 4. AI Clinical Assistant (Groq API)
- Modular components: `AppTitle`, `ConversationArea`, `ChatBubble`, `InputBox`, `SendButton`, `LoadingBox`, `ErrorBox`.
- 4 core states: `messages`, `input`, `isLoading`, `error`.
- Full conversation history sent to Groq LLaMA models with clinical decision-support prompt.
- Loaded securely via `import.meta.env.VITE_GROQ_API_KEY` from `.env`.
- Includes built-in medical protocol fallback engine.

### 5. Emergency SLA Dispatch & Dual-Gate Verification
- **Gate 1 (Webcam Verification)**:
  - Hardware check: verifies `navigator.mediaDevices`.
  - `getUserMedia` with `1280x720@30fps`.
  - Attached to `<video ref={videoRef} autoPlay playsInline />` via `srcObject = stream` (never `src` or `createObjectURL`).
  - `ondevicechange` listener warns if camera disconnects.
  - All tracks cleanly stopped on unmount or session stop.
- **Gate 2 (Fullscreen Mode)**:
  - User click calls `document.documentElement.requestFullscreen()`.
  - Synced with `fullscreenchange` listener.
  - Enforced via Main process kiosk mode (`win.setFullScreen(true)`, `win.setKiosk(true)`).
- **Authoritative SLA Push Timer**:
  - `start-timer` guarded against duplicate calls.
  - `main.js` stores start time and pushes time updates every 1s using `webContents.send("timer", ...)`.
  - Preload listener cleanup closure returned directly by React's `useEffect`.
  - `get-time-left` returns `Math.max(0, endTime - Date.now())`.
- **Synchronized Camera + Screen Audit Capture Pipeline**:
  - A single `const timestamp = Date.now()` generated per tick.
  - Passed to both `savePhoto(arrayBuffer, timestamp)` and `takeScreenShot(timestamp)`.
  - Camera: `ImageCapture.takePhoto()` -> `arrayBuffer` -> `photo-${timestamp}.jpg` in `camera_feed/`.
  - Screen: `desktopCapturer.getSources()` -> `screen-${timestamp}.png` in `screen_feed/`.
  - Both files have identical timestamps for forensic clinical audit.

### 6. Security & Keyboard Protection
- Intercepts `Ctrl/Cmd + C` and `Ctrl/Cmd + V` via `before-input-event` in `main.js`.
- Calls `event.preventDefault()` and presents specific warning dialogs preventing unauthorized extraction or pasting of sensitive patient records.
- Menu bar hidden via `Menu.setApplicationMenu(null)`.

### 7. Secondary Window
- `createAboutWindow()` in `main.js` opens modal window (`width: 400, height: 300`) displaying `about.html` with version information and emergency contact hotlines.
