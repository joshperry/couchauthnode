#!/usr/bin/env node

var net = require('net'),
	carrier	= require('carrier');

carrier.carry(process.stdin, function(line) {
	var reqvals = data.split(' ');

	switch(reqvals[0]) {
		case 'CHECK-PASSWORD':
			if(reqvals[1] === 'test@example.com' && reqvals[2] === 'dGhpc2lzYXBhc3N3b3Jk')
				process.stdout.write('OK\n');
			else
				process.stdout.write('NO\n');

			break;

		case 'USER-EXISTS':
			if(reqvals[1] === 'test@example.com')
				process.stdout.write('OK\n');
			else
				process.stdout.write('NO\n');

			break;

		default:
			process.stdout.write('NO\n');
	}
});

// Tell jabberd that we are here and what requests we support
process.stdout.write('OK USER-EXISTS CHECK-PASSWORD\n');
