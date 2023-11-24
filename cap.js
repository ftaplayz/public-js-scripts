(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapMonsterCloudClient = exports.CapmonsterCloudClientError = void 0;
const CaptchaResult_1 = require("./CaptchaResult");
const ClientOptions_1 = require("./ClientOptions");
const ErrorCodeConverter_1 = require("./ErrorCodeConverter");
const ErrorType_1 = require("./ErrorType");
const GetBalance_1 = require("./GetBalance");
const GetTaskResult_1 = require("./GetTaskResult");
const GetResultTimeouts_1 = require("./GetResultTimeouts");
const HttpClient_1 = require("./HttpClient");
const Logger_1 = require("./Logger");
const RequestsSerialization_1 = require("./Requests/RequestsSerialization");
/**
 * Base type for capmonster.cloud Client exceptions
 */
class CapmonsterCloudClientError extends Error {
}
exports.CapmonsterCloudClientError = CapmonsterCloudClientError;
/**
 * CapMonsterCloud client
 */
class CapMonsterCloudClient {
    constructor(_options, _httpClient) {
        this._options = _options;
        this._httpClient = _httpClient;
    }
    /**
     * Gets current amount of money on balance
     * {@link https://zennolab.atlassian.net/wiki/spaces/APIS/pages/655432/getBalance+retrieve+account+balance}
     */
    getBalance(cancellationController) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this._httpClient.post('getBalance', JSON.stringify((0, RequestsSerialization_1.SerializeObject)({ clientKey: this._options.clientKey })), cancellationController);
                if (response.errorId !== 0) {
                    throw new GetBalance_1.GetBalanceError(ErrorCodeConverter_1.ErrorCodeConverter.convert(response.errorCode));
                }
                return response;
            }
            catch (err) {
                if (err instanceof HttpClient_1.HttpStatusError) {
                    throw new CapmonsterCloudClientError(`Cannot get balance. Status code was ${err.statusCode}`);
                }
                else if (err instanceof HttpClient_1.JSONParseError) {
                    throw new CapmonsterCloudClientError(`Cannot parse get balance response. Response was: ${err.responseBody}`);
                }
                throw err;
            }
        });
    }
    /**
     * captcha task creating
     * {@link https://zennolab.atlassian.net/wiki/spaces/APIS/pages/393308/createTask+captcha+task+creating}
     */
    CreateTask(task, cancellationController) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this._httpClient.post('createTask', JSON.stringify((0, RequestsSerialization_1.SerializeObject)({ clientKey: this._options.clientKey, task, softId: this._options.softId || ClientOptions_1.ClientOptions.defaultSoftId })), cancellationController);
                (0, Logger_1.debugTask)('create task response', response);
                return response;
            }
            catch (err) {
                if (err instanceof HttpClient_1.HttpStatusError) {
                    throw new CapmonsterCloudClientError(`Cannot create task. Status code was ${err.statusCode}`);
                }
                else if (err instanceof HttpClient_1.JSONParseError) {
                    throw new CapmonsterCloudClientError(`Cannot parse create task response. Response was: ${err.responseBody}`);
                }
                throw err;
            }
        });
    }
    /**
     * request task result
     * {@link https://zennolab.atlassian.net/wiki/spaces/APIS/pages/688194/getTaskResult+request+task+result}
     */
    GetTaskResult(taskId, cancellationController) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this._httpClient.post('getTaskResult', JSON.stringify((0, RequestsSerialization_1.SerializeObject)({ clientKey: this._options.clientKey, taskId })), cancellationController);
                (0, Logger_1.debugTask)('GetTaskResult() response', response);
                if (response.errorId !== 0) {
                    if (response.errorCode.includes('CAPTCHA_NOT_READY')) {
                        return { type: GetTaskResult_1.TaskResultType.InProgress };
                    }
                    else {
                        return { type: GetTaskResult_1.TaskResultType.Failed, error: ErrorCodeConverter_1.ErrorCodeConverter.convert(response.errorCode) };
                    }
                }
                if (response.status === GetTaskResult_1.TaskResultStatus.ready) {
                    return { type: GetTaskResult_1.TaskResultType.Completed, solution: response.solution };
                }
                return { type: GetTaskResult_1.TaskResultType.InProgress };
            }
            catch (err) {
                if (err instanceof HttpClient_1.HttpStatusError) {
                    if (err.statusCode === HttpClient_1.HttpStatusCode.ServiceUnavailable) {
                        return { type: GetTaskResult_1.TaskResultType.InProgress };
                    }
                    throw new CapmonsterCloudClientError(`Cannot get task result. Status code was ${err.statusCode}`);
                }
                else if (err instanceof HttpClient_1.JSONParseError) {
                    throw new CapmonsterCloudClientError(`Cannot parse get task result response. Response was: ${err.responseBody}`);
                }
                throw err;
            }
        });
    }
    /**
     * Solve {Task} task
     */
    Solve(task, resultTimeouts = (0, GetResultTimeouts_1.detectResultTimeouts)(task), cancellationController) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, Logger_1.debugTask)('task in', task);
            (0, Logger_1.debugTask)('resultTimeouts in', resultTimeouts);
            const createdTask = yield this.CreateTask(task, cancellationController);
            if (createdTask.errorId !== 0) {
                return new CaptchaResult_1.CaptchaResult({
                    error: ErrorCodeConverter_1.ErrorCodeConverter.convert(createdTask.errorCode),
                });
            }
            const firstRequestDelay = task.nocache ? resultTimeouts.firstRequestNoCacheDelay : resultTimeouts.firstRequestDelay;
            (0, Logger_1.debugTask)('firstRequestDelay', firstRequestDelay);
            yield new Promise((resolve) => setTimeout(resolve, firstRequestDelay));
            let signalAborted = (cancellationController && cancellationController.signal.aborted) || false;
            const wholeTimeoutId = setTimeout(() => {
                signalAborted = true;
                cancellationController && cancellationController.abort();
                (0, Logger_1.debugTask)('cancellationController abort()');
            }, resultTimeouts.timeout);
            while (signalAborted === false) {
                try {
                    const result = yield this.GetTaskResult(createdTask.taskId, cancellationController);
                    switch (result.type) {
                        case GetTaskResult_1.TaskResultType.Failed:
                            clearTimeout(wholeTimeoutId);
                            return new CaptchaResult_1.CaptchaResult({ error: result.error });
                        case GetTaskResult_1.TaskResultType.Completed:
                            clearTimeout(wholeTimeoutId);
                            return new CaptchaResult_1.CaptchaResult({ solution: result.solution });
                        case GetTaskResult_1.TaskResultType.InProgress:
                        default:
                            break;
                    }
                }
                catch (err) {
                    if (signalAborted) {
                        break;
                    }
                    clearTimeout(wholeTimeoutId);
                    throw err;
                }
                if (signalAborted) {
                    break;
                }
                (0, Logger_1.debugTask)('requestsInterval', resultTimeouts.requestsInterval);
                yield new Promise((resolve) => setTimeout(resolve, resultTimeouts.requestsInterval));
            }
            clearTimeout(wholeTimeoutId);
            return new CaptchaResult_1.CaptchaResult({ error: ErrorType_1.ErrorType.Timeout });
        });
    }
}
exports.CapMonsterCloudClient = CapMonsterCloudClient;

},{"./CaptchaResult":8,"./ClientOptions":9,"./ErrorCodeConverter":11,"./ErrorType":12,"./GetBalance":13,"./GetResultTimeouts":14,"./GetTaskResult":15,"./HttpClient":16,"./Logger":17,"./Requests/RequestsSerialization":41}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapMonsterCloudClientFactory = void 0;
const CapMonsterCloudClient_1 = require("./CapMonsterCloudClient");
const Utils_1 = require("./Utils");
const HttpClient_1 = require("./HttpClient");
class CapMonsterCloudClientFactory {
    static Create(options) {
        return new CapMonsterCloudClient_1.CapMonsterCloudClient(options, CapMonsterCloudClientFactory.httpClients.GetOrAdd(options.serviceUrl.href, CapMonsterCloudClientFactory.CreateHttpClient(options.serviceUrl)));
    }
    static CreateHttpClient(url) {
        const httpClient = new HttpClient_1.HttpClient({
            url,
            timeout: CapMonsterCloudClientFactory.httpTimeout,
            requestHeaders: { userAgent: CapMonsterCloudClientFactory.CreateUserAgentString() },
        });
        return httpClient;
    }
    static CreateUserAgentString() {
        let productVersion = 'ProductVersion';
        if (Utils_1.isNode) {
            // require('./package.json') hide require call from browser bundler, e.g. webpack
            const packageJSON = module[`require`].call(module, '../package.json');
            productVersion = packageJSON.version;
        }
        return `${CapMonsterCloudClientFactory.productName}/${productVersion}`;
    }
}
exports.CapMonsterCloudClientFactory = CapMonsterCloudClientFactory;
CapMonsterCloudClientFactory.httpTimeout = 1000 * 21;
CapMonsterCloudClientFactory.httpClients = new Utils_1.CsMap();
CapMonsterCloudClientFactory.productName = 'Zennolab.CapMonsterCloud.Client.JS';

},{"./CapMonsterCloudClient":5,"./HttpClient":16,"./Utils":46}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapMonsterModules = void 0;
/**
 * capmonster.cloud recognition modules
 * {@link https://zennolab.atlassian.net/wiki/spaces/APIS/pages/187269121/How+to+pass+module+name+to+CapMonster+Cloud+using+ApiKey+field+only}
 */
