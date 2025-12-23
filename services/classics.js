var Session = require('../models/Session');
var User = require('../models/User');
var Game = require('../models/Game');
var Team = require('../models/Team');
var Classic = require('../models/Classic');
var Projection = require('../models/Projection');

module.exports.showAllForUser = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		var verifyUser = new Promise(function(resolve, reject) {
			if (!request.params.username) {
				if (session) {
					resolve(session.user);
				}
				else {
					reject({ error: 'not querying for anything' });
				}
			}
			else {
				User.findOne({ username: request.params.username }).select('username firstName lastName').then(function(user) {
					resolve(user);
				}).catch(function(error) {
					reject({ error: 'who' });
				});
			}
		});

		verifyUser.then(function(user) {
			var data = [
				Team.find().sort('teamName'),
				Classic.find({ user: user._id, season: process.env.SEASON }).populate('team').populate({ path: 'picks', populate: { path: 'away.team home.team' } })
			];

			Promise.all(data).then(function(values) {
				var teams = values[0];
				var classics = values[1];

				teams.forEach(function(team) {
					classics.forEach(function(classic) {
						if (classic.team.abbreviation == team.abbreviation) {
							team.classic = classic;
							return;
						}
					});
				});

				classics.forEach(function(classic) {
					classic.picks.forEach(function(pick) {
						if (pick.away.team._id == classic.team._id) {
							pick.opponent = pick.home;
						}
						else if (pick.home.team._id == classic.team._id) {
							pick.opponent = pick.away;
						}
					});

					if (!session || session.username != user.username) {
						classic.picks = classic.picks.filter(function(game) {
							return game.hasDefinitelyStarted();
						});
					}

					classic.picks.sort(Classic.populatedPicksStartTimeSort);
				});

				response.render('classics/user', { session: session, teams: teams, user: user });
			});
		}).catch(function(error) {
			response.send(error);
		});
	});
};

module.exports.showAllForTeam = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		Team.findOne({ abbreviation: request.params.teamAbbreviation }, function(error, team) {
			if (error) {
				response.sendStatus(500);
				return;
			}

			if (!team) {
				response.sendStatus(404);
				return;
			}

			var dataPromises = [
				Classic.find({ season: process.env.SEASON, team: team._id }).populate('team').populate({ path: 'picks', populate: { path: 'away.team home.team' } }),
				User.find({ seasons: process.env.SEASON }).select('displayName username').sort('displayName')
			];

			Promise.all(dataPromises).then(function(values) {
				var classics = values[0];
				var users = values[1];

				var processedUsers = [];

				users.forEach(function(user) {
					var processedUser = { displayName: user.displayName, username: user.username };

					classics.forEach(function(classic) {
						if (classic.user.toString() == user._id.toString()) {
							processedUser.classic = classic;

							classic.picks.forEach(function(pick) {
								if (pick.away.team._id == classic.team._id) {
									pick.opponent = pick.home;
								}
								else if (pick.home.team._id == classic.team._id) {
									pick.opponent = pick.away;
								}
							});

							if (!session || session.user._id.toString() != user._id.toString()) {
								classic.picks = classic.picks.filter(function(game) {
									return game.hasDefinitelyStarted();
								});
							}

							classic.picks.sort(Classic.populatedPicksStartTimeSort);
						}
					});

					processedUsers.push(processedUser);
				});

				response.render('classics/team', { session: session, users: processedUsers, team: team });
			});
		});
	});
};

module.exports.showStandings = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		var season = request.params.season || process.env.SEASON;
		console.log(season);

		var dataPromises = [
			Classic.find({ season: season }).populate('user'),
			User.find({ seasons: season }).select('displayName username').sort('displayName'),
			Projection.findById(season)
		];

		Promise.all(dataPromises).then(function(values) {
			var classics = values[0];
			var users = values[1];
			var projection = values[2];

			var standingsMap = {};
			var standings = [];

			classics.forEach(function(classic) {
				if (!standingsMap[classic.user.username]) {
					standingsMap[classic.user.username] = {
						user: classic.user,
						record: {
							wins: 0,
							losses: 0,
							winningPercentage: null
						},
						score: {
							final: 0,
							potential: {
								maximum: 0,
								minimum: 0
							}
						},
						progress: {
							wins: 0,
							losses: 0,
							open: 0
						}
					};
				}

				standingsMap[classic.user.username].record.wins += classic.record.wins;
				standingsMap[classic.user.username].record.losses += classic.record.losses;

				if (standingsMap[classic.user.username].record.wins + standingsMap[classic.user.username].record.losses > 0) {
					standingsMap[classic.user.username].record.winningPercentage = standingsMap[classic.user.username].record.wins / (standingsMap[classic.user.username].record.wins + standingsMap[classic.user.username].record.losses);
				}

				if (classic.score.potential) {
					standingsMap[classic.user.username].score.potential.maximum += classic.score.potential.best;
					standingsMap[classic.user.username].score.potential.minimum += classic.score.potential.worst;
				}

				if (classic.score.final) {
					standingsMap[classic.user.username].score.final += classic.score.final;

					if (classic.record.wins == 4) {
						standingsMap[classic.user.username].progress.wins += (4 / 120) * 100;
					}
					else if (classic.record.losses == 4) {
						standingsMap[classic.user.username].progress.losses += (4 / 120) * 100;
					}
				}
				else {
					standingsMap[classic.user.username].progress.open += (Math.max(classic.record.wins, classic.record.losses) / 120) * 100;
				}
			});

			users.forEach(function(user) {
				if (!standingsMap[user.username].projections) {
					standingsMap[user.username].projections = [];
				}

				if (!projection || !projection.data) {
					return;
				}

				var projectionsUserIndex = projection.data[0].indexOf(user.displayName);

				projection.data.forEach(function(projection, i) {
					if (i == 0) {
						return;
					}

					standingsMap[user.username].projections.push(projection[projectionsUserIndex]);
				});
			});

			Object.keys(standingsMap).forEach(function(key) {
				standings.push(standingsMap[key]);
			});

			standings = standings.sort(Classic.standingsSort);

			response.render('standings', { session: session, standings: standings });
		});
	});
};

