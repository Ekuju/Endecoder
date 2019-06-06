/**
 * Created by Trent on 1/16/2017.
 */

const Endecoder = {};

Endecoder.TYPE_NULL = 0;
Endecoder.TYPE_OBJECT = 1;
Endecoder.TYPE_ARRAY = 2;
Endecoder.TYPE_INTEGER = 3;
Endecoder.TYPE_FLOAT = 4;
Endecoder.TYPE_STRING = 5;
Endecoder.TYPE_BOOLEAN = 6;
Endecoder.TYPE_ENUM = 7;

Endecoder.ENCODE_FUNCTION_MAP = {};
Endecoder.DECODE_FUNCTION_MAP = {};

Endecoder.LITTLE_ENDIAN = 0;
Endecoder.BIG_ENDIAN = 1;
Endecoder.STRING_LENGTH_BYTES = 2; // up to 65536 characters
Endecoder.STRING_CHARACTER_BYTES = 2; // basically utf-16

Endecoder._BUFFER = new ArrayBuffer(4);
Endecoder._BYTE_BUFFER = new Uint8Array(Endecoder._BUFFER);
Endecoder._FLOAT_BUFFER = new Float32Array(Endecoder._BUFFER);
Endecoder._INT_BUFFER = new Int32Array(Endecoder._BUFFER);

Endecoder._endian = null;
Endecoder._index = 0;

Endecoder.encode = function(element, template) {
    const type = Endecoder._getType(element, template);
    const call = Endecoder.ENCODE_FUNCTION_MAP[type];

    const array = [];
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

    const templateKeys = Object.keys(template);
    if (templateKeys.length > 255) {
        throw 'Template object must have less than 256 keys.';
    }
    templateKeys.sort();

    const elementKeys = Object.keys(element);
    array.push(elementKeys.length);

    for (let i = 0; i < templateKeys.length; i++) {
        const key = templateKeys[i];
        const part = element[key];
        const templatePart = template[key];
        if (part === undefined) {
            continue;
        }

        array.push(i);

        const type = Endecoder._getType(part, templatePart);
        const call = Endecoder.ENCODE_FUNCTION_MAP[type];

        call(array, part, templatePart);
    }
};

Endecoder._encodeArray = function(array, element, template) {
    array.push(Endecoder.TYPE_ARRAY);

    if (element.length > 255) {
        throw 'Array size must be less than 256.';
    }

    array.push(element.length);

    const templatePart = template[0];
    for (let i = 0; i < element.length; i++) {
        const part = element[i];

        const type = Endecoder._getType(part, null);
        const call = Endecoder.ENCODE_FUNCTION_MAP[type];

        call(array, part, templatePart);
    }
};

Endecoder._encodeInteger = function(array, element) {
    array.push(Endecoder.TYPE_INTEGER);

    const bytes = Endecoder._readByteArrayFromInt(element);
    for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];

        array.push(byte);
    }
};

Endecoder._encodeFloat = function(array, element) {
    array.push(Endecoder.TYPE_FLOAT);

    const bytes = Endecoder._readByteArrayFromFloat(element);
    for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];

        array.push(byte);
    }
};

Endecoder._encodeString = function(array, element) {
    array.push(Endecoder.TYPE_STRING);

    if (element.length >= Math.pow(2, Endecoder.STRING_LENGTH_BYTES * 8)) {
        throw 'String length must be less than ' + Math.pow(2, Endecoder.STRING_LENGTH_BYTES * 8) + '.';
    }

    const bytes = Endecoder._readByteArrayFromInt(element.length);
    for (let i = 0; i < Endecoder.STRING_LENGTH_BYTES; i++) {
        const byte = bytes[bytes.length - Endecoder.STRING_LENGTH_BYTES + i];

        array.push(byte);
    }

    for (let i = 0; i < element.length; i++) {
        const value = element.charCodeAt(i);
        const bytes = Endecoder._readByteArrayFromInt(value);

        for (let a = 0; a < Endecoder.STRING_CHARACTER_BYTES; a++) {
            const byte = bytes[bytes.length - Endecoder.STRING_CHARACTER_BYTES + a];

            array.push(byte);
        }
    }
};

Endecoder._encodeBoolean = function(array, element) {
    array.push(Endecoder.TYPE_BOOLEAN);

    array.push(Endecoder._readByteFromBoolean(element));
};

Endecoder._encodeEnum = function(array, element, template) {
    array.push(Endecoder.TYPE_ENUM);

    if (template.length > 255) {
        throw 'The template enum set must have less than 256 entries.';
    }

    const index = template.indexOf(element);
    if (index === -1) {
        console.error('Cannot encode enum ' + element + '.');
        throw 'The enum being encoded must be part of the template enum set.';
    }

    array.push(index);
};

