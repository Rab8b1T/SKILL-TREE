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
            const res = await fetch(API_ME, { headers: authHeaders(), cache: 'no-store' });
            if (res.ok) return true;
        } catch (_) {}
        return false;
    }

    function showApp() {
        const gate = document.getElementById('auth-gate');
        const app = document.getElementById('app');
        if (gate) gate.hidden = true;
        if (app) app.hidden = false;
        document.dispatchEvent(new CustomEvent('skilltree:auth-ready'));
    }

    function showGate() {
        const gate = document.getElementById('auth-gate');
        const app = document.getElementById('app');
        if (gate) gate.hidden = false;
        if (app) app.hidden = true;
    }

    function setError(formMode, message) {
        const el = formMode === 'login' ? document.getElementById('auth-login-error') : document.getElementById('auth-signup-error');
        const other = formMode === 'login' ? document.getElementById('auth-signup-error') : document.getElementById('auth-login-error');
        if (other) { other.hidden = true; other.textContent = ''; }
        if (el) {
            el.textContent = message || '';
            el.hidden = !message;
        }
    }

    async function handleLogin(e) {
        e.preventDefault();
        const form = e.target;
        const username = (form.username && form.username.value || '').trim();
        const password = form.password && form.password.value;
        setError('login', '');
        if (!username || !password) {
            setError('login', 'Username and password are required.');
            return;
        }
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        try {
            const res = await fetch(API_LOGIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.token) {
                setToken(data.token);
                showApp();
                return;
            }
            setError('login', data.error || 'Login failed.');
        } catch (_) {
            setError('login', 'Network error. Try again.');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    async function handleSignup(e) {
        e.preventDefault();
        const form = e.target;
        const username = (form.username && form.username.value || '').trim();
        const password = form.password && form.password.value;
        setError('signup', '');
        if (!username) {
            setError('signup', 'Username is required.');
            return;
        }
        if (!password || String(password).length < 4) {
            setError('signup', 'Password must be at least 4 characters.');
            return;
        }
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        try {
            const res = await fetch(API_SIGNUP, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.token) {
                setToken(data.token);
                showApp();
                return;
            }
            setError('signup', data.error || 'Sign up failed.');
        } catch (_) {
            setError('signup', 'Network error. Try again.');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }

    function setupTabs() {
        const tabs = document.querySelectorAll('.auth-tab');
        const loginForm = document.getElementById('auth-login-form');
        const signupForm = document.getElementById('auth-signup-form');
        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                const mode = tab.getAttribute('data-tab');
                tabs.forEach(function (t) {
                    t.classList.toggle('active', t.getAttribute('data-tab') === mode);
                    t.setAttribute('aria-selected', t.getAttribute('data-tab') === mode ? 'true' : 'false');
                });
                if (mode === 'login') {
                    if (loginForm) loginForm.hidden = false;
                    if (signupForm) signupForm.hidden = true;
                    setError('login', '');
                    setError('signup', '');
                } else {
                    if (loginForm) loginForm.hidden = true;
                    if (signupForm) signupForm.hidden = false;
                    setError('login', '');
                    setError('signup', '');
                }
            });
        });
    }

    function init() {
        setupTabs();
        const loginForm = document.getElementById('auth-login-form');
        const signupForm = document.getElementById('auth-signup-form');
        if (loginForm) loginForm.addEventListener('submit', handleLogin);
        if (signupForm) signupForm.addEventListener('submit', handleSignup);

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
