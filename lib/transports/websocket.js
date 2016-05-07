

  var latte_lib = require("latte_lib");
  var Transport = require('../transport');
  var parser = require('../parser');
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
  var latte_lib = require("latte_lib");
  var debug =latte_lib.debug.info;
	var WebSocket = window? window.WebSocket : require('ws');


  module.exports = WS;

    function WS(opts){
      var forceBase64 = (opts && opts.forceBase64);
      if (forceBase64) {
        this.supportsBinary = false;
      }
      this.perMessageDeflate = opts.perMessageDeflate;
      Transport.call(this, opts);
    }


    latte_lib.inherits(WS, Transport);
    (function() {
      this.name = "websocket";
      this.supportsBinary = true;
      this.doOpen = function(){
        if (!this.check()) {
          // let probe timeout
          return;
        }

        var self = this;
        var uri = this.uri();
        var protocols = void(0) ;
        var opts = {
          agent: this.agent,
          perMessageDeflate: this.perMessageDeflate
        };
					// SSL options for Node.js client
	        opts.pfx = this.pfx;
	        opts.key = this.key;
	        opts.passphrase = this.passphrase;
	        opts.cert = this.cert;
	        opts.ca = this.ca;
	        opts.ciphers = this.ciphers;
	        opts.rejectUnauthorized = this.rejectUnauthorized;
	        if (this.extraHeaders) {
	          opts.headers = this.extraHeaders;
	        }
					if ('undefined' != typeof navigator
						&& /iPad|iPhone|iPod/i.test(navigator.userAgent)) {
	        		this.ws = new WebSocket(uri);
					}else{
							this.ws = new WebSocket(uri, protocols, opts);
					}

	        if (this.ws.binaryType === undefined) {
	          this.supportsBinary = false;
	        }

	        this.ws.binaryType = 'arraybuffer';



        this.addEventListeners();
      };

      this.addEventListeners = function(){
        var self = this;
        this.ws.onopen = function(){
          self.onOpen();
        };
        this.ws.onclose = function(){
          self.onClose();
        };
        this.ws.onmessage = function(ev){
          self.onData(ev.data);
        };
        this.ws.onerror = function(e){
          self.onError('websocket error', e);
        };
      };

      this.write = function(packets){
        var self = this;
        this.writable = false;
        // encodePacket efficient as it uses WS framing
        // no need for encodePayload
        for (var i = 0, l = packets.length; i < l; i++) {
          var packet = packets[i];
          parser.encodePacket(packet, this.supportsBinary, function(data) {
            //Sometimes the websocket has already been closed but the browser didn't
            //have a chance of informing us about it yet, in that case send will
            //throw an error
            try {
              if (window  && window.WebSocket && self.ws instanceof window.WebSocket) {
                // TypeError is thrown when passing the second argument on Safari
                self.ws.send(data);
              } else {
                self.ws.send(data, packet.options);
              }
            } catch (e){

              debug('websocket closed before onclose event');
            }
          });
        }

        function ondrain() {
          self.writable = true;
          self.emit('drain');
        }
        // fake drain
        // defer to next tick to allow Socket to clear writeBuffer
        setTimeout(ondrain, 0);
      };

      this.onClose = function(){
        Transport.prototype.onClose.call(this);
      };

      this.doClose = function(){
        if (typeof this.ws !== 'undefined') {
          this.ws.close();
        }
      };

      this.uri = function(){
        var query = this.query || {};
        var schema = this.secure ? 'wss' : 'ws';
        var port = '';

        // avoid port if default for schema
        if (this.port && (('wss' == schema && this.port != 443)
          || ('ws' == schema && this.port != 80))) {
          port = ':' + this.port;
        }

        // append timestamp to URI
        if (this.timestampRequests) {
          query[this.timestampParam] = +new Date;
        }

        // communicate binary support capabilities
        if (!this.supportsBinary) {
          query.b64 = 1;
        }

        query = parseqs.encode(query);

        // prepend ? to query
        if (query.length) {
          query = '?' + query;
        }

        return schema + '://' + this.hostname + port + this.path + query;
      };

      this.check = function(){
        return !!WebSocket && !('__initialize' in WebSocket && this.name === WS.prototype.name);
      };
    }).call(WS.prototype);

    if(window) {
      if ('undefined' != typeof navigator
        && /iPad|iPhone|iPod/i.test(navigator.userAgent)) {
        WS.prototype.onData = function(data){
          var self = this;
          setTimeout(function(){
            Transport.prototype.onData.call(self, data);
          }, 0);
        };
      }
    }


	