// User / Team Dashboard JavaScript Controller

let token = localStorage.getItem("incubation_token");
let role = localStorage.getItem("incubation_role");
let currentUserEmail = localStorage.getItem("incubation_email");
let currentUserName = localStorage.getItem("incubation_name");

let myTeamData = null;
let userChatPollInterval = null;

// Auth Verification
if (!token) {
    alert("Please sign in to access team dashboard.");
    window.location.href = "/";
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("user-display-name").innerText = currentUserName || "Team Member";
    document.getElementById("user-display-email").innerText = currentUserEmail || "user@email.com";

    // Set default date picker to today
    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("att-date");
    if (dateInput) dateInput.value = today;

    // Load initial data
    loadMyTeam();
    loadTeamAttendanceHistory();
    loadAnnouncement();
});

// Toast notification helper
function showToast(msg, isError = false) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `px-4 py-3 rounded-xl text-xs font-semibold shadow-xl border flex items-center gap-2 animate-fade-in ${
        isError
        ? "bg-red-950/90 text-red-200 border-red-500/40"
        : "bg-sky-950/90 text-sky-200 border-sky-500/40"
    }`;
    toast.innerHTML = `
        <i class="fa-solid ${isError ? 'fa-circle-exclamation text-red-400' : 'fa-circle-check text-sky-400'}"></i>
        <span>${escapeHtml(msg)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3500);
}

function getAuthHeaders() {
    return {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
}

function logout() {
    localStorage.clear();
    window.location.href = "/";
}

// User Tab Switcher
function switchUserTab(tabName) {
    document.querySelectorAll("main > section").forEach(sec => sec.classList.add("hidden"));
    document.querySelectorAll("button[id^='utab-']").forEach(btn => {
        btn.classList.remove("bg-sky-600", "text-white", "shadow-lg");
        btn.classList.add("bg-slate-800/80", "text-slate-400");
    });

    const activeSec = document.getElementById(`ucontent-${tabName}`);
    const activeBtn = document.getElementById(`utab-${tabName}`);

    if (activeSec) activeSec.classList.remove("hidden");
    if (activeBtn) {
        activeBtn.classList.remove("bg-slate-800/80", "text-slate-400");
        activeBtn.classList.add("bg-sky-600", "text-white", "shadow-lg");
    }

    if (tabName === "chat") {
        fetchUserChatMessages();
        startUserChatPolling();
    } else {
        stopUserChatPolling();
    }
}

// 1. Fetch Global Announcement
async function loadAnnouncement() {
    try {
        const res = await fetch("/api/admin/stats", { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        document.getElementById("user-announcement-text").innerText = data.announcement;
    } catch (err) {
        console.error(err);
    }
}

// 2. Fetch My Team Details & Members
async function loadMyTeam() {
    try {
        const res = await fetch("/api/team/my-team", { headers: getAuthHeaders() });
        if (!res.ok) {
            if (res.status === 404) {
                document.getElementById("user-team-display").innerText = "No Team Assigned";
                document.getElementById("u-team-name-card").innerText = "Not Assigned to Any Team";
                document.getElementById("u-team-desc-card").innerText = "Please contact Incubation Admin or update your profile to join/create a startup team.";
                return;
            }
            throw new Error("Failed to load team data.");
        }

        myTeamData = await res.json();

        // Populate Header & Card
        document.getElementById("user-team-display").innerText = myTeamData.name;
        document.getElementById("u-team-name-card").innerText = myTeamData.name;
        document.getElementById("u-team-idea-card").innerText = myTeamData.idea_title || "Idea title not set";
        document.getElementById("u-team-desc-card").innerText = myTeamData.description || "No description available.";
        document.getElementById("u-team-domain-tag").innerText = `Domain: ${myTeamData.domain || "General"}`;
        document.getElementById("u-team-status-badge").innerText = myTeamData.status;
        document.getElementById("u-team-members-count").innerText = myTeamData.members_count;

        // Render Members Roster
        renderTeamMembers(myTeamData.members);

    } catch (err) {
        console.error(err);
    }
}

function renderTeamMembers(members) {
    const grid = document.getElementById("u-team-members-grid");
    if (!grid) return;

    if (!members || members.length === 0) {
        grid.innerHTML = `<div class="col-span-full py-6 text-center text-slate-500 text-xs">No team members added yet. Click "Add Team Member" above.</div>`;
        return;
    }

    grid.innerHTML = "";
    members.forEach(m => {
        const card = document.createElement("div");
        card.className = "p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between";
        card.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-sky-500/20 border border-sky-500/30 text-sky-400 font-bold flex items-center justify-center text-xs">
                    ${escapeHtml(m.name.charAt(0).toUpperCase())}
                </div>
                <div>
                    <h4 class="font-bold text-xs text-white">${escapeHtml(m.name)}</h4>
                    <span class="text-[10px] text-sky-400 font-semibold">${escapeHtml(m.role_in_team)}</span>
                    ${m.email ? `<p class="text-[10px] text-slate-400">${escapeHtml(m.email)}</p>` : ''}
                </div>
            </div>
            <button onclick="removeUserTeamMember(${m.id})" class="text-slate-500 hover:text-red-400 text-xs p-1" title="Remove Member">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        `;
        grid.appendChild(card);
    });
}

// Add & Remove Team Members
function openUserAddMemberModal() {
    document.getElementById("modal-user-add-member").classList.remove("hidden");
}

