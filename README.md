# Endecoder

### Example Usage

```javascript
var template = {
	"value1": [],
	"val2": null,
	"enumTest": ["valueA", "valueB", "apples", "oranges"],
	"3test": {
		"finally": null,
		"again": null,
		"finalInnerVariable": []
	},
	"oneMore": [{
		"exampleObjectArray": null,
		"exampleAgain1": null,
		"exampleAgain2": null,
		"exampleAgain3": null
	}],
	"finalOuter": null
};

var json = {
	"value1": [0, 1],
	"val2": 2,
	"enumTest": "apples",
	"3test": {
		"finally": "blah!",
		"again": 3.14159,
		"finalInnerVariable": [0, 3, 5, 6]
	},
	"oneMore": [{
		"exampleObjectArray": 1923123,
		"exampleAgain2": false
	}, {
		"exampleAgain1": true,
		"exampleAgain3": "This is how you would represent an array of objects."
	}, {
		"exampleObjectArray": 5231,
		"exampleAgain1": false,
		"exampleAgain2": true,
		"exampleAgain3": "And again with all the keys but different values!"
	}],
	"finalOuter": true
};

var encoded = Endecoder.encode(json, template);
console.log('Encoded: ', new Uint8Array(encoded));
// Encoded:
//   Uint8Array(204) [1, 5, 0, 1, 3, 0, 4, 64, 73, 15, 208, 1, 2, 4, 3, 0, 0, 0, 0, 3, 0, 0, 0, 3, 3, 0, 0, 0, 5, 3, 0, 0, 0, 6, 2, 5, 5, 98, 108, 97, 104, 33, 1, 6, 1, 2, 2, 3, 1, 2, 1, 6, 0, 3, 3, 0, 29, 88, 51, 1, 2, 0, 6, 1, 2, 5, 52, 84, 104, 105, 115, 32, 105, 115, 32, 104, 111, 119, 32, 121, 111, 117, 32, 119, 111, 117, 108, 100, 32, 114, 101, 112, 114, 101, 115, 101, 110, 116, 32, 97, …]

var decoded = Endecoder.decode(encoded, template);
console.log('Decoded: ', JSON.stringify(decoded));
// Decoded:
//   {
//   	"3test": {
//			"again": 3.141590118408203,
//			"finalInnerVariable": [0, 3, 5, 6],
//			"finally": "blah!"
//		},
//		"finalOuter": true,
//		"oneMore": [{
//			"exampleAgain2": false,
//			"exampleObjectArray": 1923123
//		}, {
//			"exampleAgain1": true,
//			"exampleAgain3": "This is how you would represent an array of objects."
//		}, {
//			"exampleAgain1": false,
//			"exampleAgain2": true,
//			"exampleAgain3": "And again with all the keys but different values!",
//			"exampleObjectArray": 5231
//		}],
//		"val2": 2,
//		"value1": [0, 1]
//	}
```

The encoded value is returned in an ArrayBuffer which can be easily sent through a WebSocket as shown here:

```javascript
websocket.send(encoded, {'binary': true});
```

I'm pretty sure that the encoded value can be received over a websocket and decoded through the data parameter as shown here:

```javascript
var object = Endecoder.decode(websocketMessage.data, template);
```