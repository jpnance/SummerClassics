var request = require('superagent');

var User = require('../models/User');
var Notification = require('../models/Notification');

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);

User.findOne({ username: 'jpnance' }).exec(function(error, user) {
	if (error) { console.log(error); process.exit() }

	var notification = new Notification({
		user: user._id,
		severity: 'info',
		message: 'Just a little notification.',
		link: 'http://smatterhorn.com/'
	});

	console.log(notification);

	notification.save().then(function() {
		mongoose.disconnect();
	});
});
