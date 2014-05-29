// CLIENT SCRIPT
var socket = io.connect('http://localhost:3000',{'sync disconnect on unload': true});

// adds a message to the screen
function userMessage(msg, username){
	$('#chatEntries').append('<div class="message"><p>' + username + ": " + msg + '</p></div>');
	$("#chatEntries").animate({ scrollTop: document.getElementById('chatEntries').scrollHeight }, "fast");
}

function generalMessage(html){
	$('#chatEntries').append(html);
	$("#chatEntries").animate({ scrollTop: document.getElementById('chatEntries').scrollHeight }, "fast");
}

// send our message
function sendMessage(){
	var msg = $('#messageInput').val().trim();
	if(msg != "") {
		socket.emit('message', msg);
		userMessage(msg, "You");
		$('#messageInput').val("");
	}
}

function emptyUserList() {

}

// set our username
function login(){
	//$("#loginErrors").empty();
	//$("#loginErrors").hide();
	var username = $("#username").val().trim();
	var gender = document.querySelector('input[name="gender"]:checked').value;
	if(username != ""){
		socket.emit('connectToServer', {username: username, gender: gender});
	}
}

$(document).ready(function() {
	// GENERAL JS
	$(".navbar-toggle").on("click",function(e){
		$(".left-bar").toggleClass("left-bar-active");
		//$(".middle-bar").toggleClass("left-bar-active");
		//$(".chat-bar").toggleClass("left-bar-active");
	});

	socket.on("login response", function(data) {
		if(data.success) {
			$("#login-page").hide();
		    $("#main-page").show();
		    $("body").css("background-color", "#FFFFFF");
		    $('#messageInput').focus();
		    generalMessage("<div><p class=''>Welcome to Node Chat! Click on any room in the left bar to join and start chatting now!</p></div>");
		} else {
			console.log(data.msg)
			$("#loginErrors").empty();
			$("#loginErrors").append("<div class='alert alert-danger alert-dismissable'><button type='button' data-dismiss='alert' class='close'>&times;</button><strong>Error!</strong><span>"+data.msg+"</span></div>");
			$("#loginErrors").show();
		}
	});

	socket.on("join room response", function(data) {
		if(data.success) {
			$("#messageInput").focus();
			$("#"+data.roomId).addClass("active");
			console.log(data.people);
		} else {
			generalMessage("<div><p class=''>"+data.msg+"</p></div>");
		}
	});

	// receive incoming messages
	socket.on('message', function(data) {
		if(data.type === 'chat') {
			userMessage(data.msg, data.username);
		} else if (data.type === 'alert') {
			generalMessage("<div><p class=''>"+data.msg+"</p></div>");
		}
	});

	socket.on('update', function(data) {
		switch(data.type) {
			case "user_count":
				$("#usercount").text(data.count);
				break;
			case "room_count":
				$("#"+data.roomId+" a span").text(data.roomCount);
				break;
			case "room_list":
				generalRooms = $("#generalRooms ul");
				themedRooms = $("#themedRooms ul");
				// clear the rooms lists
				generalRooms.empty();
				themedRooms.empty();

				$.each(data.rooms, function(id, room) {
					li = "<li id="+id+"><a href='#'><span class='badge pull-right'>"+room.people.length+"</span>"+room.name+"</a></li>";
					if(room.type === "general") {
						generalRooms.append(li);
					}else if(room.type === "themed") {
						themedRooms.append(li);
					}
				});

				// If there are no rooms, inform user
				var html = "<li style='text-align:center'>There are no rooms to display.</li>";
				if(generalRooms.children().length == 0) {
					generalRooms.append(html);
				} else if(themedRooms.children().length == 0) {
					themedRooms.append(html);
				}
				break;

			case "user_list":
				console.log(data.list);
				$("#userlist ul").empty();
				for(var i = 0; i < data.list.length; i++) { 
					$("#userlist ul").append("<li><p>"+data.list[i]+"</p></li>");
				}
				break;
		}
	});

	$("#username").keyup(function(e){
		if(e.keyCode == 13){
			$("#login").click();
			$("#messageInput").focus();
		}
	});

	$("#messageInput").keyup(function(e){
		if(e.keyCode == 13){
			$("#submit").click();
			$(this).focus();
		}
	});

	// initialize some stuff on load
	$(function() {
		$("#username").focus();
	    $("#login").click(function() {login()});
	    $("#submit").click(function(e) {e.preventDefault(); sendMessage();});

	    // NOTE: this is the on click syntax for binding to dynamically loaded elements
  		$(".left-bar ul").on('click', 'li:not(.active)', function(e){
  			e.preventDefault();
  			socket.emit("join room", $(this).attr('id'));
  		});
	    // FOR TESTING
	    //$("#login-page").hide();
	    //$("#main-page").show();
	    //$("body").css("background-color", "#FFFFFF");
		//$("#userlist ul").append("<li><p>Mike</p></li>");
		//$("#userlist ul").append("<li><p>Bryon</p></li>");
	});
});