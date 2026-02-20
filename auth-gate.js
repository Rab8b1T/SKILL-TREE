/**
 * Auth gate: requires login before showing the main app.
 * Dispatches 'skilltree:auth-ready' when authenticated so app.js can init.
 */
(function () {
    'use strict';

    const AUTH_TOKEN_KEY = 'authToken';
    const API_ME = '/api/auth/me';
    const API_LOGIN = '/api/auth/login';
    const API_SIGNUP = '/api/auth/signup';

    function getToken() {
        return localStorage.getItem(AUTH_TOKEN_KEY);
    }

    function setToken(token) {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
    }

    function authHeaders() {
        const token = getToken();
        return token ? { Authorization: 'Bearer ' + token } : {};
    }

    async function checkAuth() {
        const token = getToken();
        if (!token) return false;
        try {
            var res = await fetch(API_ME, { headers: authHeaders(), cache: 'no-store' });
            if (res.ok) return true;
        } catch (_) {}
        return false;
    }

    function showApp() {
        var gate = document.getElementById('auth-gate');
        var app = document.getElementById('app');
        if (gate) gate.style.display = 'none';
        if (app) { app.hidden = false; app.style.display = ''; }
        document.dispatchEvent(new CustomEvent('skilltree:auth-ready'));
    }

    function showGate() {
        var gate = document.getElementById('auth-gate');
        var app = document.getElementById('app');
        if (gate) gate.style.display = '';
        if (app) { app.hidden = true; app.style.display = 'none'; }
    }

    // ---- Toast popup ----
    var toastTimer = null;
    function showToast(message, type) {
        var existing = document.getElementById('auth-toast');
        if (existing) existing.remove();

        var toast = document.createElement('div');
        toast.id = 'auth-toast';
        toast.className = 'auth-toast ' + (type || 'error');
        toast.setAttribute('role', 'alert');

        var icon = type === 'success' ? '\u2714' : '\u26A0';
        toast.innerHTML = '<span class="auth-toast-icon">' + icon + '</span><span class="auth-toast-msg">' + escapeHtml(message) + '</span>';
        document.body.appendChild(toast);

        void toast.offsetWidth;
        toast.classList.add('show');

        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () { if (toast.parentNode) toast.remove(); }, 300);
        }, 4000);
    }

    function escapeHtml(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    // ---- Tab switching ----
    function switchTab(mode) {
        var loginTab = document.getElementById('auth-tab-login');
        var signupTab = document.getElementById('auth-tab-signup');
        var loginPanel = document.getElementById('auth-panel-login');
        var signupPanel = document.getElementById('auth-panel-signup');

        if (mode === 'signup') {
            if (loginTab) { loginTab.classList.remove('active'); loginTab.setAttribute('aria-selected', 'false'); }
            if (signupTab) { signupTab.classList.add('active'); signupTab.setAttribute('aria-selected', 'true'); }
            if (loginPanel) { loginPanel.style.display = 'none'; }
            if (signupPanel) { signupPanel.removeAttribute('hidden'); signupPanel.style.display = 'block'; }
        } else {
            if (loginTab) { loginTab.classList.add('active'); loginTab.setAttribute('aria-selected', 'true'); }
            if (signupTab) { signupTab.classList.remove('active'); signupTab.setAttribute('aria-selected', 'false'); }
            if (loginPanel) { loginPanel.style.display = 'block'; }
            if (signupPanel) { signupPanel.style.display = 'none'; }
        }
    }

    // ---- Form handlers ----
    async function handleLogin(e) {
        e.preventDefault();
        var form = e.target;
        var username = (form.querySelector('[name="username"]').value || '').trim();
        var password = form.querySelector('[name="password"]').value || '';

        if (!username || !password) {
            showToast('Username and password are required.', 'error');
            return;
        }

        var submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Logging in...'; }

        try {
            var res = await fetch(API_LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password }),
            });
            var data = {};
            try { data = await res.json(); } catch (_) {}

            if (res.ok && data.token) {
                setToken(data.token);
                showApp();
                return;
            }

            if (res.status === 401) {
                showToast('User not found or wrong password. Please sign up first!', 'error');
            } else {
                showToast(data.error || 'Login failed. Please try again.', 'error');
            }
        } catch (_) {
            showToast('Network error. Please try again.', 'error');
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Log in'; }
        }
    }

    async function handleSignup(e) {
        e.preventDefault();
        var form = e.target;
        var username = (form.querySelector('[name="username"]').value || '').trim();
        var password = form.querySelector('[name="password"]').value || '';

        if (!username) {
            showToast('Username is required.', 'error');
            return;
        }
        if (password.length < 4) {
            showToast('Password must be at least 4 characters.', 'error');
            return;
        }

        var submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating...'; }

        try {
            var res = await fetch(API_SIGNUP, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password }),
            });
            var data = {};
            try { data = await res.json(); } catch (_) {}

            if (res.ok && data.token) {
                showToast('Account created! Welcome, ' + username + '!', 'success');
                setToken(data.token);
                setTimeout(showApp, 800);
                return;
            }

            if (res.status === 409) {
                showToast('Username "' + username + '" already exists. Try a different one.', 'error');
            } else {
                showToast(data.error || 'Sign up failed. Please try again.', 'error');
            }
        } catch (_) {
            showToast('Network error. Please try again.', 'error');
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Create account'; }
        }
    }

    // ---- Init ----
    function init() {
        var loginTab = document.getElementById('auth-tab-login');
        var signupTab = document.getElementById('auth-tab-signup');
        var loginForm = document.getElementById('auth-login-form');
        var signupForm = document.getElementById('auth-signup-form');

        if (loginTab) loginTab.addEventListener('click', function (e) { e.preventDefault(); switchTab('login'); });
        if (signupTab) signupTab.addEventListener('click', function (e) { e.preventDefault(); switchTab('signup'); });
        if (loginForm) loginForm.addEventListener('submit', handleLogin);
        if (signupForm) signupForm.addEventListener('submit', handleSignup);

        switchTab('login');

        checkAuth().then(function (ok) {
            if (ok) showApp();
            else showGate();
        });
    }

    window.getAuthToken = getToken;
    window.authHeaders = authHeaders;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
