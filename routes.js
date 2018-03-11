var schedule = require('./services/schedule');

module.exports = function(app) {
	app.get('/', schedule.showAll);
	app.get('/schedule/:teamAbbreviation', schedule.showAllForTeam);
};
