var fs = require('fs');

var users = require('./services/users');
var schedule = require('./services/schedule');
var classics = require('./services/classics');
var teams = require('./services/teams');
var statuses = require('./services/statuses');
var notifications = require('./services/notifications');

var { requireLogin, requireAdmin, requireApiKey } = require('./auth/middleware');

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

	app.get('/login', users.loginPrompt);

	app.get('/users', requireAdmin, users.showAll);
	app.get('/users.json', requireApiKey, users.all);
	app.get('/users/add', requireAdmin, users.add);
	app.post('/users/add', requireAdmin, users.signUp);
	app.get('/users/edit/:username', requireLogin, users.edit);
	app.post('/users/edit/:username', requireLogin, users.update);

	app.get('/schedule/?', schedule.showAllForDate);
	app.get('/schedule.json', requireApiKey, schedule.allForDate);
	app.get('/schedule/:date(\\d\\d\\d\\d-\\d\\d-\\d\\d)', schedule.showAllForDate);
	app.get('/schedule/:teamAbbreviation(\\w+)', schedule.showAllForTeam);

	app.get('/picks', classics.showAllForUser);
	app.get('/picks.json', requireApiKey, classics.all);
	app.get('/picks/:teamAbbreviation([A-Z][A-Z][A-Z]?)', classics.showAllForTeam);
	app.get('/picks/:username([a-z-]+)', classics.showAllForUser);
	app.get('/picks/:username([a-z-]+).json', requireApiKey, classics.allForUser);
	app.get('/pick/:teamId/:gameId', requireLogin, classics.pick);
	app.get('/unpick/:teamId/:gameId', requireLogin, classics.unpick);
	app.get('/standings', classics.showStandings);
	app.get('/standings/:season', classics.showStandings);

	app.get('/teams', teams.showAll);

	app.get('/statuses', requireAdmin, statuses.showAll);

	app.get('/notifications', requireAdmin, notifications.showAll);
	app.get('/notifications/dismiss/:notificationId', requireLogin, notifications.dismiss);

	app.get('/report', showReport);
	app.get('/report/:season', showReport);

	app.get('/rules', function(request, response) {
		response.render('rules', { session: request.session });
	});
};

var showReport = function(request, response) {
	var season = request.params.season || process.env.SEASON;

	fs.readFile(`./data/report-${season}.json`, 'utf8', (error, data) => {
		if (error) {
			// at some point, maybe we'll have a real "no report generated yet" page (or, better yet, generate a nightly one)
			response.redirect('/');
		}
		else {
			var reportData = JSON.parse(data);

			reportData.users.sort((a, b) => stringCompare(a.displayName, b.displayName));
			reportData.teams.sort((a, b) => stringCompare(a.abbreviation, b.abbreviation));

			response.render('report', { session: request.session, reportData: reportData });
		}
	});
};