module.exports.pick = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		var data = [
			Classic.findOne({ season: process.env.SEASON, user: session.user._id, team: request.params.teamId }),
			Classic.findOne({ season: process.env.SEASON, user: session.user._id, team: { '$ne': request.params.teamId }, picks: request.params.gameId }),
			Game.findById(request.params.gameId)
		];

		Promise.all(data).then(function(values) {
			var classic = values[0];
			var classicCollision = values[1];
			var game = values[2];

			var verificationPromises = [];

			if (game.hasPotentiallyStarted() && !game.hasDefinitelyStarted()) {
				verificationPromises.push(game.syncWithApi());
			}

			Promise.all(verificationPromises).then(function(values) {
				if (values.length > 0) {
					game = values[0];
				}

				var classicPromises = [];

				if (game.hasDefinitelyStarted() || game.hasBeenPostponed() || game.hasBeenCanceled()) {
					response.sendStatus(500);
					return;
				}

				if (game.away.team != request.params.teamId && game.home.team != request.params.teamId) {
					response.sendStatus(500);
					return;
				}

				if (!classic) {
					classic = new Classic({ season: process.env.SEASON, user: session.user._id, team: request.params.teamId });
				}

				if (classicCollision) {
					classicCollision.unpick(game._id);
					classicPromises.push(classicCollision.save());
				}

				Promise.all(classicPromises).then(function() {
					if (classic.isFinal()) {
						response.sendStatus(500);
						return;
					}
					else if (classic.picks.length >= 7) {
						response.sendStatus(500);
						return;
					}
					else {
						classic.pick(game._id);
						classicPromises.push(classic.save());
					}

					Promise.all(classicPromises).then(function() {
						response.send({
							success: true,
							gameId: game._id,
							teamId: classic.team
						});
					});
				});
			}).catch(function(error) {
				response.send(error);
				return;
			});
		});
	});
};

module.exports.unpick = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		var data = [
			Classic.findOne({ season: process.env.SEASON, user: session.user._id, team: request.params.teamId }),
			Game.findById(request.params.gameId)
		];

		Promise.all(data).then(function(values) {
			var classic = values[0];
			var game = values[1];

			var verificationPromises = [];

			if (game.hasPotentiallyStarted() && !game.hasDefinitelyStarted()) {
				verificationPromises.push(game.syncWithApi());
			}

			Promise.all(verificationPromises).then(function(values) {
				if (values.length > 0) {
					game = values[0];
				}

				var classicPromises = [];

				if (game.hasDefinitelyStarted()) {
					response.sendStatus(500);
					return;
				}

				if (game.away.team != request.params.teamId && game.home.team != request.params.teamId) {
					response.sendStatus(500);
					return;
				}

				if (!classic) {
					response.redirect('/picks');
				}

				if (classic.isFinal()) {
					response.sendStatus(500);
					return;
				}

				classic.unpick(game._id);
				classicPromises.push(classic.save());

				Promise.all(classicPromises).then(function() {
					response.send({
						success: true,
						gameId: game._id
					});
				});
			}).catch(function(error) {
				response.send(error);
				return;
			});
		});
	});
};

module.exports.all = function(request, response) {
	if (!request.query || !request.query.apiKey || request.query.apiKey != process.env.API_KEY) {
		response.sendStatus(401);
		return;
	}

	var season = parseInt(request.query.season) || process.env.SEASON;

	var dataPromises = [
		Classic.find({ season: season }).populate({ path: 'user', select: '-admin' }).populate('team').populate({ path: 'picks', populate: { path: 'away.team home.team' } })
	];

	Promise.all(dataPromises).then(function(values) {
		var classics = values[0];

		classics.forEach(function(classic) {
			classic.picks = classic.picks.filter(function(game) {
				return game.hasDefinitelyStarted();
			});
		});

		response.json(classics);
	});
};

module.exports.allForUser = function(request, response) {
	if (!request.query || !request.query.apiKey || request.query.apiKey != process.env.API_KEY) {
		response.sendStatus(401);
		return;
	}

	var verifyUser = new Promise(function(resolve, reject) {
		if (!request.params.username) {
			reject({ error: 'not querying for anything' });
		}
		else {
			User.findOne({ username: request.params.username }).select('username firstName lastName').then(function(user) {
				resolve(user);
			}).catch(function(error) {
				reject({ error: 'who' });
			});
		}
	});

	verifyUser.then(function(user) {
		var dataPromises = [
			Classic.find({ season: process.env.SEASON, user: user._id }).populate({ path: 'user', select: '-admin' }).populate('team').populate({ path: 'picks', populate: { path: 'away.team home.team' } })
		];

		Promise.all(dataPromises).then(function(values) {
			var classics = values[0];

			classics.forEach(function(classic) {
				classic.picks = classic.picks.filter(function(game) {
					return game.hasDefinitelyStarted();
				});
			});

			response.json(classics);
		});
	}).catch(function(error) {
		response.send(error);
	});
};