var CapMonsterModules;
(function (CapMonsterModules) {
    CapMonsterModules["Amazon"] = "amazon";
    CapMonsterModules["BotDetect"] = "botdetect";
    CapMonsterModules["Facebook"] = "facebook";
    CapMonsterModules["Gmx"] = "gmx";
    CapMonsterModules["Google"] = "google";
    CapMonsterModules["Hotmail"] = "hotmail";
    CapMonsterModules["MailRu"] = "mailru";
    CapMonsterModules["Ok"] = "ok";
    CapMonsterModules["OkNew"] = "oknew";
    CapMonsterModules["RamblerRus"] = "ramblerrus";
    CapMonsterModules["SolveMedia"] = "solvemedia";
    CapMonsterModules["Steam"] = "steam";
    CapMonsterModules["Vk"] = "vk";
    CapMonsterModules["Yandex"] = "yandex";
    /**
     * Yandex (two words)
     */
    CapMonsterModules["YandexNew"] = "yandexnew";
    CapMonsterModules["YandexWave"] = "yandexwave";
    /**
     * All other text captcha types
     */
    CapMonsterModules["Universal"] = "universal";
})(CapMonsterModules = exports.CapMonsterModules || (exports.CapMonsterModules = {}));

},{}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaptchaResult = void 0;
/**
 * General captcha recognition result
 * @template TSolution Concrete captcha result type
 */
class CaptchaResult {
    constructor({ error, solution }) {
        this.error = error;
        this.solution = solution;
    }
}
exports.CaptchaResult = CaptchaResult;

},{}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientOptions = void 0;
const ClientURL_1 = require("./ClientURL");
/**
 * Client options
 */
class ClientOptions {
    constructor(clientOptions) {
        const { serviceUrl = 'https://api.capmonster.cloud' } = clientOptions;
        this.serviceUrl = new ClientURL_1.ClientURL(serviceUrl);
        this.clientKey = clientOptions.clientKey;
        this.softId = clientOptions.softId;
    }
}
exports.ClientOptions = ClientOptions;
ClientOptions.defaultSoftId = 54;

},{"./ClientURL":10}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientURL = void 0;
class ClientURL extends URL {
    constructor(url, base) {
        super(url, base);
        this.clientPort = 0;
        if (this.port) {
            this.clientPort = Number(this.port);
        }
        else {
            if (this.protocol === 'https:') {
                this.clientPort = 443;
            }
            else if (this.protocol === 'http:') {
                this.clientPort = 80;
            }
        }
    }
}
exports.ClientURL = ClientURL;

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCodeConverter = void 0;
const ErrorType_1 = require("./ErrorType");
const Logger_1 = require("./Logger");
class ErrorCodeConverter {
    static convert(errorCode) {
        (0, Logger_1.debugErrorConverter)('errorCode passed', errorCode);
        const prefix = 'ERROR_';
        const prefixLen = prefix.length;
        if (errorCode.startsWith(prefix)) {
            errorCode = errorCode.substring(prefixLen);
        }
        (0, Logger_1.debugErrorConverter)('errorCode prepared', errorCode);
        const errorType = ErrorType_1.ErrorType[errorCode];
        (0, Logger_1.debugErrorConverter)('errorType found', errorType);
        if (errorType) {
            return errorType;
        }
        if (errorCode === 'WRONG_CAPTCHA_ID') {
            return ErrorType_1.ErrorType.NO_SUCH_CAPCHA_ID;
        }
        return ErrorType_1.ErrorType.Unknown;
    }
}
exports.ErrorCodeConverter = ErrorCodeConverter;

},{"./ErrorType":12,"./Logger":17}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorType = void 0;
/**
 * Error types
 */
var ErrorType;
(function (ErrorType) {
    /**
     * Captcha recognition timeout is expired
     */
    ErrorType["Timeout"] = "Timeout";
    /**
     * Unknown error. Maybe client library is outdated
     */
    ErrorType["Unknown"] = "Unknown";
    /**
     * Account authorization key not found in the system or has incorrect format
     */
    ErrorType["KEY_DOES_NOT_EXIST"] = "KEY_DOES_NOT_EXIST";
    /**
     * The size of the captcha you are uploading is less than 100 bytes.
     */
    ErrorType["ZERO_CAPTCHA_FILESIZE"] = "ZERO_CAPTCHA_FILESIZE";
    /**
     * The size of the captcha you are uploading is more than 50,000 bytes.
     */
    ErrorType["TOO_BIG_CAPTCHA_FILESIZE"] = "TOO_BIG_CAPTCHA_FILESIZE";
    /**
     * Account has zero balance
     */
    ErrorType["ZERO_BALANCE"] = "ZERO_BALANCE";
    /**
     * Request with current account key is not allowed from your IP
     */
    ErrorType["IP_NOT_ALLOWED"] = "IP_NOT_ALLOWED";
    /**
     * This type of captchas is not supported by the service or the image does not contain an answer, perhaps it is too noisy.
     * It could also mean that the image is corrupted or was incorrectly rendered.
     */
    ErrorType["CAPTCHA_UNSOLVABLE"] = "CAPTCHA_UNSOLVABLE";
    /**
     * The captcha that you are requesting was not found.
     * Make sure you are requesting a status update only within 5 minutes of uploading.
     */
    ErrorType["NO_SUCH_CAPCHA_ID"] = "NO_SUCH_CAPCHA_ID";
    /**
     * You have exceeded the limit of requests with the wrong api key,
     * check the correctness of your api key in the control panel and after some time, try again
     */
    ErrorType["IP_BANNED"] = "IP_BANNED";
    /**
     * This method is not supported or empty
     */
    ErrorType["NO_SUCH_METHOD"] = "NO_SUCH_METHOD";
    /**
     * You have exceeded the limit of requests to receive an answer for one task.
     * Try to request the result of the task no more than 1 time in 2 seconds.
     */
    ErrorType["TOO_MUCH_REQUESTS"] = "TOO_MUCH_REQUESTS";
    /**
     * Captcha from some domains cannot be solved in CapMonster Cloud.
     * If you try to create a task for such a domain, this error will return.
     */
    ErrorType["DOMAIN_NOT_ALLOWED"] = "DOMAIN_NOT_ALLOWED";
    /**
     * Captcha provider server reported that the additional token has expired.
     * Try creating task with a new token.
     */
    ErrorType["TOKEN_EXPIRED"] = "TOKEN_EXPIRED";
    /**
     * You have excedded requests rate limit, try to decrease parallel tasks amount.
     */
    ErrorType["NO_SLOT_AVAILABLE"] = "NO_SLOT_AVAILABLE";
    /**
     * Recaptcha invalid site key
     */
    ErrorType["RECAPTCHA_INVALID_SITEKEY"] = "RECAPTCHA_INVALID_SITEKEY";
})(ErrorType = exports.ErrorType || (exports.ErrorType = {}));

},{}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetBalanceError = void 0;
/**
 * Exception on getting balance
 */
