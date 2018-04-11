var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var notificationSchema = new Schema({
	dateTime: { type: Date, required: true, default: Date.now() },
	user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	type: { type: String, required: true, default: 'info' },
	game: {
		type: Number,
		ref: 'Game',
		required: function() {
			return ['postponement', 'unnecessary'].includes(this.type);
		}
	},
	originalStartTime: {
		type: Date,
		required: function() {
			return ['postponement'].includes(this.type);
		}
	},
	classic: {
		type: Schema.Types.ObjectId,
		ref: 'Classic',
		required: function() {
			return ['classic-win', 'classic-loss', 'postponement', 'unnecessary'].includes(this.type);
		}
	},
	read: { type: Boolean, default: false }
});

module.exports = mongoose.model('Notification', notificationSchema);
