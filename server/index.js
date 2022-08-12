const http = require('http');
const path = require('path');
const express = require('express');
const socketIO = require('socket.io');

const {LiveGames} = require('./utils');
const {Players} = require('./utils');
const QuizDB = require('./model_Quiz');

if(!process.env.NODE_ENV){
    require('dotenv').config()
}

const publicPath = path.join(__dirname, '../public');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const games = new LiveGames();
const players = new Players();

app.use(express.static(publicPath));


server.listen(process.env.PORT, ()=>{console.log(`Server Started on port ${process.env.PORT}`)})

io.on('connection', (socket)=>{

    socket.on('requestQuizs', ()=>{
        QuizDB.find((err, res)=>{
            try{
                socket.emit('quizNamesData', res);
            }catch(err){
                throw err;
            }
        });
    });

    socket.on('newQuiz', (quiz)=>{
            QuizDB.create(quiz, (err, res)=>{
            try{
                socket.emit('GoToAdmin')
            }catch(err){
                throw err;
            }
        });
    })

    socket.on('host-init',(params)=>{
        let {id} = params;
        QuizDB.findById(id, (err, res)=>{
            try{
                if(res){
                    let pin = Math.floor(Math.random()*90000)+10000;
                    let gameData = {
                        playerAnswered: 0,
                        questionLive: false,
                        gameID: id,
                        question: 1,
                    }
                    games.addGame(pin.toString(), socket.id, false, gameData);

                    // Re-get pin to make it constant
                    let npin = games.getGame(socket.id).pin
                    console.log(`New Game started with ${npin}`)
                    socket.join(npin)
                    socket.emit('showGamePin', {pin: npin})
                }else{
                    socket.emit('noGameFound')
                }
            }catch(e){
                throw e;
            }
        })
    })

    socket.on('player-join', (params)=>{
        let {name, pin} = params;
        // Search through all games for corresponding pin
        let game = games.games.find(game => game.pin == pin)
        if(game){
            players.addPlayer(game.hostID, socket.id, name, {score: 0, answer: 0})
            socket.join(pin)
            console.log(`Player(${name}) with ID ${socket.id} join ${pin}`);
            let Players = players.getPlayers(game.hostID);
            io.to(pin).emit('updatePlayerLobby', {Players})
        }else{
            socket.emit('gameNotFound')
        }

    })

    socket.on('startQuiz', ()=>{
        let quiz = games.getGame(socket.id)
        quiz.isGameLive = true;
        socket.emit('quizStarted', quiz.hostID)
    })

    socket.on('host-join-game', (params)=>{
        let game = games.getGame(params.id)
        if(game){
            game.hostID = socket.id;
            socket.join(game.pin)
            let Players = players.getPlayers(params.id);
            Players.forEach((player)=>{
                if(player.hostID == params.id){
                    player.hostID = socket.id;
                }
            })

            let {gameID} = game.gameData;

            QuizDB.findById(gameID, (err, res)=>{
                try{
                    let question = res.questions[0].question;
                    let answer1 = res.questions[0].answers[0];
                    let answer2 = res.questions[0].answers[1];
                    let answer3 = res.questions[0].answers[2];
                    let answer4 = res.questions[0].answers[3];
                    let correctAnswer = res.questions[0].correct;

                    socket.emit('gameQuestions', {
                        q1: question,
                        a1: answer1,
                        a2: answer2,
                        a3: answer3,
                        a4: answer4,
                        correct: correctAnswer,
                        playersInGame: Players.length
                    })
                }catch(e){
                    throw e;
                }
            })
            // socket.broadcast.emit('gameStartedPlayer');
            console.log(`Host join quiz ${game.pin}`);
            io.to(game.pin).emit('gameStartedPlayer');
            game.gameData.questionLive = true;
        }else{
            socket.emit('noGameFound');
        }
    })

    socket.on('player-join-game', ({id})=>{
        let player = players.getPlayer(id);
        if(player){
            let {pin, hostID} = games.getGame(player.hostID);
            socket.join(pin)
            player.playerID = socket.id;

            socket.emit('playerGameData', players.getPlayers(hostID))
        }else{
            socket.emit('noGameFound')
        }
    })

    socket.on('time', (data)=>{
        let time = (data.time / 20) * 100;
        players.getPlayer(data.player).gameData.score += time
    })

    socket.on('timeUp', ()=>{
        let game = games.getGame(socket.id)
        game.gameData.questionLive = false
        let Players = players.getPlayers(game.hostID);

        let gameQuestion = game.gameData.question;
        let gameID = game.gameData.gameID;

        QuizDB.findById(gameID, (err, res)=>{
            try{
                const correctAnswer = res.questions[gameQuestion-1].correct;
               io.to(game.pin).emit('questionOver', {playerData: Players, correct: correctAnswer})
            }catch(e){
                throw e
            }
        })
    })

    socket.on('nextQuestion', ()=>{
        let Players = players.getPlayers(socket.id);
        Players.forEach((player)=>{
            if(player.hostID == socket.id){
                player.gameData.answer = 0;
            }
        })
        let {pin, gameData, hostID} = games.getGame(socket.id)
        gameData.playerAnswered = 0;
        gameData.questionLive = true;
        gameData.question ++;
        const gameID = gameData.gameID;

        QuizDB.findById(gameID, (err, res)=>{
            try{
                if(res.questions.length >= gameData.question){
                    let questionNum = gameData.question;
                    questionNum = questionNum - 1;
                    let question = res.questions[questionNum].question;
                    let answer1 = res.questions[questionNum].answers[0];
                    let answer2 = res.questions[questionNum].answers[1];
                    let answer3 = res.questions[questionNum].answers[2];
                    let answer4 = res.questions[questionNum].answers[3];
                    let correctAnswer = res.questions[questionNum].correct;
                    socket.emit('gameQuestions', {
                            q1: question,
                            a1: answer1,
                            a2: answer2,
                            a3: answer3,
                            a4: answer4,
                            correct: correctAnswer,
                            playersInGame: Players.length
                        });
                }else{
                        var playersInGame = players.getPlayers(hostID);
                        var first = {name: "", score: 0};
                        var second = {name: "", score: 0};
                        var third = {name: "", score: 0};
                        var fourth = {name: "", score: 0};
                        var fifth = {name: "", score: 0};

                        for(var i = 0; i < playersInGame.length; i++){
                            console.log(playersInGame[i].gameData.score);
                            if(playersInGame[i].gameData.score > fifth.score){
                                if(playersInGame[i].gameData.score > fourth.score){
                                    if(playersInGame[i].gameData.score > third.score){
                                        if(playersInGame[i].gameData.score > second.score){
                                            if(playersInGame[i].gameData.score > first.score){
                                                //First Place
                                                fifth.name = fourth.name;
                                                fifth.score = fourth.score;

                                                fourth.name = third.name;
                                                fourth.score = third.score;

                                                third.name = second.name;
                                                third.score = second.score;

                                                second.name = first.name;
                                                second.score = first.score;

                                                first.name = playersInGame[i].name;
                                                first.score = playersInGame[i].gameData.score;
                                            }else{
                                                //Second Place
                                                fifth.name = fourth.name;
                                                fifth.score = fourth.score;

                                                fourth.name = third.name;
                                                fourth.score = third.score;

                                                third.name = second.name;
                                                third.score = second.score;

                                                second.name = playersInGame[i].name;
                                                second.score = playersInGame[i].gameData.score;
                                            }
                                        }else{
                                            //Third Place
                                            fifth.name = fourth.name;
                                            fifth.score = fourth.score;

                                            fourth.name = third.name;
                                            fourth.score = third.score;

                                            third.name = playersInGame[i].name;
                                            third.score = playersInGame[i].gameData.score;
                                        }
                                    }else{
                                        //Fourth Place
                                        fifth.name = fourth.name;
                                        fifth.score = fourth.score;

                                        fourth.name = playersInGame[i].name;
                                        fourth.score = playersInGame[i].gameData.score;
                                    }
                                }else{
                                    //Fifth Place
                                    fifth.name = playersInGame[i].name;
                                    fifth.score = playersInGame[i].gameData.score;
                                }
                            }
                        }

                        io.to(pin).emit('GameOver', {
                            num1: first.name,
                            num2: second.name,
                            num3: third.name,
                            num4: fourth.name,
                            num5: fifth.name
                        });
                    }
            }catch(e){
                throw e;
            }
        })
        io.to(pin).emit('nextQuestionPlayer');
    })

    socket.on('playerAnswer', (ans)=>{
        console.log(`player with ID ${socket.id} submitted answer`);

        let player = players.getPlayer(socket.id);
        const PhostID = player.hostID;
        let Players = players.getPlayers(PhostID);
        let {pin, hostID, gameData} = games.getGame(PhostID);
        if(gameData.questionLive == true){
            player.gameData.answer = ans;
            gameData.playerAnswered ++;

            QuizDB.findById(gameData.gameID, (err, res)=>{
                try{
                    const correctAnswer = res.questions[gameData.question-1].correct;
                    if(ans == correctAnswer){
                        player.gameData.score += 100;
                        io.to(pin).emit('getTime', socket.id)
                        socket.emit('answerResult', true)
                    }

                    if(gameData.playerAnswered == Players.length){
                        gameData.questionLive = false;
                        io.to(pin).emit('questionOver', {playerData: players.getPlayers(hostID), correct: correctAnswer})
                    }else{
                        io.to(pin).emit('updatePlayersAnswered', {
                            playersInGame: Players.length,
                            playersAnswered: gameData.playersAnswered
                        })
                    }
                }catch(e){
                    throw e;
                }
            })
        }
    })

    socket.on('getScore', ()=>{
        socket.emit('newScore', players.getPlayer(socket.id).gameData.score)
    })

    socket.on('disconnect', ()=>{
        let game = games.getGame(socket.id);
        if(game){
            if (game.isGameLive == false) {
                games.removeGame(socket.id)
                console.log(`Game ended with pin: ${game.pin}`)

                let playersToRemove = players.getPlayers(game.hostID);
                playersToRemove.forEach((player)=>{
                    players.removePlayer(player.playerID)
                })

                io.to(game.pin).emit('hostDisconnect')
                socket.leave(game.pin);
            }
        }else{
            let player = players.getPlayer(socket.id)
            if(player){
                let {pin, isGameLive} = games.getGame(player.hostID);
                if (isGameLive == false) {
                    players.removePlayer(socket.id)
                    io.to(pin).emit('updatePlayerLobby', players.getPlayers(player.hostID))
                    socket.leave(pin)
                }
            }
        }
    })
})