var schedule = require('./services/schedule');

module.exports = function(app) {
	app.get('/', schedule.showAll);
};
