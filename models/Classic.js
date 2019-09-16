var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Team = require('../models/Team');
var Game = require('../models/Game');
var Notification = require('../models/Notification');

var classicSchema = new Schema({
	season: { type: Number, required: true, default: process.env.SEASON },
	user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
	team: { type: Number, ref: 'Team', required: true },
	picks: [{ type: Number, ref: 'Game', default: [] }],
	score: {
		potential: {
			best: { type: Number, required: function() {
				return this.record.wins < 4 && this.record.losses < 4;
			}, default: 16 },
			worst: { type: Number, required: function() {
				return this.record.wins < 4 && this.record.losses < 4;
			}, default: -16 },
		},
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
	if (this.populated('picks')) {
		this.picks = this.picks.filter(function(game) {
			return game._id != gameId;
		});
	}
	else {
		if (this.picks.indexOf(gameId) == -1) {
			return;
		}

		this.picks.splice(this.picks.indexOf(gameId), 1);
	}
};

classicSchema.methods.scoreAndResolve = function(finalize) {
	var classic = this;
	var wasAlreadyFinal = classic.isFinal();

	return new Promise(function(resolve, reject) {
		classic.record = { wins: 0, losses: 0 };
		classic.score = {
			potential: { best: 16, worst: -16 },
			final: 0
		};

		var postponedGames = [];
		var unnecessaryGames = [];
		var notificationPromises = [];

		classic.picks.forEach(function(game) {
			if (game.hasBeenPostponed()) {
				postponedGames.push(game);
			}
			if (game.isFinal()) {
				if ((game.away.team == classic.team && game.away.winner) || (game.home.team == classic.team && game.home.winner)) {
					classic.record.wins++;
				}
				else if ((game.away.team == classic.team && !game.away.winner) || (game.home.team == classic.team && !game.home.winner)) {
					classic.record.losses++;
				}
			}
		});

		postponedGames.forEach(function(game) {
			notificationPromises.push(Notification.create({
				user: classic.user,
				type: 'postponement',
				game: game._id,
				originalStartTime: game.startTime,
				classic: classic._id
			}));

			classic.unpick(game._id);
		});

		if (classic.isFinal() && !wasAlreadyFinal) {
			if (classic.record.wins == 4) {
				notificationPromises.push(Notification.create({
					user: classic.user,
					type: 'classic-win',
					classic: classic._id
				}));
			}
			else if (classic.record.losses == 4) {
				notificationPromises.push(Notification.create({
					user: classic.user,
					type: 'classic-loss',
					classic: classic._id
				}));
			}
		}

		if (classic.isFinal()) {
			classic.picks.forEach(function(game) {
				if (!game.isFinal()) {
					notificationPromises.push(Notification.create({
						user: classic.user,
						type: 'unnecessary',
						game: game._id,
						classic: classic._id
					}));

					unnecessaryGames.push(game);
				}
			});

			unnecessaryGames.forEach(function(game) {
				classic.unpick(game._id);
			});
		}

		if (classic.record.wins == 4 || classic.record.losses == 4) {
			switch (classic.record.wins - classic.record.losses) {
				case 4:
					classic.score.final = 16;
					break;

				case 3:
					classic.score.final = 10;
					break;

				case 2:
					classic.score.final = 7;
					break;

				case 1:
					classic.score.final = 4;
					break;

				case -1:
					classic.score.final = -4;
					break;

				case -2:
					classic.score.final = -7;
					break;

				case -3:
					classic.score.final = -10;
					break;

				case -4:
					classic.score.final = -16;
					break;
			}

			classic.score.potential = { best: classic.score.final, worst: classic.score.final };
		}
		else {
			if (finalize) {
				classic.score.final = -1000;
				classic.score.potential = { best: -1000, worst: -1000 };
			}
			else {
				classic.score.potential = { best: 0, worst: 0 };

				switch (classic.record.wins) {
					case 0:
						classic.score.potential.worst = -16;
						break;

					case 1:
						classic.score.potential.worst = -10;
						break;

					case 2:
						classic.score.potential.worst = -7;
						break;

					case 3:
						classic.score.potential.worst = -4;
						break;
				}

				switch (classic.record.losses) {
					case 0:
						classic.score.potential.best = 16;
						break;

					case 1:
						classic.score.potential.best = 10;
						break;

					case 2:
						classic.score.potential.best = 7;
						break;

					case 3:
						classic.score.potential.best = 4;
						break;
				}
			}
		}

		Promise.all(notificationPromises).then(function() {
			resolve('notified');
		});
	});
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
				classicPromises.push(Classic.updateOne({ season: process.env.SEASON, user: user._id, team: team._id }, {}, { upsert: true }));
			});

			Promise.all(classicPromises).then(function() {
				resolve('done');
			});
		});
	});
};

classicSchema.statics.standingsSort = function(a, b) {
	if (a.score.final > b.score.final) {
		return -1;
	}
	else if (b.score.final > a.score.final) {
		return 1;
	}
	else {
		if (a.score.potential.minimum > b.score.potential.minimum) {
			return -1;
		}
		else if (b.score.potential.minimum > a.score.potential.minimum) {
			return 1;
		}
		else {
			if (a.score.potential.maximum > b.score.potential.maximum) {
				return -1;
			}
			else if (b.score.potential.maximum > a.score.potential.maximum) {
				return 1;
			}
			else {
				if (a.record.winningPercentage > b.record.winningPercentage) {
					return -1;
				}
				else if (b.record.winningPercentage > a.record.winningPercentage) {
					return 1;
				}
				else {
					if (a.user.displayName < b.user.displayName) {
						return -1;
					}
					else if (b.user.displayName < a.user.displayName) {
						return 1;
					}
					else {
						return 0;
					}
				}
			}
		}
	}
};

classicSchema.statics.populatedPicksStartTimeSort = function(a, b) {
	if (a.startTime < b.startTime) {
		return -1;
	}
	else if (b.startTime < a.startTime) {
		return 1;
	}
	else {
		return 0;
	}
};

classicSchema.statics.populatedUserDisplayNameSort = function(a, b) {
	if (a.user.displayName < b.user.displayName) {
		return -1;
	}
	else if (b.user.displayName < a.user.displayName) {
		return 1;
	}
	else {
		return 0;
	}
};

module.exports = mongoose.model('Classic', classicSchema);