function closeModal(id) {
    document.getElementById(id).classList.add("hidden");
}

async function handleUserAddMemberSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("u-member-name").value.trim();
    const role_in_team = document.getElementById("u-member-role").value.trim();
    const email = document.getElementById("u-member-email").value.trim();
    const phone = document.getElementById("u-member-phone").value.trim();

    try {
        const res = await fetch("/api/team/members", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, role_in_team, email, phone })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Failed to add team member.");

        closeModal("modal-user-add-member");
        loadMyTeam();
        showToast(`Member "${name}" added to your team!`);
    } catch (err) {
        showToast(err.message, true);
    }
}

async function removeUserTeamMember(memberId) {
    if (!confirm("Are you sure you want to remove this member from your team?")) return;
    try {
        const res = await fetch(`/api/team/members/${memberId}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });

        if (!res.ok) throw new Error("Failed to remove member.");
        loadMyTeam();
        showToast("Team member removed.");
    } catch (err) {
        showToast(err.message, true);
    }
}

// 3. Daily Attendance Submission
async function handleAttendanceSubmit(e) {
    e.preventDefault();
    const date = document.getElementById("att-date").value;
    const status = document.getElementById("att-status").value;
    const work_summary = document.getElementById("att-summary").value.trim();

    const btn = document.getElementById("btn-att-submit");
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Submitting...`;

    try {
        const res = await fetch("/api/team/attendance", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ date, status, work_summary })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Attendance submission failed.");

        showToast("Daily Attendance Submitted Successfully!");
        document.getElementById("att-summary").value = "";
        loadTeamAttendanceHistory();

    } catch (err) {
        showToast(err.message, true);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Submit Attendance</span>`;
    }
}

async function loadTeamAttendanceHistory() {
    const tbody = document.getElementById("u-att-history-tbody");
    if (!tbody) return;

    try {
        const res = await fetch("/api/team/attendance", { headers: getAuthHeaders() });
        if (!res.ok) return;
        const records = await res.json();

        if (records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-slate-500">No attendance history records submitted yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = "";
        records.forEach(r => {
            let statusClass = "badge-status-present";
            if (r.status === "Absent") statusClass = "badge-status-absent";
            if (r.status === "Half Day") statusClass = "badge-status-halfday";
            if (r.status === "Working Remotely") statusClass = "badge-status-remote";

            const row = document.createElement("tr");
            row.className = "hover:bg-slate-900/50 transition-colors";
            row.innerHTML = `
                <td class="py-3 px-4 font-semibold text-white">${escapeHtml(r.date)}</td>
                <td class="py-3 px-4">
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusClass}">
                        ${escapeHtml(r.status)}
                    </span>
                </td>
                <td class="py-3 px-4 text-slate-300 max-w-sm truncate">${escapeHtml(r.work_summary || "-")}</td>
                <td class="py-3 px-4 text-slate-400 text-xs">${escapeHtml(r.submitted_by_name || "Member")}</td>
            `;
            tbody.appendChild(row);
        });

    } catch (err) {
        console.error(err);
    }
}

// 4. Contact Incubation Admin (Chat)
async function fetchUserChatMessages() {
    if (!myTeamData || !myTeamData.id) return;
    const windowEl = document.getElementById("u-chat-window");

    try {
        const res = await fetch(`/api/messages/team/${myTeamData.id}`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const messages = await res.json();

        if (messages.length === 0) {
            windowEl.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-slate-500 text-xs">No messages yet. Send a message to start conversation with Incubation Admin!</div>`;
            return;
        }

        windowEl.innerHTML = "";
        messages.forEach(m => {
            const isMe = (m.sender_role === "user");
            const bubbleBg = isMe ? "bg-sky-600 text-white rounded-br-none ml-auto shadow-sky-600/20" : "bg-slate-800 text-slate-200 rounded-bl-none mr-auto border border-indigo-500/30";
            const senderTag = isMe ? "You" : "Incubation Admin";

            const msgDiv = document.createElement("div");
            msgDiv.className = `max-w-[80%] p-3 rounded-2xl text-xs ${bubbleBg} shadow-md`;
            msgDiv.innerHTML = `
                <div class="font-bold text-[10px] opacity-80 mb-0.5">${senderTag}</div>
                <div class="leading-relaxed">${escapeHtml(m.content)}</div>
                <div class="text-[9px] opacity-60 text-right mt-1">${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            `;
            windowEl.appendChild(msgDiv);
        });

        windowEl.scrollTop = windowEl.scrollHeight;

    } catch (err) {
        console.error(err);
    }
}

async function sendUserChatMessage(e) {
    e.preventDefault();
    if (!myTeamData || !myTeamData.id) {
        showToast("Cannot send message: You do not belong to a team.", true);
        return;
    }

    const input = document.getElementById("u-chat-input");
    const content = input.value.trim();
    if (!content) return;

    try {
        const res = await fetch(`/api/messages/team/${myTeamData.id}`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ content })
        });

        if (!res.ok) throw new Error("Failed to send message.");
        input.value = "";
        fetchUserChatMessages();
    } catch (err) {
        showToast(err.message, true);
    }
}

function startUserChatPolling() {
    stopUserChatPolling();
    userChatPollInterval = setInterval(fetchUserChatMessages, 4000);
}

function stopUserChatPolling() {
    if (userChatPollInterval) clearInterval(userChatPollInterval);
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
