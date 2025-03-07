var dotenv = require('dotenv').config();

var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var app = express();

app.use(express.static(__dirname + '/public'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

var router = express.Router();

/*
router.use(function(request, response, next) {
	if (request.path != '/preview' && (!request.cookies.gateKey || request.cookies.gateKey != process.env.GATE_KEY)) {
		response.render('gate');
	}
	else {
		next();
	}
});
*/

app.use(router);

app.set('view engine', 'pug');

var dateFormat = require('dateformat');

dateFormat.i18n.monthNames = [
	'Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.',
	'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
];

app.locals.dateFormat = dateFormat;

require('./routes')(app);

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);

process.env.PORT = process.env.PORT || 3333;

if (process.env.NODE_ENV == 'dev') {
	var fs = require('fs');
	var https = require('https');

	var options = {
		key: fs.readFileSync('../ssl/server.key'),
		cert: fs.readFileSync('../ssl/server.crt'),
		requestCert: false
	};

	var server = https.createServer(options, app);

	server.listen(process.env.PORT, function() { console.log('https, listening on port ' + process.env.PORT) });
}
else {
	app.listen(process.env.PORT, function() { console.log('http, listening on port ' + process.env.PORT) });
}
