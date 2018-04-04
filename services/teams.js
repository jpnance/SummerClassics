var Session = require('../models/Session');
var Team = require('../models/Team');

module.exports.showAll = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		Team.find({}).sort({ teamName: 1 }).then(function(teams) {
			response.render('teams', { teams: teams, session: session });
		});
	});
};
