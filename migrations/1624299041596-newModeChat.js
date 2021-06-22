require('./../models/client.js');
/**
 * Make any changes you need to make to the database here
 */
async function up () {
  // Write migration here
  this('client').updateMany({}, {chat: true}, function(err, result){
    if(err) return console.log(err);
    console.log(result);
});
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down () {
  this('client').updateMany({}, {chat: undefined}, function(err, result){
      if(err) return console.log(err);
      console.log(result);
  });
}

module.exports = { up, down };