class GetBalanceError extends Error {
    /**
     * @param errorType Gets occured error
     */
    constructor(errorType) {
        super(`Cannot get balance. Error was ${errorType}`);
        this.errorType = errorType;
    }
}
exports.GetBalanceError = GetBalanceError;

},{}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectResultTimeouts = exports.ComplexImageTimeouts = exports.TurnstileTimeouts = exports.GeeTestTimeouts = exports.HCaptchaTimeouts = exports.FunCaptchaTimeouts = exports.ImageToTextTimeouts = exports.RecaptchaV3Timeouts = exports.RecaptchaV2EnterpriseTimeouts = exports.RecaptchaV2Timeouts = void 0;
const TaskType_1 = require("./TaskType");
exports.RecaptchaV2Timeouts = {
    firstRequestDelay: 1000 * 1,
    firstRequestNoCacheDelay: 1000 * 10,
    requestsInterval: 1000 * 3,
    timeout: 1000 * 180,
};
exports.RecaptchaV2EnterpriseTimeouts = {
    firstRequestDelay: 1000 * 1,
    firstRequestNoCacheDelay: 1000 * 10,
    requestsInterval: 1000 * 3,
    timeout: 1000 * 180,
};
exports.RecaptchaV3Timeouts = {
    firstRequestDelay: 1000 * 1,
    firstRequestNoCacheDelay: 1000 * 10,
    requestsInterval: 1000 * 3,
    timeout: 1000 * 180,
};
exports.ImageToTextTimeouts = {
    firstRequestDelay: 350,
    requestsInterval: 200,
    timeout: 1000 * 10,
};
exports.FunCaptchaTimeouts = {
    firstRequestDelay: 1000 * 1,
    firstRequestNoCacheDelay: 1000 * 10,
    requestsInterval: 1000 * 1,
    timeout: 1000 * 80,
};
exports.HCaptchaTimeouts = {
    firstRequestDelay: 1000 * 1,
    firstRequestNoCacheDelay: 1000 * 10,
    requestsInterval: 1000 * 3,
    timeout: 1000 * 180,
};
exports.GeeTestTimeouts = {
    firstRequestDelay: 1000 * 1,
    requestsInterval: 1000 * 1,
    timeout: 1000 * 80,
};
exports.TurnstileTimeouts = {
    firstRequestDelay: 1000 * 1,
    firstRequestNoCacheDelay: 1000 * 10,
    requestsInterval: 1000 * 1,
    timeout: 1000 * 80,
};
exports.ComplexImageTimeouts = {
    firstRequestDelay: 350,
    requestsInterval: 200,
    timeout: 1000 * 10,
};
function detectResultTimeouts(task) {
    switch (task.type) {
        case TaskType_1.TaskType.FunCaptchaTaskProxyless:
        case TaskType_1.TaskType.FunCaptchaTask:
            return exports.FunCaptchaTimeouts;
        case TaskType_1.TaskType.GeeTestTaskProxyless:
        case TaskType_1.TaskType.GeeTestTask:
            return exports.GeeTestTimeouts;
        case TaskType_1.TaskType.HCaptchaTaskProxyless:
        case TaskType_1.TaskType.HCaptchaTask:
            return exports.HCaptchaTimeouts;
        case TaskType_1.TaskType.ImageToTextTask:
            return exports.ImageToTextTimeouts;
        case TaskType_1.TaskType.RecaptchaV2EnterpriseTaskProxyless:
        case TaskType_1.TaskType.RecaptchaV2EnterpriseTask:
            return exports.RecaptchaV2EnterpriseTimeouts;
        case TaskType_1.TaskType.NoCaptchaTaskProxyless:
        case TaskType_1.TaskType.NoCaptchaTask:
            return exports.RecaptchaV2Timeouts;
        case TaskType_1.TaskType.RecaptchaV3TaskProxyless:
            return exports.RecaptchaV3Timeouts;
        case TaskType_1.TaskType.TurnstileTaskProxyless:
        case TaskType_1.TaskType.TurnstileTask:
            return exports.TurnstileTimeouts;
        case TaskType_1.TaskType.ComplexImageTask:
            return exports.ComplexImageTimeouts;
        default:
            throw new Error(`Could not detect result timeouts for provided task type = ${task.type}`);
    }
}
exports.detectResultTimeouts = detectResultTimeouts;

},{"./TaskType":45}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetTaskResultError = exports.TaskResultStatus = exports.TaskResultType = void 0;
var TaskResultType;
(function (TaskResultType) {
    TaskResultType["Failed"] = "Failed";
    TaskResultType["Completed"] = "Completed";
    TaskResultType["InProgress"] = "InProgress";
})(TaskResultType = exports.TaskResultType || (exports.TaskResultType = {}));
var TaskResultStatus;
(function (TaskResultStatus) {
    TaskResultStatus["processing"] = "processing";
    TaskResultStatus["ready"] = "ready";
})(TaskResultStatus = exports.TaskResultStatus || (exports.TaskResultStatus = {}));
class GetTaskResultError extends Error {
    constructor(errorType) {
        super(`Cannot create task. Error was ${errorType}`);
        this.errorType = errorType;
    }
}
exports.GetTaskResultError = GetTaskResultError;

},{}],16:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = exports.HttpStatusCode = exports.JSONParseError = exports.HttpContentTypeError = exports.HttpStatusError = exports.HttpClientError = exports.ResponseContentType = void 0;
const Utils_1 = require("./Utils");
const Logger_1 = require("./Logger");
var ResponseContentType;
(function (ResponseContentType) {
    ResponseContentType["json"] = "application/json";
    ResponseContentType["text"] = "text/plain";
})(ResponseContentType = exports.ResponseContentType || (exports.ResponseContentType = {}));
class HttpClientError extends Error {
}
exports.HttpClientError = HttpClientError;
class HttpStatusError extends HttpClientError {
    constructor({ statusMessage, statusCode }) {
        super(statusMessage);
        this.statusMessage = statusMessage;
        this.statusCode = statusCode;
    }
}
exports.HttpStatusError = HttpStatusError;
class HttpContentTypeError extends HttpClientError {
    constructor(statusMessage, contentType) {
        super(statusMessage);
        this.statusMessage = statusMessage;
        this.contentType = contentType;
    }
}
exports.HttpContentTypeError = HttpContentTypeError;
class JSONParseError extends Error {
    constructor(message, responseBody) {
        super(message);
        this.message = message;
        this.responseBody = responseBody;
    }
}
exports.JSONParseError = JSONParseError;
var HttpStatusCode;
(function (HttpStatusCode) {
    HttpStatusCode[HttpStatusCode["ServiceUnavailable"] = 503] = "ServiceUnavailable";
})(HttpStatusCode = exports.HttpStatusCode || (exports.HttpStatusCode = {}));
class HttpClient {
    constructor({ url, timeout, requestHeaders, }) {
        const { userAgent = '', contentType = 'application/json' } = requestHeaders || {};
        this.url = url;
        this.timeout = timeout;
        this.requestHeaders = {
            userAgent,
            contentType,
        };
    }
    post(method, data, cancellationController) {
        return __awaiter(this, void 0, void 0, function* () {
            if (Utils_1.isNode) {
                yield this.netAgentUse();
            }
            return yield this.postJSON(method, data, cancellationController);
        });
    }
    createAgent() {
        return new Promise((resolve) => {
            (0, Logger_1.debugNet)('Try create agent instance');
            // require('http') or require('https') hide require call from browser bundler, e.g. webpack
            const requester = module[`require`].call(module, this.url.protocol === 'https:' ? 'https' : 'http');
            this._agent = new requester.Agent({ keepAlive: true, timeout: this.timeout });
            resolve();
        });
    }
    netAgentUse() {
        if (this._agent) {
            (0, Logger_1.debugNet)('Reuse agent instance');
            return Promise.resolve();
        }
        return this.createAgent();
    }
    responseStatusHandler(res, expectedStatus) {
        return new Promise((resolve, reject) => {
            let statusCode;
            let statusMessage;
            if (Utils_1.isNode) {
                statusCode = res.statusCode;
                statusMessage = res.statusMessage;
            }
            else {
                statusCode = res.status;
                statusMessage = res.statusText;
            }
            if (statusCode === expectedStatus) {
                resolve(res);
            }
            else {
                reject(new HttpStatusError({ statusCode, statusMessage }));
            }
        });
    }
    responseContentTypeHandler(res, expectedContentTypes) {
        return new Promise((resolve, reject) => {
            let contentType;
            if (Utils_1.isNode) {
                contentType = res.headers['content-type'];
            }
            else {
                contentType = res.headers.get('Content-Type');
            }
            if (contentType) {
                if (Array.isArray(expectedContentTypes)
                    ? expectedContentTypes.some((expectedContentType) => contentType.includes(expectedContentType))
                    : contentType.includes(expectedContentTypes)) {
                    resolve(res);
                }
                else {
                    reject(new HttpContentTypeError(`Unexpected content type. Got ${contentType}`, contentType));
                }
            }
            else {
                reject(new HttpContentTypeError('Unknown content type', contentType));
            }
        });
    }
    responseBodyHandler(res) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const responseBody = Buffer.concat(chunks).toString('utf8');
                (0, Logger_1.debugHttp)('Response body received', responseBody);
                resolve(responseBody);
            });
            res.on('error', reject);
        });
    }
    responseJSONHandler(res) {
        return __awaiter(this, void 0, void 0, function* () {
            let responseBody;
            try {
                if (Utils_1.isNode) {
                    responseBody = yield this.responseBodyHandler(res);
                    return JSON.parse(responseBody);
                }
                else {
                    return res.json();
                }
            }
            catch (err) {
                if (err instanceof SyntaxError) {
                    throw new JSONParseError(err.message, responseBody);
                }
                throw new JSONParseError('Unknown JSON parse error', responseBody);
            }
        });
    }
    requestHandler(method, data, cancellationController) {
        return new Promise((resolve, reject) => {
            const headers = {
                'user-agent': this.requestHeaders.userAgent,
                'content-type': this.requestHeaders.contentType,
            };
            const options = {
                headers,
                method: 'POST',
                signal: cancellationController && cancellationController.signal,
            };
            if (Utils_1.isNode) {
                Object.assign(options, {
                    host: this.url.hostname,
                    port: this.url.port,
                    path: `/${method}`,
                    agent: this._agent,
                });
            }
            else {
                Object.assign(options, {
                    mode: 'cors',
                    body: data,
                });
            }
            (0, Logger_1.debugHttp)('Request options', options);
            (0, Logger_1.debugHttp)('Request body', data);
            if (Utils_1.isNode) {
                // require('http') or require('https') hide require call from browser bundler, e.g. webpack
                const requester = module[`require`].call(module, this.url.protocol === 'https:' ? 'https' : 'http');
                requester
                    .request(options, (res) => {
                    (0, Logger_1.debugHttp)('Response headers received', res.statusCode, res.statusMessage);
                    resolve(res);
                })
                    .on('error', (err) => {
                    (0, Logger_1.debugHttp)('Response error', err);
                    reject(err);
                })
                    .end(data);
            }
            else {
                fetch(`${this.url.href}${method}`, options)
                    .then((res) => resolve(res))
                    .catch(reject);
            }
        });
    }
    postJSON(method, data, cancellationController) {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.requestHandler(method, data, cancellationController);
            yield this.responseStatusHandler(res, 200);
            yield this.responseContentTypeHandler(res, [ResponseContentType.json, ResponseContentType.text]);
            return yield this.responseJSONHandler(res);
        });
    }
}
exports.HttpClient = HttpClient;

}).call(this)}).call(this,require("buffer").Buffer)
},{"./Logger":17,"./Utils":46,"buffer":2}],17:[function(require,module,exports){
(function (process){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugErrorConverter = exports.debugTask = exports.debugHttp = exports.debugNet = void 0;
let createDebugger = (_) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (...args) => ({
        [_]: args,
    });
};
if (typeof process === 'object' && 'env' in process && process.env.DEBUG) {
    // require('debug') hide require call from browser bundler, e.g. webpack
    createDebugger = module[`require`].call(module, 'debug');
}
exports.debugNet = createDebugger('cmc-net');
exports.debugHttp = createDebugger('cmc-http');
exports.debugTask = createDebugger('cmc-task');
exports.debugErrorConverter = createDebugger('cmc-errconv');
exports.default = { debugNet: exports.debugNet, debugHttp: exports.debugHttp, debugTask: exports.debugTask, debugErrorConverter: exports.debugErrorConverter };

}).call(this)}).call(this,require('_process'))
},{"_process":4}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaptchaRequestBase = void 0;
/**
 * Base captcha recognition request
 */
