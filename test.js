import { Database, DatabaseSchema } from "./index.js";

const mainSchema = new DatabaseSchema({
	dateNumber: "int64",
	aBoolean: "boolean",
	anotherBoolean: "boolean",
	again: "boolean",
	storedBoolean: "boolean",
	lotsaDecimal: { type: "uint32", decimalSpots: 9 },
	someonesName: { type: "string", stringLength: 5 }
});
const db = new Database("test", "statistics", mainSchema);
const data = {
	dateNumber: Date.now(),
	aBoolean: true,
	anotherBoolean: false,
	again: true,
	storedBoolean: true,
	lotsaDecimal: 8.564325893,
	someonesName: "Bobby"
};

// I'm overwriting it for testing, best not to do this
db.template(data);

let sizeDiff =
	JSON.stringify(data).length - mainSchema.serialize(data).byteLength;
let equal = JSON.stringify(data).length == JSON.stringify(db._load()).length;
let compressionRate =
	mainSchema.serialize(data).byteLength / JSON.stringify(data).length;

console.log(
	`Storing this data as a string is ${sizeDiff}B larger than using schemas.`
);
console.log(
	`The decompressed data is ${
		equal ? "equal to" : "not equal to"
	} the never-compressed data`
);
console.log(
	`The compression rate for this data is ${
		Math.round((1 - compressionRate) * 10000) / 100
	}%`
);
