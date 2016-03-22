//chat variables
var chatCount = 0;
var chatArr = [];

//firebase variables and children
var gameLocation = "https://christiancasal.firebaseio.com/";
var playerLocation = "player-list";
var playerDataLocation = "player-data";
var playerChatLocation = "player-chat";
var numOfPlayers = 2;

//counts
var winCount = 0;
var loseCount = 0;

//main firebase reference
var gameRef = new Firebase(gameLocation);

go();

function go(){
	var playerName = prompt("What is your name?", 'Guest').trim();
	assignPlayerNumberAndPlayGame(playerName, gameRef);
	
	$('#namePlayer1').text(playerName);
	
}

function playGame(myPlayerNumber, playerName, justJoinedGame, gameRef) {
  //find opponent
  if(myPlayerNumber == 0){
  	var opponentPlayerNumber = 1;

  }
  else{
  	var opponentPlayerNumber = 0;
  }

  gameRef.on("value", function(snapshot){
	//when user leaves
	console.log(snapshot.child(playerDataLocation).child(myPlayerNumber).child("userId").val())
	var snapshotCurrentMove = snapshot.child(playerDataLocation).child(myPlayerNumber).child("currentMove").val();
	var snapshotOpponentName = snapshot.child(playerDataLocation).child(opponentPlayerNumber).child("userId").val();
	var snapshotOpponentMove = snapshot.child(playerDataLocation).child(opponentPlayerNumber).child("currentMove").val();
	var snapshotOpponentConf = snapshot.child(playerDataLocation).child(opponentPlayerNumber).child("confirm").val();
	var snapshotOpponentWins = snapshot.child(playerDataLocation).child(opponentPlayerNumber).child("wins").val();
	var snapshotOpponentLosses = snapshot.child(playerDataLocation).child(opponentPlayerNumber).child("losses").val();
	
	var opponentObj = {
		name: snapshotOpponentName,
		currentMove: snapshotOpponentMove,
		confirm: snapshotOpponentConf,
		wins: snapshotOpponentWins,
		losses: snapshotOpponentLosses
	}
	//bring to local storage
	var yourMove = snapshotCurrentMove;
	localStorage.setItem("opponent" + opponentPlayerNumber, JSON.stringify(opponentObj))
	localStorage.setItem("yourMove", yourMove)
	console.log(snapshotOpponentName);
	console.log(snapshotOpponentMove);

	if(!(snapshotOpponentName == null)){
		$('#namePlayer2').text(snapshotOpponentName);
	}
	else{
		$('#namePlayer2').text("waiting...");
	}
	if(snapshot.val()){
		gameRef.onDisconnect().remove();
	}

	});

  var playerDataRef = gameRef.child(playerDataLocation).child(myPlayerNumber);
  var playerChatLocationRef = gameRef.child(playerChatLocation).child("chat");
  alert('You are player number ' + myPlayerNumber + 
      '.  Your data will be located at ' + playerDataRef.toString());

  if (justJoinedGame) {
    alert('Doing first-time initialization of data.');
    playerDataRef.update({
    	userId: playerName, 
    	state: 'game state',
    	currentMove: "",
		wins: 0,
		losses: 0,
		confirm: false
    });
    playerChatLocationRef.update({
		chat: playerName + " has connected!",
    });
  }

playerChatLocationRef.on("value", function(snapshot){
	var snapshotChat = 	snapshot.child("chat").val()
  	if(snapshotChat == null){
  		snapshotChat = "player left!"
  	}
  	chatLogic(snapshotChat);
});

//send chat updates to firebase
$('#chatInputSubmit').on('click', function(){
	var userChat = $('#chatInput').val().trim();
	$('#chatInput').val("");
	
	playerChatLocationRef.update({
		chat: playerName + ": " + userChat
	})
	return false;
});

//on-clicks
$('.player1Choice').on("click", function(){
	if($(this)[0].id == "rockPlayer1"){
		$('#choiceImagePlayer1').attr("src", "css/images/rock1.png")

		playerDataRef.update({
			currentMove: "rock"
		})
	}
	if($(this)[0].id == "paperPlayer1"){
		$('#choiceImagePlayer1').attr("src", "css/images/paper1.png")
		
		playerDataRef.update({
			currentMove: "paper"
		})
		}
	if($(this)[0].id == "scissorPlayer1"){
		$('#choiceImagePlayer1').attr("src", "css/images/scissor1.png")
	
		playerDataRef.update({
			currentMove: "scissor"
		})
	}
});

$('#shoot').on("click", function(){
	var opponent = JSON.parse(localStorage.getItem("opponent" + opponentPlayerNumber));
	var yourMove = localStorage.getItem("yourMove")
	playerDataRef.update({
			confirm: true
		})
	console.log(opponent)
	console.log(yourMove)
	$('.player1Choice').attr('disabled', true)
	if(opponent.confirm == true){
		var winner = gameLogic(playerName, opponent.name, yourMove, opponent.currentMove, 
			opponent.wins, opponent.losses);
		console.log(winner)
		$('#resultTop').text(winner);
	}
});
}
//makes sure no more than 2 players are assigned from
//https://gist.github.com/anantn/4323981
function assignPlayerNumberAndPlayGame(playerName, gameRef){
	var playerListRef = gameRef.child(playerLocation);
	var myPlayerNumber, alreadyInGame = false;

	playerListRef.transaction(function(playerList){
    // Attempt to (re)join the given game. Notes:
    //
    // 1. Upon very first call, playerList will likely appear null (even if the
    // list isn't empty), since Firebase runs the update function optimistically
    // before it receives any data.
    // 2. The list is assumed not to have any gaps (once a player joins, they 
    // don't leave).
    // 3. Our update function sets some external variables but doesn't act on
    // them until the completion callback, since the update function may be
    // called multiple times with different data.
    if (playerList === null) {
    	playerList = [];
    }

    for (var i = 0; i < playerList.length; i++) {
    	if (playerList[i] === playerName) {
        	// Already seated so abort transaction to not unnecessarily update playerList.
        	alreadyInGame = true;
        	myPlayerNumber = i; // Tell completion callback which seat we have.
        	return;
      	}
    }
	if (i < numOfPlayers) {
		// Empty seat is available so grab it and attempt to commit modified playerList.
		playerList[i] = playerName;  // Reserve our seat.
		myPlayerNumber = i; // Tell completion callback which seat we reserved.
		return playerList;
	}
		// Abort transaction and tell completion callback we failed to join.
		myPlayerNumber = null;
}, function (error, committed) {
	  // Transaction has completed.  Check if it succeeded or we were already in
	  // the game and so it was aborted.
	  if (committed || alreadyInGame) {
	    playGame(myPlayerNumber, playerName, !alreadyInGame, gameRef);
	  } else {
	    alert('Game is full.  Can\'t join. :-(');
	  }
	});
}


