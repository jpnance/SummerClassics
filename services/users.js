var crypto = require('crypto');

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
	response.render('users/add', { session: request.session });
};

module.exports.edit = function(request, response) {
	var session = request.session;

	if (request.params.username != session.user.username && !session.user.admin) {
		response.redirect('/');
		return;
	}

	User.findOne({ username: request.params.username }).populate('notifications').then(function(user) {
		var responseData = {
			user: user,
			session: session
		};

		response.render('users/edit', responseData);
	}).catch(function(error) {
		response.send(error);
	});
};

module.exports.showAll = function(request, response) {
	User.find({}).sort({ username: 1 }).then(function(users) {
		response.render('users', { users: users, session: request.session });
	});
};

module.exports.signUp = function(request, response) {
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

		user.save().then(function(user) {
			Classic.initialize(user, process.env.SEASON).then(function() {
				response.redirect('/users');
			});
		}).catch(function(error) {
			response.status(400).send(error);
		});
	}
};

module.exports.update = function(request, response) {
	var session = request.session;

	if (session.user.username != request.params.username && !session.user.admin) {
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

		user.save().then(function(user) {
			if (user.seasons.includes(parseInt(process.env.SEASON))) {
				Classic.initialize(user, process.env.SEASON).then(function() {
					response.redirect('/users');
				});
			}
			else {
				response.redirect('/users');
			}
		}).catch(function(error) {
			response.send(error);
		});
	});
};

module.exports.all = function(request, response) {
	var season = parseInt(request.query.season) || process.env.SEASON;

	var dataPromises = [
		User.find({ seasons: season }).select('-admin')
	];

	Promise.all(dataPromises).then(function(values) {
		var users = values[0];

		response.json(users);
	});
};
