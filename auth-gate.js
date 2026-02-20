/**
 * Auth gate — login / signup wall before the main app loads.
 * Dispatches 'skilltree:auth-ready' once authenticated.
 */
(function () {
    'use strict';

    var API_ME             = '/api/auth/me';
    var API_LOGIN          = '/api/auth/login';
    var API_SIGNUP         = '/api/auth/signup';
    var API_RESET_REQUEST  = '/api/auth/reset-request';
    var API_RESET_CONFIRM  = '/api/auth/reset-confirm';

    /* ---------- token helpers ---------- */
    function getToken()      { return localStorage.getItem('authToken'); }
    function saveToken(t)    { localStorage.setItem('authToken', t); }
    function clearToken()    { localStorage.removeItem('authToken'); }

    function authHeaders() {
        var t = getToken();
        return t ? { 'Authorization': 'Bearer ' + t } : {};
    }

    /* ---------- show/hide app vs gate ---------- */
    function showApp() {
        document.getElementById('auth-gate').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        document.dispatchEvent(new CustomEvent('skilltree:auth-ready'));
    }

    function showGate() {
        document.getElementById('auth-gate').style.display = '';
        document.getElementById('app').style.display = 'none';
    }

    /* ---------- toast popup ---------- */
    var _toastTimer = null;

    function showToast(msg, type) {
        var old = document.getElementById('ag-toast');
        if (old) old.remove();

        var t = document.createElement('div');
        t.id = 'ag-toast';
        t.style.cssText = [
            'position:fixed',
            'top:28px',
            'left:50%',
            'transform:translateX(-50%)',
            'z-index:99999',
            'display:flex',
            'align-items:center',
            'gap:10px',
            'padding:14px 22px',
            'border-radius:10px',
            'font-family:inherit',
            'font-size:14px',
            'font-weight:500',
            'color:#fff',
            'box-shadow:0 8px 32px rgba(0,0,0,.55)',
            'max-width:400px',
            'line-height:1.4',
            'opacity:0',
            'transition:opacity .25s ease',
            'pointer-events:auto',
            type === 'success'
                ? 'background:linear-gradient(135deg,#10b981,#059669)'
                : 'background:linear-gradient(135deg,#ef4444,#dc2626)'
        ].join(';');

        var icon = type === 'success' ? '✔' : '⚠';
        t.innerHTML = '<span style="font-size:16px;flex-shrink:0">' + icon + '</span><span>' + esc(msg) + '</span>';
        document.body.appendChild(t);

        /* fade in */
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { t.style.opacity = '1'; });
        });

        clearTimeout(_toastTimer);
        _toastTimer = setTimeout(function () {
            t.style.opacity = '0';
            setTimeout(function () { if (t.parentNode) t.remove(); }, 300);
        }, 4500);
    }

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    /* ---------- tab switching ---------- */
    function switchTab(mode) {
        var tabLogin   = document.getElementById('auth-tab-login');
        var tabSignup  = document.getElementById('auth-tab-signup');
        var panelLogin  = document.getElementById('auth-panel-login');
        var panelSignup = document.getElementById('auth-panel-signup');

        if (mode === 'signup') {
            tabLogin.classList.remove('active');
            tabLogin.setAttribute('aria-selected', 'false');
            tabSignup.classList.add('active');
            tabSignup.setAttribute('aria-selected', 'true');
            panelLogin.style.display  = 'none';
            panelSignup.style.display = 'block';
        } else {
            tabSignup.classList.remove('active');
            tabSignup.setAttribute('aria-selected', 'false');
            tabLogin.classList.add('active');
            tabLogin.setAttribute('aria-selected', 'true');
            panelSignup.style.display = 'none';
            panelLogin.style.display  = 'block';
        }
    }

    /* ---------- login ---------- */
    async function handleLogin(e) {
        e.preventDefault();
        var form     = document.getElementById('auth-login-form');
        var username = form.querySelector('[name=username]').value.trim();
        var password = form.querySelector('[name=password]').value;
        var btn      = form.querySelector('button[type=submit]');

        if (!username || !password) {
            showToast('Please enter both username and password.', 'error');
            return;
        }

        btn.disabled    = true;
        btn.textContent = 'Logging in…';

        try {
            var res  = await fetch(API_LOGIN, {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify({ username: username, password: password })
            });

            var data = {};
            try { data = await res.json(); } catch (_) {}

            if (res.ok && data.token) {
                saveToken(data.token);
                showApp();
                return;
            }

            var errMsg = data.error || ('Login failed (HTTP ' + res.status + ').');
            if (res.status === 401) errMsg = 'No account found for "' + esc(username) + '". Please sign up first!';
            else if (res.status === 404) errMsg = 'Auth service not found (404). Run "npx vercel dev" for local testing or deploy to Vercel.';
            showToast(errMsg, 'error');
        } catch (err) {
            showToast('Network error: ' + (err.message || 'Cannot reach server'), 'error');
        } finally {
            btn.disabled    = false;
            btn.textContent = 'Log in';
        }
    }

    /* ---------- signup ---------- */
    async function handleSignup(e) {
        e.preventDefault();
        var form     = document.getElementById('auth-signup-form');
        var username = form.querySelector('[name=username]').value.trim();
        var email    = form.querySelector('[name=email]').value.trim();
        var password = form.querySelector('[name=password]').value;
        var btn      = form.querySelector('button[type=submit]');

        if (!email) { showToast('Email is required for password reset.', 'error'); return; }

        if (!username) {
            showToast('Username is required.', 'error');
            return;
        }
        if (password.length < 4) {
            showToast('Password must be at least 4 characters.', 'error');
            return;
        }

        btn.disabled    = true;
        btn.textContent = 'Creating…';

        try {
            var res  = await fetch(API_SIGNUP, {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify({ username: username, email: email, password: password })
            });

            var data = {};
            try { data = await res.json(); } catch (_) {}

            if (res.ok && data.token) {
                saveToken(data.token);
                showToast('Welcome, ' + esc(username) + '! Account created.', 'success');
                setTimeout(showApp, 900);
                return;
            }

            var errMsg = data.error || ('Sign-up failed (HTTP ' + res.status + ').');
            if (res.status === 409) errMsg = 'Username "' + esc(username) + '" is already taken. Try another or log in.';
            else if (res.status === 404) errMsg = 'Auth service not found (404). Run "npx vercel dev" for local testing or deploy to Vercel.';
            showToast(errMsg, 'error');
        } catch (err) {
            showToast('Network error: ' + (err.message || 'Cannot reach server'), 'error');
        } finally {
            btn.disabled    = false;
            btn.textContent = 'Create account';
        }
    }

    /* ---------- check existing token ---------- */
    async function checkAuth() {
        var token = getToken();
        if (!token) return false;
        try {
            var res = await fetch(API_ME, {
                headers: { 'Authorization': 'Bearer ' + token },
                cache  : 'no-store'
            });
            return res.ok;
        } catch (_) {
            return false;
        }
    }

    /* ---------- forgot / reset password ---------- */
    function showResetPanel() {
        document.getElementById('auth-panel-login').style.display  = 'none';
        document.getElementById('auth-panel-signup').style.display = 'none';
        document.getElementById('auth-panel-reset').style.display  = 'block';
        /* hide tabs while in reset view */
        document.querySelector('.auth-tabs').style.display = 'none';
    }

    function hideResetPanel() {
        document.getElementById('auth-panel-reset').style.display = 'none';
        document.querySelector('.auth-tabs').style.display = '';
        switchTab('login');
    }

    async function handleReset(e) {
        e.preventDefault();
        var form     = document.getElementById('auth-reset-form');
        var username = form.querySelector('[name=username]').value.trim();
        var btn      = form.querySelector('button[type=submit]');

        if (!username) { showToast('Username is required.', 'error'); return; }

        btn.disabled = true; btn.textContent = 'Sending…';

        try {
            var res  = await fetch(API_RESET_REQUEST, {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify({ username: username })
            });
            var data = {};
            try { data = await res.json(); } catch (_) {}

            if (res.ok) {
                showToast(data.message || 'Reset link sent! Check your email.', 'success');
                form.reset();
                hideResetPanel();
            } else {
                showToast(data.error || ('Reset failed (HTTP ' + res.status + ').'), 'error');
            }
        } catch (err) {
            showToast('Network error: ' + (err.message || 'Cannot reach server'), 'error');
        } finally {
            btn.disabled = false; btn.textContent = 'Send reset link';
        }
    }

    /* ---------- boot ---------- */
    function boot() {
        /* wire tabs */
        document.getElementById('auth-tab-login').addEventListener('click', function (e) {
            e.preventDefault(); switchTab('login');
        });
        document.getElementById('auth-tab-signup').addEventListener('click', function (e) {
            e.preventDefault(); switchTab('signup');
        });

        /* wire forms */
        document.getElementById('auth-login-form').addEventListener('submit', handleLogin);
        document.getElementById('auth-signup-form').addEventListener('submit', handleSignup);
        document.getElementById('auth-reset-form').addEventListener('submit', handleReset);

        /* forgot password link */
        document.getElementById('auth-forgot-btn').addEventListener('click', showResetPanel);
        document.getElementById('auth-reset-back').addEventListener('click', hideResetPanel);

        /* start on login panel */
        switchTab('login');

        /* check if already logged in */
        checkAuth().then(function (ok) {
            if (ok) showApp(); else showGate();
        });
    }

    /* expose for other scripts */
    window.getAuthToken   = getToken;
    window.clearAuthToken = clearToken;
    window.authHeaders    = authHeaders;
    window.showAuthToast  = showToast;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
}());
