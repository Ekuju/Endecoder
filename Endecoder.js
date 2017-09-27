/**
 * Created by Trent on 1/16/2017.
 */

var Endecoder = function() {
};

Endecoder.TYPE_NULL = 0;
Endecoder.TYPE_OBJECT = 1;
Endecoder.TYPE_ARRAY = 2;
Endecoder.TYPE_INTEGER = 3;
Endecoder.TYPE_FLOAT = 4;
Endecoder.TYPE_STRING = 5;
Endecoder.TYPE_BOOLEAN = 6;

Endecoder.ENCODE_FUNCTION_MAP = {};
Endecoder.DECODE_FUNCTION_MAP = {};

Endecoder.LITTLE_ENDIAN = 0;
Endecoder.BIG_ENDIAN = 1;

Endecoder._BUFFER = new ArrayBuffer(4);
Endecoder._BYTE_BUFFER = new Uint8Array(Endecoder._BUFFER);
Endecoder._FLOAT_BUFFER = new Float32Array(Endecoder._BUFFER);
Endecoder._INT_BUFFER = new Int32Array(Endecoder._BUFFER);

Endecoder._endian = null;
Endecoder._index = 0;

Endecoder.encode = function(element, template) {
    let type = Endecoder._getType(element);
    let call = Endecoder.ENCODE_FUNCTION_MAP[type];

    let array = [];
    call(array, element, template);

    return new Uint8Array(array).buffer;
};

Endecoder.decode = function(array, template) {
    if (array instanceof ArrayBuffer) {
        array = new Uint8Array(array);
    }

    Endecoder._index = 0;
    return Endecoder._decode(array, template);
};

Endecoder._encodeObject = function(array, element, template) {
    array.push(Endecoder.TYPE_OBJECT);

    let templateKeys = Object.keys(template);
    if (templateKeys.length > 255) {
        throw 'Template object must have less than 255 keys.';
    }
    templateKeys.sort();

    let elementKeys = Object.keys(element);
    array.push(elementKeys.length);

    for (let i = 0; i < templateKeys.length; i++) {
        let key = templateKeys[i];
        let part = element[key];
        let templatePart = template[key];
        if (part === undefined) {
            continue;
        }

        array.push(i);

        let type = Endecoder._getType(part);
        let call = Endecoder.ENCODE_FUNCTION_MAP[type];

        call(array, part, templatePart);
    }
};

Endecoder._encodeArray = function(array, element, template) {
    array.push(Endecoder.TYPE_ARRAY);

    if (element.length > 255) {
        throw 'Array size must be less than 255.';
    }

    array.push(element.length);

    let templatePart = template[0];
    for (let i = 0; i < element.length; i++) {
        let part = element[i];

        let type = Endecoder._getType(part);
        let call = Endecoder.ENCODE_FUNCTION_MAP[type];

        call(array, part, templatePart);
    }
};

Endecoder._encodeInteger = function(array, element) {
    array.push(Endecoder.TYPE_INTEGER);

    let bytes = Endecoder._readByteArrayFromInt(element);
    for (let i = 0; i < bytes.length; i++) {
        let byte = bytes[i];

        array.push(byte);
    }
};

Endecoder._encodeFloat = function(array, element) {
    array.push(Endecoder.TYPE_FLOAT);

    let bytes = Endecoder._readByteArrayFromFloat(element);
    for (let i = 0; i < bytes.length; i++) {
        let byte = bytes[i];

        array.push(byte);
    }
};

Endecoder._encodeString = function(array, element) {
    array.push(Endecoder.TYPE_STRING);

    if (element.length > 255) {
        throw 'String length must be less than 255.';
    }
    array.push(element.length);

    for (let i = 0; i < element.length; i++) {
        let value = element.charCodeAt(i);

        array.push(value);
    }
};

