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
	var pastStartTime = false;

	if (this.startTime && Date.now() >= this.startTime) {
		pastStartTime = true;
	}

	return !this.isDelayed() && pastStartTime;
};

gameSchema.methods.isDelayed = function() {
	return this.status && (this.status == 'PR' || this.status == 'PI');
};

gameSchema.methods.isActuallyHappening = function() {
	return this.hasStarted() && this.inning.number;
};

gameSchema.methods.isCool = function(hours) {
	var later = new Date(this.startTime);
	later.setMinutes(later.getMinutes() + 210);

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

gameSchema.methods.syncWithApi = function() {
	var thisGame = this;

	return new Promise(function(resolve, reject) {
		var request = require('superagent');

		var Status = require('../models/Status');

		request.get('https://statsapi.mlb.com/api/v1.1/game/' + thisGame._id + '/feed/live', function(error, response) {
			var playerPromises = [];

			var data = JSON.parse(response.text);

			if (!data.liveData || !data.liveData.linescore || !data.liveData.linescore.teams) {
				resolve('fine');
				return;
			}

			if (data.gameData.probablePitchers) {
				var pitcherIds = [];

				if (data.gameData.probablePitchers.away) {
					thisGame.away.probablePitcher = data.gameData.probablePitchers.away.id;
					pitcherIds.push(data.gameData.probablePitchers.away.id);
				}
				if (data.gameData.probablePitchers.home) {
					thisGame.home.probablePitcher = data.gameData.probablePitchers.home.id;
					pitcherIds.push(data.gameData.probablePitchers.home.id);
				}

				pitcherIds.forEach(function(pitcherId) {
					playerPromises.push(new Promise(function(resolve2, reject2) {
						request.get('https://statsapi.mlb.com/api/v1/people/' + pitcherId, function(error, response) {
							var playerData = JSON.parse(response.text);
							var player = playerData.people[0];

							var newPlayer = {
								number: player.primaryNumber,
								name: player.fullName,
								position: player.primaryPosition.abbreviation,
								bats: player.batSide.code,
								throws: player.pitchHand.code
							};

							Player.findByIdAndUpdate(player.id, newPlayer, { upsert: true }).then(function() {
								resolve2('good');
							});
						});
					}));
				});
			}

			thisGame.status = data.gameData.status.statusCode;

			playerPromises.push(Status.update(data.gameData.status, { '$set': { example: thisGame._id } }, { upsert: true }));

			if (thisGame.status == 'I' || thisGame.status == 'MA' || thisGame.status == 'MF' || thisGame.status == 'O' || thisGame.status == 'F') {
				thisGame.away.score = data.liveData.linescore.teams.away.runs;
				thisGame.home.score = data.liveData.linescore.teams.home.runs;

				thisGame.inning.number = data.liveData.linescore.currentInning;
				thisGame.inning.ordinal = data.liveData.linescore.currentInningOrdinal;
				thisGame.inning.state = data.liveData.linescore.inningState;
				thisGame.inning.half = data.liveData.linescore.inningHalf;
			}

			if (thisGame.status == 'F') {
				if (thisGame.away.score > thisGame.home.score) {
					thisGame.away.winner = true;
					thisGame.home.winner = false;
				}
				else if (thisGame.home.score > thisGame.away.score) {
					thisGame.home.winner = true;
					thisGame.away.winner = false;
				}
			}

			Promise.all(playerPromises).then(function() {
				thisGame.save(function(error) {
					if (!error) {
						resolve('good');
					}
				});
			});
		});
	});
};

gameSchema.statics.progressSortWithPopulatedTeams = function(a, b) {
	if (a.isFinalAndCool() && !b.isFinalAndCool()) {
		return 1;
	}
	else if (!a.isFinalAndCool() && b.isFinalAndCool()) {
		return -1;
	}
	else {
		if (a.startTime < b.startTime) {
			return -1;
		}
		else if (a.startTime > b.startTime) {
			return 1;
		}
		else {
			if (a.away.team.teamName < b.away.team.teamName) {
				return -1;
			}
			else if (a.away.team.teamName > b.away.team.teamName) {
				return 1;
			}
			else {
				return 0;
			}
		}
	}
};

module.exports = mongoose.model('Game', gameSchema);
