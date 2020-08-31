var moment = require('moment');

function formatMessage(username, text) {
  return {
    username,
    text,
    time: moment().format('YYYY-MM-DD  h:mm a')
  };
}

function formatDataBaseEntry(username, text, room) {
	return {
		username, 
		text, 
		time: moment().format('YYYY-MM-DD  h:mm a'),
		room
	};
}

module.exports = formatMessage;
module.exports = formatDataBaseEntry;
