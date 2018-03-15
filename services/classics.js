var Classic = require('../models/Classic');

module.exports.showAllForUser = function(request, response) {
	var data = [
		Classic.find().populate('team')
	];

	Promise.all(data).then(function(values) {
		var classics = values[0];

		response.render('classics', { classics: classics });
	});
};
