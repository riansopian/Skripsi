var app = angular.module('home',['ngAnimate', 'toaster','ngEmoticons', 'ngSanitize', 'mgcrea.ngStrap', 'ui.bootstrap', 'angular-smilies','angular-toasty','ngUpload']);

/*creating Directive to Upload file starts*/
app.directive('fileModel', ['$parse', function ($parse) {
    return {
       restrict: 'A',
       link: function(scope, element, attrs) {
          var model = $parse(attrs.fileModel);
          var modelSetter = model.assign;
          
          element.bind('change', function(event){
             scope.$apply(function(){
                var files = event.target.files;
                /* 
                    Writing the selected file name below the Upload image
                */  
                angular.element( document.querySelector( '#selectedFile' )).html(files[0].name);
                modelSetter(scope, element[0].files[0]);
             });
          });
       }
    };
}]);
/*creating Directive to Upload file ends*/

/* 
	Making factory method for socket 
*/
app.factory('socket', function ($rootScope) {
	var socket = io.connect();
	return {
		on: function (eventName, callback) {
			socket.on(eventName, function () {  
				var args = arguments;
				$rootScope.$apply(function () {
			  		callback.apply(socket, args);
				});
		  	});
		},
		emit: function (eventName, data, callback) {
		  	socket.emit(eventName, data, function () {
				var args = arguments;
				$rootScope.$apply(function () {
			  		if (callback) {
						callback.apply(socket, args);
			  		}
				});
		  	})
		}
  	};
});

/* 
	Making service to run ajax 
*/
app.service('runajax', ['$http', function ($http) {
  this.runajax_function = function(request,callback){
	var url=request.url;
	var data_server=request.data_server;
	$http.post(url,data_server).success(function(data, status, headers, config) {
	  callback(data);
	})
	.error(function(){
	  callback("data");
	});
  }
}]);


/* 
	Making directive to send is Typing Notification 
*/
app.directive('sendTypingNotification', function () {
  return{
	require: 'ngModel',
	restrict: 'A',
	link:function (scope, element, attrs,ctrl) {
	  element.bind("keydown keypress", function (event) {
		scope.self.sendTypingNotification(event.type);
		scope.send_text=element.val();
	  });
	  scope.$watch(attrs.updateModel, function(value) {
		ctrl.$setViewValue(value);
		ctrl.$render();
	  });
	}
  }      
});

app.directive('myYoutube', function($sce) {
  return {
    restrict: 'EA',
    scope: { code:'=' },
    replace: true,
    template: '<div style="height:400px;"><iframe style="overflow:hidden;height:100%;width:100%" width="100%" height="100%" src="{{url}}" frameborder="0" allowfullscreen></iframe></div>',
    link: function (scope) {
        console.log('here');
        scope.$watch('code', function (newVal) {
           if (newVal) {
               scope.url = $sce.trustAsResourceUrl("http://www.youtube.com/embed/" + newVal);
           }
        });
    }
  };
});

app.directive('smilies', function($sce) {
  return {
    restrict: 'A',
    scope: { send_text:'=' },
    template: '<div smilies="{{send_text}}"></div>',
    link: function (scope) {
        scope.$watch('send_text', function (newVal) {
           if (newVal) {
               scope.send_text = newVal;
           }
        });
    }
  };
});

