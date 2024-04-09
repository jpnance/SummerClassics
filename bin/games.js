console.log('starting games.js');

var dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

var request = require('superagent');

var Game = require('../models/Game');
var Classic = require('../models/Classic');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });

var dateCushion = new Date();
dateCushion.setDate(dateCushion.getDate() + 3);

var conditions = {
	'status.statusCode': {
		'$nin': ['F', 'FT', 'CR', 'FR', 'CI', 'FG']
	},
	season: parseInt(process.env.SEASON),
	startTime: { '$lt': dateCushion }
};

if (process.env.OVERRIDE_UPDATE_ALL) {
	conditions = { season: parseInt(process.env.SEASON) };
}

if (process.env.FORCE_UPDATE_FOR_GAME_ID) {
	conditions = { '_id': process.env.FORCE_UPDATE_FOR_GAME_ID };
}

Game.find(conditions).sort('startTime').exec(function(error, games) {
	var gamePromises = [];

	games.forEach(function(game) {
		gamePromises.push(game.syncWithApi());
	});

	Promise.allSettled(gamePromises).then(function() {
		console.log('every game promise got settled');
		Classic.find({ season: process.env.SEASON }).populate('picks').exec(function(error, classics) {
			var classicPromises = [];

			classics.forEach(function(classic) {
				classicPromises.push(new Promise(function(resolve, reject) {
					classic.scoreAndResolve(process.env.FINALIZE).then(function() {
						classic.save(function(error) {
							if (!error) {
								resolve('good');
							}
							else {
								reject(error);
							}
						});
					});
				}));
			});

			Promise.allSettled(classicPromises).then(function() {
				console.log('every classic promise got settled');
				mongoose.disconnect();
			}).catch(function(error) {
				console.log('not every classic promise got settled; here\'s the error');
				console.log(error);
      });
		});
	}).catch(function(error) {
		console.log('not every game promise got settled; here\'s the error');
		console.log(error);
	});
});
