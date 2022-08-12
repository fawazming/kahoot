if(!process.env.NODE_ENV){
    require('dotenv').config()
}
const mongoose = require('mongoose');

mongoose.connect('mongodb://mongostore:640d22266f19d4bacb22d7d6eff9b291@66.152.172.102:16313/mongostore', {
    useNewUrlParser: true
});

const db = mongoose.connection;

module.exports = db;
