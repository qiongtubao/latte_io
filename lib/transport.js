
	/**
	 * Module dependencies.
	 */

	var parser = require('./parser');
	var latte_lib = require("latte_lib");

	/**
	 * Module exports.
	 */

	module.exports = Transport;

	/**
	 * Transport abstract constructor.
	 *
	 * @param {Object} options.
	 * @api private
	 */

	function Transport (opts) {
	  this.path = opts.path;
	  this.hostname = opts.hostname;
	  this.port = opts.port;
	  this.secure = opts.secure;
	  this.query = opts.query;
	  this.timestampParam = opts.timestampParam;
	  this.timestampRequests = opts.timestampRequests;
	  this.readyState = '';
	  this.agent = opts.agent || false;
	  this.socket = opts.socket;
	  this.enablesXDR = opts.enablesXDR;

	  // SSL options for Node.js client
	  this.pfx = opts.pfx;
	  this.key = opts.key;
	  this.passphrase = opts.passphrase;
	  this.cert = opts.cert;
	  this.ca = opts.ca;
	  this.ciphers = opts.ciphers;
	  this.rejectUnauthorized = opts.rejectUnauthorized;

	  // other options for Node.js client
	  this.extraHeaders = opts.extraHeaders;
	}

	/**
	 * Mix in `Emitter`.
	 */
 	latte_lib.inherits(Transport, latte_lib.events);

	/**
	 * A counter used to prevent collisions in the timestamps used
	 * for cache busting.
	 */
	(function() {
		this.onError = function (msg, desc) {
		  var err = new Error(msg);
		  err.type = 'TransportError';
		  err.description = desc;
		  this.emit('error', err);
		  return this;
		};
		this.open = function () {
		  if ('closed' == this.readyState || '' == this.readyState) {
		    this.readyState = 'opening';
		    this.doOpen();
		  }

		  return this;
		};
		this.close = function () {
		  if ('opening' == this.readyState || 'open' == this.readyState) {
		    this.doClose();
		    this.onClose();
		  }

		  return this;
		};
		this.send = function(packets){
		  if ('open' == this.readyState) {
		    this.write(packets);
		  } else {
		    throw new Error('Transport not open');
		  }
		};
		this.onOpen = function () {
		  this.readyState = 'open';
		  this.writable = true;
		  this.emit('open');
		};
		this.onData = function(data){
		  var packet = parser.decodePacket(data, this.socket.binaryType);
		  this.onPacket(packet);
		};
		this.onPacket = function (packet) {
		  this.emit('packet', packet);
		};
		this.onClose = function () {
		  this.readyState = 'closed';
		  this.emit('close');
		};
	}).call(Transport.prototype);
	Transport.timestamps = 0;

