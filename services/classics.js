var Game = require('../models/Game');
var Team = require('../models/Team');
var Classic = require('../models/Classic');

module.exports.showAllForUser = function(request, response) {
	var data = [
		Team.find().sort('division league teamName'),
		Classic.find().populate('team').populate({ path: 'picks', populate: { path: 'away.team home.team' } })
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

		response.render('classics', { teams: teams });
	});
};

module.exports.pick = function(request, response) {
	var season = (new Date()).getFullYear();
	var data = [
		Classic.findOne({ season: season, picks: request.params.gameId }),
		Classic.findOne({ season: season, team: request.params.teamId }),
		Game.findById(request.params.gameId)
	];

	Promise.all(data).then(function(values) {
		var classicCollision = values[0];
		var classic = values[1];
		var game = values[2];

		if (classicCollision) {
			response.sendStatus(500);
		}
		else if (game.hasStarted()) {
			response.sendStatus(500);
		}
		else {
			if (!classic) {
				classic = new Classic({ season: season, team: request.params.teamId });
			}

			classic.pick(game._id);

			classic.save(function() {
				response.redirect('/picks');
			});
		}
	});
};