class CaptchaRequestBase {
    constructor({ type, nocache }) {
        this.type = type;
        this.nocache = nocache;
    }
}
exports.CaptchaRequestBase = CaptchaRequestBase;

},{}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexImageFunCaptchaRequest = void 0;
const ComplexImageRequestBase_1 = require("./ComplexImageRequestBase");
const TaskType_1 = require("../TaskType");
class ComplexImageFunCaptchaRequest extends ComplexImageRequestBase_1.ComplexImageRequestBase {
    constructor(argsObjs) {
        super(Object.assign({ type: TaskType_1.TaskType.ComplexImageTask, _class: 'funcaptcha' }, argsObjs));
    }
}
exports.ComplexImageFunCaptchaRequest = ComplexImageFunCaptchaRequest;

},{"../TaskType":45,"./ComplexImageRequestBase":22}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexImageHCaptchaRequest = void 0;
const ComplexImageRequestBase_1 = require("./ComplexImageRequestBase");
const TaskType_1 = require("../TaskType");
class ComplexImageHCaptchaRequest extends ComplexImageRequestBase_1.ComplexImageRequestBase {
    constructor(argsObjs) {
        super(Object.assign({ type: TaskType_1.TaskType.ComplexImageTask, _class: 'hcaptcha' }, argsObjs));
    }
}
exports.ComplexImageHCaptchaRequest = ComplexImageHCaptchaRequest;

},{"../TaskType":45,"./ComplexImageRequestBase":22}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexImageRecaptchaRequest = void 0;
const ComplexImageRequestBase_1 = require("./ComplexImageRequestBase");
const TaskType_1 = require("../TaskType");
class ComplexImageRecaptchaRequest extends ComplexImageRequestBase_1.ComplexImageRequestBase {
    constructor(argsObjs) {
        super(Object.assign({ type: TaskType_1.TaskType.ComplexImageTask, _class: 'recaptcha' }, argsObjs));
    }
}
exports.ComplexImageRecaptchaRequest = ComplexImageRecaptchaRequest;

},{"../TaskType":45,"./ComplexImageRequestBase":22}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexImageRequestBase = void 0;
const CaptchaRequestBase_1 = require("./CaptchaRequestBase");
class ComplexImageRequestBase extends CaptchaRequestBase_1.CaptchaRequestBase {
    constructor({ type, nocache, imageUrls, _class, imagesBase64, metaData, userAgent, websiteURL }) {
        super({ type, nocache });
        this.class = _class;
        this.imageUrls = imageUrls;
        this.imagesBase64 = imagesBase64;
        this.metadata = metaData;
        this.userAgent = userAgent;
        this.websiteURL = websiteURL;
    }
}
exports.ComplexImageRequestBase = ComplexImageRequestBase;

},{"./CaptchaRequestBase":18}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunCaptchaProxylessRequest = void 0;
const TaskType_1 = require("../TaskType");
const FunCaptchaRequestBase_1 = require("./FunCaptchaRequestBase");
/**
 * FunCaptcha recognition request (without proxy).
 * {@link https://zennolab.atlassian.net/wiki/spaces/APIS/pages/643629079/FunCaptchaTaskProxyless+solving+FunCaptcha}
 */
class FunCaptchaProxylessRequest extends FunCaptchaRequestBase_1.FunCaptchaRequestBase {
    constructor(argsObj) {
        super(Object.assign({ type: TaskType_1.TaskType.FunCaptchaTaskProxyless }, argsObj));
    }
}
exports.FunCaptchaProxylessRequest = FunCaptchaProxylessRequest;

},{"../TaskType":45,"./FunCaptchaRequestBase":25}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunCaptchaRequest = void 0;
const TaskType_1 = require("../TaskType");
const ts_mixer_1 = require("ts-mixer");
const FunCaptchaRequestBase_1 = require("./FunCaptchaRequestBase");
const ProxyInfo_1 = require("./ProxyInfo");
/**
 * FunCaptcha recognition request (with proxy).
 * {@link https://zennolab.atlassian.net/wiki/spaces/APIS/pages/735805497/FunCaptchaTask+solving+FunCaptcha}
 */
class FunCaptchaRequest extends (0, ts_mixer_1.Mixin)(FunCaptchaRequestBase_1.FunCaptchaRequestBase, ProxyInfo_1.ProxyInfo) {
    constructor(argsObj) {
        super(Object.assign({ type: TaskType_1.TaskType.FunCaptchaTask }, argsObj));
    }
}
exports.FunCaptchaRequest = FunCaptchaRequest;

},{"../TaskType":45,"./FunCaptchaRequestBase":25,"./ProxyInfo":33,"ts-mixer":48}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunCaptchaRequestBase = void 0;
const CaptchaRequestBase_1 = require("./CaptchaRequestBase");
/**
 * Base FunCaptcha recognition request
 */
class FunCaptchaRequestBase extends CaptchaRequestBase_1.CaptchaRequestBase {
    constructor({ type, nocache, websiteURL, websitePublicKey, funcaptchaApiJSSubdomain, data, cookies }) {
        super({ type, nocache });
        this.websiteURL = websiteURL;
        this.websitePublicKey = websitePublicKey;
        this.funcaptchaApiJSSubdomain = funcaptchaApiJSSubdomain;
        this.data = data;
        this.cookies = cookies;
    }
}
exports.FunCaptchaRequestBase = FunCaptchaRequestBase;

},{"./CaptchaRequestBase":18}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeeTestProxylessRequest = void 0;
const TaskType_1 = require("../TaskType");
const GeeTestRequestBase_1 = require("./GeeTestRequestBase");
/**
 * GeeTest recognition request (without proxy).
 * {@link https://zennolab.atlassian.net/wiki/spaces/APIS/pages/1940291626/GeeTestTaskProxyless+GeeTest+captcha+recognition+without+proxy}
 */
class GeeTestProxylessRequest extends GeeTestRequestBase_1.GeeTestRequestBase {
    constructor(argsObj) {
        super(Object.assign({ type: TaskType_1.TaskType.GeeTestTaskProxyless }, argsObj));
    }
}
exports.GeeTestProxylessRequest = GeeTestProxylessRequest;

},{"../TaskType":45,"./GeeTestRequestBase":28}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeeTestRequest = void 0;
const TaskType_1 = require("../TaskType");
const ts_mixer_1 = require("ts-mixer");
const GeeTestRequestBase_1 = require("./GeeTestRequestBase");
const ProxyInfo_1 = require("./ProxyInfo");
/**
 * GeeTest recognition request (with proxy).
 * {@link https://zennolab.atlassian.net/wiki/spaces/APIS/pages/1940357159/GeeTestTask+GeeTest+captcha+recognition}
 */
class GeeTestRequest extends (0, ts_mixer_1.Mixin)(GeeTestRequestBase_1.GeeTestRequestBase, ProxyInfo_1.ProxyInfo) {
    constructor(argsObj) {
        super(Object.assign({ type: TaskType_1.TaskType.GeeTestTask }, argsObj));
    }
}
exports.GeeTestRequest = GeeTestRequest;

},{"../TaskType":45,"./GeeTestRequestBase":28,"./ProxyInfo":33,"ts-mixer":48}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeeTestRequestBase = void 0;
const CaptchaRequestBase_1 = require("./CaptchaRequestBase");
/**
 * Base GeeTest recognition request
 */
class GeeTestRequestBase extends CaptchaRequestBase_1.CaptchaRequestBase {
    constructor({ type, nocache, websiteURL, gt, challenge, geetestApiServerSubdomain, geetestGetLib, userAgent }) {
        super({ type, nocache });
        this.websiteURL = websiteURL;
        this.gt = gt;
        this.challenge = challenge;
        this.geetestApiServerSubdomain = geetestApiServerSubdomain;
        this.geetestGetLib = geetestGetLib;
        this.userAgent = userAgent;
    }
}
exports.GeeTestRequestBase = GeeTestRequestBase;

},{"./CaptchaRequestBase":18}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HCaptchaProxylessRequest = void 0;
const TaskType_1 = require("../TaskType");
const HCaptchaRequestBase_1 = require("./HCaptchaRequestBase");
/**
 * HCaptcha recognition request (without proxy).
 * {@link https://zennolab.atlassian.net/wiki/spaces/APIS/pages/1203240977/HCaptchaTaskProxyless+hCaptcha+puzzle+solving}
 */
class HCaptchaProxylessRequest extends HCaptchaRequestBase_1.HCaptchaRequestBase {
    constructor(argsObj) {
        super(Object.assign({ type: TaskType_1.TaskType.HCaptchaTaskProxyless }, argsObj));
    }
}
exports.HCaptchaProxylessRequest = HCaptchaProxylessRequest;

},{"../TaskType":45,"./HCaptchaRequestBase":31}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HCaptchaRequest = void 0;
const TaskType_1 = require("../TaskType");
const ts_mixer_1 = require("ts-mixer");
const HCaptchaRequestBase_1 = require("./HCaptchaRequestBase");
const ProxyInfo_1 = require("./ProxyInfo");
/**
 * HCaptcha recognition request (with proxy).
 * {@link https://zennolab.atlassian.net/wiki/spaces/APIS/pages/1203240988/HCaptchaTask+hCaptcha+puzzle+solving}
 */
class HCaptchaRequest extends (0, ts_mixer_1.Mixin)(HCaptchaRequestBase_1.HCaptchaRequestBase, ProxyInfo_1.ProxyInfo) {
    constructor(argsObj) {
        super(Object.assign({ type: TaskType_1.TaskType.HCaptchaTask }, argsObj));
    }
}
exports.HCaptchaRequest = HCaptchaRequest;

},{"../TaskType":45,"./HCaptchaRequestBase":31,"./ProxyInfo":33,"ts-mixer":48}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HCaptchaRequestBase = void 0;
const CaptchaRequestBase_1 = require("./CaptchaRequestBase");
/**
 * Base HCaptcha recognition request
 */
class HCaptchaRequestBase extends CaptchaRequestBase_1.CaptchaRequestBase {
    constructor({ type, nocache, websiteURL, websiteKey, isInvisible, data, userAgent, cookies }) {
        super({ type, nocache });
        this.websiteURL = websiteURL;
        this.websiteKey = websiteKey;
        this.isInvisible = isInvisible;
        this.data = data;
        this.userAgent = userAgent;
        this.cookies = cookies;
    }
}
exports.HCaptchaRequestBase = HCaptchaRequestBase;

},{"./CaptchaRequestBase":18}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageToTextRequest = void 0;
const CaptchaRequestBase_1 = require("./CaptchaRequestBase");
const TaskType_1 = require("../TaskType");
/**
 * ImageToText recognition request
 * {@link https://zennolab.atlassian.net/wiki/spaces/APIS/pages/655469/ImageToTextTask+solve+image+captcha}
 */
