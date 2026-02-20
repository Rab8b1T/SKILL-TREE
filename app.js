/**
 * SKILL TREE DASHBOARD - Main Application
 * A data-driven, accessible skill tree tracker with gamification
 */

(function () {
    'use strict';

    // ============================================
    // CONFIGURATION & CONSTANTS
    // ============================================

    const CONFIG = {
        XP_PER_LEVEL: 230,  // 17,200 total XP ÷ 75 levels ≈ 230 XP per level
        AUTOSAVE_DEBOUNCE: 500,
        SEARCH_DEBOUNCE: 300,
        PROGRESS_ENDPOINT: '/progress',
    };

    const STATUS = {
        LOCKED: 'locked',
        UNLOCKED: 'unlocked',
        IN_PROGRESS: 'in-progress',
        COMPLETE: 'complete',
    };

    const BADGES = {
        FIRST_STEP: { id: 'first-step', name: 'First Step', icon: '🎯', condition: (state) => state.completedCount >= 1 },
        FIVE_DOWN: { id: 'five-down', name: 'High Five', icon: '✋', condition: (state) => state.completedCount >= 5 },
        TEN_COMPLETE: { id: 'ten-complete', name: 'Double Digits', icon: '🔟', condition: (state) => state.completedCount >= 10 },
        ZONE_MASTER: { id: 'zone-master', name: 'Zone Master', icon: '🏆', condition: (state) => state.zonesCompleted >= 1 },
        HALFWAY: { id: 'halfway', name: 'Halfway There', icon: '⚡', condition: (state) => state.progressPercent >= 50 },
        COMPLETIONIST: { id: 'completionist', name: 'Completionist', icon: '👑', condition: (state) => state.progressPercent >= 100 },
        DEDICATED: { id: 'dedicated', name: 'Dedicated', icon: '🔥', condition: (state) => state.streakDays >= 7 },
        XP_HUNTER: { id: 'xp-hunter', name: 'XP Hunter', icon: '💎', condition: (state) => state.totalXP >= 5000 },
    };

    const ZONE_ICONS = ['⚡', '🎯', '🧠', '🔮', '🏗️', '🚀', '💡', '🎨', '🔧', '📊'];
    const ZONE_COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#6366f1'];

    // ============================================
    // STATE MANAGEMENT
    // ============================================

    let state = {
        data: null,
        user: {
            current_xp: 0,
            level: 1,
            badges: [],
            notes: {},
            journal: {},
            lastVisit: null,
            streakDays: 0,
        },
        settings: {
            shortcutsEnabled: true,
            view: 'grid',
        },
        ui: {
            currentLevelId: null,
            currentZoneId: null,
            expandedZones: new Set(),
            searchQuery: '',
            statusFilter: 'all',
        },
    };

    // ============================================
    // DOM ELEMENTS
    // ============================================

    const DOM = {};

    function cacheDOMElements() {
        DOM.app = document.getElementById('app');
        DOM.zonesContainer = document.getElementById('zones-container');
        DOM.searchInput = document.getElementById('search-input');
        DOM.statusFilter = document.getElementById('status-filter');
        DOM.userLevel = document.getElementById('user-level');
        DOM.currentXP = document.getElementById('current-xp');
        DOM.nextLevelXP = document.getElementById('next-level-xp');
        DOM.xpFill = document.getElementById('xp-fill');
        DOM.globalPercentage = document.getElementById('global-percentage');
        DOM.globalProgressFill = document.getElementById('global-progress-fill');
        DOM.badgesList = document.getElementById('badges-list');
        DOM.completedCount = document.getElementById('completed-count');
        DOM.totalCount = document.getElementById('total-count');
        DOM.streakDays = document.getElementById('streak-days');

        // Panel
        DOM.levelPanel = document.getElementById('level-panel');
        DOM.panelBackdrop = document.getElementById('panel-backdrop');
        DOM.panelClose = document.getElementById('panel-close');
        DOM.panelTitle = document.getElementById('panel-title');
        DOM.panelZoneBadge = document.getElementById('panel-zone-badge');
        DOM.panelXP = document.getElementById('panel-xp');
        DOM.panelHours = document.getElementById('panel-hours');
        DOM.panelStatus = document.getElementById('panel-status');
        DOM.panelStatusBadge = document.getElementById('panel-status-badge');
        DOM.panelPrereqsSection = document.getElementById('panel-prereqs-section');
        DOM.panelPrereqs = document.getElementById('panel-prereqs');
        DOM.panelDetails = document.getElementById('panel-details');
        DOM.panelNotesInput = document.getElementById('panel-notes-input');
        DOM.journalEntries = document.getElementById('journal-entries');
        DOM.journalInput = document.getElementById('journal-input');
        DOM.addJournalBtn = document.getElementById('add-journal-btn');
        DOM.btnStart = document.getElementById('btn-start');
        DOM.btnComplete = document.getElementById('btn-complete');

        // Modals
        DOM.shortcutsModal = document.getElementById('shortcuts-modal');
        DOM.shortcutsBtn = document.getElementById('shortcuts-btn');
        DOM.shortcutsClose = document.getElementById('shortcuts-close');
        DOM.shortcutsBackdrop = document.getElementById('shortcuts-backdrop');
        DOM.disableShortcuts = document.getElementById('disable-shortcuts');

        DOM.importModal = document.getElementById('import-modal');
        DOM.importBtn = document.getElementById('import-btn');
        DOM.importClose = document.getElementById('import-close');
        DOM.importBackdrop = document.getElementById('import-backdrop');
        DOM.importFile = document.getElementById('import-file');
        DOM.importPreview = document.getElementById('import-preview');
        DOM.previewStats = document.getElementById('preview-stats');
        DOM.conflictResolution = document.getElementById('conflict-resolution');
        DOM.importCancel = document.getElementById('import-cancel');
        DOM.importConfirm = document.getElementById('import-confirm');

        DOM.exportBtn = document.getElementById('export-btn');
        DOM.toggleViewBtn = document.getElementById('toggle-view-btn');
        DOM.resetAllBtn = document.getElementById('reset-all-btn');

        // Toast & Animations
        DOM.badgeToast = document.getElementById('badge-toast');
        DOM.badgeToastName = document.getElementById('badge-toast-name');
        DOM.levelupContainer = document.getElementById('levelup-container');
        DOM.levelupLevel = document.getElementById('levelup-level');
        DOM.confettiCanvas = document.getElementById('confetti-canvas');

        // Reset buttons (panel)
        DOM.btnResetLevel = document.getElementById('btn-reset-level');
        DOM.btnResetZone = document.getElementById('btn-reset-zone');
    }

    // ============================================
    // UTILITIES
    // ============================================

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function parseMarkdown(text) {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    // ============================================
    // STORAGE
    // ============================================

    function buildPersistedPayload() {
        return {
            version: '1.0',
            updatedAt: new Date().toISOString(),
            zones: state.data ? state.data.zones : [],
            user: state.user,
            settings: state.settings,
        };
    }

    async function saveToServer() {
        try {
            const payload = buildPersistedPayload();
            const headers = { 'Content-Type': 'application/json' };
            if (typeof window.authHeaders === 'function') {
                Object.assign(headers, window.authHeaders());
            }
            await fetch(CONFIG.PROGRESS_ENDPOINT, {
                method: 'POST',
                headers,
                cache: 'no-store',
                body: JSON.stringify(payload),
            });
        } catch (e) {
            console.warn('Failed to save to server:', e);
        }
    }

    const debouncedSave = debounce(saveToServer, CONFIG.AUTOSAVE_DEBOUNCE);

    async function loadFromServer() {
        const headers = { };
        if (typeof window.authHeaders === 'function') {
            Object.assign(headers, window.authHeaders());
        }
        const res = await fetch(CONFIG.PROGRESS_ENDPOINT, { headers, cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load progress: ${res.status}`);
        return res.json();
    }

    // ============================================
    // DATA MANAGEMENT
    // ============================================

    function loadData(data, forceReload = false) {
        if (!data || !data.zones) {
            console.error('Invalid data structure');
            return;
        }

        // Server is the source of truth: load exactly what we got.
        // (We keep forceReload for compatibility, but it doesn't merge anything now.)
        state.data = { zones: JSON.parse(JSON.stringify(data.zones)) };
        if (data.user && typeof data.user === 'object') {
            state.user = { ...state.user, ...data.user };
        }
        if (data.settings && typeof data.settings === 'object') {
            state.settings = { ...state.settings, ...data.settings };
        }

        // Ensure all levels have status (for new levels without saved data)
        state.data.zones.forEach((zone, zoneIndex) => {
            zone.color = zone.color || ZONE_COLORS[zoneIndex % ZONE_COLORS.length];
            zone.icon = zone.icon || ZONE_ICONS[zoneIndex % ZONE_ICONS.length];

            zone.levels.forEach((level, levelIndex) => {
                if (!level.status) {
                    level.status = levelIndex === 0 && zoneIndex === 0 ? STATUS.UNLOCKED : STATUS.LOCKED;
                }
            });
        });

        // Update prerequisites and unlock available levels
        updateUnlockStatus();

        // Expand first zone by default (only if none expanded yet)
        if (state.ui.expandedZones.size === 0 && state.data.zones.length > 0) {
            state.ui.expandedZones.add(state.data.zones[0].id);
        }

        debouncedSave();
        renderApp();
        updateStreak();
    }

    function mergeData(newData, strategy = 'merge') {
        if (!state.data) {
            state.data = JSON.parse(JSON.stringify(newData));
            return;
        }

        newData.zones.forEach((newZone) => {
            const existingZone = state.data.zones.find((z) => z.id === newZone.id);

            if (!existingZone) {
                state.data.zones.push(JSON.parse(JSON.stringify(newZone)));
                return;
            }

            newZone.levels.forEach((newLevel) => {
                const existingLevel = existingZone.levels.find((l) => l.id === newLevel.id);

                if (!existingLevel) {
                    existingZone.levels.push(JSON.parse(JSON.stringify(newLevel)));
                    return;
                }

                switch (strategy) {
                    case 'merge':
                        // Keep the highest progress
                        const statusOrder = [STATUS.LOCKED, STATUS.UNLOCKED, STATUS.IN_PROGRESS, STATUS.COMPLETE];
                        if (statusOrder.indexOf(newLevel.status) > statusOrder.indexOf(existingLevel.status)) {
                            existingLevel.status = newLevel.status;
                        }
                        break;
                    case 'overwrite':
                        existingLevel.status = newLevel.status;
                        break;
                    case 'skip':
                        // Keep existing
                        break;
                }
            });
        });
    }

    function updateUnlockStatus() {
        if (!state.data) return;

        const completedIds = new Set();

        // Collect all completed level IDs
        state.data.zones.forEach((zone) => {
            zone.levels.forEach((level) => {
                if (level.status === STATUS.COMPLETE) {
                    completedIds.add(level.id);
                }
            });
        });

        // Update unlock status based on prerequisites (also re-lock when prereqs aren't met)
        state.data.zones.forEach((zone, zoneIndex) => {
            zone.levels.forEach((level, levelIndex) => {
                if (level.status === STATUS.COMPLETE || level.status === STATUS.IN_PROGRESS) {
                    return;
                }

                const prereqs = level.prereqs || [];
                let shouldUnlock = false;

                if (prereqs.length === 0) {
                    // No prereqs - check if previous level is complete or this is first
                    if (levelIndex === 0) {
                        // First level in zone - check if previous zone is mostly done
                        if (zoneIndex === 0) {
                            shouldUnlock = true;
                        } else {
                            const prevZone = state.data.zones[zoneIndex - 1];
                            const prevZoneComplete = prevZone.levels.filter((l) => l.status === STATUS.COMPLETE).length;
                            const threshold = Math.floor(prevZone.levels.length * 0.7);
                            if (prevZoneComplete >= threshold) {
                                shouldUnlock = true;
                            }
                        }
                    } else {
                        const prevLevel = zone.levels[levelIndex - 1];
                        if (prevLevel.status === STATUS.COMPLETE) {
                            shouldUnlock = true;
                        }
                    }
                } else {
                    // Has prereqs - check if all are complete
                    const allPrereqsComplete = prereqs.every((prereqId) => completedIds.has(prereqId));
                    if (allPrereqsComplete) {
                        shouldUnlock = true;
                    }
                }

                level.status = shouldUnlock ? STATUS.UNLOCKED : STATUS.LOCKED;
            });
        });
    }

    function calculateStats() {
        if (!state.data) {
            return {
                totalXP: 0,
                earnedXP: 0,
                completedCount: 0,
                totalCount: 0,
                progressPercent: 0,
                zonesCompleted: 0,
                streakDays: state.user.streakDays || 0,
            };
        }

        let totalXP = 0;
        let earnedXP = 0;
        let completedCount = 0;
        let totalCount = 0;
        let zonesCompleted = 0;

        state.data.zones.forEach((zone) => {
            let zoneCompleted = 0;
            zone.levels.forEach((level) => {
                totalXP += level.xp || 100;
                totalCount++;

                if (level.status === STATUS.COMPLETE) {
                    earnedXP += level.xp || 100;
                    completedCount++;
                    zoneCompleted++;
                }
            });

            if (zoneCompleted === zone.levels.length) {
                zonesCompleted++;
            }
        });

        const progressPercent = totalXP > 0 ? Math.round((earnedXP / totalXP) * 100) : 0;

        return {
            totalXP,
            earnedXP,
            completedCount,
            totalCount,
            progressPercent,
            zonesCompleted,
            streakDays: state.user.streakDays || 0,
        };
    }

    function calculateZoneStats(zone) {
        let totalXP = 0;
        let earnedXP = 0;
        let completedCount = 0;

        zone.levels.forEach((level) => {
            totalXP += level.xp || 100;
            if (level.status === STATUS.COMPLETE) {
                earnedXP += level.xp || 100;
                completedCount++;
            }
        });

        const progressPercent = totalXP > 0 ? Math.round((earnedXP / totalXP) * 100) : 0;

        return { totalXP, earnedXP, completedCount, totalCount: zone.levels.length, progressPercent };
    }

    // ============================================
    // XP & LEVELING
    // ============================================

    function calculateLevel(xp) {
        return Math.floor(xp / CONFIG.XP_PER_LEVEL) + 1;
    }

    function getXPForCurrentLevel(xp) {
        return xp % CONFIG.XP_PER_LEVEL;
    }

    function addXP(amount) {
        const oldLevel = state.user.level;
        state.user.current_xp += amount;
        state.user.level = calculateLevel(state.user.current_xp);

        if (state.user.level > oldLevel) {
            showLevelUp(state.user.level);
        }

        debouncedSave();
    }

    function recomputeXPFromCompletedLevels() {
        if (!state.data) return;
        let xp = 0;
        state.data.zones.forEach((zone) => {
            zone.levels.forEach((level) => {
                if (level.status === STATUS.COMPLETE) {
                    xp += level.xp || 100;
                }
            });
        });
        state.user.current_xp = xp;
        state.user.level = calculateLevel(state.user.current_xp);
    }

    // ============================================
    // BADGES
    // ============================================

    function checkBadges(silent = false) {
        const stats = calculateStats();
        stats.totalXP = state.user.current_xp;

        const newBadges = [];

        Object.values(BADGES).forEach((badge) => {
            if (!state.user.badges.includes(badge.id) && badge.condition(stats)) {
                state.user.badges.push(badge.id);
                newBadges.push(badge);
            }
        });

        if (!silent && newBadges.length > 0) {
            debouncedSave();
            newBadges.forEach((badge, index) => {
                setTimeout(() => showBadgeToast(badge), index * 2000);
            });
        }

        renderBadges();
    }

    function recomputeBadges({ silent = true } = {}) {
        state.user.badges = [];
        checkBadges(silent);
    }

    function showBadgeToast(badge) {
        DOM.badgeToastName.textContent = `${badge.icon} ${badge.name}`;
        DOM.badgeToast.hidden = false;

        setTimeout(() => {
            DOM.badgeToast.hidden = true;
        }, 3000);
    }

    function renderBadges() {
        const html = Object.values(BADGES)
            .map((badge) => {
                const earned = state.user.badges.includes(badge.id);
                return `
                <div class="badge-item ${earned ? 'earned' : ''}" title="${badge.name}">
                    <span class="badge-icon">${badge.icon}</span>
                    <span class="badge-name">${badge.name}</span>
                </div>
            `;
            })
            .join('');

        DOM.badgesList.innerHTML = html;
    }

    // ============================================
    // STREAK TRACKING
    // ============================================

    function updateStreak() {
        const today = new Date().toDateString();
        const lastVisit = state.user.lastVisit;

        if (!lastVisit) {
            state.user.streakDays = 1;
        } else {
            const lastDate = new Date(lastVisit);
            const todayDate = new Date(today);
            const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                // Same day - no change
            } else if (diffDays === 1) {
                // Consecutive day
                state.user.streakDays = (state.user.streakDays || 0) + 1;
            } else {
                // Streak broken
                state.user.streakDays = 1;
            }
        }

        state.user.lastVisit = today;
        debouncedSave();
    }

    // ============================================
    // LEVEL ACTIONS
    // ============================================

    function startLevel(levelId) {
        const { level } = findLevelById(levelId);
        if (!level || level.status === STATUS.LOCKED || level.status === STATUS.COMPLETE) {
            return;
        }

        level.status = STATUS.IN_PROGRESS;
        updateUnlockStatus();
        debouncedSave();
        renderApp();
        updatePanelStatus();
    }

    function completeLevel(levelId) {
        const { level, zone } = findLevelById(levelId);
        if (!level || level.status === STATUS.LOCKED) {
            return;
        }

        if (level.status !== STATUS.COMPLETE) {
            level.status = STATUS.COMPLETE;
            addXP(level.xp || 100);
            launchConfetti();
        }

        updateUnlockStatus();
        debouncedSave();
        renderApp();
        updatePanelStatus();
        checkBadges(false);
    }

    function resetLevelProgress(levelId) {
        const { level } = findLevelById(levelId);
        if (!level) return;

        // Reset status, then recompute unlocks (which may make it unlocked again)
        level.status = STATUS.LOCKED;
        updateUnlockStatus();
        recomputeXPFromCompletedLevels();
        recomputeBadges({ silent: true });
        debouncedSave();
        renderApp();
        updatePanelStatus();
    }

    function resetZoneProgress(zoneId) {
        if (!state.data) return;
        const zone = state.data.zones.find((z) => z.id === zoneId);
        if (!zone) return;

        zone.levels.forEach((level) => {
            level.status = STATUS.LOCKED;
        });

        updateUnlockStatus();
        recomputeXPFromCompletedLevels();
        recomputeBadges({ silent: true });
        debouncedSave();
        renderApp();
        updatePanelStatus();
    }

    function resetAllProgress() {
        if (!state.data) return;

        if (!confirm('Reset ALL progress? This will reset every zone and level.')) return;

        state.data.zones.forEach((zone) => {
            zone.levels.forEach((level) => {
                level.status = STATUS.LOCKED;
            });
        });

        // Also reset user progress-related fields
        state.user.current_xp = 0;
        state.user.level = 1;
        state.user.badges = [];
        state.user.lastVisit = null;
        state.user.streakDays = 0;
        state.user.notes = {};
        state.user.journal = {};

        updateUnlockStatus();
        recomputeBadges({ silent: true });
        debouncedSave();
        renderApp();
        updatePanelStatus();
    }

    function findLevelById(levelId) {
        if (!state.data) return { level: null, zone: null };

        for (const zone of state.data.zones) {
            for (const level of zone.levels) {
                if (level.id === levelId) {
                    return { level, zone };
                }
            }
        }

        return { level: null, zone: null };
    }

    function findLevelTitle(levelId) {
        const { level } = findLevelById(levelId);
        return level ? level.title : levelId;
    }

    // ============================================
    // NOTES & JOURNAL
    // ============================================

    function saveNote(levelId, note) {
        state.user.notes[levelId] = note;
        debouncedSave();
    }

    function addJournalEntry(levelId, text) {
        if (!text.trim()) return;

        if (!state.user.journal[levelId]) {
            state.user.journal[levelId] = [];
        }

        state.user.journal[levelId].push({
            id: generateId(),
            text: text.trim(),
            timestamp: new Date().toISOString(),
        });

        debouncedSave();
        renderJournalEntries(levelId);
    }

    function renderJournalEntries(levelId) {
        const entries = state.user.journal[levelId] || [];

        const html = entries
            .slice()
            .reverse()
            .map(
                (entry) => `
            <div class="journal-entry">
                <span class="journal-entry-time">${formatDate(entry.timestamp)}</span>
                <span class="journal-entry-text">${escapeHtml(entry.text)}</span>
            </div>
        `
            )
            .join('');

        DOM.journalEntries.innerHTML = html || '<p style="color: var(--text-muted); font-size: var(--font-size-sm);">No entries yet.</p>';
    }

    // ============================================
    // RENDERING
    // ============================================

    function renderApp() {
        if (!state.data) {
            renderEmptyState();
            return;
        }

        renderZones();
        renderStats();
        renderBadges();
        applyFilters();
    }

    function renderEmptyState() {
        DOM.zonesContainer.innerHTML = `
            <div style="text-align: center; padding: 4rem 2rem; color: var(--text-muted);">
                <svg style="width: 80px; height: 80px; margin-bottom: 1rem; opacity: 0.5;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                </svg>
                <h2 style="color: var(--text-secondary); margin-bottom: 0.5rem;">No Skill Tree Loaded</h2>
                <p>Load your roadmap data using <code>SKILLTREE.loadData(data)</code></p>
                <p style="margin-top: 1rem; font-size: var(--font-size-sm);">Or import a previously exported progress file.</p>
            </div>
        `;
    }

    function renderZones() {
        const html = state.data.zones
            .map((zone, index) => {
                const isExpanded = state.ui.expandedZones.has(zone.id);
                const stats = calculateZoneStats(zone);
                const circumference = 2 * Math.PI * 22;
                const dashoffset = circumference - (stats.progressPercent / 100) * circumference;

                return `
                <article class="zone-card ${isExpanded ? 'expanded' : ''}" data-zone-id="${zone.id}" style="--zone-color: ${zone.color}">
                    <header class="zone-header" tabindex="0" role="button" aria-expanded="${isExpanded}" aria-controls="zone-content-${zone.id}">
                        <div class="zone-info">
                            <div class="zone-icon">${zone.icon || ZONE_ICONS[index % ZONE_ICONS.length]}</div>
                            <div class="zone-text">
                                <h2 class="zone-title">${escapeHtml(zone.title)}</h2>
                                <p class="zone-subtitle">${escapeHtml(zone.subtitle || zone.description || '')}</p>
                            </div>
                        </div>
                        <div class="zone-stats">
                            <div class="zone-progress-ring" aria-label="${stats.progressPercent}% complete">
                                <svg width="56" height="56" viewBox="0 0 56 56">
                                    <circle class="progress-bg" cx="28" cy="28" r="22"/>
                                    <circle class="progress-value" cx="28" cy="28" r="22" 
                                        stroke-dasharray="${circumference}" 
                                        stroke-dashoffset="${dashoffset}"/>
                                </svg>
                                <span class="zone-progress-text">${stats.progressPercent}%</span>
                            </div>
                            <button class="zone-toggle" aria-label="${isExpanded ? 'Collapse' : 'Expand'} zone">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"/>
                                </svg>
                            </button>
                        </div>
                    </header>
                    <div class="zone-content" id="zone-content-${zone.id}">
                        <div class="zone-content-inner">
                            <div class="levels-grid">
                                ${zone.levels.map((level, levelIndex) => renderLevelCard(level, zone, levelIndex)).join('')}
                            </div>
                        </div>
                    </div>
                </article>
            `;
            })
            .join('');

        DOM.zonesContainer.innerHTML = html;
        DOM.zonesContainer.className = `zones-container view-${state.settings.view}`;
    }

    function renderLevelCard(level, zone, index) {
        const statusIcons = {
            [STATUS.LOCKED]: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>',
            [STATUS.UNLOCKED]: '',
            [STATUS.IN_PROGRESS]: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="8"/><path d="M12 8v4"/></svg>',
            [STATUS.COMPLETE]: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
        };

        return `
            <div class="level-card status-${level.status}" 
                 data-level-id="${level.id}" 
                 data-zone-id="${zone.id}"
                 tabindex="0" 
                 role="button"
                 aria-label="${level.title}. ${level.status}. ${level.xp || 100} XP."
                 style="--zone-color: ${zone.color}">
                <div class="level-status-toggle" aria-hidden="true">
                    ${statusIcons[level.status]}
                </div>
                <div class="level-info">
                    <h3 class="level-title">
                        <span class="level-number">${index + 1}</span>
                        ${escapeHtml(level.title)}
                    </h3>
                    <p class="level-short">${escapeHtml(level.short || '')}</p>
                    <div class="level-meta">
                        <span class="level-xp">
                            <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            ${level.xp || 100} XP
                        </span>
                        ${
                            level.estimated_hours
                                ? `
                            <span class="level-hours">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                ~${level.estimated_hours}h
                            </span>
                        `
                                : ''
                        }
                    </div>
                </div>
            </div>
        `;
    }

    function renderStats() {
        const stats = calculateStats();

        // User level & XP
        state.user.level = calculateLevel(state.user.current_xp);
        const xpInLevel = getXPForCurrentLevel(state.user.current_xp);
        const xpPercent = (xpInLevel / CONFIG.XP_PER_LEVEL) * 100;

        DOM.userLevel.textContent = state.user.level;
        DOM.currentXP.textContent = state.user.current_xp.toLocaleString();
        DOM.nextLevelXP.textContent = (state.user.level * CONFIG.XP_PER_LEVEL).toLocaleString();
        DOM.xpFill.style.width = `${xpPercent}%`;

        // Global progress
        DOM.globalPercentage.textContent = `${stats.progressPercent}%`;
        DOM.globalProgressFill.style.width = `${stats.progressPercent}%`;

        // Footer stats
        DOM.completedCount.textContent = stats.completedCount;
        DOM.totalCount.textContent = stats.totalCount;
        DOM.streakDays.textContent = state.user.streakDays || 0;
    }

    // ============================================
    // PANEL
    // ============================================

    function openPanel(levelId, zoneId) {
        const { level, zone } = findLevelById(levelId);
        if (!level) return;

        state.ui.currentLevelId = levelId;
        state.ui.currentZoneId = zoneId;

        DOM.panelTitle.textContent = level.title;
        DOM.panelZoneBadge.textContent = zone.title;
        DOM.panelZoneBadge.style.borderLeft = `3px solid ${zone.color}`;
        DOM.panelXP.textContent = `${level.xp || 100} XP`;
        DOM.panelHours.textContent = level.estimated_hours ? `~${level.estimated_hours} hours` : 'Not specified';

        updatePanelStatus();

        // Prerequisites
        if (level.prereqs && level.prereqs.length > 0) {
            DOM.panelPrereqsSection.hidden = false;
            DOM.panelPrereqs.innerHTML = level.prereqs
                .map((prereqId) => {
                    const { level: prereq } = findLevelById(prereqId);
                    const isComplete = prereq && prereq.status === STATUS.COMPLETE;
                    return `<li class="${isComplete ? 'complete' : 'incomplete'}">${escapeHtml(findLevelTitle(prereqId))}</li>`;
                })
                .join('');
        } else {
            DOM.panelPrereqsSection.hidden = true;
        }

        // Details
        DOM.panelDetails.innerHTML = parseMarkdown(level.details || level.short || 'No additional details.');

        // Notes
        DOM.panelNotesInput.value = state.user.notes[levelId] || '';

        // Journal
        renderJournalEntries(levelId);

        // Show panel
        DOM.levelPanel.hidden = false;
        document.body.style.overflow = 'hidden';

        // Focus trap
        DOM.panelClose.focus();
    }

    function updatePanelStatus() {
        const { level } = findLevelById(state.ui.currentLevelId);
        if (!level) return;

        const statusLabels = {
            [STATUS.LOCKED]: 'Locked',
            [STATUS.UNLOCKED]: 'Unlocked',
            [STATUS.IN_PROGRESS]: 'In Progress',
            [STATUS.COMPLETE]: 'Complete',
        };

        DOM.panelStatus.textContent = statusLabels[level.status];
        DOM.panelStatusBadge.className = `meta-item status-badge status-${level.status}`;

        // Update buttons
        DOM.btnStart.disabled = level.status === STATUS.LOCKED || level.status === STATUS.COMPLETE;
        DOM.btnComplete.disabled = level.status === STATUS.LOCKED;
        DOM.btnResetLevel.disabled = level.status === STATUS.LOCKED;
        DOM.btnResetZone.disabled = !state.ui.currentZoneId;

        if (level.status === STATUS.IN_PROGRESS) {
            DOM.btnStart.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                In Progress
            `;
        } else {
            DOM.btnStart.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                Start
            `;
        }

        if (level.status === STATUS.COMPLETE) {
            DOM.btnComplete.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Completed!
            `;
        } else {
            DOM.btnComplete.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                Mark Complete
            `;
        }
    }

    function closePanel() {
        DOM.levelPanel.hidden = true;
        document.body.style.overflow = '';
        state.ui.currentLevelId = null;
        state.ui.currentZoneId = null;

        // Return focus to last level card
        const lastCard = document.querySelector('.level-card:focus');
        if (lastCard) lastCard.focus();
    }

    // ============================================
    // SEARCH & FILTER
    // ============================================

    const debouncedSearch = debounce(applyFilters, CONFIG.SEARCH_DEBOUNCE);

    function applyFilters() {
        const query = state.ui.searchQuery.toLowerCase();
        const filter = state.ui.statusFilter;

        document.querySelectorAll('.zone-card').forEach((zoneCard) => {
            const levelCards = zoneCard.querySelectorAll('.level-card');
            let visibleCount = 0;

            levelCards.forEach((card) => {
                const levelId = card.dataset.levelId;
                const { level } = findLevelById(levelId);
                if (!level) return;

                let visible = true;

                // Status filter
                if (filter !== 'all') {
                    visible = level.status === filter;
                }

                // Search query
                if (visible && query) {
                    const searchText = `${level.title} ${level.short || ''} ${level.details || ''}`.toLowerCase();
                    visible = searchText.includes(query);
                }

                card.classList.toggle('hidden', !visible);
                if (visible) visibleCount++;
            });

            // Hide zone if no visible levels
            zoneCard.classList.toggle('hidden', visibleCount === 0);
        });
    }

    // ============================================
    // IMPORT / EXPORT
    // ============================================

    function exportProgress() {
        const exportData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            zones: state.data ? state.data.zones : [],
            user: state.user,
            settings: state.settings,
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `skilltree-progress-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    let pendingImportData = null;

    function handleImportFile(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (!data.zones || !Array.isArray(data.zones)) {
                    throw new Error('Invalid file format');
                }

                pendingImportData = data;

                // Show preview
                const stats = {
                    zones: data.zones.length,
                    levels: data.zones.reduce((sum, z) => sum + z.levels.length, 0),
                    completed: data.zones.reduce((sum, z) => sum + z.levels.filter((l) => l.status === STATUS.COMPLETE).length, 0),
                };

                DOM.previewStats.innerHTML = `
                    <p><strong>${stats.zones}</strong> zones, <strong>${stats.levels}</strong> levels</p>
                    <p><strong>${stats.completed}</strong> completed</p>
                    ${data.user ? `<p>XP: <strong>${data.user.current_xp || 0}</strong></p>` : ''}
                `;

                DOM.importPreview.hidden = false;

                // Check for conflicts
                if (state.data && state.data.zones.length > 0) {
                    DOM.conflictResolution.hidden = false;
                } else {
                    DOM.conflictResolution.hidden = true;
                }

                DOM.importConfirm.disabled = false;
            } catch (err) {
                alert('Failed to parse file. Please ensure it is a valid JSON export.');
                console.error(err);
            }
        };

        reader.readAsText(file);
    }

    function confirmImport() {
        if (!pendingImportData) return;

        const strategy = document.querySelector('input[name="conflict"]:checked')?.value || 'merge';

        // Merge or replace data
        if (strategy === 'overwrite' || !state.data) {
            state.data = JSON.parse(JSON.stringify(pendingImportData));
        } else {
            mergeData(pendingImportData, strategy);
        }

        // Import user data
        if (pendingImportData.user) {
            if (strategy === 'merge') {
                state.user.current_xp = Math.max(state.user.current_xp, pendingImportData.user.current_xp || 0);
                state.user.badges = [...new Set([...state.user.badges, ...(pendingImportData.user.badges || [])])];
                state.user.notes = { ...pendingImportData.user.notes, ...state.user.notes };
                state.user.journal = { ...pendingImportData.user.journal, ...state.user.journal };
            } else if (strategy === 'overwrite') {
                state.user = { ...state.user, ...pendingImportData.user };
            }
        }

        updateUnlockStatus();
        debouncedSave();
        renderApp();
        closeImportModal();

        pendingImportData = null;
    }

    function closeImportModal() {
        DOM.importModal.hidden = true;
        DOM.importPreview.hidden = true;
        DOM.importConfirm.disabled = true;
        DOM.importFile.value = '';
        pendingImportData = null;
    }

    // ============================================
    // ANIMATIONS
    // ============================================

    function showLevelUp(level) {
        DOM.levelupLevel.textContent = `Level ${level}`;
        DOM.levelupContainer.hidden = false;

        launchConfetti();

        setTimeout(() => {
            DOM.levelupContainer.hidden = true;
        }, 3000);
    }

    function launchConfetti() {
        const canvas = DOM.confettiCanvas;
        const ctx = canvas.getContext('2d');

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const colors = ['#7c3aed', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#f97316'];

        for (let i = 0; i < 150; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                vx: (Math.random() - 0.5) * 10,
                vy: Math.random() * 3 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
            });
        }

        let frame = 0;
        const maxFrames = 180;

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1;
                p.rotation += p.rotationSpeed;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();
            });

            frame++;
            if (frame < maxFrames) {
                requestAnimationFrame(animate);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }

        animate();
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================

    function setupEventListeners() {
        // Zone toggle
        DOM.zonesContainer.addEventListener('click', (e) => {
            const zoneHeader = e.target.closest('.zone-header');
            if (zoneHeader) {
                const zoneCard = zoneHeader.closest('.zone-card');
                const zoneId = zoneCard.dataset.zoneId;
                toggleZone(zoneId);
                return;
            }

            const levelCard = e.target.closest('.level-card');
            if (levelCard) {
                const levelId = levelCard.dataset.levelId;
                const zoneId = levelCard.dataset.zoneId;
                openPanel(levelId, zoneId);
            }
        });

        // Zone keyboard
        DOM.zonesContainer.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const zoneHeader = e.target.closest('.zone-header');
                if (zoneHeader) {
                    e.preventDefault();
                    const zoneCard = zoneHeader.closest('.zone-card');
                    toggleZone(zoneCard.dataset.zoneId);
                    return;
                }

                const levelCard = e.target.closest('.level-card');
                if (levelCard) {
                    e.preventDefault();
                    openPanel(levelCard.dataset.levelId, levelCard.dataset.zoneId);
                }
            }
        });

        // Panel events
        DOM.panelBackdrop.addEventListener('click', closePanel);
        DOM.panelClose.addEventListener('click', closePanel);

        DOM.btnStart.addEventListener('click', () => {
            if (state.ui.currentLevelId) {
                startLevel(state.ui.currentLevelId);
            }
        });

        DOM.btnComplete.addEventListener('click', () => {
            if (state.ui.currentLevelId) {
                completeLevel(state.ui.currentLevelId);
            }
        });

        DOM.btnResetLevel.addEventListener('click', () => {
            if (state.ui.currentLevelId) {
                if (confirm('Reset this level progress?')) {
                    resetLevelProgress(state.ui.currentLevelId);
                }
            }
        });

        DOM.btnResetZone.addEventListener('click', () => {
            if (state.ui.currentZoneId) {
                if (confirm('Reset this entire zone progress?')) {
                    resetZoneProgress(state.ui.currentZoneId);
                }
            }
        });

        DOM.panelNotesInput.addEventListener('input', (e) => {
            if (state.ui.currentLevelId) {
                saveNote(state.ui.currentLevelId, e.target.value);
            }
        });

        DOM.addJournalBtn.addEventListener('click', () => {
            if (state.ui.currentLevelId && DOM.journalInput.value.trim()) {
                addJournalEntry(state.ui.currentLevelId, DOM.journalInput.value);
                DOM.journalInput.value = '';
            }
        });

        DOM.journalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                DOM.addJournalBtn.click();
            }
        });

        // Search & Filter
        DOM.searchInput.addEventListener('input', (e) => {
            state.ui.searchQuery = e.target.value;
            debouncedSearch();
        });

        DOM.statusFilter.addEventListener('change', (e) => {
            state.ui.statusFilter = e.target.value;
            applyFilters();
        });

        // View toggle
        DOM.toggleViewBtn.addEventListener('click', () => {
            state.settings.view = state.settings.view === 'grid' ? 'list' : 'grid';
            DOM.zonesContainer.className = `zones-container view-${state.settings.view}`;
            DOM.toggleViewBtn.querySelector('.icon-grid').style.display = state.settings.view === 'grid' ? 'none' : 'block';
            DOM.toggleViewBtn.querySelector('.icon-list').style.display = state.settings.view === 'list' ? 'none' : 'block';
            debouncedSave();
        });

        // Shortcuts modal
        DOM.shortcutsBtn.addEventListener('click', () => {
            DOM.shortcutsModal.hidden = false;
        });

        DOM.shortcutsClose.addEventListener('click', () => {
            DOM.shortcutsModal.hidden = true;
        });

        DOM.shortcutsBackdrop.addEventListener('click', () => {
            DOM.shortcutsModal.hidden = true;
        });

        DOM.disableShortcuts.addEventListener('change', (e) => {
            state.settings.shortcutsEnabled = !e.target.checked;
            debouncedSave();
        });

        // Import modal
        DOM.importBtn.addEventListener('click', () => {
            DOM.importModal.hidden = false;
        });

        DOM.importClose.addEventListener('click', closeImportModal);
        DOM.importBackdrop.addEventListener('click', closeImportModal);
        DOM.importCancel.addEventListener('click', closeImportModal);

        DOM.importFile.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleImportFile(e.target.files[0]);
            }
        });

        DOM.importConfirm.addEventListener('click', confirmImport);

        // Drag & drop
        const dropZone = DOM.importModal.querySelector('.file-input-label');
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--accent-primary)';
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = '';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '';
            if (e.dataTransfer.files.length > 0) {
                handleImportFile(e.dataTransfer.files[0]);
            }
        });

        // Export
        DOM.exportBtn.addEventListener('click', exportProgress);

        // Reset all
        DOM.resetAllBtn.addEventListener('click', resetAllProgress);

        // Global keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcut);

        // Window resize for confetti
        window.addEventListener('resize', () => {
            DOM.confettiCanvas.width = window.innerWidth;
            DOM.confettiCanvas.height = window.innerHeight;
        });
    }

    function toggleZone(zoneId) {
        if (state.ui.expandedZones.has(zoneId)) {
            state.ui.expandedZones.delete(zoneId);
        } else {
            state.ui.expandedZones.add(zoneId);
        }

        const zoneCard = document.querySelector(`[data-zone-id="${zoneId}"]`);
        if (zoneCard) {
            zoneCard.classList.toggle('expanded', state.ui.expandedZones.has(zoneId));
            const header = zoneCard.querySelector('.zone-header');
            if (header) {
                header.setAttribute('aria-expanded', state.ui.expandedZones.has(zoneId));
            }
        }
    }

    function handleKeyboardShortcut(e) {
        if (!state.settings.shortcutsEnabled) return;

        // Don't trigger shortcuts when typing in inputs
        if (e.target.matches('input, textarea, select')) {
            if (e.key === 'Escape') {
                e.target.blur();
            }
            return;
        }

        // Escape - close modals/panel
        if (e.key === 'Escape') {
            if (!DOM.levelPanel.hidden) {
                closePanel();
                return;
            }
            if (!DOM.shortcutsModal.hidden) {
                DOM.shortcutsModal.hidden = true;
                return;
            }
            if (!DOM.importModal.hidden) {
                closeImportModal();
                return;
            }
        }

        // / - Focus search
        if (e.key === '/') {
            e.preventDefault();
            DOM.searchInput.focus();
            return;
        }

        // ? - Show shortcuts
        if (e.key === '?') {
            e.preventDefault();
            DOM.shortcutsModal.hidden = !DOM.shortcutsModal.hidden;
            return;
        }

        // M - Mark complete (when panel open)
        if (e.key === 'm' || e.key === 'M') {
            if (!DOM.levelPanel.hidden && state.ui.currentLevelId) {
                e.preventDefault();
                completeLevel(state.ui.currentLevelId);
                return;
            }
        }

        // V - Toggle view
        if (e.key === 'v' || e.key === 'V') {
            e.preventDefault();
            DOM.toggleViewBtn.click();
            return;
        }

        // Ctrl/Cmd + E - Export
        if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
            e.preventDefault();
            exportProgress();
            return;
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        cacheDOMElements();

        // Username and logout
        const headerUsername = document.getElementById('header-username');
        const logoutBtn = document.getElementById('logout-btn');
        fetch('/api/auth/me', { headers: typeof window.authHeaders === 'function' ? window.authHeaders() : {}, cache: 'no-store' })
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
                if (data && data.user && headerUsername) headerUsername.textContent = data.user.username;
            })
            .catch(() => {});
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('authToken');
                location.reload();
            });
        }

        setupEventListeners();

        // Load progress from server BEFORE first render.
        loadFromServer()
            .then((data) => {
                loadData(data);

                // Apply loaded settings
                DOM.disableShortcuts.checked = !state.settings.shortcutsEnabled;
                DOM.toggleViewBtn.querySelector('.icon-grid').style.display = state.settings.view === 'grid' ? 'none' : 'block';
                DOM.toggleViewBtn.querySelector('.icon-list').style.display = state.settings.view === 'list' ? 'none' : 'block';

                // Check badges on load
                if (state.data) {
                    checkBadges(true);
                }
            })
            .catch((err) => {
                console.error(err);
                renderEmptyState();
            });
    }

    // ============================================
    // PUBLIC API
    // ============================================

    window.SKILLTREE = {
        loadData: loadData,
        getData: () => state.data,
        getUser: () => state.user,
        exportProgress: exportProgress,
        resetAllProgress: resetAllProgress,
        resetZoneProgress: resetZoneProgress,
        resetLevelProgress: resetLevelProgress,
        resetProgress: () => {
            if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
                // Reset on server by overwriting progress with an empty baseline.
                state.data = { zones: [] };
                state.user = {
                    current_xp: 0,
                    level: 1,
                    badges: [],
                    notes: {},
                    journal: {},
                    lastVisit: null,
                    streakDays: 0,
                };
                state.settings = { shortcutsEnabled: true, view: 'grid' };
                debouncedSave();
                location.reload();
            }
        },
    };

    // Initialize only when auth gate has confirmed the user is logged in
    document.addEventListener('skilltree:auth-ready', init);
})();

