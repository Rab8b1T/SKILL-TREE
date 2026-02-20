/**
 * POST /api/auth/reset-confirm
 * Body: { token, newPassword }
 * Validates the reset token and sets the new password.
 */
import { getUsersDb, hashPassword, sendJson, readBody } from './auth-shared.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' });

    const data        = await readBody(req);
    const token       = data?.token?.trim();
    const newPassword = data?.newPassword;

    if (!token)       return sendJson(res, 400, { error: 'Reset token is missing' });
    if (!newPassword || String(newPassword).length < 4)
        return sendJson(res, 400, { error: 'New password must be at least 4 characters' });

    try {
        const db   = await getUsersDb();
        const user = await db.collection('users').findOne({
            resetToken        : token,
            resetTokenExpires : { $gt: new Date() },
        });

        if (!user) return sendJson(res, 400, { error: 'Reset link is invalid or has expired. Request a new one.' });

        await db.collection('users').updateOne(
            { _id: user._id },
            {
                $set  : { passwordHash: hashPassword(newPassword), updatedAt: new Date().toISOString() },
                $unset: { resetToken: '', resetTokenExpires: '' },
            }
        );

        return sendJson(res, 200, { ok: true });
    } catch (err) {
        console.error('[auth-reset-confirm]', err);
        return sendJson(res, 500, { error: err.message || 'Reset failed' });
    }
}