class ImageToTextRequest extends CaptchaRequestBase_1.CaptchaRequestBase {
    constructor({ nocache, body, CapMonsterModule, recognizingThreshold, Case, numeric, math }) {
        super({ type: TaskType_1.TaskType.ImageToTextTask, nocache });
        this.body = body;
        this.CapMonsterModule = CapMonsterModule;
        this.recognizingThreshold = recognizingThreshold;
        this.Case = Case;
        this.numeric = numeric;
        this.math = math;
    }
}
exports.ImageToTextRequest = ImageToTextRequest;

},{"../TaskType":45,"./CaptchaRequestBase":18}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyInfo = void 0;
/**
 * Interface for captcha recognition with proxy requests
 */
class ProxyInfo {
    constructor({ proxyType, proxyAddress, proxyPort, proxyLogin, proxyPassword }) {
        this.proxyType = proxyType;
        this.proxyAddress = proxyAddress;
        this.proxyPort = proxyPort;
        this.proxyLogin = proxyLogin;
        this.proxyPassword = proxyPassword;
    }
}
exports.ProxyInfo = ProxyInfo;

},{}],34:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecaptchaV2EnterpriseProxylessRequest = void 0;
const TaskType_1 = require("../TaskType");
const RecaptchaV2EnterpriseRequestBase_1 = require("./RecaptchaV2EnterpriseRequestBase");
/**
 * Recaptcha V2 Enterprise recognition request (without proxy).
 */
class RecaptchaV2EnterpriseProxylessRequest extends RecaptchaV2EnterpriseRequestBase_1.RecaptchaV2EnterpriseRequestBase {
    constructor(argsObj) {
        super(Object.assign({ type: TaskType_1.TaskType.RecaptchaV2EnterpriseTaskProxyless }, argsObj));
    }
}
exports.RecaptchaV2EnterpriseProxylessRequest = RecaptchaV2EnterpriseProxylessRequest;

},{"../TaskType":45,"./RecaptchaV2EnterpriseRequestBase":36}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecaptchaV2EnterpriseRequest = void 0;
const TaskType_1 = require("../TaskType");
const ts_mixer_1 = require("ts-mixer");
const ProxyInfo_1 = require("./ProxyInfo");
const RecaptchaV2EnterpriseRequestBase_1 = require("./RecaptchaV2EnterpriseRequestBase");
/**
 * Recaptcha V2 Enterprise recognition request (with proxy).
 */
class RecaptchaV2EnterpriseRequest extends (0, ts_mixer_1.Mixin)(RecaptchaV2EnterpriseRequestBase_1.RecaptchaV2EnterpriseRequestBase, ProxyInfo_1.ProxyInfo) {
    constructor(argsObj) {
        super(Object.assign({ type: TaskType_1.TaskType.RecaptchaV2EnterpriseTask }, argsObj));
    }
}
exports.RecaptchaV2EnterpriseRequest = RecaptchaV2EnterpriseRequest;

},{"../TaskType":45,"./ProxyInfo":33,"./RecaptchaV2EnterpriseRequestBase":36,"ts-mixer":48}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecaptchaV2EnterpriseRequestBase = void 0;
const CaptchaRequestBase_1 = require("./CaptchaRequestBase");
/**
 * Base Recaptcha V2 Enterprise recognition request
 */
class RecaptchaV2EnterpriseRequestBase extends CaptchaRequestBase_1.CaptchaRequestBase {
    constructor({ type, nocache, websiteURL, websiteKey, enterprisePayload, recaptchaDataSValue, userAgent, }) {
        super({ type, nocache });
        this.websiteURL = websiteURL;
        this.websiteKey = websiteKey;
        this.enterprisePayload = enterprisePayload;
        this.recaptchaDataSValue = recaptchaDataSValue;
        this.userAgent = userAgent;
    }
}
exports.RecaptchaV2EnterpriseRequestBase = RecaptchaV2EnterpriseRequestBase;

},{"./CaptchaRequestBase":18}],37:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecaptchaV2ProxylessRequest = void 0;
const TaskType_1 = require("../TaskType");
const RecaptchaV2RequestBase_1 = require("./RecaptchaV2RequestBase");
/**
 * Recaptcha V2 recognition request (without proxy).
 * {@link https://zennolab.atlassian.net/wiki/spaces/APIS/pages/680689685/NoCaptchaTask+solving+Google+recaptcha}
 */
class RecaptchaV2ProxylessRequest extends RecaptchaV2RequestBase_1.RecaptchaV2RequestBase {
    constructor(argsObj) {
        super(Object.assign({ type: TaskType_1.TaskType.NoCaptchaTaskProxyless }, argsObj));
    }
}
exports.RecaptchaV2ProxylessRequest = RecaptchaV2ProxylessRequest;

},{"../TaskType":45,"./RecaptchaV2RequestBase":39}],38:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecaptchaV2Request = void 0;
const TaskType_1 = require("../TaskType");
const ts_mixer_1 = require("ts-mixer");
const ProxyInfo_1 = require("./ProxyInfo");
const RecaptchaV2RequestBase_1 = require("./RecaptchaV2RequestBase");
/**
 * Recaptcha V2 recognition request (with proxy).
 * {@link https://zennolab.atlassian.net/wiki/spaces/APIS/pages/373161985/NoCaptchaTaskProxyless+solving+Google+recaptcha}
 */
class RecaptchaV2Request extends (0, ts_mixer_1.Mixin)(RecaptchaV2RequestBase_1.RecaptchaV2RequestBase, ProxyInfo_1.ProxyInfo) {
    constructor(argsObj) {
        super(Object.assign({ type: TaskType_1.TaskType.NoCaptchaTask }, argsObj));
    }
}
exports.RecaptchaV2Request = RecaptchaV2Request;

},{"../TaskType":45,"./ProxyInfo":33,"./RecaptchaV2RequestBase":39,"ts-mixer":48}],39:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecaptchaV2RequestBase = void 0;
const CaptchaRequestBase_1 = require("./CaptchaRequestBase");
/**
 * Base Recaptcha V2 recognition request
 */
class RecaptchaV2RequestBase extends CaptchaRequestBase_1.CaptchaRequestBase {
    constructor({ type, nocache, websiteURL, websiteKey, recaptchaDataSValue, userAgent, cookies }) {
        super({ type, nocache });
        this.websiteURL = websiteURL;
        this.websiteKey = websiteKey;
        this.recaptchaDataSValue = recaptchaDataSValue;
        this.userAgent = userAgent;
        this.cookies = cookies;
    }
}
exports.RecaptchaV2RequestBase = RecaptchaV2RequestBase;

},{"./CaptchaRequestBase":18}],40:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecaptchaV3ProxylessRequest = void 0;
const TaskType_1 = require("../TaskType");
const CaptchaRequestBase_1 = require("./CaptchaRequestBase");
/**
 * Recaptcha V3 recognition request (without proxy).
 * {@link https://zennolab.atlassian.net/wiki/spaces/APIS/pages/566853650/RecaptchaV3TaskProxyless+solving+Google+ReCaptcha+v.3}
 */
class RecaptchaV3ProxylessRequest extends CaptchaRequestBase_1.CaptchaRequestBase {
    constructor({ nocache, websiteURL, websiteKey, minScore, pageAction = 'verify' }) {
        super({ type: TaskType_1.TaskType.RecaptchaV3TaskProxyless, nocache });
        this.websiteURL = websiteURL;
        this.websiteKey = websiteKey;
        this.minScore = minScore;
        this.pageAction = pageAction;
    }
}
exports.RecaptchaV3ProxylessRequest = RecaptchaV3ProxylessRequest;

},{"../TaskType":45,"./CaptchaRequestBase":18}],41:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerializeObject = void 0;
function SerializeObject(options) {
    return Object.assign({}, options);
}
exports.SerializeObject = SerializeObject;

},{}],42:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurnstileRequest = void 0;
const TaskType_1 = require("../TaskType");
const ts_mixer_1 = require("ts-mixer");
const ProxyInfo_1 = require("./ProxyInfo");
const TurnstileRequestBase_1 = require("./TurnstileRequestBase");
/**
 * TurnstileTask / Cloudflare Challenge (with proxy for cf-clearance).
 * {@link https://zennolab.atlassian.net/wiki/spaces/APIS/pages/2313814017/TurnstileTask+Cloudflare+Challenge}
 */
class TurnstileRequest extends (0, ts_mixer_1.Mixin)(TurnstileRequestBase_1.TurnstileRequestBase, ProxyInfo_1.ProxyInfo) {
    constructor(argsObj) {
        super(Object.assign({ type: TaskType_1.TaskType.TurnstileTask }, argsObj));
        this.cloudflareTaskType = argsObj.cloudflareTaskType;
        this.userAgent = argsObj.userAgent;
        if (argsObj.cloudflareTaskType === 'cf_clearance') {
            this.htmlPageBase64 = argsObj === null || argsObj === void 0 ? void 0 : argsObj.htmlPageBase64;
            this.data = argsObj === null || argsObj === void 0 ? void 0 : argsObj.data;
            this.pageData = argsObj === null || argsObj === void 0 ? void 0 : argsObj.pageData;
        }
        if (argsObj.cloudflareTaskType === 'token') {
            this.data = argsObj === null || argsObj === void 0 ? void 0 : argsObj.data;
            this.pageData = argsObj === null || argsObj === void 0 ? void 0 : argsObj.pageData;
            this.pageAction = argsObj.pageAction;
        }
    }
}
exports.TurnstileRequest = TurnstileRequest;

},{"../TaskType":45,"./ProxyInfo":33,"./TurnstileRequestBase":43,"ts-mixer":48}],43:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurnstileRequestBase = void 0;
const CaptchaRequestBase_1 = require("./CaptchaRequestBase");
/**
 * Base Turnstile recognition request
 */
class TurnstileRequestBase extends CaptchaRequestBase_1.CaptchaRequestBase {
    constructor({ type, nocache, websiteURL, websiteKey }) {
        super({ type, nocache });
        this.websiteURL = websiteURL;
        this.websiteKey = websiteKey;
    }
}
exports.TurnstileRequestBase = TurnstileRequestBase;

},{"./CaptchaRequestBase":18}],44:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurnstileProxylessRequest = void 0;
const TaskType_1 = require("../TaskType");
const TurnstileRequestBase_1 = require("./TurnstileRequestBase");
/**
 * Recaptcha V2 recognition request (without proxy).
 * {@link https://zennolab.atlassian.net/wiki/spaces/APIS/pages/2256764929/TurnstileTaskProxyless+Turnstile}
 */
