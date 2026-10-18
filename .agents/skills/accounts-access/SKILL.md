---
name: accounts-access
description: Use when changing account login, user administration, JWT roles, password reset, or account email in the rabbit nursery backend.
---

# Accounts and access

Follow requests through routes/index.js, routes/auth.js or routes/users.js, middleware/auth.js, middleware/mailer.js, and the AdminUser and User models in database.js.

Check access at both the route mount and handler. authRequired sets req.user; adminOnly depends on that value. Preserve the distinction between admin and user accounts, inactive users, and mustResetPassword behavior.

Keep password hashes and reset codes out of responses and logs. Preserve the generic forgot-password response for unknown addresses. Check the behavior for missing credentials, invalid tokens, unauthorized roles, and expired reset codes when changing these flows.

Verify changed HTTP behavior with focused checks. An integration check needs a MongoDB instance; a syntax check alone does not establish account behavior.
