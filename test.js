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
		if (code >= 400 && code <= 499) {
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
		.then(createDefaultUser)
		.catch(e => { console.log(e); });

test(testHappyPath)
	.then(disconnectAndExit)