class TurnstileProxylessRequest extends TurnstileRequestBase_1.TurnstileRequestBase {
    constructor(argsObj) {
        super(Object.assign({ type: TaskType_1.TaskType.TurnstileTaskProxyless }, argsObj));
    }
}
exports.TurnstileProxylessRequest = TurnstileProxylessRequest;

},{"../TaskType":45,"./TurnstileRequestBase":43}],45:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskType = void 0;
var TaskType;
(function (TaskType) {
    TaskType["FunCaptchaTaskProxyless"] = "FunCaptchaTaskProxyless";
    TaskType["FunCaptchaTask"] = "FunCaptchaTask";
    TaskType["GeeTestTaskProxyless"] = "GeeTestTaskProxyless";
    TaskType["GeeTestTask"] = "GeeTestTask";
    TaskType["HCaptchaTaskProxyless"] = "HCaptchaTaskProxyless";
    TaskType["HCaptchaTask"] = "HCaptchaTask";
    TaskType["ImageToTextTask"] = "ImageToTextTask";
    TaskType["RecaptchaV2EnterpriseTaskProxyless"] = "RecaptchaV2EnterpriseTaskProxyless";
    TaskType["RecaptchaV2EnterpriseTask"] = "RecaptchaV2EnterpriseTask";
    TaskType["NoCaptchaTaskProxyless"] = "NoCaptchaTaskProxyless";
    TaskType["NoCaptchaTask"] = "NoCaptchaTask";
    TaskType["RecaptchaV3TaskProxyless"] = "RecaptchaV3TaskProxyless";
    TaskType["TurnstileTask"] = "TurnstileTask";
    TaskType["TurnstileTaskProxyless"] = "TurnstileTaskProxyless";
    TaskType["ComplexImageTask"] = "ComplexImageTask";
})(TaskType = exports.TaskType || (exports.TaskType = {}));

},{}],46:[function(require,module,exports){
(function (process){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNode = exports.CsMap = void 0;
class CsMap extends Map {
    constructor() {
        super();
    }
    GetOrAdd(key, value) {
        if (this.has(key)) {
            // skip adding
        }
        else {
            this.set(key, value);
        }
        return this.get(key);
    }
}
exports.CsMap = CsMap;
let isNode = false;
exports.isNode = isNode;
if (typeof process === 'object') {
    if (typeof process.versions === 'object') {
        if (typeof process.versions.node !== 'undefined') {
            exports.isNode = isNode = true;
        }
    }
}

}).call(this)}).call(this,require('_process'))
},{"_process":4}],47:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexImageFunCaptchaRequest = exports.ComplexImageHCaptchaRequest = exports.ComplexImageRecaptchaRequest = exports.TurnstileProxylessRequest = exports.TurnstileRequest = exports.RecaptchaV3ProxylessRequest = exports.RecaptchaV2Request = exports.RecaptchaV2ProxylessRequest = exports.RecaptchaV2EnterpriseRequest = exports.RecaptchaV2EnterpriseProxylessRequest = exports.ImageToTextRequest = exports.HCaptchaRequest = exports.HCaptchaProxylessRequest = exports.GeeTestRequest = exports.GeeTestProxylessRequest = exports.FunCaptchaRequest = exports.FunCaptchaProxylessRequest = exports.ClientOptions = exports.CapMonsterCloudClientFactory = exports.CapMonsterModules = exports.ErrorType = exports.TaskType = void 0;
const ClientOptions_1 = require("./ClientOptions");
Object.defineProperty(exports, "ClientOptions", { enumerable: true, get: function () { return ClientOptions_1.ClientOptions; } });
const CapMonsterCloudClientFactory_1 = require("./CapMonsterCloudClientFactory");
Object.defineProperty(exports, "CapMonsterCloudClientFactory", { enumerable: true, get: function () { return CapMonsterCloudClientFactory_1.CapMonsterCloudClientFactory; } });
const FunCaptchaProxylessRequest_1 = require("./Requests/FunCaptchaProxylessRequest");
Object.defineProperty(exports, "FunCaptchaProxylessRequest", { enumerable: true, get: function () { return FunCaptchaProxylessRequest_1.FunCaptchaProxylessRequest; } });
const FunCaptchaRequest_1 = require("./Requests/FunCaptchaRequest");
Object.defineProperty(exports, "FunCaptchaRequest", { enumerable: true, get: function () { return FunCaptchaRequest_1.FunCaptchaRequest; } });
const GeeTestProxylessRequest_1 = require("./Requests/GeeTestProxylessRequest");
Object.defineProperty(exports, "GeeTestProxylessRequest", { enumerable: true, get: function () { return GeeTestProxylessRequest_1.GeeTestProxylessRequest; } });
const GeeTestRequest_1 = require("./Requests/GeeTestRequest");
Object.defineProperty(exports, "GeeTestRequest", { enumerable: true, get: function () { return GeeTestRequest_1.GeeTestRequest; } });
const HCaptchaProxylessRequest_1 = require("./Requests/HCaptchaProxylessRequest");
Object.defineProperty(exports, "HCaptchaProxylessRequest", { enumerable: true, get: function () { return HCaptchaProxylessRequest_1.HCaptchaProxylessRequest; } });
const HCaptchaRequest_1 = require("./Requests/HCaptchaRequest");
Object.defineProperty(exports, "HCaptchaRequest", { enumerable: true, get: function () { return HCaptchaRequest_1.HCaptchaRequest; } });
const ImageToTextRequest_1 = require("./Requests/ImageToTextRequest");
Object.defineProperty(exports, "ImageToTextRequest", { enumerable: true, get: function () { return ImageToTextRequest_1.ImageToTextRequest; } });
const RecaptchaV2EnterpriseProxylessRequest_1 = require("./Requests/RecaptchaV2EnterpriseProxylessRequest");
Object.defineProperty(exports, "RecaptchaV2EnterpriseProxylessRequest", { enumerable: true, get: function () { return RecaptchaV2EnterpriseProxylessRequest_1.RecaptchaV2EnterpriseProxylessRequest; } });
const RecaptchaV2EnterpriseRequest_1 = require("./Requests/RecaptchaV2EnterpriseRequest");
Object.defineProperty(exports, "RecaptchaV2EnterpriseRequest", { enumerable: true, get: function () { return RecaptchaV2EnterpriseRequest_1.RecaptchaV2EnterpriseRequest; } });
const RecaptchaV2ProxylessRequest_1 = require("./Requests/RecaptchaV2ProxylessRequest");
Object.defineProperty(exports, "RecaptchaV2ProxylessRequest", { enumerable: true, get: function () { return RecaptchaV2ProxylessRequest_1.RecaptchaV2ProxylessRequest; } });
const RecaptchaV2Request_1 = require("./Requests/RecaptchaV2Request");
Object.defineProperty(exports, "RecaptchaV2Request", { enumerable: true, get: function () { return RecaptchaV2Request_1.RecaptchaV2Request; } });
const RecaptchaV3ProxylessRequest_1 = require("./Requests/RecaptchaV3ProxylessRequest");
Object.defineProperty(exports, "RecaptchaV3ProxylessRequest", { enumerable: true, get: function () { return RecaptchaV3ProxylessRequest_1.RecaptchaV3ProxylessRequest; } });
const TurnstileRequest_1 = require("./Requests/TurnstileRequest");
Object.defineProperty(exports, "TurnstileRequest", { enumerable: true, get: function () { return TurnstileRequest_1.TurnstileRequest; } });
const TurnstileRequestProxyless_1 = require("./Requests/TurnstileRequestProxyless");
Object.defineProperty(exports, "TurnstileProxylessRequest", { enumerable: true, get: function () { return TurnstileRequestProxyless_1.TurnstileProxylessRequest; } });
const CapMonsterModules_1 = require("./CapMonsterModules");
Object.defineProperty(exports, "CapMonsterModules", { enumerable: true, get: function () { return CapMonsterModules_1.CapMonsterModules; } });
const ErrorType_1 = require("./ErrorType");
Object.defineProperty(exports, "ErrorType", { enumerable: true, get: function () { return ErrorType_1.ErrorType; } });
const TaskType_1 = require("./TaskType");
Object.defineProperty(exports, "TaskType", { enumerable: true, get: function () { return TaskType_1.TaskType; } });
const ComplexImageRecaptchaRequest_1 = require("./Requests/ComplexImageRecaptchaRequest");
Object.defineProperty(exports, "ComplexImageRecaptchaRequest", { enumerable: true, get: function () { return ComplexImageRecaptchaRequest_1.ComplexImageRecaptchaRequest; } });
const ComplexImageHCaptchaRequest_1 = require("./Requests/ComplexImageHCaptchaRequest");
Object.defineProperty(exports, "ComplexImageHCaptchaRequest", { enumerable: true, get: function () { return ComplexImageHCaptchaRequest_1.ComplexImageHCaptchaRequest; } });
const ComplexImageFunCaptchaRequest_1 = require("./Requests/ComplexImageFunCaptchaRequest");
Object.defineProperty(exports, "ComplexImageFunCaptchaRequest", { enumerable: true, get: function () { return ComplexImageFunCaptchaRequest_1.ComplexImageFunCaptchaRequest; } });
exports.default = {
    CapMonsterCloudClientFactory: CapMonsterCloudClientFactory_1.CapMonsterCloudClientFactory,
    ClientOptions: ClientOptions_1.ClientOptions,
    FunCaptchaProxylessRequest: FunCaptchaProxylessRequest_1.FunCaptchaProxylessRequest,
    FunCaptchaRequest: FunCaptchaRequest_1.FunCaptchaRequest,
    GeeTestProxylessRequest: GeeTestProxylessRequest_1.GeeTestProxylessRequest,
    GeeTestRequest: GeeTestRequest_1.GeeTestRequest,
    HCaptchaProxylessRequest: HCaptchaProxylessRequest_1.HCaptchaProxylessRequest,
    HCaptchaRequest: HCaptchaRequest_1.HCaptchaRequest,
    ImageToTextRequest: ImageToTextRequest_1.ImageToTextRequest,
    RecaptchaV2EnterpriseProxylessRequest: RecaptchaV2EnterpriseProxylessRequest_1.RecaptchaV2EnterpriseProxylessRequest,
    RecaptchaV2EnterpriseRequest: RecaptchaV2EnterpriseRequest_1.RecaptchaV2EnterpriseRequest,
    RecaptchaV2ProxylessRequest: RecaptchaV2ProxylessRequest_1.RecaptchaV2ProxylessRequest,
    RecaptchaV2Request: RecaptchaV2Request_1.RecaptchaV2Request,
    RecaptchaV3ProxylessRequest: RecaptchaV3ProxylessRequest_1.RecaptchaV3ProxylessRequest,
    TurnstileRequest: TurnstileRequest_1.TurnstileRequest,
    TurnstileProxylessRequest: TurnstileRequestProxyless_1.TurnstileProxylessRequest,
    ComplexImageRecaptchaRequest: ComplexImageRecaptchaRequest_1.ComplexImageRecaptchaRequest,
    ComplexImageHCaptchaRequest: ComplexImageHCaptchaRequest_1.ComplexImageHCaptchaRequest,
    ComplexImageFunCaptchaRequest: ComplexImageFunCaptchaRequest_1.ComplexImageFunCaptchaRequest,
};

},{"./CapMonsterCloudClientFactory":6,"./CapMonsterModules":7,"./ClientOptions":9,"./ErrorType":12,"./Requests/ComplexImageFunCaptchaRequest":19,"./Requests/ComplexImageHCaptchaRequest":20,"./Requests/ComplexImageRecaptchaRequest":21,"./Requests/FunCaptchaProxylessRequest":23,"./Requests/FunCaptchaRequest":24,"./Requests/GeeTestProxylessRequest":26,"./Requests/GeeTestRequest":27,"./Requests/HCaptchaProxylessRequest":29,"./Requests/HCaptchaRequest":30,"./Requests/ImageToTextRequest":32,"./Requests/RecaptchaV2EnterpriseProxylessRequest":34,"./Requests/RecaptchaV2EnterpriseRequest":35,"./Requests/RecaptchaV2ProxylessRequest":37,"./Requests/RecaptchaV2Request":38,"./Requests/RecaptchaV3ProxylessRequest":40,"./Requests/TurnstileRequest":42,"./Requests/TurnstileRequestProxyless":44,"./TaskType":45}],48:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Mixin = Mixin;
exports.settings = exports.mix = exports.hasMixin = exports.decorate = void 0;
/**
 * Utility function that works like `Object.apply`, but copies getters and setters properly as well.  Additionally gives
 * the option to exclude properties by name.
 */
