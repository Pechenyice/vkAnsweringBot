const mongoose = require("mongoose");
const {Schema} = mongoose;

require('dotenv').config();

let mongooseUtils = {
    clientSchema: null,
    client: null,
    jokeSchema: null,
    joke: null,

    /**
     * start mongo db session.
     */
    startSession: function() {

        this.clientSchema = new Schema({id: Number, ttsRoots: Boolean, tts: Boolean, jokes: Boolean, rand: Boolean});
        this.client = mongoose.model("client", this.clientSchema);

        this.jokeSchema = new Schema({content: String});
        this.joke = mongoose.model("joke", this.jokeSchema);

        mongoose.connect(process.env.MONGODBURI, { useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false }, function(err){
            if(err) return console.log(err);
        });
    },

    /**
     * end mongo db session.
     */
    endSession: function() {
        mongoose.disconnect();
    },

    /**
     * save client to collection.
     * @param {Object} user - New user.
     * @param {Number} user.id - user vk id.
     * @param {Boolean} user.ttsRoots - user tts access.
     * @param {Boolean} user.tts - user tts mode.
     * @param {Boolean} user.jokes - user jokes access.
     * @param {Boolean} user.rand - user rand access.
     */
    saveClient: function(user) {
        let client = new this.client(user);

        this.client.find({id: user.id}, function(err, clients){        
            if(err) return console.log(err);
            if (clients.length) {
                console.log("client already exists!");
                return;
            }

            client.save(function(err){
                if(err) return console.log(err);
                console.log("saved: " + client)
            });
        });

    },

    /**
     * get all clients vk ids from collection.
     * @returns {Number[]}
     */
    getClientsIds: async function() {
        let ids = [];
        await this.client.find({}, function(err, clients){        
            if(err) return console.log(err);
            for (let c of clients) {
                ids.push(c.id);
            }
        });
        return ids;
    },

    /**
     * get all clients modes.
     * @returns {Object[]}
     */
    getClientsModes: async function() {
        let ids = {};
        await this.client.find({}, function(err, clients){        
            if(err) return console.log(err);
            for (let c of clients) {
                ids[c.id] = {
                    'ttsRoots': c.ttsRoots,
                    'tts': c.tts,
                    'jokes': c.jokes,
                    'rand': c.rand,
                };
            }
        });
        return ids;
    },

     /**
     * @param {Object} modes - New modes.
     * set all clients modes.
     */
    setClientsModes: async function(modes) {
      
        for (const [key, value] of Object.entries(modes)) {
            await this.client.updateOne({id: key}, {ttsRoots: value.ttsRoots, tts: value.tts, jokes: value.jokes, rand: value.rand}, function(err, result){
                if(err) return console.log(err);
            });
        }

    },

    /**
     * save joke to collection.
     * @param {Object} joke - New joke.
     * @param {String} joke.content - joke content.
     */
     saveJoke: function(j) {
        let joke = new this.joke(j);

        this.joke.find({content: j.content}, function(err, jo){        
            if(err) return console.log(err);
            if (jo.length) {
                console.log("joke already exists!");
                return;
            }

            joke.save(function(err){
                if(err) return console.log(err);
                console.log("saved: " + joke)
            });
        });

    },

    /**
     * get all jokes.
     * @returns {String[]}
     */
     getJokes: async function() {
      
        let jokes = [];
        await this.joke.find({}, function(err, res){        
            if(err) return console.log(err);
            for (let r of res) {
                jokes.push(r.content);
            }
        });
        return jokes;

    }

}

module.exports = mongooseUtils;