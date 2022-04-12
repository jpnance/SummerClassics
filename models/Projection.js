var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var projectionSchema = new Schema({
	_id: { type: Number, required: true, default: process.env.SEASON },
	data: { type: Array, required: true }
});

module.exports = mongoose.model('Projection', projectionSchema);
