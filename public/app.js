/* ═══════════════════════════════════════════════════════════
   Lucky Group Wheel — Single Page Application
   ═══════════════════════════════════════════════════════════ */

// ── API helpers ──────────────────────────────────────────────
const API = {
    async get(url) {
        const h = {};
        const t = sessionStorage.getItem('adminToken');
        if (t) h['x-admin-token'] = t;
        const r = await fetch(url, { headers: h });
        if (!r.ok) throw r;
        return r.json();
    },
    async post(url, body) {
        const h = { 'Content-Type': 'application/json' };
        const t = sessionStorage.getItem('adminToken');
        if (t) h['x-admin-token'] = t;
        const r = await fetch(url, { method: 'POST', headers: h, body: JSON.stringify(body) });
        if (!r.ok) throw r;
        return r.json();
    },
    async put(url, body) {
        const h = { 'Content-Type': 'application/json' };
        const t = sessionStorage.getItem('adminToken');
        if (t) h['x-admin-token'] = t;
        const r = await fetch(url, { method: 'PUT', headers: h, body: JSON.stringify(body) });
        if (!r.ok) throw r;
        return r.json();
    },
    async del(url) {
        const h = {};
        const t = sessionStorage.getItem('adminToken');
        if (t) h['x-admin-token'] = t;
        const r = await fetch(url, { method: 'DELETE', headers: h });
        if (!r.ok) throw r;
        return r.json();
    }
};

// ── Router ───────────────────────────────────────────────────
function getRoute() {
    const hash = location.hash.slice(1) || '/';
    return hash;
}

function navigate(path) {
    location.hash = '#' + path;
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', render);

function render() {
    const route = getRoute();
    const app = document.getElementById('app');
    app.innerHTML = '';

    if (route === '/') return renderHome(app);
    if (route === '/group/create') return renderCreateGroup(app);
    if (route.startsWith('/group/') && !route.includes('/mode')) {
        const id = route.split('/group/')[1];
        return renderGroupDetail(app, id);
    }
    if (route.startsWith('/mode/select/')) {
        const id = route.split('/mode/select/')[1];
        return renderModeSelect(app, id);
    }
    if (route.startsWith('/mode/wheel/')) {
        const id = route.split('/mode/wheel/')[1];
        return renderWheel(app, id);
    }
    if (route.startsWith('/mode/jackpot/')) {
        const id = route.split('/mode/jackpot/')[1];
        return renderJackpot(app, id);
    }
    if (route.startsWith('/mode/dice/')) {
        const id = route.split('/mode/dice/')[1];
        return renderDice(app, id);
    }
    if (route === '/admin') return renderAdmin(app);

    // fallback
    renderHome(app);
}

// ── Toast ────────────────────────────────────────────────────
let toastEl = null;
function showToast(msg) {
    if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.className = 'toast';
        document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2200);
}

// ── Color palette (pastel, non-repeating for wheel) ─────────
function generateColors(n) {
    const colors = [];
    const saturation = 55;
    const lightness = 72;
    for (let i = 0; i < n; i++) {
        const hue = Math.round((360 / n) * i + 15);
        colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
    return colors;
}

// ── Sound (Web Audio API) ────────────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function ensureAudio() {
    if (!audioCtx) audioCtx = new AudioCtx();
}

function playTick() {
    ensureAudio();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    o.type = 'sine';
    o.frequency.value = 800 + Math.random() * 400;
    g.gain.setValueAtTime(0.08, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
    o.start(audioCtx.currentTime);
    o.stop(audioCtx.currentTime + 0.06);
}

function playWinSound() {
    ensureAudio();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g);
        g.connect(audioCtx.destination);
        o.type = 'triangle';
        o.frequency.value = freq;
        const t = audioCtx.currentTime + i * 0.15;
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        o.start(t);
        o.stop(t + 0.4);
    });
}

function playSlotTick() {
    ensureAudio();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    o.type = 'square';
    o.frequency.value = 200 + Math.random() * 100;
    g.gain.setValueAtTime(0.04, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);
    o.start(audioCtx.currentTime);
    o.stop(audioCtx.currentTime + 0.03);
}

function playDiceShake() {
    ensureAudio();
    for (let i = 0; i < 3; i++) {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g);
        g.connect(audioCtx.destination);
        o.type = 'sawtooth';
        o.frequency.value = 100 + Math.random() * 200;
        const t = audioCtx.currentTime + i * 0.04;
        g.gain.setValueAtTime(0.05, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        o.start(t);
        o.stop(t + 0.05);
    }
}

function playLotteryMusic(durationSec) {
    ensureAudio();
    // Khát Vọng Mùa Xuân (Xổ Số Kiến Thiết Miền Bắc)
    // f: tần số, d: thời lượng (đơn vị 1/8 nhịp)
    const notes = [
        {f: 659, d: 2}, {f: 784, d: 2}, {f: 880, d: 4},
        {f: 1047, d: 1}, {f: 1047, d: 1}, {f: 988, d: 1}, {f: 880, d: 1}, {f: 784, d: 4},
        {f: 880, d: 2}, {f: 1047, d: 2}, {f: 1175, d: 4},
        {f: 1319, d: 1}, {f: 1319, d: 1}, {f: 1175, d: 1}, {f: 1047, d: 1}, {f: 988, d: 4},
        {f: 1047, d: 2}, {f: 1319, d: 2}, {f: 1568, d: 4},
        {f: 1319, d: 1}, {f: 1175, d: 1}, {f: 1047, d: 1}, {f: 988, d: 1}, {f: 880, d: 4},
        {f: 784, d: 2}, {f: 659, d: 2}, {f: 784, d: 4},
        {f: 1047, d: 1}, {f: 988, d: 1}, {f: 880, d: 1}, {f: 784, d: 1}, {f: 1047, d: 4}
    ];

    const unitLen = durationSec / 64;
    const oscillators = [];
    let currentT = audioCtx.currentTime;

    notes.forEach(note => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g);
        g.connect(audioCtx.destination);
        // Nhạc xổ số hoài cổ dùng sóng vuông (square)
        o.type = 'square';
        o.frequency.value = note.f;
        const noteLen = note.d * unitLen;

        g.gain.setValueAtTime(0, currentT);
        g.gain.linearRampToValueAtTime(0.04, currentT + 0.02);
        g.gain.setValueAtTime(0.04, currentT + noteLen * 0.7);
        g.gain.exponentialRampToValueAtTime(0.001, currentT + noteLen - 0.01);

        o.start(currentT);
        o.stop(currentT + noteLen);
        oscillators.push(o);
        currentT += noteLen;
    });
    return oscillators;
}

