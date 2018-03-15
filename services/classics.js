var Team = require('../models/Team');
var Classic = require('../models/Classic');

module.exports.showAllForUser = function(request, response) {
	var data = [
		Team.find().sort('division league teamName'),
		Classic.find().populate('team picks')
	];

	Promise.all(data).then(function(values) {
		var teams = values[0];
		var classics = values[1];

		teams.forEach(function(team) {
			classics.forEach(function(classic) {
				if (classic.team.abbreviation == team.abbreviation) {
					team.classic = classic;
				}
			});
		});

		response.render('classics', { teams: teams });
	});
};
