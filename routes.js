var schedule = require('./services/schedule');
var classics = require('./services/classics');

module.exports = function(app) {
	app.get('/', schedule.showAllForDate);
	app.get('/picks', classics.showAllForUser);
	app.get('/schedule/:date', schedule.showAllForDate);
	app.get('/schedule/:teamAbbreviation', schedule.showAllForTeam);
};
