
		var latte_lib = require("latte_lib");
		var utf8 = latte_lib.utf8;
		var noop = function() {};
		var after = function(count, callback, err_cb) {
		    var bail = false
		    err_cb = err_cb || noop
		    proxy.count = count

		    return (count === 0) ? callback() : proxy

		    function proxy(err, result) {
		        if (proxy.count <= 0) {
		            throw new Error('after called too many times')
		        }
		        --proxy.count

		        // after first error, rest are passed to err_cb
		        if (err) {
		            bail = true
		            callback(err)
		            // future error callbacks will go to error handler
		            callback = err_cb
		        } else if (proxy.count === 0 && !bail) {
		            callback(null, result)
		        }
		    }
		};
		var keys = Object.keys;


		if(!window) {

			var keys = Object.keys;

		var err = { type: 'error', data: 'parser error' };
		(function() {
				this.protocol = 3;
				var packets = this.packets = {
				    open:     0    // non-ws
				  , close:    1    // non-ws
				  , ping:     2
				  , pong:     3
				  , message:  4
				  , upgrade:  5
				  , noop:     6
				};
				var packetslist = keys(packets);
				this.encodePacket = function (packet, supportsBinary, utf8encode, callback) {
				  if ('function' == typeof supportsBinary) {
				    callback = supportsBinary;
				    supportsBinary = null;
				  }

				  if ('function' == typeof utf8encode ) {
				    callback = utf8encode;
				    utf8encode = null;
				  }

				  var data = (packet.data === undefined)
				    ? undefined
				    : packet.data.buffer || packet.data;

				  if (Buffer.isBuffer(data)) {
				    return encodeBuffer(packet, supportsBinary, callback);
				  } else if (data instanceof ArrayBuffer) {
				    return encodeArrayBuffer(packet, supportsBinary, callback);
				  }

				  // Sending data as a utf-8 string
				  var encoded = packets[packet.type];

				  // data fragment is optional
				  if (undefined !== packet.data) {
				    encoded += utf8encode ? utf8.encode(String(packet.data)) : String(packet.data);
				  }

				  return callback('' + encoded);
				};

					function encodeBuffer(packet, supportsBinary, callback) {
					  var data = packet.data;
					  if (!supportsBinary) {
					    return exports.encodeBase64Packet(packet, callback);
					  }

					  var typeBuffer = new Buffer(1);
					  typeBuffer[0] = packets[packet.type];
					  return callback(Buffer.concat([typeBuffer, data]));
					}

					function encodeArrayBuffer(packet, supportsBinary, callback) {
					  var data = (packet.data === undefined)
					    ? undefined
					    : packet.data.buffer || packet.data;

					  if (!supportsBinary) {
					    return exports.encodeBase64Packet(packet, callback);
					  }

					  var contentArray = new Uint8Array(data);
					  var resultBuffer = new Buffer(1 + data.byteLength);

					  resultBuffer[0] = packets[packet.type];
					  for (var i = 0; i < contentArray.length; i++){
					    resultBuffer[i+1] = contentArray[i];
					  }
					  return callback(resultBuffer);
					}
				this.encodeBase64Packet = function(packet, callback){
				  var data = packet.data.buffer || packet.data;
				  if (data instanceof ArrayBuffer) {
				    var buf = new Buffer(data.byteLength);
				    for (var i = 0; i < buf.length; i++) {
				      buf[i] = data[i];
				    }
				    packet.data = buf;
				  }

				  var message = 'b' + packets[packet.type];
				  message += packet.data.toString('base64');
				  return callback(message);
				};
				this.decodePacket = function (data, binaryType, utf8decode) {
				  // String data
				  if (typeof data == 'string' || data === undefined) {
				    if (data.charAt(0) == 'b') {
				      return exports.decodeBase64Packet(data.substr(1), binaryType);
				    }

				    var type = data.charAt(0);
				    if (utf8decode) {
				      try {
				        data = utf8.decode(data);
				      } catch (e) {
				        return err;
				      }
				    }

				    if (Number(type) != type || !packetslist[type]) {
				      return err;
				    }

				    if (data.length > 1) {
				      return { type: packetslist[type], data: data.substring(1) };
				    } else {
				      return { type: packetslist[type] };
				    }
				  }

				  // Binary data
				  if (binaryType === 'arraybuffer') {
				    var type = data[0];
				    var intArray = new Uint8Array(data.length - 1);
				    for (var i = 1; i < data.length; i++) {
				      intArray[i - 1] = data[i];
				    }
				    return { type: packetslist[type], data: intArray.buffer };
				  }
				  var type = data[0];
				  return { type: packetslist[type], data: data.slice(1) };
				};

				this.decodeBase64Packet = function(msg, binaryType) {
				  var type = packetslist[msg.charAt(0)];
				  var data = new Buffer(msg.substr(1), 'base64');
				  if (binaryType === 'arraybuffer') {
				    var abv = new Uint8Array(data.length);
				    for (var i = 0; i < abv.length; i++){
				      abv[i] = data[i];
				    }
				    data = abv.buffer;
				  }
				  return { type: type, data: data };
				};
				this.encodePayload = function (packets, supportsBinary, callback) {
				  if (typeof supportsBinary == 'function') {
				    callback = supportsBinary;
				    supportsBinary = null;
				  }

				  if (supportsBinary) {
				    return exports.encodePayloadAsBinary(packets, callback);
				  }

				  if (!packets.length) {
				    return callback('0:');
				  }

				  function setLengthHeader(message) {
				    return message.length + ':' + message;
				  }

				  function encodeOne(packet, doneCallback) {
				    exports.encodePacket(packet, supportsBinary, true, function(message) {
				      doneCallback(null, setLengthHeader(message));
				    });
				  }

				  map(packets, encodeOne, function(err, results) {
				    return callback(results.join(''));
				  });
				};
				function map(ary, each, done) {
				  var result = new Array(ary.length);
				  var next = after(ary.length, done);

				  var eachWithIndex = function(i, el, cb) {
				    each(el, function(error, msg) {
				      result[i] = msg;
				      cb(error, result);
				    });
				  };

				  for (var i = 0; i < ary.length; i++) {
				    eachWithIndex(i, ary[i], next);
				  }
				}

				this.decodePayload = function (data, binaryType, callback) {
				  if ('string' != typeof data) {
				    return exports.decodePayloadAsBinary(data, binaryType, callback);
				  }

				  if (typeof binaryType === 'function') {
				    callback = binaryType;
				    binaryType = null;
				  }

				  var packet;
				  if (data == '') {
				    // parser error - ignoring payload
				    return callback(err, 0, 1);
				  }

				  var length = ''
				    , n, msg;

				  for (var i = 0, l = data.length; i < l; i++) {
				    var chr = data.charAt(i);

				    if (':' != chr) {
				      length += chr;
				    } else {
				      if ('' == length || (length != (n = Number(length)))) {
				        // parser error - ignoring payload
				        return callback(err, 0, 1);
				      }

				      msg = data.substr(i + 1, n);

				      if (length != msg.length) {
				        // parser error - ignoring payload
				        return callback(err, 0, 1);
				      }

				      if (msg.length) {
				        packet = exports.decodePacket(msg, binaryType, true);

				        if (err.type == packet.type && err.data == packet.data) {
				          // parser error in individual packet - ignoring payload
				          return callback(err, 0, 1);
				        }

				        var ret = callback(packet, i + n, l);
				        if (false === ret) return;
				      }

				      // advance cursor
				      i += n;
				      length = '';
				    }
				  }

				  if (length != '') {
				    // parser error - ignoring payload
				    return callback(err, 0, 1);
				  }

				};
					function bufferToString(buffer) {
					  var str = '';
					  for (var i = 0; i < buffer.length; i++) {
					    str += String.fromCharCode(buffer[i]);
					  }
					  return str;
					}

					function stringToBuffer(string) {
					  var buf = new Buffer(string.length);
					  for (var i = 0; i < string.length; i++) {
					    buf.writeUInt8(string.charCodeAt(i), i);
					  }
					  return buf;
					}
				this.encodePayloadAsBinary = function (packets, callback) {
				  if (!packets.length) {
				    return callback(new Buffer(0));
				  }

				  function encodeOne(p, doneCallback) {
				    exports.encodePacket(p, true, true, function(packet) {

				      if (typeof packet === 'string') {
				        var encodingLength = '' + packet.length;
				        var sizeBuffer = new Buffer(encodingLength.length + 2);
				        sizeBuffer[0] = 0; // is a string (not true binary = 0)
				        for (var i = 0; i < encodingLength.length; i++) {
				          sizeBuffer[i + 1] = parseInt(encodingLength[i], 10);
				        }
				        sizeBuffer[sizeBuffer.length - 1] = 255;
				        return doneCallback(null, Buffer.concat([sizeBuffer, stringToBuffer(packet)]));
				      }

				      var encodingLength = '' + packet.length;
				      var sizeBuffer = new Buffer(encodingLength.length + 2);
				      sizeBuffer[0] = 1; // is binary (true binary = 1)
				      for (var i = 0; i < encodingLength.length; i++) {
				        sizeBuffer[i + 1] = parseInt(encodingLength[i], 10);
				      }
				      sizeBuffer[sizeBuffer.length - 1] = 255;
				      doneCallback(null, Buffer.concat([sizeBuffer, packet]));
				    });
				  }

				  map(packets, encodeOne, function(err, results) {
				    return callback(Buffer.concat(results));
				  });
				};

				this.decodePayloadAsBinary = function (data, binaryType, callback) {
				  if (typeof binaryType === 'function') {
				    callback = binaryType;
				    binaryType = null;
				  }

				  var bufferTail = data;
				  var buffers = [];

				  while (bufferTail.length > 0) {
				    var strLen = '';
				    var isString = bufferTail[0] === 0;
				    var numberTooLong = false;
				    for (var i = 1; ; i++) {
				      if (bufferTail[i] == 255)  break;
				      // 310 = char length of Number.MAX_VALUE
				      if (strLen.length > 310) {
				        numberTooLong = true;
				        break;
				      }
				      strLen += '' + bufferTail[i];
				    }
				    if(numberTooLong) return callback(err, 0, 1);
				    bufferTail = bufferTail.slice(strLen.length + 1);

				    var msgLength = parseInt(strLen, 10);

				    var msg = bufferTail.slice(1, msgLength + 1);
				    if (isString) msg = bufferToString(msg);
				    buffers.push(msg);
				    bufferTail = bufferTail.slice(msgLength + 1);
				  }

				  var total = buffers.length;
				  buffers.forEach(function(buffer, i) {
				    callback(exports.decodePacket(buffer, binaryType, true), i, total);
				  });
				};
			}).call(module.exports);
		}else{
			var hasBinary = function hasBinary(data) {

			  function _hasBinary(obj) {
			    if (!obj) return false;
			    if ( (window.Buffer && window.Buffer.isBuffer(obj)) ||
			         (window.ArrayBuffer && obj instanceof ArrayBuffer) ||
			         (window.Blob && obj instanceof window.Blob) ||
			         (window.File && obj instanceof window.File)
			        ) {
			      return true;
			    }

			    if (latte_lib.isArray(obj)) {
			      for (var i = 0; i < obj.length; i++) {
			          if (_hasBinary(obj[i])) {
			              return true;
			          }
			      }
			    } else if (obj && 'object' == typeof obj) {
			      if (obj.toJSON) {
			        obj = obj.toJSON();
			      }

			      for (var key in obj) {
			        if (obj.hasOwnProperty(key) && _hasBinary(obj[key])) {
			          return true;
			        }
			      }
			    }

			    return false;
			  }

			  return _hasBinary(data);
			};
			var sliceBuffer = function(arraybuffer, start, end) {
			  var bytes = arraybuffer.byteLength;
			  start = start || 0;
			  end = end || bytes;

			  if (arraybuffer.slice) { return arraybuffer.slice(start, end); }

			  if (start < 0) { start += bytes; }
			  if (end < 0) { end += bytes; }
			  if (end > bytes) { end = bytes; }

			  if (start >= bytes || start >= end || bytes === 0) {
			    return new ArrayBuffer(0);
			  }

			  var abv = new Uint8Array(arraybuffer);
			  var result = new Uint8Array(end - start);
			  for (var i = start, ii = 0; i < end; i++, ii++) {
			    result[ii] = abv[i];
			  }
			  return result.buffer;
			};

			var base64encoder = latte_lib.base64;



			/**
			 * Check if we are running an android browser. That requires us to use
			 * ArrayBuffer with polling transports...
			 *
			 * http://ghinda.net/jpeg-blob-ajax-android/
			 */

			var isAndroid = navigator.userAgent.match(/Android/i);

			/**
			 * Check if we are running in PhantomJS.
			 * Uploading a Blob with PhantomJS does not work correctly, as reported here:
			 * https://github.com/ariya/phantomjs/issues/11395
			 * @type boolean
			 */
			var isPhantomJS = /PhantomJS/i.test(navigator.userAgent);

			/**
			 * When true, avoids using Blobs to encode payloads.
			 * @type boolean
			 */
			var dontSendBlobs = isAndroid || isPhantomJS;

			/**
			 * Current protocol version.
			 */



			/**
			 * Premade error packet.
			 */

			var err = { type: 'error', data: 'parser error' };

			/**
			 * Create a blob api even for blob builder when vendor prefixes exist
			 */

			var BlobBuilder = window.BlobBuilder
			  || window.WebKitBlobBuilder
			  || window.MSBlobBuilder
			  || window.MozBlobBuilder;

			/**
			 * Check if Blob constructor is supported
			 */
			 var Blob = (function() {
			  if (blobSupported) {
			    return window.Blob;
			  } else if (blobBuilderSupported) {
			    return BlobBuilderConstructor;
			  } else {
			    return undefined;
			  }
			})();
			var blobSupported = (function() {
			  try {
			    var b = new window.Blob(['hi']);
			    return b.size == 2;
			  } catch(e) {
			    return false;
			  }
			})();

			/**
			 * Check if BlobBuilder is supported
			 */

			var blobBuilderSupported = BlobBuilder
			  && BlobBuilder.prototype.append
			  && BlobBuilder.prototype.getBlob;

			var BlobBuilderConstructor = function (ary, options) {
			  options = options || {};

			  var bb = new BlobBuilder();
			  for (var i = 0; i < ary.length; i++) {
			    bb.append(ary[i]);
			  }
			  return (options.type) ? bb.getBlob(options.type) : bb.getBlob();
			};

			
			(function() {
				this.protocol = 3;
				var packets = this.packets = {
				    open:     0    // non-ws
				  , close:    1    // non-ws
				  , ping:     2
				  , pong:     3
				  , message:  4
				  , upgrade:  5
				  , noop:     6
				};

				var packetslist = keys(packets);
				this.encodePacket = function (packet, supportsBinary, utf8encode, callback) {
				  if ('function' == typeof supportsBinary) {
				    callback = supportsBinary;
				    supportsBinary = false;
				  }

				  if ('function' == typeof utf8encode) {
				    callback = utf8encode;
				    utf8encode = null;
				  }

				  var data = (packet.data === undefined)
				    ? undefined
				    : packet.data.buffer || packet.data;

				  if (window.ArrayBuffer && data instanceof ArrayBuffer) {
				    return encodeArrayBuffer(packet, supportsBinary, callback);
				  } else if (Blob && data instanceof window.Blob) {
				    return encodeBlob(packet, supportsBinary, callback);
				  }

				  // might be an object with { base64: true, data: dataAsBase64String }
				  if (data && data.base64) {
				    return encodeBase64Object(packet, callback);
				  }

				  // Sending data as a utf-8 string
				  var encoded = packets[packet.type];

				  // data fragment is optional
				  if (undefined !== packet.data) {
				    encoded += utf8encode ? utf8.encode(String(packet.data)) : String(packet.data);
				  }

				  return callback('' + encoded);

				};
				var encodeBase64Object = function (packet, callback) {
				  // packet data is an object { base64: true, data: dataAsBase64String }
				  var message = 'b' + exports.packets[packet.type] + packet.data.data;
				  return callback(message);
				}

				var encodeArrayBuffer = function (packet, supportsBinary, callback) {
				  if (!supportsBinary) {
				    return exports.encodeBase64Packet(packet, callback);
				  }

				  var data = packet.data;
				  var contentArray = new Uint8Array(data);
				  var resultBuffer = new Uint8Array(1 + data.byteLength);

				  resultBuffer[0] = packets[packet.type];
				  for (var i = 0; i < contentArray.length; i++) {
				    resultBuffer[i+1] = contentArray[i];
				  }

				  return callback(resultBuffer.buffer);
				}

				var encodeBlobAsArrayBuffer = function (packet, supportsBinary, callback) {
				  if (!supportsBinary) {
				    return exports.encodeBase64Packet(packet, callback);
				  }

				  var fr = new FileReader();
				  fr.onload = function() {
				    packet.data = fr.result;
				    exports.encodePacket(packet, supportsBinary, true, callback);
				  };
				  return fr.readAsArrayBuffer(packet.data);
				}

				var encodeBlob = function (packet, supportsBinary, callback) {
				  if (!supportsBinary) {
				    return exports.encodeBase64Packet(packet, callback);
				  }

				  if (dontSendBlobs) {
				    return encodeBlobAsArrayBuffer(packet, supportsBinary, callback);
				  }

				  var length = new Uint8Array(1);
				  length[0] = packets[packet.type];
				  var blob = new Blob([length.buffer, packet.data]);

				  return callback(blob);
				}
				var _self = this;
				this.encodeBase64Packet = function(packet, callback) {
				  var message = 'b' + _self.packets[packet.type];
				  if (Blob && packet.data instanceof Blob) {
				    var fr = new FileReader();
				    fr.onload = function() {
				      var b64 = fr.result.split(',')[1];
				      callback(message + b64);
				    };
				    return fr.readAsDataURL(packet.data);
				  }

				  var b64data;
				  try {
				    b64data = String.fromCharCode.apply(null, new Uint8Array(packet.data));
				  } catch (e) {
				    // iPhone Safari doesn't let you apply with typed arrays
				    var typed = new Uint8Array(packet.data);
				    var basic = new Array(typed.length);
				    for (var i = 0; i < typed.length; i++) {
				      basic[i] = typed[i];
				    }
				    b64data = String.fromCharCode.apply(null, basic);
				  }
				  message += window.btoa(b64data);
				  return callback(message);
				};

				this.decodePacket = function (data, binaryType, utf8decode) {
				  // String data
				  if (typeof data == 'string' || data === undefined) {
				    if (data.charAt(0) == 'b') {
				      return exports.decodeBase64Packet(data.substr(1), binaryType);
				    }

				    if (utf8decode) {
				      try {
				        data = utf8.decode(data);
				      } catch (e) {
				        return err;
				      }
				    }
				    var type = data.charAt(0);

				    if (Number(type) != type || !packetslist[type]) {
				      return err;
				    }

				    if (data.length > 1) {
				      return { type: packetslist[type], data: data.substring(1) };
				    } else {
				      return { type: packetslist[type] };
				    }
				  }

				  var asArray = new Uint8Array(data);
				  var type = asArray[0];
				  var rest = sliceBuffer(data, 1);
				  if (Blob && binaryType === 'blob') {
				    rest = new Blob([rest]);
				  }
				  return { type: packetslist[type], data: rest };
				};

				this.decodeBase64Packet = function(msg, binaryType) {
				  var type = packetslist[msg.charAt(0)];
				  if (!window.ArrayBuffer) {
				    return { type: type, data: { base64: true, data: msg.substr(1) } };
				  }

				  var data = base64encoder.decode(msg.substr(1));

				  if (binaryType === 'blob' && Blob) {
				    data = new Blob([data]);
				  }

				  return { type: type, data: data };
				};
					var map = function (ary, each, done) {
					  var result = new Array(ary.length);
					  var next = after(ary.length, done);

					  var eachWithIndex = function(i, el, cb) {
					    each(el, function(error, msg) {
					      result[i] = msg;
					      cb(error, result);
					    });
					  };

					  for (var i = 0; i < ary.length; i++) {
					    eachWithIndex(i, ary[i], next);
					  }
					}
				this.encodePayload = function (packets, supportsBinary, callback) {
				  if (typeof supportsBinary == 'function') {
				    callback = supportsBinary;
				    supportsBinary = null;
				  }

				  var isBinary = hasBinary(packets);

				  if (supportsBinary && isBinary) {
				    if (Blob && !dontSendBlobs) {
				      return exports.encodePayloadAsBlob(packets, callback);
				    }

				    return exports.encodePayloadAsArrayBuffer(packets, callback);
				  }

				  if (!packets.length) {
				    return callback('0:');
				  }

				  function setLengthHeader(message) {
				    return message.length + ':' + message;
				  }

				  function encodeOne(packet, doneCallback) {
				    exports.encodePacket(packet, !isBinary ? false : supportsBinary, true, function(message) {
				      doneCallback(null, setLengthHeader(message));
				    });
				  }

				  map(packets, encodeOne, function(err, results) {
				    return callback(results.join(''));
				  });
				};

				this.decodePayload = function (data, binaryType, callback) {
				  if (typeof data != 'string') {
				    return exports.decodePayloadAsBinary(data, binaryType, callback);
				  }

				  if (typeof binaryType === 'function') {
				    callback = binaryType;
				    binaryType = null;
				  }

				  var packet;
				  if (data == '') {
				    // parser error - ignoring payload
				    return callback(err, 0, 1);
				  }

				  var length = ''
				    , n, msg;

				  for (var i = 0, l = data.length; i < l; i++) {
				    var chr = data.charAt(i);

				    if (':' != chr) {
				      length += chr;
				    } else {
				      if ('' == length || (length != (n = Number(length)))) {
				        // parser error - ignoring payload
				        return callback(err, 0, 1);
				      }

				      msg = data.substr(i + 1, n);

				      if (length != msg.length) {
				        // parser error - ignoring payload
				        return callback(err, 0, 1);
				      }

				      if (msg.length) {
				        packet = exports.decodePacket(msg, binaryType, true);

				        if (err.type == packet.type && err.data == packet.data) {
				          // parser error in individual packet - ignoring payload
				          return callback(err, 0, 1);
				        }

				        var ret = callback(packet, i + n, l);
				        if (false === ret) return;
				      }

				      // advance cursor
				      i += n;
				      length = '';
				    }
				  }

				  if (length != '') {
				    // parser error - ignoring payload
				    return callback(err, 0, 1);
				  }

				};

				this.encodePayloadAsArrayBuffer = function(packets, callback) {
				  if (!packets.length) {
				    return callback(new ArrayBuffer(0));
				  }

				  function encodeOne(packet, doneCallback) {
				    exports.encodePacket(packet, true, true, function(data) {
				      return doneCallback(null, data);
				    });
				  }

				  map(packets, encodeOne, function(err, encodedPackets) {
				    var totalLength = encodedPackets.reduce(function(acc, p) {
				      var len;
				      if (typeof p === 'string'){
				        len = p.length;
				      } else {
				        len = p.byteLength;
				      }
				      return acc + len.toString().length + len + 2; // string/binary identifier + separator = 2
				    }, 0);

				    var resultArray = new Uint8Array(totalLength);

				    var bufferIndex = 0;
				    encodedPackets.forEach(function(p) {
				      var isString = typeof p === 'string';
				      var ab = p;
				      if (isString) {
				        var view = new Uint8Array(p.length);
				        for (var i = 0; i < p.length; i++) {
				          view[i] = p.charCodeAt(i);
				        }
				        ab = view.buffer;
				      }

				      if (isString) { // not true binary
				        resultArray[bufferIndex++] = 0;
				      } else { // true binary
				        resultArray[bufferIndex++] = 1;
				      }

				      var lenStr = ab.byteLength.toString();
				      for (var i = 0; i < lenStr.length; i++) {
				        resultArray[bufferIndex++] = parseInt(lenStr[i]);
				      }
				      resultArray[bufferIndex++] = 255;

				      var view = new Uint8Array(ab);
				      for (var i = 0; i < view.length; i++) {
				        resultArray[bufferIndex++] = view[i];
				      }
				    });

				    return callback(resultArray.buffer);
				  });
				};

				this.encodePayloadAsBlob = function(packets, callback) {
				  function encodeOne(packet, doneCallback) {
				    exports.encodePacket(packet, true, true, function(encoded) {
				      var binaryIdentifier = new Uint8Array(1);
				      binaryIdentifier[0] = 1;
				      if (typeof encoded === 'string') {
				        var view = new Uint8Array(encoded.length);
				        for (var i = 0; i < encoded.length; i++) {
				          view[i] = encoded.charCodeAt(i);
				        }
				        encoded = view.buffer;
				        binaryIdentifier[0] = 0;
				      }

				      var len = (encoded instanceof ArrayBuffer)
				        ? encoded.byteLength
				        : encoded.size;

				      var lenStr = len.toString();
				      var lengthAry = new Uint8Array(lenStr.length + 1);
				      for (var i = 0; i < lenStr.length; i++) {
				        lengthAry[i] = parseInt(lenStr[i]);
				      }
				      lengthAry[lenStr.length] = 255;

				      if (Blob) {
				        var blob = new Blob([binaryIdentifier.buffer, lengthAry.buffer, encoded]);
				        doneCallback(null, blob);
				      }
				    });
				  }

				  map(packets, encodeOne, function(err, results) {
				    return callback(new Blob(results));
				  });
				};

				this.decodePayloadAsBinary = function (data, binaryType, callback) {
				  if (typeof binaryType === 'function') {
				    callback = binaryType;
				    binaryType = null;
				  }

				  var bufferTail = data;
				  var buffers = [];

				  var numberTooLong = false;
				  while (bufferTail.byteLength > 0) {
				    var tailArray = new Uint8Array(bufferTail);
				    var isString = tailArray[0] === 0;
				    var msgLength = '';

				    for (var i = 1; ; i++) {
				      if (tailArray[i] == 255) break;

				      if (msgLength.length > 310) {
				        numberTooLong = true;
				        break;
				      }

				      msgLength += tailArray[i];
				    }

				    if(numberTooLong) return callback(err, 0, 1);

				    bufferTail = sliceBuffer(bufferTail, 2 + msgLength.length);
				    msgLength = parseInt(msgLength);

				    var msg = sliceBuffer(bufferTail, 0, msgLength);
				    if (isString) {
				      try {
				        msg = String.fromCharCode.apply(null, new Uint8Array(msg));
				      } catch (e) {
				        // iPhone Safari doesn't let you apply to typed arrays
				        var typed = new Uint8Array(msg);
				        msg = '';
				        for (var i = 0; i < typed.length; i++) {
				          msg += String.fromCharCode(typed[i]);
				        }
				      }
				    }

				    buffers.push(msg);
				    bufferTail = sliceBuffer(bufferTail, msgLength);
				  }

				  var total = buffers.length;
				  buffers.forEach(function(buffer, i) {
				    callback(exports.decodePacket(buffer, binaryType, true), i, total);
				  });
				};
			}).call(module.exports);

		}

	