var schedule = require('./services/schedule');

module.exports = function(app) {
	app.get('/', schedule.showAllForDate);
	app.get('/schedule/:date', schedule.showAllForDate);
	app.get('/schedule/:teamAbbreviation', schedule.showAllForTeam);
};
