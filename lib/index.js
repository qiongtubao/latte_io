
		var transports = require("./transports");
		var latte_lib = require("latte_lib");
		var debug = latte_lib.debug.info;
		var parser = require("./parser");
		var parseuri = function(str) {
			var re = /^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

			var parts = [
			    'source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'
			];
		    var src = str,
		        b = str.indexOf('['),
		        e = str.indexOf(']');

		    if (b != -1 && e != -1) {
		        str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ';') + str.substring(e, str.length);
		    }

		    var m = re.exec(str || ''),
		        uri = {},
		        i = 14;

		    while (i--) {
		        uri[parts[i]] = m[i] || '';
		    }

		    if (b != -1 && e != -1) {
		        uri.source = src;
		        uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ':');
		        uri.authority = uri.authority.replace('[', '').replace(']', '').replace(/;/g, ':');
		        uri.ipv6uri = true;
		    }

		    return uri;
		};
		var parsejson = function(data) {
			var rvalidchars = /^[\],:{}\s]*$/;
			var rvalidescape = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
			var rvalidtokens = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
			var rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g;
			var rtrimLeft = /^\s+/;
			var rtrimRight = /\s+$/;
		  if ('string' != typeof data || !data) {
		    return null;
		  }

		  data = data.replace(rtrimLeft, '').replace(rtrimRight, '');

		  // Attempt to parse using the native JSON parser first
		  if ( JSON.parse) {
		    return JSON.parse(data);
		  }

		  if (rvalidchars.test(data.replace(rvalidescape, '@')
		      .replace(rvalidtokens, ']')
		      .replace(rvalidbraces, ''))) {
		    return (new Function('return ' + data))();
		  }
		};
		var parseqs = {
			encode : function (obj) {
			  var str = '';

			  for (var i in obj) {
			    if (obj.hasOwnProperty(i)) {
			      if (str.length) str += '&';
			      str += encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]);
			    }
			  }

			  return str;
			},
			decode : function(qs){
			  var qry = {};
			  var pairs = qs.split('&');
			  for (var i = 0, l = pairs.length; i < l; i++) {
			    var pair = pairs[i].split('=');
			    qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
			  }
			  return qry;
			}
		};
		module.exports = Socket;
		function noop(){}

		/**
		 * Socket constructor.
		 *
		 * @param {String|Object} uri or options
		 * @param {Object} options
		 * @api public
		 */

		function Socket(uri, opts){
		  if (!(this instanceof Socket)) return new Socket(uri, opts);

		  opts = opts || {};

		  if (uri && 'object' == typeof uri) {
		    opts = uri;
		    uri = null;
		  }

		  if (uri) {
		    uri = parseuri(uri);
		    opts.host = uri.host;
		    opts.secure = uri.protocol == 'https' || uri.protocol == 'wss';
		    opts.port = uri.port;
				opts.path = uri.path;
		    if (uri.query) opts.query = uri.query;
		  }

		  this.secure = null != opts.secure ? opts.secure :
		    (window.location && 'https:' == location.protocol);

		  if (opts.host) {
		    var match = opts.host.match(/(\[.+\])(.+)?/)
		      , pieces;

		    if (match) {
		      opts.hostname = match[1];
		      if (match[2]) opts.port = match[2].slice(1);
		    } else {
		      pieces = opts.host.split(':');
		      opts.hostname = pieces.shift();
		      if (pieces.length) opts.port = pieces.pop();
		    }

		    // if `host` does not include a port and one is not specified manually,
		    // use the protocol default
		    if (!opts.port) opts.port = this.secure ? '443' : '80';
		  }

		  this.agent = opts.agent || false;
		  this.hostname = opts.hostname ||
		    (window.location ? location.hostname : 'localhost');
		  this.port = opts.port || (window.location && location.port ?
		       location.port :
		       (this.secure ? 443 : 80));
		  this.query = opts.query || {};
		  if ('string' == typeof this.query) this.query = parseqs.decode(this.query);
		  this.upgrade = false !== opts.upgrade;
		  this.path = (opts.path || '/engine.io').replace(/\/$/, '') + '/';
		  this.forceJSONP = !!opts.forceJSONP;
		  this.jsonp = false !== opts.jsonp;
		  this.forceBase64 = !!opts.forceBase64;
		  this.enablesXDR = !!opts.enablesXDR;
		  this.timestampParam = opts.timestampParam || 't';
		  this.timestampRequests = opts.timestampRequests;
		  this.transports = opts.transports || ['polling', 'websocket'];
		  this.readyState = '';
		  this.writeBuffer = [];
		  this.callbackBuffer = [];
		  this.policyPort = opts.policyPort || 843;
		  this.rememberUpgrade = opts.rememberUpgrade || false;
		  this.binaryType = null;
		  this.onlyBinaryUpgrades = opts.onlyBinaryUpgrades;
		  this.perMessageDeflate = false !== opts.perMessageDeflate ? (opts.perMessageDeflate || true) : false;

		  // SSL options for Node.js client
		  this.pfx = opts.pfx || null;
		  this.key = opts.key || null;
		  this.passphrase = opts.passphrase || null;
		  this.cert = opts.cert || null;
		  this.ca = opts.ca || null;
		  this.ciphers = opts.ciphers || null;
		  this.rejectUnauthorized = opts.rejectUnauthorized || null;

		  // other options for Node.js client
		  var freeGlobal = typeof window == 'object' && window;
		  if (freeGlobal.global === freeGlobal) {
		    if (opts.extraHeaders && Object.keys(opts.extraHeaders).length > 0) {
		      this.extraHeaders = opts.extraHeaders;
		    }
		  }
		  this.open();
		};
		(function() {
			this.priorWebsocketSuccess = false;
		}).call(Socket);

		/**
		 * Mix in `Emitter`.
		 */

		latte_lib.inherits(Socket, latte_lib.events);

		(function() {
			this.createTransport = function(name) {
				debug("create transport '%s' ", name);

				var query = latte_lib.clone(this.query);
				query.EIO = parser.protocol;
				query.transport = name;
				if(this.id) query.sid = this.id;
				var transport = new transports[name]({
					agent: this.agent,
				    hostname: this.hostname,
				    port: this.port,
				    secure: this.secure,
				    path: this.path,
				    query: query,
				    forceJSONP: this.forceJSONP,
				    jsonp: this.jsonp,
				    forceBase64: this.forceBase64,
				    enablesXDR: this.enablesXDR,
				    timestampRequests: this.timestampRequests,
				    timestampParam: this.timestampParam,
				    policyPort: this.policyPort,
				    socket: this,
				    pfx: this.pfx,
				    key: this.key,
				    passphrase: this.passphrase,
				    cert: this.cert,
				    ca: this.ca,
				    ciphers: this.ciphers,
				    rejectUnauthorized: this.rejectUnauthorized,
				    perMessageDeflate: this.perMessageDeflate,
				    extraHeaders: this.extraHeaders
				});
				return transport;
			}
			this.open = function() {
				var transport;
				if (this.rememberUpgrade && Socket.priorWebsocketSuccess && this.transports.indexOf('websocket') != -1) {
					transport = 'websocket';
				} else if (0 === this.transports.length) {
					// Emit error on next tick so it can be listened to
					var self = this;
					setTimeout(function() {
						self.emit('error', 'No transports available');
					}, 0);
					return;
				} else {
					transport = this.transports[0];
				}
				this.readyState = 'opening';

				// Retry with the next transport if the transport is disabled (jsonp: false)
				//var transport;

				try {
					transport = this.createTransport(transport);
				} catch (e) {
					this.transports.shift();
					this.open();
					return;
				}

				transport.open();
				this.setTransport(transport);
			};
			this.setTransport = function(transport) {
				debug("setting transport %s", transport.name);
				var self = this;
				if(this.transport) {
					debug("clearing existing transport %s", this.transport.name);
					this.transport.removeAllListeners();
				}
				this.transport = transport;
				transport
				.on('drain', function(){
					self.onDrain();
				})
				.on('packet', function(packet){
					self.onPacket(packet);
				})
				.on('error', function(e){
					self.onError(e);
				})
				.on('close', function(){
					self.onClose('transport close');
				});
			};
			this.probe = function (name) {
			  debug('probing transport "%s"', name);
			  var transport = this.createTransport(name, { probe: 1 })
			    , failed = false
			    , self = this;

			  Socket.priorWebsocketSuccess = false;

			  function onTransportOpen(){
			    if (self.onlyBinaryUpgrades) {
			      var upgradeLosesBinary = !this.supportsBinary && self.transport.supportsBinary;
			      failed = failed || upgradeLosesBinary;
			    }
			    if (failed) return;

			    debug('probe transport "%s" opened', name);
			    transport.send([{ type: 'ping', data: 'probe', options: { compress: true } }]);
			    transport.once('packet', function (msg) {
			      if (failed) return;
			      if ('pong' == msg.type && 'probe' == msg.data) {
			        debug('probe transport "%s" pong', name);
			        self.upgrading = true;
			        self.emit('upgrading', transport);
			        if (!transport) return;
			        Socket.priorWebsocketSuccess = 'websocket' == transport.name;

			        debug('pausing current transport "%s"', self.transport.name);
			        self.transport.pause(function () {
			          if (failed) return;
			          if ('closed' == self.readyState) return;
			          debug('changing transport and sending upgrade packet');

			          cleanup();

			          self.setTransport(transport);
			          transport.send([{ type: 'upgrade', options: { compress: true } }]);
			          self.emit('upgrade', transport);
			          transport = null;
			          self.upgrading = false;
			          self.flush();
			        });
			      } else {
			        debug('probe transport "%s" failed', name);
			        var err = new Error('probe error');
			        err.transport = transport.name;
			        self.emit('upgradeError', err);
			      }
			    });
			  }

			  function freezeTransport() {
			    if (failed) return;

			    // Any callback called by transport should be ignored since now
			    failed = true;

			    cleanup();

			    transport.close();
			    transport = null;
			  }

			  //Handle any error that happens while probing
			  function onerror(err) {
			    var error = new Error('probe error: ' + err);
			    error.transport = transport.name;

			    freezeTransport();

			    debug('probe transport "%s" failed because of error: %s', name, err);

			    self.emit('upgradeError', error);
			  }

			  function onTransportClose(){
			    onerror("transport closed");
			  }

			  //When the socket is closed while we're probing
			  function onclose(){
			    onerror("socket closed");
			  }

			  //When the socket is upgraded while we're probing
			  function onupgrade(to){
			    if (transport && to.name != transport.name) {
			      debug('"%s" works - aborting "%s"', to.name, transport.name);
			      freezeTransport();
			    }
			  }

			  //Remove all listeners on the transport and on self
			  function cleanup(){
			    transport.removeListener('open', onTransportOpen);
			    transport.removeListener('error', onerror);
			    transport.removeListener('close', onTransportClose);
			    self.removeListener('close', onclose);
			    self.removeListener('upgrading', onupgrade);
			  }

			  transport.once('open', onTransportOpen);
			  transport.once('error', onerror);
			  transport.once('close', onTransportClose);

			  this.once('close', onclose);
			  this.once('upgrading', onupgrade);

			  transport.open();

			};

			this.onOpen = function () {
			  debug('socket open');
			  this.readyState = 'open';
			  Socket.priorWebsocketSuccess = 'websocket' == this.transport.name;
			  this.emit('open');
			  this.flush();

			  // we check for `readyState` in case an `open`
			  // listener already closed the socket
			  if ('open' == this.readyState && this.upgrade && this.transport.pause) {
			    debug('starting upgrade probes');
			    for (var i = 0, l = this.upgrades.length; i < l; i++) {
			      this.probe(this.upgrades[i]);
			    }
			  }
			};
			this.onPacket = function (packet) {
			  if ('opening' == this.readyState || 'open' == this.readyState) {
			    debug('socket receive: type "%s", data "%s"', packet.type, packet.data);

			    this.emit('packet', packet);

			    // Socket is live - any packet counts
			    this.emit('heartbeat');

			    switch (packet.type) {
			      case 'open':
			        this.onHandshake(parsejson(packet.data));
			        break;

			      case 'pong':
			        this.setPing();
			        this.emit('pong');
			        break;

			      case 'error':
			        var err = new Error('server error');
			        err.code = packet.data;
			        this.onError(err);
			        break;

			      case 'message':
			        this.emit('data', packet.data);
			        this.emit('message', packet.data);
			        break;
			    }
			  } else {
			    debug('packet received with socket readyState "%s"', this.readyState);
			  }
			};
			this.onHandshake = function (data) {

			  this.emit('handshake', data);
			  this.id = data.sid;
			  this.transport.query.sid = data.sid;
			  this.upgrades = this.filterUpgrades(data.upgrades);
			  this.pingInterval = data.pingInterval;
			  this.pingTimeout = data.pingTimeout;
			  this.onOpen();
			  // In case open handler closes socket
			  if  ('closed' == this.readyState) return;
			  this.setPing();

			  // Prolong liveness of socket on heartbeat
			  this.removeListener('heartbeat', this.onHeartbeat);
			  this.on('heartbeat', this.onHeartbeat);
			};
			this.onHeartbeat = function (timeout) {
			  clearTimeout(this.pingTimeoutTimer);
			  var self = this;
			  self.pingTimeoutTimer = setTimeout(function () {
			    if ('closed' == self.readyState) return;
			    self.onClose('ping timeout');
			  }, timeout || (self.pingInterval + self.pingTimeout));
			};

			this.setPing = function () {
			  var self = this;
			  clearTimeout(self.pingIntervalTimer);
			  self.pingIntervalTimer = setTimeout(function () {
			    debug('writing ping packet - expecting pong within %sms', self.pingTimeout);
			    self.ping();
			    self.onHeartbeat(self.pingTimeout);
			  }, self.pingInterval);
			};
			this.ping = function () {
			  var self = this;
			  this.sendPacket('ping', function(){
			    self.emit('ping');
			  });
			};

			this.onDrain = function() {
			  for (var i = 0; i < this.prevBufferLen; i++) {
			    if (this.callbackBuffer[i]) {
			      this.callbackBuffer[i]();
			    }
			  }

			  this.writeBuffer.splice(0, this.prevBufferLen);
			  this.callbackBuffer.splice(0, this.prevBufferLen);

			  // setting prevBufferLen = 0 is very important
			  // for example, when upgrading, upgrade packet is sent over,
			  // and a nonzero prevBufferLen could cause problems on `drain`
			  this.prevBufferLen = 0;

			  if (0 === this.writeBuffer.length) {
			    this.emit('drain');
			  } else {
			    this.flush();
			  }
			};

			this.flush = function () {
			  if ('closed' != this.readyState && this.transport.writable &&
			    !this.upgrading && this.writeBuffer.length) {
			    debug('flushing %d packets in socket', this.writeBuffer.length);
			    this.transport.send(this.writeBuffer);
			    // keep track of current length of writeBuffer
			    // splice writeBuffer and callbackBuffer on `drain`
			    this.prevBufferLen = this.writeBuffer.length;
			    this.emit('flush');
			  }
			};



			this.write =
			this.send = function (msg, options, fn) {
			  this.sendPacket('message', msg, options, fn);
			  return this;
			};

		this.sendPacket = function (type, data, options, fn) {
		  if('function' == typeof data) {
		    fn = data;
		    data = undefined;
		  }

		  if ('function' == typeof options) {
		    fn = options;
		    options = null;
		  }

		  if ('closing' == this.readyState || 'closed' == this.readyState) {
		    return;
		  }

		  options = options || {};
		  options.compress = false !== options.compress;

		  var packet = {
		    type: type,
		    data: data,
		    options: options
		  };
		  this.emit('packetCreate', packet);
		  this.writeBuffer.push(packet);
		  this.callbackBuffer.push(fn);
		  this.flush();
		};

		/**
		 * Closes the connection.
		 *
		 * @api private
		 */

		this.close = function () {
		  if ('opening' == this.readyState || 'open' == this.readyState) {
		    this.readyState = 'closing';

		    var self = this;

		    if (this.writeBuffer.length) {
		      this.once('drain', function() {
		        if (this.upgrading) {
		          waitForUpgrade();
		        } else {
		          close();
		        }
		      });
		    } else if (this.upgrading) {
		      waitForUpgrade();
		    } else {
		      close();
		    }
		  }

		  function close() {
		    self.onClose('forced close');
		    debug('socket closing - telling transport to close');
		    self.transport.close();
		  }

		  function cleanupAndClose() {
		    self.removeListener('upgrade', cleanupAndClose);
		    self.removeListener('upgradeError', cleanupAndClose);
		    close();
		  }

		  function waitForUpgrade() {
		    // wait for upgrade to finish since we can't send packets while pausing a transport
		    self.once('upgrade', cleanupAndClose);
		    self.once('upgradeError', cleanupAndClose);
		  }

		  return this;
		};

		this.onError = function (err) {
		  debug('socket error %j', err);
		  Socket.priorWebsocketSuccess = false;
		  this.emit('error', err);
		  this.onClose('transport error', err);
		};

		this.onClose = function (reason, desc) {
		  if ('opening' == this.readyState || 'open' == this.readyState || 'closing' == this.readyState) {
		    debug('socket close with reason: "%s"', reason);
		    var self = this;

		    // clear timers
		    clearTimeout(this.pingIntervalTimer);
		    clearTimeout(this.pingTimeoutTimer);

		    // clean buffers in next tick, so developers can still
		    // grab the buffers on `close` event
		    setTimeout(function() {
		      self.writeBuffer = [];
		      self.callbackBuffer = [];
		      self.prevBufferLen = 0;
		    }, 0);

		    // stop event from firing again for transport
		    this.transport.removeAllListeners('close');

		    // ensure transport won't stay open
		    this.transport.close();

		    // ignore further transport communication
		    this.transport.removeAllListeners();

		    // set ready state
		    this.readyState = 'closed';

		    // clear session id
		    this.id = null;

		    // emit close event
		    this.emit('close', reason, desc);
		  }
		};

		this.filterUpgrades = function (upgrades) {
		  var filteredUpgrades = [];
		  for (var i = 0, j = upgrades.length; i<j; i++) {
		    if (~this.transports.indexOf(upgrades[i])) filteredUpgrades.push(upgrades[i]);
		  }
		  return filteredUpgrades;
		};
	}).call(Socket.prototype);







