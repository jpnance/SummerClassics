var User = require('../models/User');
var Session = require('../models/Session');
var Game = require('../models/Game');
var Team = require('../models/Team');
var Classic = require('../models/Classic');

var dateFormat = require('dateformat');

module.exports.showAll = function(request, response) {
	var data = [
		Game.find().sort('startTime').populate('away.team').populate('home.team')
	];

	Promise.all(data).then(function(values) {
		var games = values[0];

		response.render('index', { games: games });
	});
};

module.exports.showAllForTeam = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		Team.findOne({ abbreviation: request.params.teamAbbreviation }, function(error, team) {
			if (error) {
				response.sendStatus(500);
				return;
			}

			if (!team) {
				response.sendStatus(404);
				return;
			}

			var dataPromises = [
				Game.find({ season: process.env.SEASON, '$or': [ { 'home.team': team._id }, { 'away.team': team._id } ]}).sort('startTime').populate('away.team away.probablePitcher home.team home.probablePitcher'),
				Classic.find({ season: process.env.SEASON }).populate('user team')
			];

			Promise.all(dataPromises).then(function(values) {
				var games = values[0];
				var classics = values[1];

				games.forEach(function(game) {
					game.away.picks = [];
					game.home.picks = [];

					classics.forEach(function(classic) {
						if (session && session.user.username == classic.user.username) {
							if (classic.team._id == game.away.team._id) {
								game.away.team.classic = classic;
							}

							if (classic.team._id == game.home.team._id) {
								game.home.team.classic = classic;
							}
						}

						if (classic.picks.indexOf(game._id) > -1) {
							if (session && session.user.username == classic.user.username) {
								game.classic = classic;

								if (classic.team._id == game.away.team._id) {
									game.away.picked = true;
								}
								else if (classic.team._id == game.home.team._id) {
									game.home.picked = true;
								}
							}

							if (game.hasDefinitelyStarted()) {
								if (classic.team._id == game.away.team._id) {
									game.away.picks.push(classic);
								}

								if (classic.team._id == game.home.team._id) {
									game.home.picks.push(classic);
								}
							}
						}
					});

					game.away.picks.sort(Classic.populatedUserDisplayNameSort);
					game.home.picks.sort(Classic.populatedUserDisplayNameSort);
				});

				var responseData = {
					session: session,
					games: games,
					team: team
				};

				response.render('schedule/team', responseData);
			});
		});
	});
};

module.exports.showAllForDate = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		var dateString;

		if (!request.params.date) {
			var now = new Date();
			now.setMinutes(now.getMinutes() - now.getTimezoneOffset() - 180);

			dateString = dateFormat(now, 'yyyy-mm-dd', true);
		}
		else {
			dateString = dateFormat(request.params.date, 'yyyy-mm-dd', true);
		}

		if (dateString < process.env.OPENING_DAY) {
			dateString = process.env.OPENING_DAY;
		}

		if (dateString > process.env.FINAL_DAY) {
			dateString = process.env.FINAL_DAY;
		}

		var today = new Date(dateString);
		today.setHours(today.getHours() + 14);

		var tomorrow = new Date(today);
		tomorrow.setHours(today.getHours() + 18);

		var yesterday = new Date(today);
		yesterday.setHours(today.getHours() - 18);

		var data = [
			Game.find({ season: process.env.SEASON, date: dateString, 'away.team': { '$nin': [159, 160] }, 'home.team': { '$nin': [159, 160] } }).sort('startTime away.team.teamName').populate('away.team away.probablePitcher home.team home.probablePitcher'),
			Classic.find({ season: process.env.SEASON }).populate('user team')
		];

		Promise.all(data).then(function(values) {
			var games = {
				all: values[0],
				interesting: [],
				other: []
			};

			var classics = values[1];

			games.all.forEach(function(game) {
				game.away.picks = [];
				game.home.picks = [];

				classics.forEach(function(classic) {
					if (session && session.user.username == classic.user.username) {
						if (classic.team._id == game.away.team._id) {
							game.away.team.classic = classic;
						}

						if (classic.team._id == game.home.team._id) {
							game.home.team.classic = classic;
						}
					}

					if (classic.picks.indexOf(game._id) > -1) {
						if (session && session.user.username == classic.user.username) {
							game.classic = classic;

							if (classic.team._id == game.away.team._id) {
								game.away.picked = true;
							}
							else if (classic.team._id == game.home.team._id) {
								game.home.picked = true;
							}
						}

						if (game.hasDefinitelyStarted()) {
							if (classic.team._id == game.away.team._id) {
								game.away.picks.push(classic);
							}

							if (classic.team._id == game.home.team._id) {
								game.home.picks.push(classic);
							}
						}
					}
				});

				game.away.picks.sort(Classic.populatedUserDisplayNameSort);
				game.home.picks.sort(Classic.populatedUserDisplayNameSort);
			});

			games.all.sort(Game.progressSortWithPopulatedTeams);

			games.interesting = games.all.filter(function(game) {
				return game.hasDefinitelyStarted() && (game.away.picks.length || game.home.picks.length);
			});

			games.interesting.sort(Game.interestingnessSortWithPopulatedPicks);

			games.other = games.all.filter(function(game) {
				return !games.interesting.includes(game);
			});

			var responseData = {
				session: session,
				games: games,
				yesterday: yesterday,
				today: today,
				tomorrow: tomorrow
			};

			response.render('schedule/all', responseData);
		});
	});
};

module.exports.allForDate = function(request, response) {
	if (!request.query || !request.query.apiKey || request.query.apiKey != process.env.API_KEY) {
		response.sendStatus(401);
		return;
	}

	var dataPromises = [
		Game.find({ date: request.query.date }).populate('away.team home.team')
	];

	Promise.all(dataPromises).then(function(values) {
		var games = values[0];

		response.json(games);
	});
};
