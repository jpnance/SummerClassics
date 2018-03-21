var Session = require('../models/Session');
var Game = require('../models/Game');
var Team = require('../models/Team');
var Classic = require('../models/Classic');

module.exports.showAllForUser = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		var data = [
			Team.find().sort('division league teamName'),
			Classic.find({ user: session.user._id, season: process.env.SEASON }).populate('team').populate({ path: 'picks', populate: { path: 'away.team home.team' } })
		];

		Promise.all(data).then(function(values) {
			var teams = values[0];
			var classics = values[1];

			teams.forEach(function(team) {
				classics.forEach(function(classic) {
					if (classic.team.abbreviation == team.abbreviation) {
						team.classic = classic;
						return;
					}
				});
			});

			classics.forEach(function(classic) {
				classic.picks.forEach(function(pick) {
					if (pick.away.team._id == classic.team._id) {
						pick.opponent = pick.home;
					}
					else if (pick.home.team._id == classic.team._id) {
						pick.opponent = pick.away;
					}
				});
			});

			response.render('classics', { session: session, teams: teams });
		});
	});
};

module.exports.pick = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		var data = [
			Classic.findOne({ season: process.env.SEASON, user: session.user._id, team: request.params.teamId }),
			Classic.findOne({ season: process.env.SEASON, user: session.user._id, team: { '$ne': request.params.teamId }, picks: request.params.gameId }),
			Game.findById(request.params.gameId)
		];

		Promise.all(data).then(function(values) {
			var classic = values[0];
			var classicCollision = values[1];
			var game = values[2];

			var classicPromises = [];

			if (game.hasStarted()) {
				response.sendStatus(500);
				return;
			}

			if (game.away.team != request.params.teamId && game.home.team != request.params.teamId) {
				response.sendStatus(500);
				return;
			}

			if (!classic) {
				classic = new Classic({ season: process.env.SEASON, user: session.user._id, team: request.params.teamId });
			}

			if (classicCollision) {
				classicCollision.unpick(game._id);
				classicPromises.push(classicCollision.save());
			}

			Promise.all(classicPromises).then(function() {
				if (classic.isFinal()) {
					response.sendStatus(500);
					return;
				}
				else if (classic.picks.length >= 7) {
					response.sendStatus(500);
					return;
				}
				else {
					classic.pick(game._id);
					classicPromises.push(classic.save());
				}

				Promise.all(classicPromises).then(function() {
					response.redirect('/picks');
				});
			});
		});
	});
};

module.exports.unpick = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		var data = [
			Classic.findOne({ season: process.env.SEASON, user: session.user._id, team: request.params.teamId }),
			Game.findById(request.params.gameId)
		];

		Promise.all(data).then(function(values) {
			var classic = values[0];
			var game = values[1];

			var classicPromises = [];

			if (game.hasStarted()) {
				response.sendStatus(500);
				return;
			}

			if (game.away.team != request.params.teamId && game.home.team != request.params.teamId) {
				response.sendStatus(500);
				return;
			}

			if (!classic) {
				response.redirect('/picks');
			}

			if (classic.isFinal()) {
				response.sendStatus(500);
				return;
			}

			classic.unpick(game._id);
			classicPromises.push(classic.save());

			Promise.all(classicPromises).then(function() {
				response.redirect('/picks');
			});
		});
	});
};
