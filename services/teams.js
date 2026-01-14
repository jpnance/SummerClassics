var Team = require('../models/Team');

module.exports.showAll = function(request, response) {
	Team.find({}).sort({ teamName: 1 }).then(function(teams) {
		response.render('teams', { teams: teams, session: request.session });
	});
};