const copyProps = (dest, src, exclude = []) => {
  const props = Object.getOwnPropertyDescriptors(src);
  for (let prop of exclude) delete props[prop];
  Object.defineProperties(dest, props);
};
/**
 * Returns the full chain of prototypes up until Object.prototype given a starting object.  The order of prototypes will
 * be closest to farthest in the chain.
 */
const protoChain = (obj, currentChain = [obj]) => {
  const proto = Object.getPrototypeOf(obj);
  if (proto === null) return currentChain;
  return protoChain(proto, [...currentChain, proto]);
};
/**
 * Identifies the nearest ancestor common to all the given objects in their prototype chains.  For most unrelated
 * objects, this function should return Object.prototype.
 */
const nearestCommonProto = (...objs) => {
  if (objs.length === 0) return undefined;
  let commonProto = undefined;
  const protoChains = objs.map(obj => protoChain(obj));
  while (protoChains.every(protoChain => protoChain.length > 0)) {
    const protos = protoChains.map(protoChain => protoChain.pop());
    const potentialCommonProto = protos[0];
    if (protos.every(proto => proto === potentialCommonProto)) commonProto = potentialCommonProto;else break;
  }
  return commonProto;
};
/**
 * Creates a new prototype object that is a mixture of the given prototypes.  The mixing is achieved by first
 * identifying the nearest common ancestor and using it as the prototype for a new object.  Then all properties/methods
 * downstream of this prototype (ONLY downstream) are copied into the new object.
 *
 * The resulting prototype is more performant than softMixProtos(...), as well as ES5 compatible.  However, it's not as
 * flexible as updates to the source prototypes aren't captured by the mixed result.  See softMixProtos for why you may
 * want to use that instead.
 */
const hardMixProtos = (ingredients, constructor, exclude = []) => {
  var _a;
  const base = (_a = nearestCommonProto(...ingredients)) !== null && _a !== void 0 ? _a : Object.prototype;
  const mixedProto = Object.create(base);
  // Keeps track of prototypes we've already visited to avoid copying the same properties multiple times.  We init the
  // list with the proto chain below the nearest common ancestor because we don't want any of those methods mixed in
  // when they will already be accessible via prototype access.
  const visitedProtos = protoChain(base);
  for (let prototype of ingredients) {
    let protos = protoChain(prototype);
    // Apply the prototype chain in reverse order so that old methods don't override newer ones.
    for (let i = protos.length - 1; i >= 0; i--) {
      let newProto = protos[i];
      if (visitedProtos.indexOf(newProto) === -1) {
        copyProps(mixedProto, newProto, ['constructor', ...exclude]);
        visitedProtos.push(newProto);
      }
    }
  }
  mixedProto.constructor = constructor;
  return mixedProto;
};
const unique = arr => arr.filter((e, i) => arr.indexOf(e) == i);

/**
 * Finds the ingredient with the given prop, searching in reverse order and breadth-first if searching ingredient
 * prototypes is required.
 */
const getIngredientWithProp = (prop, ingredients) => {
  const protoChains = ingredients.map(ingredient => protoChain(ingredient));
  // since we search breadth-first, we need to keep track of our depth in the prototype chains
  let protoDepth = 0;
  // not all prototype chains are the same depth, so this remains true as long as at least one of the ingredients'
  // prototype chains has an object at this depth
  let protosAreLeftToSearch = true;
  while (protosAreLeftToSearch) {
    // with the start of each horizontal slice, we assume this is the one that's deeper than any of the proto chains
    protosAreLeftToSearch = false;
    // scan through the ingredients right to left
    for (let i = ingredients.length - 1; i >= 0; i--) {
      const searchTarget = protoChains[i][protoDepth];
      if (searchTarget !== undefined && searchTarget !== null) {
        // if we find something, this is proof that this horizontal slice potentially more objects to search
        protosAreLeftToSearch = true;
        // eureka, we found it
        if (Object.getOwnPropertyDescriptor(searchTarget, prop) != undefined) {
          return protoChains[i][0];
        }
      }
    }
    protoDepth++;
  }
  return undefined;
};
/**
 * "Mixes" ingredients by wrapping them in a Proxy.  The optional prototype argument allows the mixed object to sit
 * downstream of an existing prototype chain.  Note that "properties" cannot be added, deleted, or modified.
 */
const proxyMix = (ingredients, prototype = Object.prototype) => new Proxy({}, {
  getPrototypeOf() {
    return prototype;
  },
  setPrototypeOf() {
    throw Error('Cannot set prototype of Proxies created by ts-mixer');
  },
  getOwnPropertyDescriptor(_, prop) {
    return Object.getOwnPropertyDescriptor(getIngredientWithProp(prop, ingredients) || {}, prop);
  },
  defineProperty() {
    throw new Error('Cannot define new properties on Proxies created by ts-mixer');
  },
  has(_, prop) {
    return getIngredientWithProp(prop, ingredients) !== undefined || prototype[prop] !== undefined;
  },
  get(_, prop) {
    return (getIngredientWithProp(prop, ingredients) || prototype)[prop];
  },
  set(_, prop, val) {
    const ingredientWithProp = getIngredientWithProp(prop, ingredients);
    if (ingredientWithProp === undefined) throw new Error('Cannot set new properties on Proxies created by ts-mixer');
    ingredientWithProp[prop] = val;
    return true;
  },
  deleteProperty() {
    throw new Error('Cannot delete properties on Proxies created by ts-mixer');
  },
  ownKeys() {
    return ingredients.map(Object.getOwnPropertyNames).reduce((prev, curr) => curr.concat(prev.filter(key => curr.indexOf(key) < 0)));
  }
});
/**
 * Creates a new proxy-prototype object that is a "soft" mixture of the given prototypes.  The mixing is achieved by
 * proxying all property access to the ingredients.  This is not ES5 compatible and less performant.  However, any
 * changes made to the source prototypes will be reflected in the proxy-prototype, which may be desirable.
 */
const softMixProtos = (ingredients, constructor) => proxyMix([...ingredients, {
  constructor
}]);
const settings = exports.settings = {
  initFunction: null,
  staticsStrategy: 'copy',
  prototypeStrategy: 'copy',
  decoratorInheritance: 'deep'
};

