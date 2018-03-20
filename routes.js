var schedule = require('./services/schedule');
var classics = require('./services/classics');

module.exports = function(app) {
	app.get('/', schedule.showAllForDate);
	app.get('/picks', classics.showAllForUser);
	app.get('/pick/:teamId/:gameId', classics.pick);
	app.get('/schedule/:date', schedule.showAllForDate);
	app.get('/schedule/:teamAbbreviation', schedule.showAllForTeam);
};
