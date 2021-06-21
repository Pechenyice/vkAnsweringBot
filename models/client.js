const mongoose = require("mongoose");
const {Schema} = mongoose;

let clientSchema = new Schema({id: Number, ttsRoots: Boolean, tts: Boolean, jokes: Boolean, rand: Boolean, chat: Boolean});
let client = mongoose.model("client", clientSchema);

module.exports = client;