var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Team = require('../models/Team');
var Game = require('../models/Game');

var classicSchema = new Schema({
	season: { type: Number, required: true, default: (new Date()).getFullYear() },
	user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	team: { type: Number, ref: 'Team', required: true },
	picks: [{ type: Number, ref: 'Game', default: [] }],
	score: {
		potential: { type: Number, required: function() {
			return this.record.wins < 4 && this.record.losses < 4;
		}, default: 16 },
		final: { type: Number, required: function() {
			return this.record.wins == 4 || this.record.losses == 4;
		}}
	},
	record: {
		wins: { type: Number, required: true, default: 0, min: 0, max: 4 },
		losses: { type: Number, required: true, default: 0, min: 0, max: 4 }
	}
});

classicSchema.methods.isFinal = function() {
	return this.record.wins == 4 || this.record.losses == 4;
};

classicSchema.methods.pick = function(gameId) {
	if (this.picks.indexOf(gameId) > -1) {
		return;
	}

	this.picks.push(gameId);
};

classicSchema.methods.unpick = function(gameId) {
	if (this.picks.indexOf(gameId) == -1) {
		return;
	}

	this.picks.splice(this.picks.indexOf(gameId), 1);
};

classicSchema.statics.initialize = function(user, season) {
	return new Promise(function(resolve, reject) {
		var dataPromises = [
			Team.find()
		];

		Promise.all(dataPromises).then(function(values) {
			var teams = values[0];

			var Classic = mongoose.model('Classic');
			var classicPromises = [];

			teams.forEach(function(team) {
				var classic = new Classic({ season: process.env.SEASON, user: user._id, team: team._id });

				classicPromises.push(classic.save());
			});

			Promise.all(classicPromises).then(function() {
				resolve('done');
			});
		});
	});
};

module.exports = mongoose.model('Classic', classicSchema);
