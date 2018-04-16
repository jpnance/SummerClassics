var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var statusSchema = new Schema({
	_id: { type: String, required: true },
	abstractGameState: { type: String, required: true },
	codedGameState: { type: String, required: true },
	detailedState: { type: String, required: true },
	statusCode: { type: String, required: true },
	startTimeTBD: { type: Boolean },
	abstractGameCode: { type: String, required: true },
	reason: { type: String },
	example: { type: Number, ref: 'Game', required: true }
}, { collection: 'statuses' });

module.exports = mongoose.model('Status', statusSchema);
