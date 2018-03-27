var crypto = require('crypto');

var User = require('../models/User');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);

var user = new User({
	username: process.env.ADMIN_USERNAME,
	password: crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD).digest('hex'),
	firstName: process.env.ADMIN_FIRST_NAME,
	lastName: process.env.ADMIN_LAST_NAME,
	displayName: process.env.ADMIN_DISPLAY_NAME,
	seasons: [ process.env.SEASON ],
	admin: true
});

user.save(function(error) {
	if (error) {
		console.log(error);
	}

	mongoose.disconnect();
});
