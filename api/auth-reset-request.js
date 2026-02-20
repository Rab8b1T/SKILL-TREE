/**
 * POST /api/auth/reset-request
 * Body: { username }
 * Checks that user exists, generates a short-lived reset token,
 * stores it in DB, and sends an email with the reset link.
 * Requires RESEND_API_KEY and RESET_FROM_EMAIL env vars.
 */
import crypto from 'crypto';
import { getUsersDb, sendJson, readBody } from './auth-shared.js';

const RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

async function sendResetEmail(to, username, resetLink) {
    const apiKey   = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESET_FROM_EMAIL || 'Skill Tree <onboarding@resend.dev>';

    if (!apiKey) throw new Error('RESEND_API_KEY not configured in Vercel');

    const body = {
        from   : fromEmail,
        to     : [to],
        subject: 'Skill Tree — Reset your password',
        html   : `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#1a1a2e;color:#f0f0ff;border-radius:12px">
                <h2 style="color:#a78bfa;margin:0 0 8px">Skill Tree 🎮</h2>
                <p style="color:#a0a0c0;margin:0 0 24px">Password Reset Request</p>
                <p>Hi <strong>${username}</strong>,</p>
                <p>You requested a password reset. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
                <a href="${resetLink}"
                   style="display:inline-block;margin:24px 0;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
                    Reset Password
                </a>
                <p style="color:#6b6b8d;font-size:13px">Or copy this link:<br>
                   <a href="${resetLink}" style="color:#a78bfa;word-break:break-all">${resetLink}</a>
                </p>
                <p style="color:#6b6b8d;font-size:12px;margin-top:32px">
                    If you didn't request this, ignore this email. Your password won't change.
                </p>
            </div>`,
    };

    const r = await fetch('https://api.resend.com/emails', {
        method : 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body   : JSON.stringify(body),
    });

    if (!r.ok) {
        const err = await r.text();
        throw new Error(`Email send failed: ${err}`);
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

    const data     = await readBody(req);
    const username = data?.username?.trim()?.toLowerCase();

    if (!username) return sendJson(res, 400, { error: 'Username is required' });

    try {
        const db   = await getUsersDb();
        const user = await db.collection('users').findOne({ username });

        // Always return success to prevent username enumeration
        if (!user) return sendJson(res, 200, { ok: true, message: 'If that account exists, a reset email was sent.' });
        if (!user.email) return sendJson(res, 400, { error: 'No email linked to this account. Please contact the admin.' });

        // Generate reset token
        const token   = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + RESET_EXPIRY_MS);

        await db.collection('users').updateOne(
            { username },
            { $set: { resetToken: token, resetTokenExpires: expires } }
        );

        const appUrl    = process.env.APP_URL || `https://${req.headers?.['x-forwarded-host'] || req.headers?.host}`;
        const resetLink = `${appUrl}/reset-password.html?token=${token}`;

        await sendResetEmail(user.email, user.displayName || user.username, resetLink);
        return sendJson(res, 200, { ok: true, message: 'Reset email sent! Check your inbox.' });
    } catch (err) {
        console.error('[auth-reset-request]', err);
        return sendJson(res, 500, { error: err.message || 'Failed to send reset email' });
    }
}