// ── Confetti ─────────────────────────────────────────────────
function spawnConfetti() {
    const colors = ['#6c5ce7', '#00cec9', '#fd79a8', '#fdcb6e', '#a29bfe', '#00b894'];
    for (let i = 0; i < 40; i++) {
        const c = document.createElement('div');
        c.style.cssText = `
      position:fixed; width:${6 + Math.random() * 8}px; height:${6 + Math.random() * 8}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      left:${Math.random() * 100}vw; bottom:-20px; z-index:1001;
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      animation: confetti ${1.5 + Math.random() * 1.5}s ease forwards;
      animation-delay: ${Math.random() * 0.5}s;
      pointer-events: none;
    `;
        document.body.appendChild(c);
        setTimeout(() => c.remove(), 3500);
    }
}


/* ═══════════════════════════════════════════════════════════
   PAGE: Home
   ═══════════════════════════════════════════════════════════ */
async function renderHome(app) {
    app.innerHTML = `
    <div class="page-header">
      <h1>🎯 Lucky Group Wheel</h1>
      <p>Quản lý nhóm & bốc thăm may mắn</p>
    </div>
    <div style="text-align:center; margin-bottom:20px;">
      <button class="btn btn-primary btn-lg" onclick="navigate('/group/create')">
        ✨ Tạo nhóm mới
      </button>
    </div>
    <div id="group-list" class="group-grid">
      <div class="empty-state"><p>Đang tải...</p></div>
    </div>
  `;

    try {
        const groups = await API.get('/api/groups');
        const container = document.getElementById('group-list');
        if (groups.length === 0) {
            container.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-icon">📋</div>
          <p>Chưa có nhóm nào. Hãy tạo nhóm đầu tiên!</p>
        </div>`;
            return;
        }
        container.innerHTML = groups.map(g => `
      <div class="card group-card" data-id="${g.id}">
        <div class="group-name">${escHtml(g.groupName)}</div>
        <div class="group-meta">
          <span>👥 ${g.members.length} thành viên</span>
        </div>
        <div class="group-actions">
          <button class="btn btn-accent btn-sm" onclick="event.stopPropagation(); navigate('/mode/select/${g.id}')">🎲 Chơi</button>
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); navigate('/group/${g.id}')">✏️ Sửa</button>
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); deleteGroup('${g.id}')">🗑️</button>
        </div>
      </div>
    `).join('');

        // card click → detail
        container.querySelectorAll('.group-card').forEach(c => {
            c.addEventListener('click', () => navigate('/group/' + c.dataset.id));
        });
    } catch (e) {
        document.getElementById('group-list').innerHTML = '<p style="color:red">Lỗi tải dữ liệu</p>';
    }
}

async function deleteGroup(id) {
    if (!confirm('Xóa nhóm này?')) return;
    try {
        await API.del('/api/groups/' + id);
        showToast('Đã xóa nhóm');
        render();
    } catch { showToast('Lỗi khi xóa'); }
}
// expose to inline onclick
window.deleteGroup = deleteGroup;
window.navigate = navigate;


/* ═══════════════════════════════════════════════════════════
   PAGE: Create Group
   ═══════════════════════════════════════════════════════════ */
function renderCreateGroup(app) {
    let mode = 'byNumber'; // 'byNumber' | 'manual'
    let members = [];

    app.innerHTML = `
    <div class="back-bar">
      <a class="back-link" onclick="navigate('/')">← Quay lại</a>
    </div>
    <div class="page-header">
      <h1>✨ Tạo nhóm mới</h1>
    </div>
    <div class="card" style="max-width:600px; margin:0 auto;">
      <div class="form-group">
        <label>Tên nhóm</label>
        <input class="form-input" id="group-name" placeholder="VD: Lớp 10A1" />
      </div>
      <div class="tab-toggle" id="mode-toggle">
        <button class="active" data-mode="byNumber">Nhập số lượng</button>
        <button data-mode="manual">Thêm thủ công</button>
      </div>
      <div id="input-area"></div>
      <div style="text-align:center; margin-top:24px;">
        <button class="btn btn-primary btn-lg" id="save-group-btn">💾 Lưu nhóm</button>
      </div>
    </div>
  `;

    const inputArea = document.getElementById('input-area');

    function showByNumber() {
        inputArea.innerHTML = `
      <div class="form-group">
        <label>Số thành viên</label>
        <input class="form-input" id="member-count" type="number" min="2" max="100" value="5" />
      </div>
      <button class="btn btn-secondary btn-sm" id="gen-slots">Tạo ô nhập</button>
      <div class="member-grid" id="member-grid"></div>
      <div style="text-align:center; margin-top:12px;">
        <button class="btn btn-secondary btn-sm" id="add-more" style="display:none;">➕ Thêm ô</button>
      </div>
    `;
        document.getElementById('gen-slots').onclick = () => {
            const n = parseInt(document.getElementById('member-count').value) || 5;
            genSlots(n);
        };
    }

    function genSlots(n) {
        const grid = document.getElementById('member-grid');
        grid.innerHTML = '';
        for (let i = 0; i < n; i++) {
            addSlot(grid, i + 1);
        }
        document.getElementById('add-more').style.display = 'inline-flex';
        document.getElementById('add-more').onclick = () => addSlot(grid, grid.children.length + 1);
    }

    function addSlot(grid, idx) {
        const div = document.createElement('div');
        div.className = 'member-slot';
        div.innerHTML = `
      <input placeholder="Thành viên ${idx}" class="member-input" />
      <button class="remove-btn" onclick="this.parentElement.remove()">✕</button>
    `;
        grid.appendChild(div);
    }

    function showManual() {
        inputArea.innerHTML = `
      <div class="member-grid" id="member-grid"></div>
      <div style="text-align:center; margin-top:12px;">
        <button class="btn btn-accent btn-sm" id="add-manual">➕ Thêm thành viên</button>
      </div>
    `;
        const grid = document.getElementById('member-grid');
        addSlot(grid, 1);
        addSlot(grid, 2);
        document.getElementById('add-manual').onclick = () => addSlot(grid, grid.children.length + 1);
    }

    // toggle tabs
    document.getElementById('mode-toggle').addEventListener('click', e => {
        if (!e.target.dataset.mode) return;
        mode = e.target.dataset.mode;
        document.querySelectorAll('#mode-toggle button').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        if (mode === 'byNumber') showByNumber();
        else showManual();
    });

    showByNumber();

    // save
    document.getElementById('save-group-btn').onclick = async () => {
        const name = document.getElementById('group-name').value.trim();
        if (!name) return showToast('Nhập tên nhóm!');
        const inputs = document.querySelectorAll('.member-input');
        const members = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);
        if (members.length < 2) return showToast('Cần ít nhất 2 thành viên!');
        // check duplicates
        const unique = [...new Set(members)];
        if (unique.length !== members.length) return showToast('Tên thành viên bị trùng!');

        try {
            await API.post('/api/groups', { groupName: name, members });
            showToast('Đã tạo nhóm!');
            navigate('/');
        } catch { showToast('Lỗi khi tạo nhóm'); }
    };
}


/* ═══════════════════════════════════════════════════════════
   PAGE: Group Detail
   ═══════════════════════════════════════════════════════════ */
async function renderGroupDetail(app, groupId) {
    app.innerHTML = `
    <div class="back-bar"><a class="back-link" onclick="navigate('/')">← Quay lại</a></div>
    <div class="page-header"><h1>📝 Chi tiết nhóm</h1></div>
    <div class="card" style="max-width:600px; margin:0 auto;">
      <p>Đang tải...</p>
    </div>`;

    try {
        const group = await API.get('/api/groups/' + groupId);
        app.innerHTML = `
      <div class="back-bar"><a class="back-link" onclick="navigate('/')">← Quay lại</a></div>
      <div class="page-header"><h1>📝 ${escHtml(group.groupName)}</h1></div>
      <div class="card" style="max-width:600px; margin:0 auto;">
        <div class="form-group">
          <label>Tên nhóm</label>
          <input class="form-input" id="edit-name" value="${escHtml(group.groupName)}" />
        </div>
        <label style="font-weight:700; font-size:0.9rem;">Thành viên</label>
        <div class="member-grid" id="member-grid"></div>
        <div style="text-align:center; margin-top:12px;">
          <button class="btn btn-accent btn-sm" id="add-member-btn">➕ Thêm</button>
        </div>
        <div style="display:flex; gap:12px; justify-content:center; margin-top:24px; flex-wrap:wrap;">
          <button class="btn btn-primary" id="save-detail">💾 Lưu thay đổi</button>
          <button class="btn btn-accent" onclick="navigate('/mode/select/${groupId}')">🎲 Chơi ngay</button>
        </div>
      </div>
    `;

        const grid = document.getElementById('member-grid');
        group.members.forEach((m, i) => {
            const div = document.createElement('div');
            div.className = 'member-slot';
            div.innerHTML = `
        <input class="member-input" value="${escHtml(m)}" />
        <button class="remove-btn" onclick="this.parentElement.remove()">✕</button>
      `;
            grid.appendChild(div);
        });

        document.getElementById('add-member-btn').onclick = () => {
            const div = document.createElement('div');
            div.className = 'member-slot';
            div.innerHTML = `
        <input class="member-input" placeholder="Tên mới" />
        <button class="remove-btn" onclick="this.parentElement.remove()">✕</button>
      `;
            grid.appendChild(div);
            div.querySelector('input').focus();
        };

        document.getElementById('save-detail').onclick = async () => {
            const name = document.getElementById('edit-name').value.trim();
            const inputs = document.querySelectorAll('.member-input');
            const members = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);
            if (!name) return showToast('Nhập tên nhóm!');
            if (members.length < 2) return showToast('Cần ít nhất 2 thành viên!');
            const unique = [...new Set(members)];
            if (unique.length !== members.length) return showToast('Tên bị trùng!');
            try {
                await API.put('/api/groups/' + groupId, { groupName: name, members });
                showToast('Đã lưu!');
            } catch { showToast('Lỗi khi lưu'); }
        };
    } catch {
        app.innerHTML = '<p style="text-align:center; color:red; margin-top:60px;">Không tìm thấy nhóm</p>';
    }
}


/* ═══════════════════════════════════════════════════════════
   PAGE: Mode Select
   ═══════════════════════════════════════════════════════════ */
function renderModeSelect(app, groupId) {
    app.innerHTML = `
    <div class="back-bar"><a class="back-link" onclick="navigate('/group/${groupId}')">← Quay lại nhóm</a></div>
    <div class="page-header">
      <h1>🎮 Chọn chế độ</h1>
      <p>Chọn kiểu bốc thăm yêu thích</p>
    </div>
    <div class="mode-grid">
      <div class="card mode-card" onclick="navigate('/mode/wheel/${groupId}')">
        <span class="mode-icon">🎡</span>
        <div class="mode-title">Vòng quay</div>
        <div class="mode-desc">Quay bánh xe may mắn cổ điển</div>
      </div>
      <div class="card mode-card" onclick="navigate('/mode/jackpot/${groupId}')">
        <span class="mode-icon">🎰</span>
        <div class="mode-title">Jackpot</div>
        <div class="mode-desc">Máy xèng phong cách casino</div>
      </div>
      <div class="card mode-card" onclick="navigate('/mode/dice/${groupId}')">
        <span class="mode-icon">🎲</span>
        <div class="mode-title">Lắc Điên Cuồng</div>
        <div class="mode-desc">Lắc bát điên cuồng, mở xem số phận</div>
      </div>
    </div>
  `;
}


/* ═══════════════════════════════════════════════════════════
   PAGE: Wheel Mode
   ═══════════════════════════════════════════════════════════ */
async function renderWheel(app, groupId) {
    app.innerHTML = `
    <div class="back-bar"><a class="back-link" onclick="navigate('/mode/select/${groupId}')">← Chọn chế độ</a></div>
    <div class="page-header"><h1>🎡 Vòng Quay May Mắn</h1></div>
    <div class="wheel-container">
      <div class="wheel-stage">
        <div class="wheel-pointer"></div>
        <canvas id="wheel-canvas" width="380" height="380"></canvas>
      </div>
      <button class="btn btn-primary btn-lg" id="spin-btn">🚀 Quay!</button>
    </div>`;

    let group;
    try {
        group = await API.get('/api/groups/' + groupId);
    } catch {
        app.innerHTML = '<p style="text-align:center; color:red; margin-top:60px;">Không tìm thấy nhóm</p>';
        return;
    }

    const members = group.members;
    const n = members.length;
    const colors = generateColors(n);
    const canvas = document.getElementById('wheel-canvas');
    const ctx = canvas.getContext('2d');
    const cx = 190, cy = 190, radius = 178;
    let currentAngle = 0;
    let spinning = false;

    function drawWheel(angle) {
        ctx.clearRect(0, 0, 380, 380);
        const sliceAngle = (2 * Math.PI) / n;

        for (let i = 0; i < n; i++) {
            const startA = angle + i * sliceAngle;
            const endA = startA + sliceAngle;

            // slice
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, startA, endA);
            ctx.closePath();
            ctx.fillStyle = colors[i];
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();

            // text
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(startA + sliceAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#2d2a26';
            ctx.font = `bold ${Math.min(14, 160 / n)}px Nunito`;
            const label = members[i].length > 10 ? members[i].slice(0, 9) + '…' : members[i];
            ctx.fillText(label, radius - 14, 5);
            ctx.restore();
        }

        // center circle
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#eee';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawWheel(currentAngle);

    document.getElementById('spin-btn').onclick = async () => {
        if (spinning) return;
        spinning = true;
        const btn = document.getElementById('spin-btn');
        btn.disabled = true;
        btn.textContent = '⏳ Đang quay...';

        // Get winner from server
        let winner;
        try {
            const result = await API.post('/api/draw/' + groupId);
            winner = result.winner;
        } catch {
            showToast('Lỗi khi bốc thăm');
            spinning = false;
            btn.disabled = false;
            btn.textContent = '🚀 Quay!';
            return;
        }

        // Find winner index
        const winIdx = members.indexOf(winner);
        const sliceAngle = (2 * Math.PI) / n;
        // Target: pointer at top (-PI/2), winner slice center aligned
        const targetSliceCenter = winIdx * sliceAngle + sliceAngle / 2;
        const targetAngle = -Math.PI / 2 - targetSliceCenter;
        // Add full rotations for dramatic effect
        const totalRotation = 8 * 2 * Math.PI + (targetAngle - (currentAngle % (2 * Math.PI)));

        // Play lottery music
        playLotteryMusic(10);

        // Animate
        const startAngle = currentAngle;
        const duration = 10000; // 10s
        const startTime = performance.now();
        let lastTickAngle = startAngle;

        function animate(now) {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            // Custom easing: slow start, fast middle, slow end with snap
            const ease = 1 - Math.pow(1 - t, 4);
            currentAngle = startAngle + totalRotation * ease;
            drawWheel(currentAngle);

            // Tick sound at slice boundaries
            const currentSlice = Math.floor((((-currentAngle - Math.PI / 2) % (2 * Math.PI)) + 4 * Math.PI) / sliceAngle) % n;
            const lastSlice = Math.floor((((-lastTickAngle - Math.PI / 2) % (2 * Math.PI)) + 4 * Math.PI) / sliceAngle) % n;
            if (currentSlice !== lastSlice && t < 0.95) playTick();
            lastTickAngle = currentAngle;

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                // Done!
                spinning = false;
                btn.disabled = false;
                btn.textContent = '🚀 Quay lại!';
                showWinner(winner, groupId);
            }
        }
        requestAnimationFrame(animate);
    };
}


/* ═══════════════════════════════════════════════════════════
   PAGE: Jackpot Mode (Single Reel)
   ═══════════════════════════════════════════════════════════ */
async function renderJackpot(app, groupId) {
    app.innerHTML = `
    <div class="back-bar"><a class="back-link" onclick="navigate('/mode/select/${groupId}')">← Chọn chế độ</a></div>
    <div class="page-header"><h1>🎰 Jackpot</h1></div>
    <div class="jackpot-container">
      <div class="jackpot-machine">
        <div class="jackpot-header">★ JACKPOT ★</div>
        <div class="jackpot-window">
          <div class="jackpot-center-line"></div>
          <div class="jackpot-reel" id="reel-main"><div class="reel-strip" id="reel-strip"></div></div>
        </div>
        <div class="jackpot-lever" id="jackpot-lever">
          <div class="lever-ball"></div>
          <div class="lever-shaft"></div>
        </div>
        <div class="jackpot-lights">
          ${Array(10).fill('<span></span>').join('')}
        </div>
      </div>
      <p style="color:var(--text-light); font-size:0.85rem;">Kéo cần gạt hoặc nhấn nút bên dưới</p>
      <button class="btn btn-primary btn-lg" id="pull-btn">🎰 Kéo!</button>
    </div>`;

    let group;
    try {
        group = await API.get('/api/groups/' + groupId);
    } catch {
        app.innerHTML = '<p style="text-align:center;color:red;margin-top:60px;">Không tìm thấy nhóm</p>';
        return;
    }

    const members = group.members;
    const ITEM_H = window.innerWidth <= 600 ? 54 : 66;
    let pulling = false;

    // Build reel: lots of repeated shuffled names
    const strip = document.getElementById('reel-strip');
    const reelNames = [];
    for (let r = 0; r < 80; r++) {
        const copy = [...members].sort(() => Math.random() - 0.5);
        reelNames.push(...copy);
    }
    reelNames.forEach(name => {
        const div = document.createElement('div');
        div.className = 'reel-item';
        div.textContent = name;
        strip.appendChild(div);
    });
    const startIdx = Math.floor(reelNames.length * 0.05);
    strip.style.transform = `translateY(-${startIdx * ITEM_H}px)`;

    const reel = document.getElementById('reel-main');
    const lever = document.getElementById('jackpot-lever');
    const pullBtn = document.getElementById('pull-btn');

    function spawnParticles() {
        const machine = document.querySelector('.jackpot-machine');
        const colors = ['#fdcb6e', '#ff6b6b', '#a29bfe', '#00cec9', '#fd79a8'];
        for (let i = 0; i < 20; i++) {
            const p = document.createElement('div');
            p.className = 'jackpot-particle';
            const tx = (Math.random() - 0.5) * 200;
            const ty = (Math.random() - 0.5) * 200 - 50;
            p.style.cssText = `
                left: 50%; top: 50%;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                --tx: ${tx}px; --ty: ${ty}px;
                animation: particleFly ${0.6 + Math.random() * 0.6}s ease forwards;
                animation-delay: ${Math.random() * 0.2}s;
            `;
            machine.appendChild(p);
            setTimeout(() => p.remove(), 1500);
        }
    }

    function rebuildReel() {
        strip.innerHTML = '';
        reelNames.length = 0;
        for (let r = 0; r < 80; r++) {
            const copy = [...members].sort(() => Math.random() - 0.5);
            reelNames.push(...copy);
        }
        reelNames.forEach(name => {
            const div = document.createElement('div');
            div.className = 'reel-item';
            div.textContent = name;
            strip.appendChild(div);
        });
        const resetIdx = Math.floor(reelNames.length * 0.05);
        strip.style.transform = `translateY(-${resetIdx * ITEM_H}px)`;
    }

    async function pull() {
        if (pulling) return;
        pulling = true;
        rebuildReel();
        pullBtn.disabled = true;
        pullBtn.textContent = '⏳ Đang quay...';
        lever.classList.add('pulled');

        // Get winner from server
        let winner;
        try {
            const result = await API.post('/api/draw/' + groupId);
            winner = result.winner;
        } catch {
            showToast('Lỗi');
            pulling = false;
            pullBtn.disabled = false;
            pullBtn.textContent = '🎰 Kéo!';
            lever.classList.remove('pulled');
            return;
        }

        setTimeout(() => lever.classList.remove('pulled'), 600);

        // Play music during spin
        const musicOscs = playLotteryMusic(8);

        // Decide if we do a fake-out (30% chance)
        const doFakeout = Math.random() < 0.30;

        // Find the target: winner in latter portion of reel
        let targetIdx = -1;
        for (let i = Math.floor(reelNames.length * 0.6); i < reelNames.length - 3; i++) {
            if (reelNames[i] === winner) { targetIdx = i; break; }
        }
        if (targetIdx === -1) {
            for (let i = reelNames.length - 1; i >= 0; i--) {
                if (reelNames[i] === winner) { targetIdx = i; break; }
            }
        }

        // If fakeout: first target one position BEFORE winner, then slide to winner
        const fakeIdx = doFakeout ? targetIdx - 1 : targetIdx;

        const viewCenter = 200 / 2;
        const fakeTop = -(fakeIdx * ITEM_H) + viewCenter - ITEM_H / 2;
        const finalTop = -(targetIdx * ITEM_H) + viewCenter - ITEM_H / 2;
        const currentTop = parseFloat(strip.style.transform.replace(/[^0-9\.\-]/g, '')) || 0;
        const totalScroll = fakeTop - currentTop;

        // ── PHASE 1: Fast constant speed (0-60%) with heavy blur + tick sounds
        // ── PHASE 2: Gradual deceleration (60-90%) blur fades out, ticks slow down
        // ── PHASE 3: Near-stop crawl (90-100%) very slow, clear text, suspenseful
        const duration = 8000;
        const startTime = performance.now();
        let lastSliceIdx = -1;

        /* no blur */

        function tick(now) {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            let pos;

            if (t < 0.55) {
                // PHASE 1: constant fast speed, heavy blur
                pos = currentTop + totalScroll * (t / 0.55) * 0.55;
            } else if (t < 0.85) {
                // PHASE 2: deceleration, blur fades
                if (t > 0.6) {
                    /* no blur */
                    /* no blur */
                }
                if (t > 0.75) {
                    /* no blur */
                }
                const localT = (t - 0.55) / 0.30;
                const eased = 1 - Math.pow(1 - localT, 3); // cubic ease-out
                pos = currentTop + totalScroll * (0.55 + 0.40 * eased);
            } else {
                // PHASE 3: very slow crawl, clear text
                /* no blur */
                const localT = (t - 0.85) / 0.15;
                const slowEase = 1 - Math.pow(1 - localT, 4); // even slower ease
                pos = currentTop + totalScroll * (0.95 + 0.05 * slowEase);
            }

            strip.style.transform = `translateY(${ pos }px)`;

            // Tick sounds based on which name is at center
            const currentSliceIdx = Math.round(-pos / ITEM_H);
            if (currentSliceIdx !== lastSliceIdx) {
                lastSliceIdx = currentSliceIdx;
                playSlotTick();
            }

            if (t < 1) {
                requestAnimationFrame(tick);
            } else {
                // Landed on fakeIdx position
                strip.style.transform = `translateY(${ fakeTop }px)`;
                /* no blur */

                if (doFakeout) {
                    // FAKE-OUT: pause briefly, then slowly slide to the real winner
                    setTimeout(() => {
                        const slideStart = performance.now();
                        const slideDur = 800;
                        const slideFrom = fakeTop;
                        const slideTo = finalTop;

                        function slideAnim(now2) {
                            const el2 = now2 - slideStart;
                            const t2 = Math.min(el2 / slideDur, 1);
                            // Slow ease with slight overshoot
                            const ease2 = t2 < 0.7
                                ? (t2 / 0.7) * 0.85
                                : 0.85 + (1 - Math.pow(1 - ((t2 - 0.7) / 0.3), 2)) * 0.15;
                            strip.style.transform = `translateY(${ (slideFrom + (slideTo - slideFrom) * ease2) }px)`;

                            if (t2 < 0.7 && Math.floor(t2 * 10) !== Math.floor((t2 - 0.01) * 10)) {
                                playSlotTick();
                            }

                            if (t2 < 1) {
                                requestAnimationFrame(slideAnim);
                            } else {
                                strip.style.transform = `translateY(${ finalTop }px)`;
                                finishSpin(targetIdx, winner);
                            }
                        }
                        requestAnimationFrame(slideAnim);
                    }, 500);
                } else {
                    finishSpin(targetIdx, winner);
                }
            }
        }

        function finishSpin(idx, winnerName) {
            const items = strip.querySelectorAll('.reel-item');
            if (items[idx]) {
                items[idx].classList.add('winner-item');
                items[idx].style.animation = 'jackpotBounce 0.5s ease';
            }
            spawnParticles();
            playWinSound();
            setTimeout(() => {
                pulling = false;
                pullBtn.disabled = false;
                pullBtn.textContent = '🎰 Kéo lại!';
                showWinner(winnerName, groupId);
            }, 800);
        }

        setTimeout(() => requestAnimationFrame(tick), 300);
    }

    lever.onclick = pull;
    pullBtn.onclick = pull;
}
/* ═══════════════════════════════════════════════════════════
   PAGE: Dice / Xóc Đĩa Mode
   ═══════════════════════════════════════════════════════════ */
async function renderDice(app, groupId) {
    app.innerHTML = `
    <div class="back-bar"><a class="back-link" onclick="navigate('/mode/select/${groupId}')">← Chọn chế độ</a></div>
    <div class="page-header"><h1>🎲 Xóc Đĩa May Mắn</h1></div>
    <div class="dice-container">
      <div class="dice-scene">
        <div class="dice-plate"></div>
        <div class="dice-result-on-plate" id="dice-result-plate"></div>
        <div class="dice-bowl dice-bowl-idle" id="dice-bowl">
          <span class="bowl-text">Kéo ↕ để lắc</span>
        </div>
      </div>
      <div class="dice-number-panel">
        <span class="dice-number-label">Số</span>
        <span class="dice-number-value" id="dice-number">—</span>
      </div>
      <p class="dice-tooltip" id="dice-tooltip">↕️ Kéo bát lên/xuống để lắc</p>
      <div class="dice-member-name" id="dice-winner-name"></div>
      <button class="btn btn-primary btn-lg" id="dice-reveal-btn" style="display:none;">🥣 Mở bát</button>
      <button class="btn btn-accent btn-lg" id="dice-again-btn" style="display:none;">🔄 Lắc lại</button>
    </div>`;

    let group;
    try {
        group = await API.get('/api/groups/' + groupId);
    } catch {
        app.innerHTML = '<p style="text-align:center;color:red;margin-top:60px;">Không tìm thấy nhóm</p>';
        return;
    }

    const members = group.members;
    const bowl = document.getElementById('dice-bowl');
    const numberDisplay = document.getElementById('dice-number');
    const resultOnPlate = document.getElementById('dice-result-plate');
    const tooltip = document.getElementById('dice-tooltip');
    const revealBtn = document.getElementById('dice-reveal-btn');
    const againBtn = document.getElementById('dice-again-btn');
    const winnerNameEl = document.getElementById('dice-winner-name');

    let shakeCount = 0;
    let isDragging = false;
    let lastY = 0;
    let winner = null;
    let winnerIdx = -1;
    let state = 'idle'; // idle, shaking, ready, revealed
    let currentDisplayNum = 0;
    const SHAKE_THRESHOLD = 6;

    // Randomly change the displayed number
    function randomizeNumber() {
        const idx = Math.floor(Math.random() * members.length);
        currentDisplayNum = idx + 1;
        numberDisplay.textContent = String(currentDisplayNum).padStart(2, '0');
    }

    // ── Pointer events: shake
    bowl.addEventListener('pointerdown', e => {
        if (state !== 'idle' && state !== 'shaking') return;
        isDragging = true;
        lastY = e.clientY;
        bowl.classList.add('grabbed');
        bowl.classList.remove('dice-bowl-idle');
        bowl.setPointerCapture(e.pointerId);
        state = 'shaking';
    });

    bowl.addEventListener('pointermove', e => {
        if (!isDragging || state !== 'shaking') return;
        const dy = e.clientY - lastY;
        if (Math.abs(dy) > 12) {
            shakeCount++;
            lastY = e.clientY;

            // Visual shake: slight offset
            const angle = (Math.random() - 0.5) * 6;
            const tx = (Math.random() - 0.5) * 8;
            bowl.style.transform = `translate(calc(-50% + ${tx}px), calc(-50%)) rotate(${angle}deg)`;
            bowl.classList.add('shaking');
            playDiceShake();

            // Change number each shake cycle
            randomizeNumber();

            if (shakeCount >= SHAKE_THRESHOLD && !winner) {
                API.post('/api/draw/' + groupId).then(r => {
                    winner = r.winner;
                    winnerIdx = members.indexOf(winner) + 1;
                }).catch(() => showToast('Lỗi'));
            }
        }
    });

    bowl.addEventListener('pointerup', () => {
        if (!isDragging) return;
        isDragging = false;
        bowl.classList.remove('grabbed');

        if (state === 'shaking') {
            // Reset bowl position
            bowl.style.transform = 'translate(-50%, -50%) rotate(0deg)';
            setTimeout(() => bowl.classList.remove('shaking'), 150);

            // Thud sound
            ensureAudio();
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.connect(g); g.connect(audioCtx.destination);
            o.type = 'sine'; o.frequency.value = 80;
            g.gain.setValueAtTime(0.12, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
            o.start(audioCtx.currentTime); o.stop(audioCtx.currentTime + 0.15);

            if (shakeCount >= SHAKE_THRESHOLD) {
                state = 'ready';
                tooltip.textContent = '✅ Đã lắc đủ! Nhấn mở bát';
                tooltip.style.animation = 'none';
                revealBtn.style.display = 'inline-flex';
            }
        }
    });

    // ── REVEAL: Mở bát — instant bowl flip
    function doReveal() {
        if (state !== 'ready' || !winner) return;
        state = 'revealed';
        revealBtn.style.display = 'none';
        tooltip.textContent = '';

        // Show final number on number panel
        numberDisplay.textContent = String(winnerIdx).padStart(2, '0');
        numberDisplay.classList.add('locked');

        // Instant bowl flip off
        bowl.classList.add('lifted');

        // Show number on the plate
        setTimeout(() => {
            resultOnPlate.textContent = winner;
            resultOnPlate.classList.add('visible');

            winnerNameEl.textContent = `#${winnerIdx} — ${winner}`;
            winnerNameEl.classList.add('visible');

            againBtn.style.display = 'inline-flex';
        }, 500);
    }

    revealBtn.onclick = doReveal;

    // Play again
    againBtn.onclick = () => {
        render();
    };
}

