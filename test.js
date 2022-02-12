import { checkSchemaId, Database, DatabaseSchema } from "./index.js";

const pSchema = new DatabaseSchema({
	x: "int32",
	y: "int32",
	username: "string_big"
});
const mainSchema = new DatabaseSchema({
	dateNumber: "int64",
	lotsaDecimal: { type: "uint32", decimalSpots: 9 },
	player: [pSchema],
	ps: [pSchema],
	string: { type: "string", stringLength: 12 }
});
const db = new Database("test", "statistics", mainSchema);
const data = {
	dateNumber: Date.now(),
	lotsaDecimal: 4.294965321,
	player: [
		{
			x: 0,
			y: 0,
			username: "heyo"
		}
	],
	ps: [
		{
			x: 50,
			y: 64,
			username: "supbros"
		}
	],
	string: "testing"
};

// I'm overwriting it for testing, best not to do this
db.template(data);

let sizeDiff =
	JSON.stringify(data).length - mainSchema.serialize(data).byteLength;
let equal =
	JSON.stringify(data).length ==
	JSON.stringify(mainSchema.deserialize(mainSchema.serialize(data))).length;
let compressionRate =
	mainSchema.serialize(data).byteLength / JSON.stringify(data).length;
let idsMatch = checkSchemaId(mainSchema.serialize(data)) == mainSchema.schemaId;

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
console.log(`The schema ids do${idsMatch ? "" : "n't"} match`);
console.log(mainSchema.deserialize(mainSchema.serialize(data)));
