var request = require('superagent');

var Game = require('../models/Game');
var Team = require('../models/Team');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);

var dateRange = {
	start: new Date('2018-03-29 00:00:00'),
	end: new Date('2018-10-01 00:00:00')
};

var days = (dateRange.end - dateRange.start) / 86400000;

var schedulePromises = [];

for (var i = 0; i <= days; i++) {
	var date = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate() + i);

	var year = date.getFullYear();
	var month = date.getMonth();
	var date = date.getDate();

	var dateString = year + '-' + (month + 1) + '-' + (date < 10 ? '0' : '') + date;

	schedulePromises.push(new Promise(function(resolve, reject) {
		request.get('https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=' + dateString + '&hydrate=team', function(error, response) {
			var gamePromises = [];
			var data = JSON.parse(response.text);

			data.dates.forEach(function(date) {
				date.games.forEach(function(game) {
					if (game.status.abstractGameCode == 'F' || game.seriesDescription != 'Regular Season') {
						return;
					}

					var awayTeam = game.teams.away.team;
					var homeTeam = game.teams.home.team;

					var newGame = {
						startTime: game.gameDate,
						'away.team': awayTeam.id,
						'home.team': homeTeam.id,
						status: game.status.statusCode
					};

					gamePromises.push(Team.findByIdAndUpdate(awayTeam.id, { name: awayTeam.name, abbreviation: awayTeam.abbreviation, locationName: awayTeam.locationName, teamName: awayTeam.teamName }, { upsert: true }));
					gamePromises.push(Team.findByIdAndUpdate(homeTeam.id, { name: homeTeam.name, abbreviation: homeTeam.abbreviation, locationName: homeTeam.locationName, teamName: homeTeam.teamName }, { upsert: true }));

					gamePromises.push(Game.findByIdAndUpdate(game.gamePk, newGame, { upsert: true }));
				});
			});

			Promise.all(gamePromises).then(function() {
				resolve(null);
			});

		});
	}));
}

Promise.all(schedulePromises).then(function() {
	mongoose.disconnect();
});
