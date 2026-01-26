var apiRequest = require('superagent');
var User = require('../models/User');

/**
 * Attaches session and user to request if logged in.
 * Always calls next() - doesn't block unauthenticated users.
 * Use on all routes via app.use().
 */
async function attachSession(request, response, next) {
	request.session = null;

	if (!request.cookies.sessionKey) {
		return next();
	}

	try {
		var sessionResponse = await apiRequest
			.post(process.env.LOGIN_SERVICE_INTERNAL + '/sessions/retrieve')
			.send({ key: request.cookies.sessionKey });

		if (sessionResponse.body?.user) {
			var user = await User.findOne({
				username: sessionResponse.body.user.username
			}).populate({
				path: 'notifications',
				match: { read: false },
				populate: [
					{
						path: 'game',
						populate: [
							{ path: 'away.team' },
							{ path: 'home.team' }
						],
					},
					{
						path: 'classic',
						populate: { path: 'team' }
					},
				]
			});

			if (user) {
				request.session = { username: user.username, user: user };
			}
		}
	} catch (err) {
		// Log but don't crash - treat as unauthenticated
		console.error('Auth service error:', err.message);
	}

	next();
}

/**
 * Requires a logged-in user. Redirects to /login if not.
 * Use on specific routes: app.get('/picks', requireLogin, handler)
 */
function requireLogin(request, response, next) {
	if (!request.session) {
		return response.redirect('/login');
	}
	next();
}

/**
 * Requires an admin user. Redirects to / if not logged in or not admin.
 */
function requireAdmin(request, response, next) {
	if (!request.session || !request.session.user || !request.session.user.admin) {
		return response.redirect('/');
	}
	next();
}

/**
 * Requires a valid API key in query params. Returns 401 if missing or invalid.
 * Use on JSON API routes: app.get('/data.json', requireApiKey, handler)
 */
function requireApiKey(request, response, next) {
	if (!request.query?.apiKey || request.query.apiKey !== process.env.API_KEY) {
		return response.sendStatus(401);
	}
	next();
}

module.exports = {
	attachSession: attachSession,
	requireLogin: requireLogin,
	requireAdmin: requireAdmin,
	requireApiKey: requireApiKey
};
