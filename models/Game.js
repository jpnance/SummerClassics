var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Team = require('../models/Team');
var Player = require('../models/Player');

var gameSchema = new Schema({
	_id: { type: Number },
	startTime: { type: Date },
	away: {
		team: { type: Number, ref: 'Team', required: true },
		probablePitcher: { type: Number, ref: 'Player' },
		score: { type: Number, default: 0 },
		winner: { type: Boolean }
	},
	home: {
		team: { type: Number, ref: 'Team', required: true },
		probablePitcher: { type: Number, ref: 'Player' },
		score: { type: Number, default: 0 },
		winner: { type: Boolean }
	},
	status: { type: String, required: true },
	inning: {
		number: { type: Number },
		ordinal: { type: String },
		state: { type: String },
		half: { type: String }
	}
});

gameSchema.methods.hasStarted = function() {
	var rainDelayed = false;
	var pastStartTime = false;

	if (this.status && this.status == 'PR') {
		rainDelayed = true;
	}

	if (this.startTime && Date.now() >= this.startTime) {
		pastStartTime = true;
	}

	return !rainDelayed && pastStartTime;
};

gameSchema.methods.isCool = function(hours) {
	var later = new Date(this.startTime);
	later.setHours(later.getHours() + 6);

	return Date.now() >= later;
};

gameSchema.methods.isFinal = function() {
	return this.status == 'F';
};

gameSchema.methods.isFinalAndCool = function() {
	return this.isFinal() && this.isCool();
};

gameSchema.methods.isOver = function() {
	return this.status == 'O' || this.status == 'F';
};

module.exports = mongoose.model('Game', gameSchema);
