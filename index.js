var express = require('express');
var app = express();

app.use(express.static(__dirname + '/public'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));

app.set('view engine', 'pug');

app.locals.dateFormat = require('dateformat');

require('./routes')(app);

var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);

process.env.PORT = process.env.PORT || 3333;
app.listen(process.env.PORT, function() { console.log('yes, listening on port ' + process.env.PORT) });
