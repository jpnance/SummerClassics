var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
	username: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	firstName: { type: String, required: true },
	lastName: { type: String, required: true },
	displayName: { type: String, required: true },
	seasons: { type: [Number] },
	admin: { type: Boolean, default: false }
});

userSchema.methods.isEligibleFor = function(season) {
	return this.seasons.indexOf(season) > -1;
};

userSchema.methods.makeEligibleFor = function(season) {
	if (!this.seasons) {
		this.seasons = [];
	}

	if (this.seasons.indexOf(season) == -1) {
		this.seasons.push(season);
	}
};

userSchema.methods.makeUneligibleFor = function(season) {
	if (!this.seasons) {
		this.seasons = [];
	}

	var seasons = [];

	this.seasons.forEach(function(existingSeason) {
		if (existingSeason != season) {
			seasons.push(existingSeason);
		}
	});

	this.seasons = seasons;
};

module.exports = mongoose.model('User', userSchema);
