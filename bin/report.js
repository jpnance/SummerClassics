// begin by fetching https://classics.coinflipper.org/picks.json?apiKey=<API key>&season=<year> into season-data.json

var dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });

var Team = require('../models/Team');
var User = require('../models/User');
var Game = require('../models/Game');
var Classic = require('../models/Classic');

var report = {
	users: [],
	teams: [],
	teamMap: {},
	total: {
		overall: { wins: 0, losses: 0 },
		oneRun: { wins: 0, losses: 0 },
		pickedAgainst: {},
	}
};

User.find({ "seasons": process.env.SEASON }).then((users) => {
	users.forEach((user) => {
		report.users.push({ username: user.username, displayName: user.displayName });

		report[user.username] = {
			overall: { wins: 0, losses: 0 },
			oneRun: { wins: 0, losses: 0 },
			pickedAgainst: {}
		};
	});

	Team.find({}).then((teams) => {
		teams.forEach((team) => {
			report.teams.push({ _id: team._id, abbreviation: team.abbreviation, teamName: team.teamName });

			report.teamMap[team._id] = team.abbreviation;

			report.total.pickedAgainst[team.abbreviation] = { wins: 0, losses: 0 };

			users.forEach((user) => {
				report[user.username].pickedAgainst[team.abbreviation] = { wins: 0, losses: 0 };
			});
		});
	});

	Classic.find({ season: process.env.SEASON }).populate('user').populate('picks').then((classics) => {
		classics.forEach((classic) => {
			//console.log(JSON.stringify(classic, null, '  ')); process.exit();
			var username = classic.user.username;
			var totalOverallSummary = report.total.overall;
			var userOverallSummary = report[username].overall;
			var totalOneRunSummary = report.total.oneRun;
			var userOneRunSummary = report[username].oneRun;

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
					pickedAgainstTeam = report.teamMap[pick.home.team];
				}
				else if (pick.home.team == classic.team) {
					pickedAgainstTeam = report.teamMap[pick.away.team];
				}

				if ((pick.home.team == classic.team && pick.home.score > pick.away.score) || (pick.away.team == classic.team && pick.away.score > pick.home.score)) {
					report.total.pickedAgainst[pickedAgainstTeam].wins++;
					report[username].pickedAgainst[pickedAgainstTeam].wins++;
				}
				else {
					report.total.pickedAgainst[pickedAgainstTeam].losses++;
					report[username].pickedAgainst[pickedAgainstTeam].losses++;
				}
			});
		});

		console.log(JSON.stringify(report, null, '  '));
		process.exit();
	});
});
