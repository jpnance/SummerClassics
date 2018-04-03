var Session = require('../models/Session');
var Game = require('../models/Game');
var Team = require('../models/Team');
var Classic = require('../models/Classic');

module.exports.showAllForUser = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		var data = [
			Team.find().sort('league division teamName'),
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

				classic.picks.sort(Classic.populatedPicksStartTimeSort);
			});

			response.render('classics', { session: session, teams: teams });
		});
	});
};

module.exports.showStandings = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		var dataPromises = [
			Classic.find({ season: process.env.SEASON }).populate('user')
		];

		Promise.all(dataPromises).then(function(values) {
			var classics = values[0];

			var standingsMap = {};
			var standings = [];

			classics.forEach(function(classic) {
				if (!standingsMap[classic.user.username]) {
					standingsMap[classic.user.username] = {
						user: classic.user,
						record: {
							wins: 0,
							losses: 0,
							winningPercentage: null
						},
						score: {
							final: 0,
							potential: {
								maximum: 0,
								minimum: 0
							}
						}
					};
				}

				standingsMap[classic.user.username].record.wins += classic.record.wins;
				standingsMap[classic.user.username].record.losses += classic.record.losses;

				if (standingsMap[classic.user.username].record.wins + standingsMap[classic.user.username].record.losses > 0) {
					standingsMap[classic.user.username].record.winningPercentage = standingsMap[classic.user.username].record.wins / (standingsMap[classic.user.username].record.wins + standingsMap[classic.user.username].record.losses);
				}

				if (classic.score.potential) {
					standingsMap[classic.user.username].score.potential.maximum += classic.score.potential.best;
					standingsMap[classic.user.username].score.potential.minimum += classic.score.potential.worst;
				}

				if (classic.score.final) {
					standingsMap[classic.user.username].score.potential.maximum += classic.score.final;
					standingsMap[classic.user.username].score.potential.minimum += classic.score.final;
					standingsMap[classic.user.username].score.final += classic.score.final;
				}
			});

			Object.keys(standingsMap).forEach(function(key) {
				standings.push(standingsMap[key]);
			});

			standings = standings.sort(Classic.standingsSort);

			response.render('standings', { session: session, standings: standings });
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
					response.send({
						success: true,
						gameId: game._id,
						teamId: classic.team
					});
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
				response.send({
					success: true,
					gameId: game._id
				});
			});
		});
	});
};
