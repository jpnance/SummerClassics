var Session = require('../models/Session');
var Status = require('../models/Status');

module.exports.showAll = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		if (!session || !session.user || !session.user.admin) {
			response.redirect('/');
			return;
		}

		Status.find({}).sort().then(function(statuses) {
			response.render('statuses', { statuses: statuses, session: session });
		});
	});
};
