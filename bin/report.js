// begin by fetching https://classics.coinflipper.org/picks.json?apiKey=<API key>&season=<year> into season-data.json

var fs = require('fs');

var dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);

var Team = require('../models/Team');
var User = require('../models/User');
var Game = require('../models/Game');
var Classic = require('../models/Classic');

var report = {
	users: [],
	teams: [],
	monthMap: {
		3: 'March',
		4: 'April',
		5: 'May',
		6: 'June',
		7: 'July',
		8: 'August',
		9: 'September',
		10: 'October'
	},
	teamMap: {},
	total: {
		overall: { wins: 0, losses: 0 },
		oneRun: { wins: 0, losses: 0 },
		withHome: { wins: 0, losses: 0 },
		withAway: { wins: 0, losses: 0 },
		pickedAgainst: {},
		months: {
			3: { wins: 0, losses: 0 },
			4: { wins: 0, losses: 0 },
			5: { wins: 0, losses: 0 },
			6: { wins: 0, losses: 0 },
			7: { wins: 0, losses: 0 },
			8: { wins: 0, losses: 0 },
			9: { wins: 0, losses: 0 },
			10: { wins: 0, losses: 0 }
		},
		pickDates: []
	}
};

User.find({ "seasons": process.env.SEASON }).then((users) => {
	users.forEach((user) => {
		report.users.push({ username: user.username, displayName: user.displayName });

		report[user.username] = {
			overall: { wins: 0, losses: 0 },
			oneRun: { wins: 0, losses: 0 },
			withHome: { wins: 0, losses: 0 },
			withAway: { wins: 0, losses: 0 },
			pickedAgainst: {},
			months: {
				3: { wins: 0, losses: 0 },
				4: { wins: 0, losses: 0 },
				5: { wins: 0, losses: 0 },
				6: { wins: 0, losses: 0 },
				7: { wins: 0, losses: 0 },
				8: { wins: 0, losses: 0 },
				9: { wins: 0, losses: 0 },
				10: { wins: 0, losses: 0 }
			},
			pickDates: []
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
			var totalWithHomeSummary = report.total.withHome;
			var userWithHomeSummary = report[username].withHome;
			var totalWithAwaySummary = report.total.withAway;
			var userWithAwaySummary = report[username].withAway;
			var totalOneRunSummary = report.total.oneRun;
			var userOneRunSummary = report[username].oneRun;

			classic.picks.forEach((pick) => {
				if (pick.status.abstractGameCode != 'F') {
					return;
				}

				/* ---- */

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

				if (pick.home.team == classic.team) {
					if (pick.home.score > pick.away.score) {
						totalWithHomeSummary.wins++;
						userWithHomeSummary.wins++;
					}
					else if (pick.away.score > pick.home.score) {
						totalWithHomeSummary.losses++;
						userWithHomeSummary.losses++;
					}
				}
				else if (pick.away.team == classic.team) {
					if (pick.away.score > pick.home.score) {
						totalWithAwaySummary.wins++;
						userWithAwaySummary.wins++;
					}
					else if (pick.home.score > pick.away.score) {
						totalWithAwaySummary.losses++;
						userWithAwaySummary.losses++;
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

				/* ---- */

				var monthIndex = (new Date(pick.date + 'T12:00:00-07:00')).getMonth() + 1;

				if ((pick.home.team == classic.team && pick.home.score > pick.away.score) || (pick.away.team == classic.team && pick.away.score > pick.home.score)) {
					report.total.months[monthIndex].wins++;
					report[username].months[monthIndex].wins++;
				}
				else {
					report.total.months[monthIndex].losses++;
					report[username].months[monthIndex].losses++;
				}

				/* ---- */

				if (!report.total.pickDates.includes(pick.date)) {
					report.total.pickDates.push(pick.date);
				}

				if (!report[username].pickDates.includes(pick.date)) {
					report[username].pickDates.push(pick.date);
				}
			});
		});

		fs.writeFileSync(`../data/report-${process.env.SEASON}.json`, JSON.stringify(report), (error) => {
			console.log(error);
		});

		process.exit();
	});
});
