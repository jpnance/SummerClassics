var dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

var Classic = require('../models/Classic');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);

Classic.find({ season: process.env.SEASON }).populate('picks').then(function(classics) {
	var classicPromises = [];

	classics.forEach(function(classic) {
		classicPromises.push(new Promise(function(resolve, reject) {
			classic.scoreAndResolve(process.env.FINALIZE).then(function() {
				classic.save().then(resolve).catch(reject);
			});
		}));
	});

	Promise.all(classicPromises).then(function() {
		mongoose.disconnect();
	});
}).catch(function(error) {
	console.error(error);
	process.exit();
});
