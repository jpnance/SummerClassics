var express = require('express');
var app = express();

app.get('/', function(request, response) {
	response.send('Summer Classix');
});

process.env.PORT = process.env.PORT || 3333;
app.listen(process.env.PORT);
