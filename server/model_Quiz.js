const mongoose = require('mongoose');
const db = require('./config_db');

let quizSchema = new mongoose.Schema({
  "id": Number,
  "name": String,
  "questions": [
    {
      "question": String,
      "answers": Array,
      "correct": Number
    }
  ]
});

const Quiz = db.model('Quiz', quizSchema);


module.exports = Quiz