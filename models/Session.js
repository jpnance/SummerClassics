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

sessionSchema.statics.closeActiveSession = function(request, callback) {
	if (request.cookies.sessionId) {
		this.findByIdAndUpdate(request.cookies.sessionId, { active: false, userAgent: request.headers['user-agent'], ipAddress: request.connection.remoteAddress, lastActivity: Date.now() }).populate('user').exec(function(error, session) {
			if (error) {
				callback(error);
			}
			else {
				callback(null);
			}
		});
	}
	else {
		callback(null);
	}
};

sessionSchema.statics.withActiveSession = function(request, callback) {
	if (request.cookies.sessionId) {
		this.findByIdAndUpdate(request.cookies.sessionId, { userAgent: request.headers['user-agent'], ipAddress: request.connection.remoteAddress, lastActivity: Date.now() }).populate('user').exec(function(error, session) {
			if (error) {
				callback(error, null);
			}
			else {
				callback(null, session);
			}
		});
	}
	else {
		callback(null, null);
	}
};

module.exports = mongoose.model('Session', sessionSchema);
