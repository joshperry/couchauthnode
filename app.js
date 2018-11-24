var net 	= require('net'),
	fs		= require('fs'),
  path = require('path'),
	events 	= require('events'),
	util 	= require('util'),
	carrier	= require('carrier');


var dbuser = process.env.COUCH_USER,
	dbpass = process.env.COUCH_PASSWORD,
	db = require('nano')('http://' + dbuser + ':' + dbpass + '@localhost:5984/mail');

var postfixHandler = function(serviceName, getHandler) {
	var clientId = 0;

	// Default to return nothing
	if(!getHandler) {
		getHandler = function() { return ''; }
	}

	return function(client) {
		var service = serviceName + '(' + clientId++ + ')';
		console.log(service + ': Postfix client connected');
		client.on('end', function() { console.log(service + ': Postfix client disconnected'); });

		carrier.carry(client, null, 'ascii')
			.on('line', function(line) {
				// Make sure this is a get request and that it has a parameter
				line = line.toLowerCase();
				var tokens = line.split(' ');
				if(tokens.length == 2 && tokens[0] == 'get') {
					// Unescape the parameter value
					var reqval = unescape(tokens[1]);
					console.log(service + ': Got get request ' + reqval);

					// Have the subclass do its lookup
					getHandler(reqval, function(respval) {
						if(respval) {
							console.log(service + ': responding with ' + respval);
							client.write('200 ' + respval + '\n');
						} else {
							console.log(service + ': responding with Not Found');
							client.write('500 Not Found\n');
						}
					});
				} else {
					console.log(service + ': got an unknow request line (' + line + ')');
					client.write('400 Unknown or unsupported request type\n');
				}
			})
			.on('end', function() {
				client.end();
			});
	};
};

var domainHandler = function() {
	return postfixHandler('domain', function(domain, callback) {
		db.get(domain, function(err, body) {
			if(!err)
				callback('OK');
			else
				callback('');
		});
	});
};

var mailboxHandler = function() {
	return postfixHandler('mailbox', function(username, callback) {
		db.get(username, function(err, body) {
			if(!err) 
				callback(username);
			else
				callback('');
		});
	});
};

var aliasHandler = function() {
	return postfixHandler('alias', function(alias, callback) {
		db.get('alias-' + alias, function(err, body) {
			if(!err) 
				callback(body.target);
			else
				callback('');
		});
	});
};

var dovecotEscape = function(str) {
	return str.replace(/\001/g,'\0011')
		.replace(/\n/g,'\001n')
		.replace(/\t/g, '\001t');
}

var dovecotAuthHandler = function() {
	// Dovecot makes one request per connection
	var CMD_HELLO = 'H';
	var CMD_LOOKUP = 'L';

	var vars = {};

	return function(client) {
		console.log('Dovecot: client connected');
		client.on('end', function() { console.log('Dovecot: client disconnected'); });

		carrier.carry(client, null, 'ascii')
			.on('line', function(line) {
				console.log('Dovecot: got request line (' + line + ')');
				var cmd = line[0];

				switch(cmd) {
					case CMD_HELLO:
						var vals = line.substring(1).split('\t');
						vars.table = vals[4];
						vars.user = vals[3];
						break;

					case CMD_LOOKUP:
						switch(vars.table) {
							case 'auth':
								vars.user = line.split('/')[1];
								console.log('Dovecot: looking up auth for ' + vars.user);
								db.get(vars.user, function(err, body) {
									if(!err) {
										console.log("Dovecot: Found entry in db for " + body._id);
										client.write('O');
										client.write(JSON.stringify({ password : body.password }));
										client.write('\n');
									} else {
										console.log('Dovecot: responding with Not Found');
										client.write('N\n');
									}
								});
								break;

							case 'sieve':
								console.log('Dovecot: looking up sieve for ' + vars.user);
								var paths = line.split('/');
								if(paths[2] === 'name') {
									// Dovecot caches the compiled script based on the ID we return
									// so let's return a composite key based on the _id and _rev of the script
									db.get(vars.user, function(err, body) {
										if(!err) {
											db.get(body.sieve[paths[3]], function(err, body) {
												if(!err) {
													console.log("Dovecot: Found entry in db for " + body._id);
													client.write('O');
													client.write(body._id + "+" + body._rev);
													client.write('\n');
												} else {
													console.log('Dovecot: could not find the script document for the user');
													client.write('N\n');
												}
											});
										} else {
											console.log('Dovecot: could not find script with that name for user');
											client.write('N\n');
										}
									});
								} else if(paths[2] === 'data') {
									db.get(paths[3].split('+')[0], function(err, body) {
										if(!err) {
											console.log("Dovecot: Found entry in db for " + body._id);
											client.write('O');
											client.write(dovecotEscape(body.script));
											client.write('\n');
										} else {
											console.log('Dovecot: could not find script with that id');
											client.write('N\n');
										}
									});
								}
								break;
						}
						break;
				}
			})
			.on('end', function() {
				client.end();
			});
	}
};

net.createServer(domainHandler()).listen(40571, 'localhost');
net.createServer(mailboxHandler()).listen(40572, 'localhost');
net.createServer(aliasHandler()).listen(40573, 'localhost');


var dovecotSocket = '/var/run/couchmail/dovecot-auth.sock';
fs.mkdirSync(path.dirname(dovecotSocket));

var dovecotServer = net.createServer(dovecotAuthHandler());
var startDovecotServer = function() {
	var oldumask = process.umask(000);
	dovecotServer.listen(dovecotSocket, function() { process.umask(oldumask); });
}

// See if the socket file already exists
if(fs.existsSync(dovecotSocket)) {
	// See if a server process is listening on it already
	console.log('Dovecot: auth socket already exists');
    new net.Socket()
		.on('error', function(e) {
			console.log('Dovecot: could not connect to socket ' + e.code);
			// handle error trying to talk to server
			if (e.code == 'ECONNREFUSED') {
				console.log('Dovecot: deleting unused server socket');
				// No other server listening so delete the file
				fs.unlink(dovecotSocket);
				startDovecotServer();
			}
		})
		.connect({path: dovecotSocket}, function() { 
			console.log('Server alreadyrunning, giving up...');
			process.exit();
		});	
} else {
	startDovecotServer();
}

