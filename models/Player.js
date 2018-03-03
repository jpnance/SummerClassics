var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerSchema = new Schema({
	_id: { type: Number },
	team: { type: Number, ref: 'Team', required: true },
	name: { type: String, required: true },
	number: { type: Number, required: true },
	position: { type: String, required: true },
	bats: { type: String, required: true },
	throws: { type: String, required: true }
});

module.exports = mongoose.model('Player', playerSchema);
