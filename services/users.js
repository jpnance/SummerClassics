var crypto = require('crypto');

var Session = require('../models/Session');
var User = require('../models/User');
var Classic = require('../models/Classic');

module.exports.loginPrompt = function(request, response) {
	var responseData = {};

	if (request.query.error == 'invalid-email') {
		responseData.error = { message: 'Invalid email address.' };
	}
	else if (request.query.error == 'not-found') {
		responseData.error = { message: 'No user found for that email address.' };
	}
	else if (request.query.error == 'unknown') {
		responseData.error = { message: 'Unknown server error.' };
	}
	else if (request.query.success == 'email-sent') {
		responseData.success = { message: 'Check your email for your login link!' };
	}

	response.render('users/login', responseData);
};

module.exports.add = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		if (session && session.user.admin) {
			response.render('users/add', { session: session });
		}
		else {
			response.redirect('/');
		}
	});
};

module.exports.edit = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		if (session && (request.params.username == session.user.username || session.user.admin)) {
			User.findOne({ username: request.params.username }).populate('notifications').exec(function(error, user) {
				var responseData = {
					user: user,
					session: session
				};

				if (error) {
					response.send(error);
				}

				response.render('users/edit', responseData);
			});
		}
		else {
			response.redirect('/');
		}
	});
};

module.exports.showAll = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		if (session && session.user.admin) {
			User.find({}).sort({ username: 1 }).then(function(users) {
				response.render('users', { users: users, session: session });
			});
		}
		else {
			response.redirect('/');
		}
	});
};

module.exports.signUp = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		if (session && session.user.admin) {
			if (!request.body.username) {
				response.status(400).send('No username supplied');
			}
			else {
				var user = new User({
					username: request.body.username,
					firstName: request.body.firstName,
					lastName: request.body.lastName,
					displayName: request.body.displayName ? request.body.displayName : request.body.firstName
				});

				if (request.body.eligible == 'on') {
					user.makeEligibleFor(process.env.SEASON);
				}
				else {
					user.makeUneligibleFor(process.env.SEASON);
				}

				user.save().then((user) => {
					Classic.initialize(user, process.env.SEASON).then(function() {
						response.redirect('/users');
					});
				}).catch((error) => {
					response.status(400).send(error);
				});
			}
		}
		else {
			response.redirect('/');
		}
	});
};

module.exports.update = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		if (!session || (session.user.username != request.params.username && !session.user.admin)) {
			response.redirect('/');
			return;
		}

		var data = [
			User.findOne({ username: request.params.username })
		];

		Promise.all(data).then(function(values) {
			var user = values[0];

			if (session.user.admin) {
				user.firstName = request.body.firstName;
				user.lastName = request.body.lastName;
				user.displayName = request.body.displayName;

				if (request.body.eligible == 'on') {
					user.makeEligibleFor(process.env.SEASON);
				}
				else {
					user.makeUneligibleFor(process.env.SEASON);
				}
			}

			user.save(function(error) {
				if (error) {
					response.send(error);
				}
				else {
					if (user.seasons.includes(parseInt(process.env.SEASON))) {
						Classic.initialize(user, process.env.SEASON).then(function() {
							response.redirect('/users');
						});
					}
					else {
						response.redirect('/users');
					}
				}
			});
		});
	});
};

module.exports.all = function(request, response) {
	if (!request.query || !request.query.apiKey || request.query.apiKey != process.env.API_KEY) {
		response.sendStatus(401);
		return;
	}

	var season = parseInt(request.query.season) || process.env.SEASON;

	var dataPromises = [
		User.find({ seasons: season }).select('-admin')
	];

	Promise.all(dataPromises).then(function(values) {
		var users = values[0];

		response.json(users);
	});
};
