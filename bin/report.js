// begin by fetching https://classics.coinflipper.org/picks.json?apiKey=<API key>&season=<year> into season-data.json

var dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });

var Team = require('../models/Team');
var User = require('../models/User');
var Game = require('../models/Game');
var Classic = require('../models/Classic');

var teamMap = {};

var summary = {
	total: {
		overall: { wins: 0, losses: 0 },
		oneRun: { wins: 0, losses: 0 },
		pickedAgainst: {},
	}
};

User.find({ "seasons": process.env.SEASON }).then((users) => {
	users.forEach((user) => {
		summary[user.username] = {
			overall: { wins: 0, losses: 0 },
			oneRun: { wins: 0, losses: 0 },
			pickedAgainst: {}
		};
	});

	Team.find({}).then((teams) => {
		teams.forEach((team) => {
			teamMap[team._id] = team.abbreviation;

			summary.total.pickedAgainst[team.abbreviation] = { wins: 0, losses: 0 };

			users.forEach((user) => {
				summary[user.username].pickedAgainst[team.abbreviation] = { wins: 0, losses: 0 };
			});
		});
	});

	Classic.find({ season: process.env.SEASON }).populate('user').populate('picks').then((classics) => {
		classics.forEach((classic) => {
			//console.log(JSON.stringify(classic, null, '  ')); process.exit();
			var username = classic.user.username;
			var totalOverallSummary = summary.total.overall;
			var userOverallSummary = summary[username].overall;
			var totalOneRunSummary = summary.total.oneRun;
			var userOneRunSummary = summary[username].oneRun;

			classic.picks.forEach((pick) => {
				if ((pick.home.team == classic.team && pick.home.score > pick.away.score) || (pick.away.team == classic.team && pick.away.score > pick.home.score)) {
					totalOverallSummary.wins++;
					userOverallSummary.wins++;
				}
				else {
					totalOverallSummary.losses++;
					userOverallSummary.losses++;
				}

				/* ---- */

				if (Math.abs(pick.away.score - pick.home.score) == 1) {
					if ((pick.home.team == classic.team && pick.home.score > pick.away.score) || (pick.away.team == classic.team && pick.away.score > pick.home.score)) {
						totalOneRunSummary.wins++;
						userOneRunSummary.wins++;
					}
					else {
						totalOneRunSummary.losses++;
						userOneRunSummary.losses++;
					}
				}

				/* ---- */

				var pickedAgainstTeam;

				if (pick.away.team == classic.team) {
					pickedAgainstTeam = teamMap[pick.home.team];
				}
				else if (pick.home.team == classic.team) {
					pickedAgainstTeam = teamMap[pick.away.team];
				}

				if ((pick.home.team == classic.team && pick.home.score > pick.away.score) || (pick.away.team == classic.team && pick.away.score > pick.home.score)) {
					summary.total.pickedAgainst[pickedAgainstTeam].wins++;
					summary[username].pickedAgainst[pickedAgainstTeam].wins++;
				}
				else {
					summary.total.pickedAgainst[pickedAgainstTeam].losses++;
					summary[username].pickedAgainst[pickedAgainstTeam].losses++;
				}
			});
		});

		console.log(JSON.stringify(summary, null, '  '));
		process.exit();
	});
});
