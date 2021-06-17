const mongooseUtils = require('./../modules/mongooseUtils.js');

mongooseUtils.startSession();
mongooseUtils.saveClient({vkId: 12});