var users = require('./services/users');
var sessions = require('./services/sessions');
var schedule = require('./services/schedule');
var classics = require('./services/classics');

module.exports = function(app) {
	app.get('/', schedule.showAllForDate);

	app.get('/login', users.loginPrompt);
	app.post('/login', sessions.logIn);
	app.get('/logout', sessions.logOut);

	app.get('/users', users.showAll);
	app.get('/users/add', users.add);
	app.post('/users/add', users.signUp);
	app.get('/users/edit/:username', users.edit);
	app.post('/users/edit/:username', users.update);

	app.get('/schedule/?', schedule.showAllForDate);
	app.get('/schedule/:date', schedule.showAllForDate);
	app.get('/schedule/:teamAbbreviation', schedule.showAllForTeam);

	app.get('/picks', classics.showAllForUser);
	app.get('/pick/:teamId/:gameId', classics.pick);
};
