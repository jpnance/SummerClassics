var request = require('superagent');

var Game = require('../models/Game');
var Player = require('../models/Player');
var Classic = require('../models/Classic');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);

var dateCushion = new Date();
dateCushion.setDate(dateCushion.getDate() + 7);

Game.find({ status: { '$nin': ['F', 'FT', 'CR', 'FR', 'CI', 'FG'] }, startTime: { '$lt': dateCushion } }).sort('startTime').exec(function(error, games) {
	var gamePromises = [];

	games.forEach(function(game) {
		gamePromises.push(new Promise(function(resolve, reject) {
			request.get('https://statsapi.mlb.com/api/v1.1/game/' + game._id + '/feed/live', function(error, response) {
				var playerPromises = [];

				var data = JSON.parse(response.text);

				if (!data.liveData || !data.liveData.linescore || !data.liveData.linescore.teams) {
					resolve('fine');
					return;
				}

				if (data.gameData.probablePitchers) {
					if (data.gameData.probablePitchers.away) {
						game.away.probablePitcher = data.gameData.probablePitchers.away.id;

						playerPromises.push(new Promise(function(resolve2, reject2) {
							request.get('https://statsapi.mlb.com/api/v1/people/' + game.away.probablePitcher, function(error, response) {
								var playerData = JSON.parse(response.text);
								var player = playerData.people[0];

								var newPlayer = {
									team: data.gameData.teams.away.id,
									number: player.primaryNumber,
									name: player.fullName,
									position: player.primaryPosition.abbreviation,
									bats: player.batSide.code,
									throws: player.pitchHand.code
								};

								Player.findByIdAndUpdate(player.id, newPlayer, { upsert: true }).then(function() {
									resolve2('good');
								});
							});
						}));
					}
					if (data.gameData.probablePitchers.home) {
						game.home.probablePitcher = data.gameData.probablePitchers.home.id;

						playerPromises.push(new Promise(function(resolve2, reject2) {
							request.get('https://statsapi.mlb.com/api/v1/people/' + game.home.probablePitcher, function(error, response) {
								var playerData = JSON.parse(response.text);
								var player = playerData.people[0];

								var newPlayer = {
									team: data.gameData.teams.home.id,
									number: player.primaryNumber,
									name: player.fullName,
									position: player.primaryPosition.abbreviation,
									bats: player.batSide.code,
									throws: player.pitchHand.code
								};

								Player.findByIdAndUpdate(player.id, newPlayer, { upsert: true }).then(function() {
									resolve2('good');
								});
							});
						}));
					}
				}

				game.status = data.gameData.status.statusCode;

				if (game.status == 'I' || game.status == 'F') {
					game.away.score = data.liveData.linescore.teams.away.runs;
					game.home.score = data.liveData.linescore.teams.home.runs;
				}

				if (game.status == 'F') {
					if (game.away.score > game.home.score) {
						game.away.winner = true;
						game.home.winner = false;
					}
					else if (game.home.score > game.away.score) {
						game.home.winner = true;
						game.away.winner = false;
					}
				}

				Promise.all(playerPromises).then(function() {
					game.save(function(error) {
						if (!error) {
							resolve('good');
						}
					});
				});
			});
		}));
	});

	Promise.all(gamePromises).then(function() {
		Classic.find().populate('picks').exec(function(error, classics) {
			var classicPromises = [];

			classics.forEach(function(classic) {
				classicPromises.push(new Promise(function(resolve, reject) {
					classic.tally();

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
	});
});
