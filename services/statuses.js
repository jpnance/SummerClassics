var Status = require('../models/Status');

module.exports.showAll = function(request, response) {
	Status.find({}).sort().then(function(statuses) {
		response.render('statuses', { statuses: statuses, session: request.session });
	});
};