/* ═══════════════════════════════════════════════════════════
   PAGE: Admin Panel
   ═══════════════════════════════════════════════════════════ */
function renderAdmin(app) {
    const token = sessionStorage.getItem('adminToken');

    if (!token) {
        showLoginModal(app);
        return;
    }

    app.innerHTML = `
    <div class="back-bar"><a class="back-link" onclick="navigate('/')">← Trang chính</a></div>
    <div class="page-header"><h1>🔧 Admin Panel</h1></div>
    <div class="admin-container">
      <div class="card">
        <div class="form-group">
          <label>Chọn nhóm</label>
          <select class="form-input" id="admin-group-select">
            <option value="">-- Chọn nhóm --</option>
          </select>
        </div>
      </div>
      <div id="admin-prob-area"></div>
      <div style="text-align:center; margin-top:16px;">
        <button class="btn btn-danger btn-sm" onclick="sessionStorage.removeItem('adminToken'); navigate('/admin')">🚪 Đăng xuất</button>
      </div>
    </div>`;

    loadAdminGroups();
}

async function loadAdminGroups() {
    try {
        const groups = await API.get('/api/admin/groups');
        const sel = document.getElementById('admin-group-select');
        groups.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.groupName + ` (${g.members.length})`;
            sel.appendChild(opt);
        });
        sel.onchange = () => {
            if (sel.value) loadProbability(sel.value);
        };
    } catch (e) {
        if (e.status === 401) {
            sessionStorage.removeItem('adminToken');
            showToast('Phiên hết hạn, đăng nhập lại');
            navigate('/admin');
        }
    }
}

