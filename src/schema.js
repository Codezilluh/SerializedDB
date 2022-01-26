import types from "./types.js";
import { filter, forEach } from "./optimized.js";
import messages from "./messages.js";

const sortEntries = (a, b) => a[0].localeCompare(b[0]);
const toArrayBuffer = (buf) => {
	const ab = new ArrayBuffer(buf.length);
	const view = new Uint8Array(ab);
	for (let i = 0; i < buf.length; ++i) {
		view[i] = buf[i];
	}
	return ab;
};

export default class DatabaseSchema {
	constructor(template) {
		this._template = template;
		this._boolCount = Object.keys(
			filter(
				template,
				(e) => typeof e == "string" && e.toLowerCase() == "boolean"
			)
		).length;
	}

	_getByteLength(data, temp) {
		if (typeof this._template !== "object") return;

		let length = 0;

		forEach(Object.entries(this._template), ([key, value]) => {
			// Is this a schema?
			if (
				typeof value == "object" &&
				typeof value._getByteLength == "function"
			) {
				length += value._getByteLength();

				return;
			}

			// Is this an array?
			if (
				typeof value == "object" &&
				Array.isArray(value) &&
				typeof value[0]._getByteLength == "function" &&
				data
			) {
				length +=
					value[0]._getByteLength(data[key], value[0]._template) *
						data[key].length +
					2;

				return;
			}

			// Add two bytes to length
			if (
				(value == "string" || value == "string_small") &&
				!value.stringLength
			)
				length += 2;

			// Default
			length +=
				(types[value] || types[value.type]).byteLength *
				(value.type
					? value.stringLength || 1
					: data && data[key]
					? data[key].length || 1
					: 1);
		});

		return Math.ceil(length);
	}

	serialize(data) {
		let buf = new ArrayBuffer(this._getByteLength(data));
		let view = new DataView(buf);

		let boolArray = [];
		let offset = 0;

		try {
			Object.entries(this._template)
				.sort(sortEntries)
				.forEach(([key, tempValue]) => {
					let typeName = tempValue;
					let value = data[key];
					let decimalSpots = 0;
					let stringLength = 0;

					// Should some customization be done to this type?
					if (
						typeof typeName == "object" &&
						(typeName.decimalSpots || typeName.stringLength) &&
						typeName.type
					) {
						stringLength = typeName.stringLength || 0;
						decimalSpots = typeName.decimalSpots || 0;

						typeName = typeName.type;

						// Make the decimal number a whole number
						if (decimalSpots) {
							value *= Math.round(10 ** decimalSpots);
						}
					} else {
						if (typeof typeName == "string") {
							typeName = typeName.toLowerCase();
						} else if (
							typeof typeName._getByteLength == "function"
						) {
							typeName = "schema";
						} else if (
							Array.isArray(typeName) &&
							typeof typeName[0]._getByteLength == "function"
						) {
							typeName = "schema_array";
						}
					}

					let typeData = types[typeName];

					// Decide how to add the data to the DataView
					switch (typeName) {
						case "uint8": {
							view.setUint8(offset, value);
							offset += typeData.byteLength;

							break;
						}
						case "uint16": {
							view.setUint16(offset, value);
							offset += typeData.byteLength;
							break;
						}
						case "uint32": {
							view.setUint32(offset, value);
							offset += typeData.byteLength;
							break;
						}
						case "uint64": {
							view.setBigUint64(offset, BigInt(value));
							offset += typeData.byteLength;
							break;
						}
						case "int8": {
							view.setInt8(offset, value);
							offset += typeData.byteLength;
							break;
						}
						case "int16": {
							view.setInt16(offset, value);
							offset += typeData.byteLength;
							break;
						}
						case "int32": {
							view.setInt32(offset, value);
							offset += typeData.byteLength;
							break;
						}
						case "int64": {
							view.setBigInt64(offset, BigInt(value));
							offset += typeData.byteLength;
							break;
						}
						case "string": {
							// Iterate over available letters
							for (let i = 0; i < stringLength; i++) {
								view.setUint16(offset, value.charCodeAt(i));
								offset += typeData.byteLength;
							}

							break;
						}
						case "string_small": {
							// Iterate over available letters
							for (let i = 0; i < stringLength; i++) {
								view.setUint8(offset, value.charCodeAt(i));
								offset += typeData.byteLength;
							}

							break;
						}
						case "boolean": {
							// Will add booleans last
							boolArray.push(!!value);

							break;
						}
						case "schema": {
							let struct = tempValue.serialize(value);

							// Append each serialized byte
							forEach(struct, (byte) => {
								view.setUint8(offset, byte);
								offset++;
							});

							break;
						}
						case "schema_array": {
							// Describe the length of the Array
							view.setUint16(offset, value.length);
							offset += 2;

							forEach(value, (value) => {
								let struct = tempValue[0].serialize(value);

								// Append each serialized byte
								forEach(struct, (byte) => {
									view.setUint8(offset, byte);
									offset++;
								});
							});
						}
					}
				});
		} catch (e) {
			console.warn(messages.missingParameter, e);
		}

		// Loop through every byte that needs to be added for boolArray
		for (let i = 0; i < this._boolCount / 8; i++) {
			let bitSum;
			// Loop through the individual bits and combine them
			for (let h = 0; h < boolArray.length - 8 * i; h++) {
				if (!!boolArray[h]) {
					bitSum |= 1 << h % 8; // set bit at h to true
				} else {
					bitSum &= ~(1 << h % 8); // set bit at h to false
				}
			}
			view.setInt8(offset, bitSum);
			offset++;
		}

		return Buffer.from(buf);
	}