//gameLogic takes in the players name and move and returns results
function gameLogic(player1Name, player2Name, player1Move, player2Move, oppWins, oppLosses){
	//turn on buttons
	$('.player1Choice').attr('disabled', false)
	
	//turn on opponent picture
	if(player2Move == 'rock'){
		$('#choiceImagePlayer2').attr('src', 'css/images/rock2.png')
	}
	if(player2Move == 'paper'){
		$('#choiceImagePlayer2').attr('src', 'css/images/paper2.png')
	}
	if(player2Move == 'scissor'){
		$('#choiceImagePlayer2').attr('src', 'css/images/scissor2.png')
	}
var results ={
	 player1Win: player1Name + " wins!",
	 player2Win: player2Name + " wins!",
	 playersTied: "Players tied!"
}
	if(player1Move == player2Move){
		return results.playersTied;
	}
	//results for player1 rock
	if(player1Move == "rock"){
		if(player2Move == "scissor"){
			winCount++;
			$('#player1Wins').text("Wins: " + winCount);
			oppLosses++
			$('#player2Losses').text("Loss: " + oppLosses)
			return results.player1Win;
		}
		else{
			loseCount++;
			$('#player1Losses').text("Loss: " + loseCount);
			oppWins++
			$('#player2Wins').text("Wins: " + oppWins)
			return results.player2Win;
		}
	}
	//results for player1 paper
	if(player1Move == "paper"){
		if(player2Move == "rock"){
			winCount++;
			$('#player1Wins').text("Wins: " + winCount);
			oppLosses++
			$('#player2Losses').text("Loss: " + oppLosses)
			return results.player1Win;
		}
		else{
			loseCount++;
			$('#player1Losses').text("Loss: " + loseCount);
			oppWins++
			$('#player2Wins').text("Wins: " + oppWins)
			return results.player2Win;
		}
	}
	//results for plyaer1 scissors
	if(player1Move == "scissor"){
		if(player2Move == "paper"){
			winCount++;
			$('#player1Wins').text("Wins: " + winCount);
			oppLosses++
			$('#player2Losses').text("Loss: " + oppLosses)
			return results.player1Win;
		}
		else{
			loseCount++;
			$('#player1Losses').text("Loss: " + loseCount);
			oppWins++
			$('#player2Wins').text("Wins: " + oppWins)
			return results.player2Win;
		}
	}
}
function chatLogic(chat){
	chat =  chat + '\n';
	chatArr.push(chat);

	if(chatCount > 4){
		//remove first element
		chatArr.shift();

		//clear box
		$('#chatBox').text("")
		
		//print each line
		for(i = 0; i < chatArr.length; i++){
			$('#chatBox').append(chatArr[i])
		}	
	}
	else{
		$('#chatBox').append(chat)
		chatCount++;
	}

}