Endecoder._encodeBoolean = function(array, element) {
    array.push(Endecoder.TYPE_BOOLEAN);

    array.push(Endecoder._readByteFromBoolean(element));
};

Endecoder._decode = function(array, template) {
    let type = array[Endecoder._index++];
    let call = Endecoder.DECODE_FUNCTION_MAP[type];

    return call(array, template);
};

Endecoder._decodeObject = function(array, template) {
    let keys = Object.keys(template);
    keys.sort();

    let finalObject = {};

    let keyCount = array[Endecoder._index++];
    for (let i = 0; i < keyCount; i++) {
        let keyIndex = array[Endecoder._index++];
        let key = keys[keyIndex];
        let part = template[key];

        let type = array[Endecoder._index++];
        let call = Endecoder.DECODE_FUNCTION_MAP[type];

        finalObject[key] = call(array, part);
    }

    return finalObject;
};

Endecoder._decodeArray = function(array, template) {
    let length = array[Endecoder._index++];

    let finalArray = [];

    for (let i = 0; i < length; i++) {
        let type = array[Endecoder._index++];
        let call = Endecoder.DECODE_FUNCTION_MAP[type];

        finalArray[i] = call(array, template[0]);
    }

    return finalArray;
};

Endecoder._decodeInteger = function(array) {
    let bytes = [array[Endecoder._index++], array[Endecoder._index++], array[Endecoder._index++], array[Endecoder._index++]];

    return Endecoder._readIntFromByteArray(bytes);
};

Endecoder._decodeFloat = function(array) {
    let bytes = [array[Endecoder._index++], array[Endecoder._index++], array[Endecoder._index++], array[Endecoder._index++]];

    return Endecoder._readFloatFromByteArray(bytes);
};

Endecoder._decodeString = function(array) {
    let length = array[Endecoder._index++];

    let string = '';
    for (let i = 0; i < length; i++) {
        string += String.fromCharCode(array[Endecoder._index++]);
    }

    return string;
};

Endecoder._decodeBoolean = function(array) {
    let byte = array[Endecoder._index++];

    return Endecoder._readBooleanFromByte(byte);
};

Endecoder._getType = function(element) {
    let type = Endecoder.TYPE_NULL;

    if (typeof element === 'object') {
        type = Endecoder.TYPE_OBJECT;

        if (element instanceof Array) {
            type = Endecoder.TYPE_ARRAY;
        }
    }

    if (typeof element === 'number') {
        type = Endecoder.TYPE_INTEGER;

        if (Math.floor(element) !== element) {
            type = Endecoder.TYPE_FLOAT;
        }
    }

    if (typeof element === 'string') {
        type = Endecoder.TYPE_STRING;
    }

    if (typeof element === 'boolean') {
        type = Endecoder.TYPE_BOOLEAN;
    }

    return type;
};

Endecoder._readIntFromByteArray = function(array) {
    Endecoder._loadByteBuffer(array);

    return Endecoder._INT_BUFFER[0];
};

Endecoder._readFloatFromByteArray = function(array) {
    Endecoder._loadByteBuffer(array);

    return Endecoder._FLOAT_BUFFER[0];
};

Endecoder._readBooleanFromByte = function(byte) {
    return byte === 1;
};

Endecoder._readByteArrayFromInt = function(value) {
    Endecoder._INT_BUFFER[0] = value;

    return Endecoder._getByteBuffer();
};

Endecoder._readByteArrayFromFloat = function(value) {
    Endecoder._FLOAT_BUFFER[0] = value;

    return Endecoder._getByteBuffer();
};

Endecoder._readByteFromBoolean = function(boolean) {
    return boolean ? 1 : 0;
};

