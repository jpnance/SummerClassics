var request = require('superagent');

var Game = require('../models/Game');
var Team = require('../models/Team');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);

Game.find().sort('startTime').exec(function(error, games) {
	var gamePromises = [];

	games.forEach(function(game) {
		gamePromises.push(new Promise(function(resolve, reject) {
			request.get('https://statsapi.mlb.com/api/v1/game/' + game._id + '/feed/live', function(error, response) {
				var data = JSON.parse(response.text);

				if (!data.liveData || !data.liveData.boxscore || !data.liveData.boxscore.teams) {
					resolve('fine');
					return;
				}

				var awayTeam = data.liveData.boxscore.teams.away;
				var homeTeam = data.liveData.boxscore.teams.home;

				if (data.gameData.probablePitchers) {
					if (data.gameData.probablePitchers.away) {
						//game.away.probablePitcher = data.gameData.probablePitchers.away.id;
					}
					if (data.gameData.probablePitchers.home) {
						//game.home.probablePitcher = data.gameData.probablePitchers.home.id;
					}
				}

				game.status = data.gameData.status.statusCode;

				if (game.status == 'I' || game.status == 'F') {
					game.away.score = data.liveData.linescore.away.runs;
					game.home.score = data.liveData.linescore.home.runs;
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

				game.save(function(error) {
					if (!error) {
						resolve('good');
					}
				});
			});
		}));
	});

	Promise.all(gamePromises).then(function() {
		mongoose.disconnect();
	});
});
