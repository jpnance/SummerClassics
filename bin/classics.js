var Classic = require('../models/Classic');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);

Classic.find({ season: process.env.SEASON }).populate('picks').exec(function(error, classics) {
	var classicPromises = [];

	classics.forEach(function(classic) {
		classicPromises.push(new Promise(function(resolve, reject) {
			classic.scoreAndResolve();

			classic.save(function(error) {
				if (!error) {
					resolve('good');
				}
				else {
					reject(error);
				}
			});
		}));
	});

	Promise.all(classicPromises).then(function() {
		mongoose.disconnect();
	});
});
