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
//   Uint8Array(316) [1, 6, 0, 1, 3, 0, 4, 64, 73, 15, 208, 1, 2, 4, 3, 0, 0, 0, 0, 3, 0, 0, 0, 3, 3, 0, 0, 0, 5, 3, 0, 0, 0, 6, 2, 5, 0, 5, 0, 98, 0, 108, 0, 97, 0, 104, 0, 33, 1, 7, 2, 2, 6, 1, 3, 2, 3, 1, 2, 1, 6, 0, 3, 3, 0, 29, 88, 51, 1, 2, 0, 6, 1, 2, 5, 0, 52, 0, 84, 0, 104, 0, 105, 0, 115, 0, 32, 0, 105, 0, 115, 0, 32, 0, 104, 0, 111, 0, 119, 0, …]

var decoded = Endecoder.decode(encoded, template);
console.log('Decoded: ', JSON.stringify(decoded));
// Decoded:
//   {
//   	"3test": {
//			"again": 3.141590118408203,
//			"finalInnerVariable": [0, 3, 5, 6],
//			"finally": "blah!"
//		},
//		"enumTest": "apples",
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