require('./../models/client.js');
/**
 * Make any changes you need to make to the database here
 */
async function up () {
  // Write migration here
  this('client').updateMany({}, {'chat': {$exists : false}}, {$set: {'chat': true}});
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down () {
  this('client').update({"chat": true}, {"$set":{"chat": false}}, {"multi": true});
}

module.exports = { up, down };
