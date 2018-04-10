var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var notificationSchema = new Schema({
	dateTime: { type: Date, required: true, default: Date.now() },
	user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	severity: { type: String, required: true, default: 'info' },
	message: { type: String, required: true },
	link: { type: String },
	read: { type: Boolean, default: false }
});

module.exports = mongoose.model('Notification', notificationSchema);