	deserialize(buffer) {
		let view = new DataView(toArrayBuffer(buffer));
		let offset = 0;
		let boolArrayKeys = [];
		let data = {};

		Object.entries(this._template)
			.sort(sortEntries)
			.forEach(([key, tempValue]) => {
				let typeName = tempValue;
				let decimalSpots = 0;
				let stringLength = 0;

				// Should some customization be done to this type?
				if (
					typeof typeName == "object" &&
					(typeName.decimalSpots || typeName.stringLength) &&
					typeName.type
				) {
					stringLength = typeName.stringLength || 0;
					decimalSpots = typeName.decimalSpots || 0;

					typeName = typeName.type;
				} else {
					if (typeof typeName == "string") {
						typeName = typeName.toLowerCase();
					} else if (typeof typeName._getByteLength == "function") {
						typeName = "schema";
					} else if (
						Array.isArray(typeName) &&
						typeof typeName[0]._getByteLength == "function"
					) {
						typeName = "schema_array";
					}
				}

				let typeData = types[typeName];

				// Decide how to add the data to the DataView
				switch (typeName) {
					case "uint8": {
						data[key] = view.getUint8(offset);
						offset += typeData.byteLength;

						break;
					}
					case "uint16": {
						data[key] = view.getUint16(offset);
						offset += typeData.byteLength;
						break;
					}
					case "uint32": {
						data[key] = view.getUint32(offset);
						offset += typeData.byteLength;
						break;
					}
					case "uint64": {
						data[key] = parseInt(
							view.getBigUint64(offset).toString()
						);
						offset += typeData.byteLength;
						break;
					}
					case "int8": {
						data[key] = view.getInt8(offset);
						offset += typeData.byteLength;
						break;
					}
					case "int16": {
						data[key] = view.getInt16(offset);
						offset += typeData.byteLength;
						break;
					}
					case "int32": {
						data[key] = view.getInt32(offset);
						offset += typeData.byteLength;
						break;
					}
					case "int64": {
						data[key] = parseInt(
							view.getBigInt64(offset).toString()
						);
						offset += typeData.byteLength;
						break;
					}
					case "string": {
						data[key] = "";

						// Iterate over available letters
						for (let i = 0; i < stringLength; i++) {
							data[key] += String.fromCharCode(
								view.getUint16(offset)
							);
							offset += typeData.byteLength;
						}

						data[key] = data[key].replace(/\x00/g, "");

						break;

						break;
					}
					case "string_small": {
						data[key] = "";

						// Iterate over available letters
						for (let i = 0; i < stringLength; i++) {
							data[key] += String.fromCharCode(
								view.getUint8(offset)
							);
							offset += typeData.byteLength;
						}

						data[key] = data[key].replace(/\x00/g, "");

						break;
					}
					case "boolean": {
						boolArrayKeys.push(key);

						break;
					}
					case "schema": {
						let length = tempValue._getByteLength();
						let structBuffer = new Uint8Array(length);

						for (let i = 0; i < length; i++) {
							structBuffer[i] = buffer[i + offset];
						}

						data = {
							...data,
							[key]: {
								...tempValue.deserialize(
									Buffer.from(structBuffer)
								)
							}
						};

						offset += length;

						break;
					}
					case "schema_array": {
						// Retrieve the length of the Array
						let arrLength = view.getUint16(offset);
						offset += 2;

						for (let x = 0; x < arrLength; x++) {
							let length = tempValue[0]._getByteLength();
							let structBuffer = new Uint8Array(length);

							for (let i = 0; i < length; i++) {
								structBuffer[i] = buffer[i + offset];
							}

							if (!data[key]) data[key] = [];

							data[key].push(
								tempValue[0].deserialize(
									Buffer.from(structBuffer)
								)
							);

							offset += length;
						}

						break;
					}
				}

				// Make the whole number a decimal number
				if (decimalSpots) {
					data[key] /= 10 ** decimalSpots;
				}
			});

		// Loop through every byte that needs to be added for boolArray
		for (let i = 0; i < this._boolCount / 8; i++) {
			let bitSum = view.getUint8(offset);

			// Loop through the individual bits and find them
			for (let h = 0; h < boolArrayKeys.length - 8 * i; h++) {
				data[boolArrayKeys[h + 8 * i]] = (bitSum & (1 << h % 32)) > 0;
			}

			offset++;
		}

		return data;
	}
}