Endecoder._decode = function(array, template) {
    const type = array[Endecoder._index++];
    const call = Endecoder.DECODE_FUNCTION_MAP[type];

    return call(array, template);
};

Endecoder._decodeObject = function(array, template) {
    const keys = Object.keys(template);
    keys.sort();

    const finalObject = {};

    const keyCount = array[Endecoder._index++];
    for (let i = 0; i < keyCount; i++) {
        const keyIndex = array[Endecoder._index++];
        const key = keys[keyIndex];
        const part = template[key];

        const type = array[Endecoder._index++];
        const call = Endecoder.DECODE_FUNCTION_MAP[type];

        finalObject[key] = call(array, part);
    }

    return finalObject;
};

Endecoder._decodeArray = function(array, template) {
    const length = array[Endecoder._index++];

    const finalArray = [];

    for (let i = 0; i < length; i++) {
        const type = array[Endecoder._index++];
        const call = Endecoder.DECODE_FUNCTION_MAP[type];

        finalArray[i] = call(array, template[0]);
    }

    return finalArray;
};

Endecoder._decodeInteger = function(array) {
    const bytes = [array[Endecoder._index++], array[Endecoder._index++], array[Endecoder._index++], array[Endecoder._index++]];

    return Endecoder._readIntFromByteArray(bytes);
};

Endecoder._decodeFloat = function(array) {
    const bytes = [array[Endecoder._index++], array[Endecoder._index++], array[Endecoder._index++], array[Endecoder._index++]];

    return Endecoder._readFloatFromByteArray(bytes);
};

Endecoder._decodeString = function(array) {
    const lengthBytes = [0, 0, 0, 0];
    for (let i = 0; i < Endecoder.STRING_LENGTH_BYTES; i++) {
        lengthBytes[lengthBytes.length - Endecoder.STRING_LENGTH_BYTES + i] = array[Endecoder._index++];
    }

    const length = Endecoder._readIntFromByteArray(lengthBytes);

    let string = '';
    for (let i = 0; i < length; i++) {
        const bytes = [0, 0, 0, 0];
        for (let i = 0; i < Endecoder.STRING_CHARACTER_BYTES; i++) {
            bytes[bytes.length - Endecoder.STRING_CHARACTER_BYTES + i] = array[Endecoder._index++];
        }
        const value = Endecoder._readIntFromByteArray(bytes);

        string += String.fromCharCode(value);
    }

    return string;
};

Endecoder._decodeBoolean = function(array) {
    const byte = array[Endecoder._index++];

    return Endecoder._readBooleanFromByte(byte);
};

Endecoder._decodeEnum = function(array, template) {
    const index = array[Endecoder._index++];

    return template[index];
};

Endecoder._getType = function(element, template) {
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

        if (template instanceof Array) {
            type = Endecoder.TYPE_ENUM;
        }
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

    const tempArrayBuffer = new ArrayBuffer(4);
    const tempByteBuffer = new Uint8Array(tempArrayBuffer);
    const tempIntBuffer = new Int32Array(tempArrayBuffer);
    tempByteBuffer[3] = 0;
    tempByteBuffer[2] = 0;
    tempByteBuffer[1] = 0;
    tempByteBuffer[0] = 1;
    const value = tempIntBuffer[0];

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
    Endecoder.ENCODE_FUNCTION_MAP[Endecoder.TYPE_ENUM] = Endecoder._encodeEnum;

    Endecoder.DECODE_FUNCTION_MAP[Endecoder.TYPE_NULL] = function() {throw 'No decode function defined for type null.'};
    Endecoder.DECODE_FUNCTION_MAP[Endecoder.TYPE_OBJECT] = Endecoder._decodeObject;
    Endecoder.DECODE_FUNCTION_MAP[Endecoder.TYPE_ARRAY] = Endecoder._decodeArray;
    Endecoder.DECODE_FUNCTION_MAP[Endecoder.TYPE_INTEGER] = Endecoder._decodeInteger;
    Endecoder.DECODE_FUNCTION_MAP[Endecoder.TYPE_FLOAT] = Endecoder._decodeFloat;
    Endecoder.DECODE_FUNCTION_MAP[Endecoder.TYPE_STRING] = Endecoder._decodeString;
    Endecoder.DECODE_FUNCTION_MAP[Endecoder.TYPE_BOOLEAN] = Endecoder._decodeBoolean;
    Endecoder.DECODE_FUNCTION_MAP[Endecoder.TYPE_ENUM] = Endecoder._decodeEnum;
};

Endecoder._initialize();