// Keeps track of constituent classes for every mixin class created by ts-mixer.
const mixins = new Map();
const getMixinsForClass = clazz => mixins.get(clazz);
const registerMixins = (mixedClass, constituents) => mixins.set(mixedClass, constituents);
const hasMixin = (instance, mixin) => {
  if (instance instanceof mixin) return true;
  const constructor = instance.constructor;
  const visited = new Set();
  let frontier = new Set();
  frontier.add(constructor);
  while (frontier.size > 0) {
    // check if the frontier has the mixin we're looking for.  if not, we can say we visited every item in the frontier
    if (frontier.has(mixin)) return true;
    frontier.forEach(item => visited.add(item));
    // build a new frontier based on the associated mixin classes and prototype chains of each frontier item
    const newFrontier = new Set();
    frontier.forEach(item => {
      var _a;
      const itemConstituents = (_a = mixins.get(item)) !== null && _a !== void 0 ? _a : protoChain(item.prototype).map(proto => proto.constructor).filter(item => item !== null);
      if (itemConstituents) itemConstituents.forEach(constituent => {
        if (!visited.has(constituent) && !frontier.has(constituent)) newFrontier.add(constituent);
      });
    });
    // we have a new frontier, now search again
    frontier = newFrontier;
  }
  // if we get here, we couldn't find the mixin anywhere in the prototype chain or associated mixin classes
  return false;
};
exports.hasMixin = hasMixin;
const mergeObjectsOfDecorators = (o1, o2) => {
  var _a, _b;
  const allKeys = unique([...Object.getOwnPropertyNames(o1), ...Object.getOwnPropertyNames(o2)]);
  const mergedObject = {};
  for (let key of allKeys) mergedObject[key] = unique([...((_a = o1 === null || o1 === void 0 ? void 0 : o1[key]) !== null && _a !== void 0 ? _a : []), ...((_b = o2 === null || o2 === void 0 ? void 0 : o2[key]) !== null && _b !== void 0 ? _b : [])]);
  return mergedObject;
};
const mergePropertyAndMethodDecorators = (d1, d2) => {
  var _a, _b, _c, _d;
  return {
    property: mergeObjectsOfDecorators((_a = d1 === null || d1 === void 0 ? void 0 : d1.property) !== null && _a !== void 0 ? _a : {}, (_b = d2 === null || d2 === void 0 ? void 0 : d2.property) !== null && _b !== void 0 ? _b : {}),
    method: mergeObjectsOfDecorators((_c = d1 === null || d1 === void 0 ? void 0 : d1.method) !== null && _c !== void 0 ? _c : {}, (_d = d2 === null || d2 === void 0 ? void 0 : d2.method) !== null && _d !== void 0 ? _d : {})
  };
};
const mergeDecorators = (d1, d2) => {
  var _a, _b, _c, _d, _e, _f;
  return {
    class: unique([...((_a = d1 === null || d1 === void 0 ? void 0 : d1.class) !== null && _a !== void 0 ? _a : []), ...((_b = d2 === null || d2 === void 0 ? void 0 : d2.class) !== null && _b !== void 0 ? _b : [])]),
    static: mergePropertyAndMethodDecorators((_c = d1 === null || d1 === void 0 ? void 0 : d1.static) !== null && _c !== void 0 ? _c : {}, (_d = d2 === null || d2 === void 0 ? void 0 : d2.static) !== null && _d !== void 0 ? _d : {}),
    instance: mergePropertyAndMethodDecorators((_e = d1 === null || d1 === void 0 ? void 0 : d1.instance) !== null && _e !== void 0 ? _e : {}, (_f = d2 === null || d2 === void 0 ? void 0 : d2.instance) !== null && _f !== void 0 ? _f : {})
  };
};
const decorators = new Map();
const findAllConstituentClasses = (...classes) => {
  var _a;
  const allClasses = new Set();
  const frontier = new Set([...classes]);
  while (frontier.size > 0) {
    for (let clazz of frontier) {
      const protoChainClasses = protoChain(clazz.prototype).map(proto => proto.constructor);
      const mixinClasses = (_a = getMixinsForClass(clazz)) !== null && _a !== void 0 ? _a : [];
      const potentiallyNewClasses = [...protoChainClasses, ...mixinClasses];
      const newClasses = potentiallyNewClasses.filter(c => !allClasses.has(c));
      for (let newClass of newClasses) frontier.add(newClass);
      allClasses.add(clazz);
      frontier.delete(clazz);
    }
  }
  return [...allClasses];
};
const deepDecoratorSearch = (...classes) => {
  const decoratorsForClassChain = findAllConstituentClasses(...classes).map(clazz => decorators.get(clazz)).filter(decorators => !!decorators);
  if (decoratorsForClassChain.length == 0) return {};
  if (decoratorsForClassChain.length == 1) return decoratorsForClassChain[0];
  return decoratorsForClassChain.reduce((d1, d2) => mergeDecorators(d1, d2));
};
const directDecoratorSearch = (...classes) => {
  const classDecorators = classes.map(clazz => getDecoratorsForClass(clazz));
  if (classDecorators.length === 0) return {};
  if (classDecorators.length === 1) return classDecorators[0];
  return classDecorators.reduce((d1, d2) => mergeDecorators(d1, d2));
};
const getDecoratorsForClass = clazz => {
  let decoratorsForClass = decorators.get(clazz);
  if (!decoratorsForClass) {
    decoratorsForClass = {};
    decorators.set(clazz, decoratorsForClass);
  }
  return decoratorsForClass;
};
const decorateClass = decorator => clazz => {
  const decoratorsForClass = getDecoratorsForClass(clazz);
  let classDecorators = decoratorsForClass.class;
  if (!classDecorators) {
    classDecorators = [];
    decoratorsForClass.class = classDecorators;
  }
  classDecorators.push(decorator);
  return decorator(clazz);
};
const decorateMember = decorator => (object, key, ...otherArgs) => {
  var _a, _b, _c;
  const decoratorTargetType = typeof object === 'function' ? 'static' : 'instance';
  const decoratorType = typeof object[key] === 'function' ? 'method' : 'property';
  const clazz = decoratorTargetType === 'static' ? object : object.constructor;
  const decoratorsForClass = getDecoratorsForClass(clazz);
  const decoratorsForTargetType = (_a = decoratorsForClass === null || decoratorsForClass === void 0 ? void 0 : decoratorsForClass[decoratorTargetType]) !== null && _a !== void 0 ? _a : {};
  decoratorsForClass[decoratorTargetType] = decoratorsForTargetType;
  let decoratorsForType = (_b = decoratorsForTargetType === null || decoratorsForTargetType === void 0 ? void 0 : decoratorsForTargetType[decoratorType]) !== null && _b !== void 0 ? _b : {};
  decoratorsForTargetType[decoratorType] = decoratorsForType;
  let decoratorsForKey = (_c = decoratorsForType === null || decoratorsForType === void 0 ? void 0 : decoratorsForType[key]) !== null && _c !== void 0 ? _c : [];
  decoratorsForType[key] = decoratorsForKey;
  // @ts-ignore: array is type `A[] | B[]` and item is type `A | B`, so technically a type error, but it's fine
  decoratorsForKey.push(decorator);
  // @ts-ignore
  return decorator(object, key, ...otherArgs);
};
const decorate = decorator => (...args) => {
  if (args.length === 1) return decorateClass(decorator)(args[0]);
  return decorateMember(decorator)(...args);
};
exports.decorate = decorate;
function Mixin(...constructors) {
  var _a, _b, _c;
  const prototypes = constructors.map(constructor => constructor.prototype);
  // Here we gather up the init functions of the ingredient prototypes, combine them into one init function, and
  // attach it to the mixed class prototype.  The reason we do this is because we want the init functions to mix
  // similarly to constructors -- not methods, which simply override each other.
  const initFunctionName = settings.initFunction;
  if (initFunctionName !== null) {
    const initFunctions = prototypes.map(proto => proto[initFunctionName]).filter(func => typeof func === 'function');
    const combinedInitFunction = function (...args) {
      for (let initFunction of initFunctions) initFunction.apply(this, args);
    };
    const extraProto = {
      [initFunctionName]: combinedInitFunction
    };
    prototypes.push(extraProto);
  }
  function MixedClass(...args) {
    for (const constructor of constructors)
    // @ts-ignore: potentially abstract class
    copyProps(this, new constructor(...args));
    if (initFunctionName !== null && typeof this[initFunctionName] === 'function') this[initFunctionName].apply(this, args);
  }
  MixedClass.prototype = settings.prototypeStrategy === 'copy' ? hardMixProtos(prototypes, MixedClass) : softMixProtos(prototypes, MixedClass);
  Object.setPrototypeOf(MixedClass, settings.staticsStrategy === 'copy' ? hardMixProtos(constructors, null, ['prototype']) : proxyMix(constructors, Function.prototype));
  let DecoratedMixedClass = MixedClass;
  if (settings.decoratorInheritance !== 'none') {
    const classDecorators = settings.decoratorInheritance === 'deep' ? deepDecoratorSearch(...constructors) : directDecoratorSearch(...constructors);
    for (let decorator of (_a = classDecorators === null || classDecorators === void 0 ? void 0 : classDecorators.class) !== null && _a !== void 0 ? _a : []) {
      const result = decorator(DecoratedMixedClass);
      if (result) {
        DecoratedMixedClass = result;
      }
    }
    applyPropAndMethodDecorators((_b = classDecorators === null || classDecorators === void 0 ? void 0 : classDecorators.static) !== null && _b !== void 0 ? _b : {}, DecoratedMixedClass);
    applyPropAndMethodDecorators((_c = classDecorators === null || classDecorators === void 0 ? void 0 : classDecorators.instance) !== null && _c !== void 0 ? _c : {}, DecoratedMixedClass.prototype);
  }
  registerMixins(DecoratedMixedClass, constructors);
  return DecoratedMixedClass;
}
const applyPropAndMethodDecorators = (propAndMethodDecorators, target) => {
  const propDecorators = propAndMethodDecorators.property;
  const methodDecorators = propAndMethodDecorators.method;
  if (propDecorators) for (let key in propDecorators) for (let decorator of propDecorators[key]) decorator(target, key);
  if (methodDecorators) for (let key in methodDecorators) for (let decorator of methodDecorators[key]) decorator(target, key, Object.getOwnPropertyDescriptor(target, key));
};
/**
 * A decorator version of the `Mixin` function.  You'll want to use this instead of `Mixin` for mixing generic classes.
 */
const mix = (...ingredients) => decoratedClass => {
  // @ts-ignore
  const mixedClass = Mixin(...ingredients.concat([decoratedClass]));
  Object.defineProperty(mixedClass, 'name', {
    value: decoratedClass.name,
    writable: false
  });
  return mixedClass;
};
exports.mix = mix;

},{}],49:[function(require,module,exports){
require('@zennolab_com/capmonstercloud-client');

},{"@zennolab_com/capmonstercloud-client":47}]},{},[49]);
