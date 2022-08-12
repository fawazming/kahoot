class LiveGames {
    constructor(){
        this.games = [];
    }

    addGame(pin, hostID, isGameLive, gameData){
        let game = {pin, hostID, isGameLive, gameData};
        this.games.push(game);
        return game;
    }

    getGame(hostID){
        let game = this.games.filter((game)=>game.hostID === hostID)[0]
        return game;
    }

    removeGame(hostID){
        let game = this.getGame(hostID);
        if(game){
            this.games = this.games.filter((game)=>game.hostID !== hostID)
        }
        return game;
    }
}


class Players{
    constructor(){
        this.players = [];
    }

    addPlayer(hostID, playerID, name, gameData){
        let player = {hostID, playerID, name, gameData};
        this.players.push(player);
        return player;
    }

    getPlayer(playerID){
        return this.players.filter((player)=>player.playerID === playerID)[0]
    }

    getPlayers(hostID){
        return this.players.filter((player)=>player.hostID === hostID)
    }

    removePlayer(playerID){
        let player = this.getPlayer(playerID);
        if (player) {
            this.players = this.players.filter((player)=>player.playerID !== playerID)
        }
        return player;
    }
}

module.exports = {Players, LiveGames};