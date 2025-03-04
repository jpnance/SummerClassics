var dotenv = require('dotenv').config({ path: __dirname + '/../.env' });

var request = require('superagent');

var Projection = require('../models/Projection');

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);

var date = new Date();
date.setDate(date.getDate() - 1);

var yesterdayString = date.getFullYear() + (date.getMonth() + 1).toString().padStart(2, '0') + date.getDate().toString().padStart(2, '0');

request.get('https://lflrankings.com/classix/get_data.php?d=' + yesterdayString, function(error, response) {
	var data = JSON.parse(response.text).data;
	var projection = {
		data: data
	};

	Projection.findByIdAndUpdate(process.env.SEASON, projection, { upsert: true }).then(function() {
		mongoose.disconnect();
	});;
});
