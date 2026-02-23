const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', 'data');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');
const PROB_FILE = path.join(DATA_DIR, 'probability.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

// In-memory admin session
let adminSession = { token: null, createdAt: null };
const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

// ── Helpers ──────────────────────────────────────────────────
function readJSON(filePath) {
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function requireAdmin(req, res, next) {
    const token = req.headers['x-admin-token'];
    if (
        !token ||
        token !== adminSession.token ||
        !adminSession.createdAt ||
        Date.now() - adminSession.createdAt > SESSION_TTL
    ) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// ── Group CRUD ───────────────────────────────────────────────

// GET /api/groups
router.get('/groups', (req, res) => {
    const groups = readJSON(GROUPS_FILE);
    const list = Object.entries(groups).map(([id, g]) => ({ id, ...g }));
    list.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
    res.json(list);
});

// POST /api/groups
router.post('/groups', (req, res) => {
    const { groupName, members } = req.body;
    if (!groupName || !Array.isArray(members) || members.length === 0) {
        return res.status(400).json({ error: 'groupName and members[] required' });
    }
    const groups = readJSON(GROUPS_FILE);
    const id = uuidv4();
    groups[id] = {
        groupName,
        members,
        createdAt: Date.now(),
        lastUsed: Date.now()
    };
    writeJSON(GROUPS_FILE, groups);
    res.status(201).json({ id, ...groups[id] });
});

// GET /api/groups/:id
router.get('/groups/:id', (req, res) => {
    const groups = readJSON(GROUPS_FILE);
    const group = groups[req.params.id];
    if (!group) return res.status(404).json({ error: 'Group not found' });
    res.json({ id: req.params.id, ...group });
});

// PUT /api/groups/:id
router.put('/groups/:id', (req, res) => {
    const groups = readJSON(GROUPS_FILE);
    if (!groups[req.params.id]) return res.status(404).json({ error: 'Group not found' });
    const { groupName, members } = req.body;
    if (groupName) groups[req.params.id].groupName = groupName;
    if (Array.isArray(members)) groups[req.params.id].members = members;
    groups[req.params.id].lastUsed = Date.now();
    writeJSON(GROUPS_FILE, groups);
    res.json({ id: req.params.id, ...groups[req.params.id] });
});

// DELETE /api/groups/:id
router.delete('/groups/:id', (req, res) => {
    const groups = readJSON(GROUPS_FILE);
    if (!groups[req.params.id]) return res.status(404).json({ error: 'Group not found' });
    delete groups[req.params.id];
    writeJSON(GROUPS_FILE, groups);
    // Also clean up probability config
    const prob = readJSON(PROB_FILE);
    delete prob[req.params.id];
    writeJSON(PROB_FILE, prob);
    res.json({ success: true });
});

// ── Draw (with probability) ─────────────────────────────────

// POST /api/draw/:groupId
router.post('/draw/:groupId', (req, res) => {
    const groups = readJSON(GROUPS_FILE);
    const group = groups[req.params.groupId];
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const prob = readJSON(PROB_FILE);
    const groupProb = prob[req.params.groupId] || {};

    // Weight-based probability: red=0.001, green=1.1, white=1.0
    const weights = group.members.map(name => {
        const status = groupProb[name] || 'white';
        if (status === 'red') return { name, weight: 0.001 };
        if (status === 'green') return { name, weight: 1.1 };
        return { name, weight: 1.0 };
    });

    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let rand = Math.random() * totalWeight;
    let winner = weights[0].name;

    for (const w of weights) {
        rand -= w.weight;
        if (rand <= 0) {
            winner = w.name;
            break;
        }
    }

    // Update lastUsed
    groups[req.params.groupId].lastUsed = Date.now();
    writeJSON(GROUPS_FILE, groups);

    res.json({ winner, members: group.members });
});

// ── Admin ────────────────────────────────────────────────────

// POST /api/admin/login
router.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    const admin = readJSON(ADMIN_FILE);
    if (username === admin.username && password === admin.password) {
        const token = uuidv4();
        adminSession = { token, createdAt: Date.now() };
        return res.json({ token });
    }
    res.status(401).json({ error: 'Invalid credentials' });
});

// GET /api/admin/probability/:groupId
router.get('/admin/probability/:groupId', requireAdmin, (req, res) => {
    const prob = readJSON(PROB_FILE);
    res.json(prob[req.params.groupId] || {});
});

// PUT /api/admin/probability/:groupId
router.put('/admin/probability/:groupId', requireAdmin, (req, res) => {
    const prob = readJSON(PROB_FILE);
    prob[req.params.groupId] = req.body; // { memberName: "green"|"red"|"white" }
    writeJSON(PROB_FILE, prob);
    res.json({ success: true });
});

// GET /api/admin/groups (list all groups for admin dropdown)
router.get('/admin/groups', requireAdmin, (req, res) => {
    const groups = readJSON(GROUPS_FILE);
    const list = Object.entries(groups).map(([id, g]) => ({ id, groupName: g.groupName, members: g.members }));
    res.json(list);
});

module.exports = router;
