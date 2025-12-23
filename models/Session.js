var apiRequest = require('superagent');

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var User = require('../models/User');

var sessionSchema = new Schema({
	_id: { type: String, required: true },
	username: { type: String, required: true },
	active: { type: Boolean, required: true, default: true },
	userAgent: { type: String },
	ipAddress: { type: String },
	lastActivity: { type: Date, required: true }
});

sessionSchema.virtual('user', {
	ref: 'User',
	localField: 'username',
	foreignField: 'username',
	justOne: true
});

sessionSchema.statics.withActiveSession = function(request, callback) {
	if (request.cookies.sessionKey) {
		apiRequest
			.post(process.env.LOGIN_SERVICE_INTERNAL + '/sessions/retrieve')
			.send({ key: request.cookies.sessionKey })
			.then(response => {
				User.findOne({
					username: response.body.user.username
				}).populate({
					path: 'notifications',
					match: { read: false },
					populate: {
						path: 'game classic',
						populate: {
							path: 'team home.team away.team'
						}
					}
				}).then(function(user) {
					callback(null, { username: user.username, user: user });
				});
			})
			.catch(error => {
				callback(error, null);
			});
	}
	else {
		callback(null, null);
	}
};

module.exports = mongoose.model('Session', sessionSchema);