app.controller('home', function ($scope,$http,$location,$window,$sce,$timeout,toaster,socket,runajax,toasty) {
  
	$scope.show_userinfo=""; //To contain user information.
  	$scope.userlist=""; //To contain list of users.
  	$scope.RecentUserList=""; //To contain list of users.
  	$scope.uid="";
	$scope.hightlight_id="";
  	$scope.hightlight_socket_id="";
  	$scope.send_to_userinfo="";
  	$scope.send_to_user_name="";
  	$scope.send_text;
  	$scope.file_name;
  	$scope.msgs=[];

  	$scope.options = {
        'linkTarget': '_blank',
        'basicVideo': false,
        'code'      : {
            'highlight'  : true,
            'lineNumbers': true
        },
        'video'     : {
            'embed'    : true,
            'width'    : 800,
            'ytTheme'  : 'light',
            'details'  : true,
            'ytAuthKey': 'AIzaSyAQONTdSSaKwqB1X8i6dHgn9r_PtusDhq0'
        },
        'image'     : {
            'embed': true
        }
    };

	/* Making Usefull function*/
	$scope.self={
		getUserInfo: function(callback){
			var uid=$location.search()['id'];
			$scope.uid=uid;
			var data={
				url:'/get_userinfo',
				data_server:{
					uid:uid
				}
			};
			runajax.runajax_function(data,function(userdata){        
				$scope.show_userinfo=userdata;        
				callback(userdata);
			});
		},
		getRecentChats: function(callback){
			var uid=$location.search()['id'];
			$scope.uid=uid;
			var data={
				url:'/get_recent_chats',
				data_server:{
					uid:uid
				}
			};
			runajax.runajax_function(data,function(userdata){
				callback(userdata);
			});
		},
		getUsersToChats:function(callback){
		  var uid=$location.search()['id'];
		  $scope.uid=uid;
		  var data={
			url:'/get_users_to_chats',
			data_server:{
			  uid:uid
			}
		  };
		  runajax.runajax_function(data,function(userdata){
			callback(userdata);
		  });
		},
		getMsg:function(msgs_userinfo,callback){
		  var data={
			url:'/get_msgs',
			data_server:{
			  uid:$scope.uid,
			  from_id:msgs_userinfo.id
			}
		  }
		  runajax.runajax_function(data,function(userdata){        
			callback(userdata);
		  });
		},
		scrollDiv:function(){
		  var scrollDiv = angular.element( document.querySelector( '.msg-container' ) );
		  $(scrollDiv).animate({scrollTop: scrollDiv[0].scrollHeight}, 900);
		},
		sendTypingNotification:function(eventName){
		  var TypeTimer;                
		  var TypingInterval = 2000;
		  var data_server={
			  data_uid:$scope.uid,
			  data_fromid:$scope.hightlight_id,
			  data_socket_fromid:$scope.hightlight_socket_id
			}; 
		  if ( eventName=="keypress" ) {
			$timeout.cancel(TypeTimer);
			data_server.event_name='keypress';
			socket.emit('setTypingNotification',data_server);
		  }else {
			TypeTimer=$timeout( function(){
			  data_server.event_name='keydown';
			  socket.emit('setTypingNotification',data_server);
			}, TypingInterval);
		  }
		}
	};

	/*
		Function To get 'user information as well as invokes to get Chat list' 
	*/
	$scope.self.getUserInfo(function(userinfo){
		socket.emit('userInfo',userinfo.data); // sending user info to the server  
	});
  

	/*
		Function To show selected user from chat list  
	*/  
	$scope.hightlight_user=function(send_to_userinfo){

		console.log(send_to_userinfo);

		$scope.send_to_userinfo=send_to_userinfo;
		$scope.hightlight_id=send_to_userinfo.id;
		$scope.send_to_user_name=send_to_userinfo.name; 
		$scope.hightlight_socket_id=send_to_userinfo.socketId; 
		
		$scope.self.getMsg(send_to_userinfo,function(result){
		  $scope.msgs="";
		  if(result != 'null'){
			$scope.msgs=result;
		  }
		});
	};

	/*
		Function To get 'chat list' 
	*/
	$scope.get_recent_chats=function(){
		$scope.self.getRecentChats(function(offlineUsers){
			$scope.RecentUserList=offlineUsers;
		});
	};

	//upload file
	 $scope.complete = function(content) {
      console.log(content); // process content
    }

	/*
		Function To get 'start new chat list' 
	*/
	$scope.get_users_to_chats=function(){
		$scope.self.getUsersToChats(function(newUsers){
		  $scope.RecentUserList=newUsers;
		});
	};

	// delete chat
	$scope.delete_msg=function(msgId,fromModal,socketId,toid){
		if(fromModal==""){
			if($scope.send_to_userinfo != ""){
				if($scope.send_text==""){
					toasty.warning("Message can't be empty.");
				} else{

					console.log($scope.send_to_userinfo);
					delete $scope.send_to_userinfo;
					// console.log(msgId.$$hashKey);
					// console.log(msgId.$$hashKey.split(':')[1]);

					
					$scope.msgs.splice($scope.msgs[msgId.$$hashKey.split(':')[1]],1);
					// socket.emit('sendMsg',data);
					// return false;
					// var data={
					// 	socket_id:$scope.send_to_userinfo.socketId,
					// 	to_id:$scope.send_to_userinfo.id,
					// 	from_id:$scope.uid,
					// 	msg:$scope.send_text
					// };

					// // sending user info to the server starts

					// $scope.msgs.push({
					// 	msg:$scope.send_text,
					// 	from_id:$scope.uid,
					// 	to_id:$scope.send_to_userinfo.id,
					// 	timestamp:Math.floor(new Date() / 1000)
					// });
					// $scope.send_text="";
					// $scope.self.scrollDiv();
				}           
			}else{
			  toasty.danger("Select a user to send Message.");
			}  
		}
	}

	/*
		Function To send messages
	*/  
	$scope.send_msg=function(fromModal,socketId,toid){
		if(fromModal==""){
			if($scope.send_to_userinfo != ""){
				if($scope.send_text==""){
					toasty.warning("Message can't be empty.");
				} else{
					if($scope.myFile){

						var file_text = '/uploads/' + Date.now() + $scope.myFile.name;

						var file_ext=["image/png","image/jpg","image/jpeg","image/gif"];
				        var file_type_ok=true;
				        var file = $scope.myFile;
				        
				        var file_size=Math.round(file.size/1024);

				        file_ext.forEach(function(element, index){
				            if(element===(file.type).toLowerCase()){
				                file_type_ok=false;
				            }
				        });
				        
				        if(file_size>2048){
				            alert("Upload file below 500 KB.");
				        }else if(file_type_ok){
				            alert("Upload image file.");
				        }else{
				            var fd = new FormData();
				            fd.append('file', file);
				            fd.append('from_id', $scope.uid);
				            fd.append('to_id', $scope.send_to_userinfo.id);
				            fd.append('msg', $scope.send_text);

				            $http.post("/upload_img", fd, {
				                transformRequest: angular.identity,
				                headers: {'Content-Type': undefined}
				            })
				            .success(function(data, status, headers, config) {
				            	console.log(data);
				                if(data.is_logged){

				                	// $window.location.href = "/home#?id="+data.from_id;
				                	// console.log($window.location.href);
				                	// var id_ajaah = {id:$scope.uid}
									// $scope.self.getMsg(data.from_id,function(result){
									//   $scope.msgs=[];
									//   if(result != 'null'){
									// 	$scope.msgs=result;
									//   }
									// });
									// var data={
									// 	socket_id:$scope.send_to_userinfo.socketId,
									// 	to_id:$scope.send_to_userinfo.id,
									// 	from_id:$scope.uid,
									// 	msg:$scope.send_text,
									// 	file:file_text
									// };
									
									$scope.hightlight_user($scope.send_to_userinfo);
				                    $scope.LoginAlert = true;
				                    $scope.self.scrollDiv();
				                }else{
				                    $scope.LoginAlert = false;
				                }
				                $scope.myFile = '';
				            })
				            .error(function(){
				                alert("Connection Error");
				            });
				        }

					} else {

						var file_text = '';
						var data={
							socket_id:$scope.send_to_userinfo.socketId,
							to_id:$scope.send_to_userinfo.id,
							from_id:$scope.uid,
							msg:$scope.send_text,
							file:file_text
						};

						console.log(data);
						
					// sending user info to the server starts
					socket.emit('sendMsg',data);
					}

					$scope.msgs.push({
						photo:file_text,
						msg:$scope.send_text,
						from_id:$scope.uid,
						to_id:$scope.send_to_userinfo.id,
						timestamp:Math.floor(new Date() / 1000)
					});

					$scope.send_text="";
					// $window.location.href = "/home#?id="+$scope.uid;
					$scope.self.scrollDiv();
				}           
			}else{
			  toasty.error("Select a user to send Message.");
			}  
		}else{
			var getMsgText =angular.element( document.querySelector( '#msg_modal'+'_'+toid ) ).val();
			
			if(getMsgText==""){
				toasty.warning("Message can't be empty.");
			}else{
				var data={
					socket_id:null,
					to_id:toid,
					from_id:$scope.uid,
					msg:getMsgText,
					file:''
				};
				socket.emit('sendMsg',data);
			}
		}
	};

	// update profil

	$scope.profil = function(){
        var file_ext=["image/png","image/jpg","image/jpeg","image/gif"];
        var file_type_ok=true;
        var file = $scope.myFile;
        var file_size=Math.round(file.size/1024);

        file_ext.forEach(function(element, index){
            if(element===(file.type).toLowerCase()){
                file_type_ok=false;
            }
        });
        
        if(file_size>2048){
            alert("Upload file below 500 KB.");
        }else if(file_type_ok){
            alert("Upload image file.");
        }
        else{
            var fd = new FormData();
            fd.append('file', file);
            fd.append('id',$scope.uid);
            fd.append('username',$scope.username);
            fd.append('password',$scope.password);
            $http.post("/profil", fd, {
                transformRequest: angular.identity,
                headers: {'Content-Type': undefined}
            })
            .success(function(data, status, headers, config) {
                if(data.is_logged){
                    $scope.LoginAlert = true;
                    $window.location.href = "/";
                }else{
                    $scope.LoginAlert = false;
                }
            })
            .error(function(){
                alert("Connection Error");
            });
        }
    };


	/*
		To hide and show the Message box inside Modal
	*/
	$scope.hideShowMsgBox=function(id,action,$event){

		var hideShowEle = angular.element( document.querySelector( '.collapseMsgBox'+'_'+id ) ); 
		var hidEle=angular.element( document.querySelector( '.hideMSgBox'+'_'+id ) );
		var showEle=angular.element( document.querySelector( '.showMSgBox'+'_'+id ) );

		if(action=="hide"){
			hideShowEle.addClass('send-msg-hidden');
			hideShowEle.removeClass('send-msg-show');
			showEle.removeClass('send-msg-hidden');
			showEle.addClass('send-msg-show');
			hidEle.addClass('send-msg-hidden');
			hidEle.removeClass('send-msg-show');
		}else{
			hideShowEle.addClass('send-msg-show');
			hideShowEle.removeClass('send-msg-hidden');
			showEle.addClass('send-msg-hidden');
			showEle.removeClass('send-msg-show');
			hidEle.removeClass('send-msg-hidden');
			hidEle.addClass('send-msg-show');
		}
	}

	
	/*---------------------------------------------------------------------------------
		Socket on event starts
  	---------------------------------------------------------------------------------*/


  	/*
		Function to show messages.
  	*/
	socket.on('getMsg',function(data){
		if($scope.send_to_userinfo != ""){
	  		$scope.self.getMsg($scope.send_to_userinfo,function(result){
				$scope.msgs="";
				$scope.msgs=result;
				$scope.self.scrollDiv();
	  		});    
		}

		/*
	  		Using Toaster to show notifications
		*/
		toasty.info(data.name+" sent you a message", data.msg,5000);
  	});

	/*
		Function to update user list when one user goes offline.
	*/
  	socket.on('getTypingNotification',function(data){
		if(data.event_name=="keypress"){
	  		angular.element('#isTyping_'+data.data_uid).css('display','block');
		}else{
	  		angular.element('#isTyping_'+data.data_uid).css('display','none');      
		}
  	});

  	socket.on('exit',function(data){
  		$scope.self.getUserInfo(function(userinfo){
			socket.emit('userInfo',userinfo.data); // sending user info to the server  
		});
  	});
  	/*
		Function to show Chat List.
  	*/
	socket.on('userEntrance',function(data){
		$scope.userlist=data;
  	});

 
  	/*---------------------------------------------------------------------------------
		Socket on event Ends
  	---------------------------------------------------------------------------------*/
});