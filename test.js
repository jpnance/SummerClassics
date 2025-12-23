const dotenv = require('dotenv').config({ path: '/app/.env' });

const mongoose = require('mongoose');
const mongoUri = 'mongodb://classix-mongo:27017/test';

mongoose.connect(mongoUri);

const Classic = require('./models/Classic');
const Game = require('./models/Game');
const Notification = require('./models/Notification');
const Player = require('./models/Player');
const Projection = require('./models/Projection');
const Session = require('./models/Session');
const Status = require('./models/Status');
const Team = require('./models/Team');
const User = require('./models/User');

const users = require('./services/users');
const schedule = require('./services/schedule');

const now = new Date();
const yesterday = new Date(now);
const tomorrow = new Date(now);

Date.prototype.toDateString = function() {
	let gameYear = this.getFullYear();
	let gameMonth = this.getMonth();
	let gameDate = this.getDate();

	return gameYear + '-' + (gameMonth + 1 < 10 ? '0' : '') + (gameMonth + 1) + '-' + (gameDate < 10 ? '0' : '') + gameDate;
};

yesterday.setDate(now.getDate() - 1);
tomorrow.setDate(now.getDate() + 1);

process.env.SEASON = now.getFullYear();
process.env.OPENING_DAY = yesterday.toDateString();
process.env.FINAL_DAY = tomorrow.toDateString();

Session.withActiveSession = (request, callback) => {
	callback(null, {
		user: {
			admin: true
		}
	});
};

const mockRequest = (data) => {
	const request = {
		body: {},
		cookies: {},
		headers: {},
		params: {}
	};

	Object.assign(request, data);

	return request;
};

const mockResponse = () => {
	const response = {};

	const { promise, resolve: fulfill, reject } = Promise.withResolvers();

	response.clearCookie = () => {};

	response.cookie = () => {};

	response.done = promise;

	response.redirect = (data) => {
		fulfill(data);
	};

	response.render = (template, data) => {
		fulfill(data);
	};

	response.send = (data) => {
		fulfill(data);
	};

	response.status = (code) => {
		if ([400, 404, 500].includes(code)) {
			return {
				send: (error) => {
					reject(`HTTP ${code}: ${error}`);
				}
			};
		}
		else {
			return response;
		}
	};

	return response;
};

const resetDatabase = Promise.all([
	Classic.collection.drop(),
	Game.collection.drop(),
	Notification.collection.drop(),
	Player.collection.drop(),
	Projection.collection.drop(),
	Status.collection.drop(),
	Team.collection.drop(),
	User.collection.drop(),
]);

const seedTeamData = () => {
	const teams = [
		{
			id: 117,
			name: 'Houston Astros',
			abbreviation: 'HOU',
			locationName: 'Houston',
			teamName: 'Astros'
		},
		{
			id: 119,
			name: 'Los Angeles Dodgers',
			abbreviation: 'LAD',
			locationName: 'Los Angeles',
			teamName: 'Dodgers'
		}
	];

	return Promise.all(teams.map(team => Team.findByIdAndUpdate(team.id, team, { upsert: true })));
};

const seedScheduleData = () => {
	const gameDate = (new Date()).toISOString();
	const gameStartDateIso = new Date(gameDate);
	const gameStartDateLocal = new Date(gameDate);

	gameStartDateLocal.setHours(gameStartDateIso.getHours() - 8);

	const games = [
		{
			gamePk: 123456,
			season: process.env.SEASON,
			startTime: gameStartDateIso,
			date: gameStartDateLocal.toDateString(),
			'away.team': 117,
			'home.team': 119
		}
	];

	return Promise.all(games.map(game => Game.findByIdAndUpdate(game.gamePk, game, { upsert: true })));
};

const createDefaultUser = () => {
	const request = mockRequest({
		body: {
			firstName: 'Patrick',
			lastName: 'Nance',
			displayName: 'Patrick',
			username: 'patrick-nance',
			eligible: 'on'
		}
	});

	const response = mockResponse();

	users.signUp(request, response);

	return response.done;
};

const loadScheduleForToday = () => {
	const request = mockRequest();

	const response = mockResponse();

	schedule.showAllForDate(request, response);

	return response.done;
};

const disconnectAndExit = (data) => {
	console.log();
	mongoose.disconnect();
};

const displayErrorAndExit = (error) => {
	console.log(error);
	mongoose.disconnect();
};

const print = (message) => {
	return () => {
		process.stdout.write(message);
	};
};

const test = (testPromise) => {
	return testPromise
		.then(print('.'))
		.catch(print('x'));
};

const testHappyPath =
	resetDatabase
		.then(seedTeamData)
		.then(seedScheduleData)
		.then(createDefaultUser)
		.then(loadScheduleForToday)
		.then(console.log)
		.catch(console.error);

test(testHappyPath)
	.then(disconnectAndExit)
