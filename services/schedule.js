var Team = require('../models/Team');

module.exports.showAll = function(request, response) {
	var data = [
		Team.find().sort('league division teamName')
	];

	Promise.all(data).then(function(values) {
		var teams = values[0];

		response.render('placeholder', { teams: teams });
	});
};