async function loadProbability(groupId) {
    const area = document.getElementById('admin-prob-area');
    try {
        const groups = await API.get('/api/admin/groups');
        const group = groups.find(g => g.id === groupId);
        if (!group) return;
        const probData = await API.get('/api/admin/probability/' + groupId);

        area.innerHTML = `
      <div class="card">
        <h3 style="margin-bottom:16px;">⚖️ Điều chỉnh xác suất</h3>
        <div id="prob-list"></div>
        <div style="text-align:center; margin-top:24px;">
          <button class="btn btn-primary" id="save-prob">💾 Lưu thay đổi</button>
        </div>
      </div>
    `;

        const list = document.getElementById('prob-list');
        group.members.forEach(name => {
            const current = probData[name] || 'white';
            const row = document.createElement('div');
            row.className = 'prob-member';
            row.dataset.name = name;
            row.innerHTML = `
        <div class="member-name">${escHtml(name)}</div>
        <div class="prob-options">
          <div class="prob-option opt-white ${current === 'white' ? 'active' : ''}" data-color="white" title="Xác suất bình thường, weight = 1.0">
            <div class="prob-radio"></div>
            <span class="prob-icon">⚪</span>
            <div class="prob-label">
              <span class="prob-title">Công bằng</span>
              <span class="prob-desc">Xác suất bình thường</span>
            </div>
          </div>
          <div class="prob-option opt-green ${current === 'green' ? 'active' : ''}" data-color="green" title="Ưu tiên, weight = 1.1 (+10%)">
            <div class="prob-radio"></div>
            <span class="prob-icon">🟢</span>
            <div class="prob-label">
              <span class="prob-title">Ưu tiên +10%</span>
              <span class="prob-desc">Tăng nhẹ cơ hội trúng</span>
            </div>
          </div>
          <div class="prob-option opt-red ${current === 'red' ? 'active' : ''}" data-color="red" title="Gần như không trúng, weight = 0.001">
            <div class="prob-radio"></div>
            <span class="prob-icon">🔴</span>
            <div class="prob-label">
              <span class="prob-title">Gần như 0%</span>
              <span class="prob-desc">Hầu như không bao giờ trúng</span>
            </div>
          </div>
        </div>
      `;
            list.appendChild(row);
        });

        // Click handlers for radio options
        list.addEventListener('click', e => {
            const opt = e.target.closest('.prob-option');
            if (!opt) return;
            const member = opt.closest('.prob-member');
            member.querySelectorAll('.prob-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
        });

        // Save
        document.getElementById('save-prob').onclick = async () => {
            const config = {};
            list.querySelectorAll('.prob-member').forEach(row => {
                const name = row.dataset.name;
                const active = row.querySelector('.prob-option.active');
                config[name] = active ? active.dataset.color : 'white';
            });
            try {
                await API.put('/api/admin/probability/' + groupId, config);
                showToast('Đã lưu xác suất!');
            } catch {
                showToast('Lỗi khi lưu');
            }
        };
    } catch (e) {
        if (e.status === 401) {
            sessionStorage.removeItem('adminToken');
            showToast('Phiên hết hạn');
            navigate('/admin');
        }
    }
}

function showLoginModal(app) {
    app.innerHTML = `
    <div class="login-overlay">
      <div class="login-box">
        <h2>🔒 Admin Login</h2>
        <div class="form-group">
          <label>Tài khoản</label>
          <input class="form-input" id="login-user" placeholder="Username" autocomplete="off" />
        </div>
        <div class="form-group">
          <label>Mật khẩu</label>
          <input class="form-input" id="login-pass" type="password" placeholder="Password" />
        </div>
        <div style="text-align:center; margin-top:8px;">
          <button class="btn btn-primary" id="login-btn">Đăng nhập</button>
          <p style="margin-top:12px;"><a class="back-link" onclick="navigate('/')">← Về trang chính</a></p>
        </div>
      </div>
    </div>`;

    document.getElementById('login-btn').onclick = async () => {
        const username = document.getElementById('login-user').value.trim();
        const password = document.getElementById('login-pass').value;
        try {
            const result = await API.post('/api/admin/login', { username, password });
            sessionStorage.setItem('adminToken', result.token);
            showToast('Đăng nhập thành công!');
            renderAdmin(document.getElementById('app'));
        } catch {
            showToast('Sai tài khoản hoặc mật khẩu');
        }
    };

    document.getElementById('login-pass').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('login-btn').click();
    });
}


/* ═══════════════════════════════════════════════════════════
   SHARED: Winner overlay
   ═══════════════════════════════════════════════════════════ */
function showWinner(name, groupId) {
    playWinSound();
    spawnConfetti();

    const overlay = document.createElement('div');
    overlay.className = 'winner-overlay';
    overlay.innerHTML = `
    <div class="winner-box">
      <div class="trophy">🏆</div>
      <div class="winner-label">Người may mắn là</div>
      <div class="winner-name">${escHtml(name)}</div>
      <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
        <button class="btn btn-primary" id="winner-again">🔄 Quay lại</button>
        <button class="btn btn-secondary" id="winner-close">✖ Đóng</button>
      </div>
    </div>
  `;
    document.body.appendChild(overlay);

    overlay.querySelector('#winner-close').onclick = () => overlay.remove();
    overlay.querySelector('#winner-again').onclick = () => {
        overlay.remove();
        render();
    };
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.remove();
    });
}


/* ═══════════════════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════════════════ */
function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}
