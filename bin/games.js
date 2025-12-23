var dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

var request = require('superagent');

var Game = require('../models/Game');
var Classic = require('../models/Classic');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);

var startTime = (new Date()).toISOString();

setInterval(coinflipperAlert.bind(null, `script that started at ${startTime} is taking a long time`), 60000);

console.log('----------')
console.log(`starting games.js at ${startTime}`);

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

Game.find(conditions).sort('startTime').then(async function(games) {
	var gamePromises = [];

	if (!games) {
		await coinflipperAlert('games came back empty');

		console.log('not sure why but we didn\'t find any games; bailing out');
		disconnectAndExit();
	}

	games.forEach(function(game) {
		gamePromises.push(game.syncWithApi());
	});

	Promise.allSettled(gamePromises).then(function() {
		console.log('every game promise got settled');

		Classic.find({ season: process.env.SEASON }).populate('picks').then(function(classics) {
			var classicPromises = [];

			classics.forEach(function(classic) {
				classicPromises.push(new Promise(function(resolve, reject) {
					classic.scoreAndResolve(process.env.FINALIZE).then(function() {
						classic.save().then(resolve).catch(reject);
					});
				}));
			});

			Promise.allSettled(classicPromises).then(function() {
				console.log('every classic promise got settled');

				disconnectAndExit();
			}).catch(async function(error) {
				await coinflipperAlert('some classic promises didn\'t get settled');

				console.log('not every classic promise got settled; here\'s the error');
				console.log(error);

				disconnectAndExit();
			});
		}).catch(function(error) {
			console.error(error);
			process.exit();
		});
	}).catch(async function(error) {
		await coinflipperAlert('some game promises didn\'t get settled');

		console.log('not every game promise got settled; here\'s the error');
		console.log(error);

		disconnectAndExit();
	});
}).catch(function(error) {
	console.error(error);
	process.exit();
});

async function coinflipperAlert(message) {
	if (process.env.NODE_ENV != 'production') {
		return Promise.resolve();
	}

	return request
		.post('https://ntfy.sh/coinflipper')
		.set('Content-Type', 'application/x-www-form-urlencoded')
		.send(`${(new Date()).toISOString()} ${message}`)
		.then(response => {});
}

function disconnectAndExit() {
	console.log('----------')

	mongoose.disconnect();
	process.exit();
}
