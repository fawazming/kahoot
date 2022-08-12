if(!process.env.NODE_ENV){
    require('dotenv').config()
}
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true
});

const db = mongoose.connection;

module.exports = db;
