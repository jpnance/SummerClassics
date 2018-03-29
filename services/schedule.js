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
	var data = [
		new Promise(function(resolve, reject) {
			Team.findOne({ abbreviation: request.params.teamAbbreviation }, function(error, team) {
				resolve(Game.find({ '$or': [ { 'home.team': team._id }, { 'away.team': team._id } ]}).sort('startTime').populate('away.team home.team'));
			});
		})
	];

	Promise.all(data).then(function(values) {
		var games = values[0];

		response.render('index', { games: games });
	});
};

module.exports.showAllForDate = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		var dateString;

		if (!request.params.date) {
			dateString = dateFormat(new Date(), 'yyyy-mm-dd', true);
		}
		else {
			dateString = dateFormat(request.params.date, 'yyyy-mm-dd', true);
		}

		if (dateString < '2018-03-29') {
			dateString = '2018-03-29';
		}

		if (dateString > '2018-09-30') {
			dateString = '2018-09-30';
		}

		var today = new Date(dateString);
		today.setHours(today.getHours() + 14);

		var tomorrow = new Date(today);
		tomorrow.setHours(today.getHours() + 18);

		var yesterday = new Date(today);
		yesterday.setHours(today.getHours() - 18);

		var data = [
			Game.find({ startTime: { '$gte': today, '$lte': tomorrow } }).sort('startTime away.team.teamName').populate('away.team away.probablePitcher home.team home.probablePitcher'),
			Classic.find({ season: process.env.SEASON }).populate('user team')
		];

		Promise.all(data).then(function(values) {
			var games = values[0];
			var classics = values[1];

			games.forEach(function(game) {
				if (game.hasStarted() {
					game.away.picks = [];
					game.home.picks = [];
				}

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

						if (game.hasStarted()) {
							if (classic.team._id == game.away.team._id) {
								game.away.picks.push(classic.user);
							}

							if (classic.team._id == game.home.team._id) {
								game.home.picks.push(classic.user);
							}
						}
					}
				});
			});

			var responseData = {
				session: session,
				games: games,
				yesterday: yesterday,
				today: today,
				tomorrow: tomorrow
			};

			response.render('index', responseData);
		});
	});
};
