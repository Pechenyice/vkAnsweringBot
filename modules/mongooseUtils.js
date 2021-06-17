const mongoose = require("mongoose");
const {Schema} = mongoose;

require('dotenv').config();
 
// const clientSchema = new Schema({vkId: Number});
// const client = mongoose.model("Client", userSchema);
 
// mongoose.connect("mongodb://localhost:27017/usersdb", { useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false }, function(err){
//     if(err) return console.log(err);
// });

let mongooseUtils = {
    clientSchema: null,
    client: null,

    startSession: function() {

        this.clientSchema = new Schema({vkId: Number});
        this.client = mongoose.model("client", this.clientSchema);

        mongoose.connect(process.env.MONGODBURI, { useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false }, function(err){
            if(err) return console.log(err);
        });
    },

    saveClient: function(user) {
        let client = new this.client({vkId: user.vkId});
        
        console.log(client)
        client.save(function(err){
            if(err) return console.log(err);
            console.log("saved: " + client)
        });
    }
}

module.exports = mongooseUtils;