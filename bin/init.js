var dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

var crypto = require('crypto');

var User = require('../models/User');
var Classic = require('../models/Classic');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);

console.log(process.env.ADMIN_USERNAME);

User.findOne({ username: process.env.ADMIN_USERNAME }).then(function(user) {
	if (!user) {
		user = new User({
			username: process.env.ADMIN_USERNAME,
			firstName: process.env.ADMIN_FIRST_NAME,
			lastName: process.env.ADMIN_LAST_NAME,
			displayName: process.env.ADMIN_DISPLAY_NAME,
			seasons: [ process.env.SEASON ],
			admin: true
		});
	}

	user.save(function(error) {
		if (error) {
			console.log(error);
		}

		Classic.initialize(user, process.env.SEASON).then(function() {
			mongoose.disconnect();
		});
	});
});
