var socket = io();
var params = jQuery.deparam(window.location.search);

//When host connects to server
socket.on('connect', function() {

    document.getElementById('players').value = "";
    
    //Tell server that it is host connection
    socket.emit('host-init', params);
});

socket.on('showGamePin', function(data){
   document.getElementById('gamePinText').innerHTML = data.pin;
});

// socket.on('updatePlayerLobby', function(data){
//    document.getElementById('layers').innerHTML = data.Players[0].name;
// });
// Adds player's name to screen and updates player count
socket.on('updatePlayerLobby', function(data){

    document.getElementById('players').value = "";

    for(var i = 0; i < data.length; i++){
        document.getElementById('players').value += data[i].name + "\n";
    }

});

socket.on('updatePlayerLobby', function(data){
   document.getElementById('layers').innerHTML = data.Players[0].name;
});

//Tell server to start game if button is clicked
function startGame(){
    socket.emit('startQuiz');
}
function endGame(){
    window.location.href = "/";
}

//When server starts the game
socket.on('quizStarted', function(id){
    console.log('Game Started!');
    window.location.href="/host/game/" + "?id=" + id;
});

socket.on('noGameFound', function(){
   window.location.href = '../../';//Redirect user to 'join game' page
});

