var dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

var Notification = require('../models/Notification');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);

Notification.deleteMany({}).then(function() {
	mongoose.disconnect();
}).catch(function(error) {
	console.error(error);
	process.exit();
});
