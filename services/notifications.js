var Session = require('../models/Session');
var Notification = require('../models/Notification');

module.exports.dismiss = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		if (!session || !session.user) {
			response.redirect('/');
			return;
		}

		Notification.findOneAndUpdate({ _id: request.params.notificationId, user: session.user._id }, { '$set': { read: true } }).then(function(notification) {
			response.send({ success: true });
		}).catch(function(error) {
			response.sendStatus(500);
		});
	});
};

module.exports.showAll = function(request, response) {
	Session.withActiveSession(request, function(error, session) {
		if (!session || !session.user || !session.user.admin) {
			response.redirect('/');
			return;
		}

		Notification.find({ user: session.user._id }).sort('dateTime').then(function(notifications) {
			console.log(notifications);
			response.render('notifications', { notifications: notifications, session: session });
		});
	});
};