Endecoder._getByteBuffer = function() {
    let buffer = [];
    if (Endecoder._getEndian() === Endecoder.LITTLE_ENDIAN) {
        buffer = [Endecoder._BYTE_BUFFER[3], Endecoder._BYTE_BUFFER[2], Endecoder._BYTE_BUFFER[1], Endecoder._BYTE_BUFFER[0]];
    } else {
        buffer = [Endecoder._BYTE_BUFFER[0], Endecoder._BYTE_BUFFER[1], Endecoder._BYTE_BUFFER[2], Endecoder._BYTE_BUFFER[3]];
    }

    return buffer;
};

Endecoder._loadByteBuffer = function(array) {
    if (Endecoder._getEndian() === Endecoder.LITTLE_ENDIAN) {
        Endecoder._BYTE_BUFFER[0] = array[3];
        Endecoder._BYTE_BUFFER[1] = array[2];
        Endecoder._BYTE_BUFFER[2] = array[1];
        Endecoder._BYTE_BUFFER[3] = array[0];
    } else {
        Endecoder._BYTE_BUFFER[0] = array[0];
        Endecoder._BYTE_BUFFER[1] = array[1];
        Endecoder._BYTE_BUFFER[2] = array[2];
        Endecoder._BYTE_BUFFER[3] = array[3];
    }
};

Endecoder._getEndian = function() {
    if (Endecoder._endian !== null) {
        return Endecoder._endian;
    }

    var tempArrayBuffer = new ArrayBuffer(4);
    var tempByteBuffer = new Uint8Array(tempArrayBuffer);
    var tempIntBuffer = new Int32Array(tempArrayBuffer);
    tempByteBuffer[3] = 0;
    tempByteBuffer[2] = 0;
    tempByteBuffer[1] = 0;
    tempByteBuffer[0] = 1;
    let value = tempIntBuffer[0];

    if (value === 1) {
        Endecoder._endian = Endecoder.LITTLE_ENDIAN;
        return Endecoder.LITTLE_ENDIAN;
    }

    Endecoder._endian = Endecoder.BIG_ENDIAN;
    return Endecoder.BIG_ENDIAN;
};

Endecoder._initialize = function() {
    Endecoder.ENCODE_FUNCTION_MAP[Endecoder.TYPE_NULL] = function() {throw 'No encode function defined for type null.'};
    Endecoder.ENCODE_FUNCTION_MAP[Endecoder.TYPE_OBJECT] = Endecoder._encodeObject;
    Endecoder.ENCODE_FUNCTION_MAP[Endecoder.TYPE_ARRAY] = Endecoder._encodeArray;
    Endecoder.ENCODE_FUNCTION_MAP[Endecoder.TYPE_INTEGER] = Endecoder._encodeInteger;
    Endecoder.ENCODE_FUNCTION_MAP[Endecoder.TYPE_FLOAT] = Endecoder._encodeFloat;
    Endecoder.ENCODE_FUNCTION_MAP[Endecoder.TYPE_STRING] = Endecoder._encodeString;
    Endecoder.ENCODE_FUNCTION_MAP[Endecoder.TYPE_BOOLEAN] = Endecoder._encodeBoolean;

    Endecoder.DECODE_FUNCTION_MAP[Endecoder.TYPE_NULL] = function() {throw 'No decode function defined for type null.'};
    Endecoder.DECODE_FUNCTION_MAP[Endecoder.TYPE_OBJECT] = Endecoder._decodeObject;
    Endecoder.DECODE_FUNCTION_MAP[Endecoder.TYPE_ARRAY] = Endecoder._decodeArray;
    Endecoder.DECODE_FUNCTION_MAP[Endecoder.TYPE_INTEGER] = Endecoder._decodeInteger;
    Endecoder.DECODE_FUNCTION_MAP[Endecoder.TYPE_FLOAT] = Endecoder._decodeFloat;
    Endecoder.DECODE_FUNCTION_MAP[Endecoder.TYPE_STRING] = Endecoder._decodeString;
    Endecoder.DECODE_FUNCTION_MAP[Endecoder.TYPE_BOOLEAN] = Endecoder._decodeBoolean;
};

Endecoder._initialize();