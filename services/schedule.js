var Game = require('../models/Game');
var Team = require('../models/Team');

module.exports.showAll = function(request, response) {
	var data = [
		Game.find().sort('startTime').populate('away.team').populate('home.team')
	];

	Promise.all(data).then(function(values) {
		var games = values[0];

		response.render('placeholder', { games: games });
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

		response.render('placeholder', { games: games });
	});
};
