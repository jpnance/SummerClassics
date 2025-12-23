var dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

var request = require('superagent');

var Game = require('../models/Game');
var Classic = require('../models/Classic');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });

console.log('----------')
console.log(`starting games.js at ${(new Date()).toISOString()}`);

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

	if (!games) {
		console.log('not sure why but we didn\'t find any games; bailing out');
		coinflipperAlert('games came back empty');
		mongoose.disconnect();
		process.exit();
	}

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
				console.log('----------')
				mongoose.disconnect();
			}).catch(function(error) {
				console.log('not every classic promise got settled; here\'s the error');
				coinflipperAlert('some classic promises didn\'t get settled');
				console.log(error);
				console.log('----------')
      });
		});
	}).catch(function(error) {
		console.log('not every game promise got settled; here\'s the error');
		coinflipperAlert('some game promises didn\'t get settled');
		console.log(error);
		console.log('----------')
	});
});

function coinflipperAlert(message) {
	request
		.post('https://ntfy.sh/coinflipper')
		.set('Content-Type', 'application/x-www-form-urlencoded')
		.send(`${(new Date()).toISOString()} ${message}`)
		.then(response => {});
}
