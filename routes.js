var fs = require('fs');

var users = require('./services/users');
var schedule = require('./services/schedule');
var classics = require('./services/classics');
var teams = require('./services/teams');
var statuses = require('./services/statuses');
var notifications = require('./services/notifications');

var Session = require('./models/Session');

var stringCompare = function(a, b) {
	if (a < b) {
		return -1;
	}
	else if (a > b) {
		return 1;
	}
	else {
		return 0;
	}
};

module.exports = function(app) {
	app.get('/', schedule.showAllForDate);

	app.get('/preview', function(request, response) {
		response.cookie('gateKey', process.env.GATE_KEY).redirect('/');
	});
	app.get('/unpreview', function(request, response) {
		response.clearCookie('gateKey').redirect('/');
	});

	app.get('/login', users.loginPrompt);

	app.get('/users', users.showAll);
	app.get('/users.json', users.all);
	app.get('/users/add', users.add);
	app.post('/users/add', users.signUp);
	app.get('/users/edit/:username', users.edit);
	app.post('/users/edit/:username', users.update);

	app.get('/schedule/?', schedule.showAllForDate);
	app.get('/schedule.json', schedule.allForDate);
	app.get('/schedule/:date(\\d\\d\\d\\d-\\d\\d-\\d\\d)', schedule.showAllForDate);
	app.get('/schedule/:teamAbbreviation(\\w+)', schedule.showAllForTeam);

	app.get('/picks', classics.showAllForUser);
	app.get('/picks.json', classics.all);
	app.get('/picks/:teamAbbreviation([A-Z][A-Z][A-Z]?)', classics.showAllForTeam);
	app.get('/picks/:username([a-z-]+)', classics.showAllForUser);
	app.get('/picks/:username([a-z-]+).json', classics.allForUser);
	app.get('/pick/:teamId/:gameId', classics.pick);
	app.get('/unpick/:teamId/:gameId', classics.unpick);
	app.get('/standings', classics.showStandings);
	app.get('/standings/:season', classics.showStandings);

	app.get('/teams', teams.showAll);

	app.get('/statuses', statuses.showAll);

	app.get('/notifications', notifications.showAll);
	app.get('/notifications/dismiss/:notificationId', notifications.dismiss);

	app.get('/report', showReport);
	app.get('/report/:season', showReport);

	app.get('/rules', function(request, response) {
		Session.withActiveSession(request, function(error, session) {
			response.render('rules', { session: session });
		});
	});
};

var showReport = function(request, response) {
	var season = request.params.season || process.env.SEASON;

	fs.readFile(`./data/report-${season}.json`, 'utf8', (error, data) => {
		var reportData = JSON.parse(data);

		reportData.users.sort((a, b) => stringCompare(a.displayName, b.displayName));
		reportData.teams.sort((a, b) => stringCompare(a.abbreviation, b.abbreviation));

		Session.withActiveSession(request, function(error, session) {
			response.render('report', { session: session, reportData: reportData });
		});
	});
};
