
		var latte_lib = require("latte_lib");
		function Socket(url, opts) {
			this.buffers = [];
			this.methods =  {};
			this.id = 0;
			this.url = url;
			this.opts = opts;
			this.open();
			this.isRestart = 1;
		};
		latte_lib.inherits(Socket, latte_lib.events);
		(function() {
			this.close = function() {
				this.isRestart = 0;
				this.socket.close();
			}
			this.open = function() {
				var Socket = require("./index");
				var socket = this.socket = new Socket(this.url, this.opts);
				var self = this;
				socket.on("open", function() {
					self.emit("open");
					var buffer ;
					while(buffer = self.buffers.unshift()) {
						self.write(buffer);
					}
				});
				socket.on("close", function() {
					self.socket = null;
					self.emit("close");
					if(self.isRestart){
						self.open();
					}
				});
				socket.on("error", function(error) {
						console.log(error);
				});
				socket.on("message", function(data) {
					self.onData(data);
				});

			}
			this.send = function(handle, params, callback) {
				var self = this;
				console.log(handle, params);
				if(this.socket) {
					this.write({
						method: handle,
						params: params,
						id: ++self.id
					});
				}else{
					this.buffers.push({
						method: handle,
						params: params,
						id: ++self.id
					});
				}
				callback && this.once(self.id, callback);

			}
				var backData = function(err, result, id) {
					return {
						error: err,
						result: result,
						id: id
					};
				}
			this.write = function(data) {
				this.socket.send(JSON.stringify(data));
			}
			this.Set = function(method, fn) {
				this.methods[method] = fn;
			}
			this.onData = function(data) {
				data = JSON.parse(data)
				var self = this;
				if(data.method) {
					var method = self.methods[data.method];
					if(method) {
						if(!latte_lib.isArray(data.params)) {
							data.params = [].concat(data.params);
						}
						data.params.push(function(err, result){
							self.write(backData(err, result, data.id));
						});
						method.apply(self, data.params);
					}

				}else if(data.id) {
					self.emit(data.id, data.error, data.result);
				}else if(data.code) {
					self.emit("error", data);
					self.close();
				}
			}

		}).call(Socket.prototype);
		module.exports = Socket;
	