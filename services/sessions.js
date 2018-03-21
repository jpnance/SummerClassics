var crypto = require('crypto');

var Session = require('../models/Session');
var User = require('../models/User');

module.exports.logIn = function(request, response) {
	if (request.body.username && request.body.password) {
		User.find({
			username: request.body.username,
			password: crypto.createHash('sha256').update(request.body.password).digest('hex')
		}, function(error, documents) {
			if (request.body.justVerify) {
				if (error) {
					response.send({ success: false, error: error.message });
				}
				else if (documents.length == 1) {
					var user = documents[0];
					response.send({ success: true, user: { username: user.username, displayName: user.displayName } });
				}
				else {
					response.send({ success: false, error: new Error('No clue really') });
				}

				return;
			}

			if (error) {
				response.send(error);
			}
			else if (documents.length == 1) {
				var sessionId = crypto.randomBytes(20).toString('hex');

				var sessionUpdate = {
					username: request.body.username,
					active: true,
					userAgent: request.headers['user-agent'],
					ipAddress: request.connection.remoteAddress,
					lastActivity: Date.now()
				};

				var options = {
					upsert: true
				};

				if (request.cookies && request.cookies.sessionId) {
					sessionId = request.cookies.sessionId;
				}

				Session.findByIdAndUpdate(sessionId, sessionUpdate, options, function(error, session) {
					if (error) {
						response.send(error);
					}
					else {
						response.cookie('sessionId', sessionId).redirect('/');
					}
				});
			}
			else {
				response.redirect('/?error=login');
			}
		});
	}
	else {
		response.redirect('/?error=login');
	}
};

module.exports.logOut = function(request, response) {
	Session.closeActiveSession(request, function(error) {
		response.clearCookie('sessionId').redirect('/');
	});
};

module.exports.showAll = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		if (error || !session || !session.user.admin) {
			response.redirect('/');
			return;
		}

		var data = [
			User.find({}).select('username').sort('username'),
			Session.find({})
		];

		Promise.all(data).then(function(values) {
			var responseData = {
				session: session,
				users: values[0],
				sessionUserActivityMap: {},
				totals: {
					users: 0,
					actives: 0,
					inactives: 0
				},
				dateFormat: require('dateformat')
			}

			var sessions = values[1];

			responseData.users.forEach(function(user) {
				responseData.sessionUserActivityMap[user.username] = {
					active: 0,
					inactive: 0,
					lastActivity: null
				};

				responseData.totals.users++;
			});

			sessions.forEach(function(session) {
				if (session.active) {
					responseData.sessionUserActivityMap[session.username].active++;
					responseData.totals.actives++;
				}
				else {
					responseData.sessionUserActivityMap[session.username].inactive++;
					responseData.totals.inactives++;
				}

				if (session.lastActivity > responseData.sessionUserActivityMap[session.username].lastActivity) {
					responseData.sessionUserActivityMap[session.username].lastActivity = session.lastActivity;
				}
			});

			response.render('sessions', responseData);
		});
	});
};
