var users = require('./services/users');
var sessions = require('./services/sessions');
var schedule = require('./services/schedule');
var classics = require('./services/classics');
var teams = require('./services/teams');
var statuses = require('./services/statuses');
var notifications = require('./services/notifications');

module.exports = function(app) {
	app.get('/', schedule.showAllForDate);

	app.get('/preview', function(request, response) {
		response.cookie('preview', 'yep').redirect('/');
	});
	app.get('/unpreview', function(request, response) {
		response.clearCookie('preview').redirect('/');
	});

	app.get('/login', users.loginPrompt);
	app.post('/login', sessions.logIn);
	app.get('/logout', sessions.logOut);

	app.get('/users', users.showAll);
	app.get('/users/add', users.add);
	app.post('/users/add', users.signUp);
	app.get('/users/edit/:username', users.edit);
	app.post('/users/edit/:username', users.update);

	app.get('/schedule/?', schedule.showAllForDate);
	app.get('/schedule/:date(\\d\\d\\d\\d-\\d\\d-\\d\\d)', schedule.showAllForDate);
	app.get('/schedule/:teamAbbreviation(\\w+)', schedule.showAllForTeam);

	app.get('/picks', classics.showAllForUser);
	app.get('/picks/:username', classics.showAllForUser);
	app.get('/pick/:teamId/:gameId', classics.pick);
	app.get('/unpick/:teamId/:gameId', classics.unpick);
	app.get('/standings', classics.showStandings);

	app.get('/teams', teams.showAll);

	app.get('/statuses', statuses.showAll);

	app.get('/notifications', notifications.showAll);
};
