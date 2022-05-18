import types from "./types.js";
import { filter, forEach } from "./optimized.js";
import messages from "./messages.js";

const sortEntries = (a, b) => a[0].localeCompare(b[0]);
const hashCode = (e) => {
	var hash = 0;
	for (var i = 0; i < e.length; i++) {
		var character = e.charCodeAt(i);
		hash = (hash << 5) - hash + character;
		hash = hash & hash; // Convert to 32bit integer
	}
	return hash;
};

export default class DatabaseSchema {
	constructor(template) {
		this._template = template;
		this._boolCount = Object.keys(
			filter(template, (e) => typeof e == "string" && e.toLowerCase() == "boolean")
		).length;
		this.schemaId = hashCode(JSON.stringify(template).replace(/"|,|:/g, ""))
			.toString(16)
			.replace("-", "M");
	}

	_getByteLength(data, temp) {
		if (typeof this._template !== "object") return;

		let length = 0;

		forEach(Object.entries(this._template), ([key, value]) => {
			// Is this a schema?
			if (typeof value == "object" && typeof value._getByteLength == "function") {
				length += value._getByteLength(data[key]) + 2;

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
					(data[key].length > 0
						? (value[0]._getByteLength(data[key][0]) + 2) * data[key].length
						: 0) + 2;

				return;
			}

			// Add two bytes to length
			if (value == "string_big" || value == "string") {
				length += 2;
			}

			// Default
			length +=
				(types[value] || types[value.type]).byteLength *
				(value.type
					? value.stringLength || 1
					: data && data[key]
					? typeof data[key] == "string"
						? data[key].length || 1
						: 1
					: 1);
		});

		return Math.ceil(length);
	}

	/**
	 * This serializes data to the template
	 *
	 * @param {*} data The object you wish to serialize
	 * @returns {ArrayBuffer} Serialized data
	 */
	serialize(data, r = false) {
		let buf = new ArrayBuffer(this._getByteLength(data) + (r ? 0 : 4));
		let view = new DataView(buf);

		let boolArray = [];
		let offset = 0;

		if (!r) {
			view.setInt32(offset, parseInt(this.schemaId.replace("M", "-"), 16));
			offset += 4;
		}

		try {
			Object.entries(this._template)
				.sort(sortEntries)
				.forEach(([key, tempValue]) => {
					let typeName = tempValue;
					let value = data[key];
					let decimalSpots = 0;
					let stringLength = 0;
					let dynamic = false;

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

							if (typeName == "string_big" || typeName == "string") {
								dynamic = true;
							}
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
						case "string_big": {
							if (dynamic) {
								// Set string length
								view.setUint16(offset, value.length);
								offset += 2;

								// Iterate over all letters
								for (let i = 0; i < value.length; i++) {
									view.setUint16(offset, value.charCodeAt(i));
									offset += typeData.byteLength;
								}
							} else {
								// Iterate over available letters
								for (let i = 0; i < stringLength; i++) {
									view.setUint16(offset, value.charCodeAt(i));
									offset += typeData.byteLength;
								}
							}

							break;
						}
						case "string": {
							if (dynamic) {
								// Set string length
								view.setUint16(offset, value.length);
								offset += 2;

								// Iterate over all letters
								for (let i = 0; i < value.length; i++) {
									view.setUint8(offset, value.charCodeAt(i));
									offset += typeData.byteLength;
								}
							} else {
								// Iterate over available letters
								for (let i = 0; i < stringLength; i++) {
									view.setUint8(offset, value.charCodeAt(i));
									offset += typeData.byteLength;
								}
							}

							break;
						}
						case "boolean": {
							// Will add booleans last
							boolArray.push(!!value);

							break;
						}
						case "schema": {
							let struct = new Uint8Array(tempValue.serialize(value, true));
							view.setUint16(offset, struct.byteLength);
							offset += 2;

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
								let struct = new Uint8Array(tempValue[0].serialize(value, true));

								view.setUint16(offset, struct.byteLength);
								offset += 2;

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
			for (let h = 0; h < Math.min(8, boolArray.length - 8 * i); h++) {
				if (!!boolArray[h + 8 * i]) {
					bitSum |= 1 << h % 8; // set bit at h to true
				} else {
					bitSum &= ~(1 << h % 8); // set bit at h to false
				}
			}
			view.setInt8(offset, bitSum);
			offset++;
		}

		return buf;
	}

	/**
	 * Deserializes a serialized object
	 *
	 * @param {ArrayBuffer} buffer The buffer you want to deserialize
	 * @returns The object
	 */
	deserialize(buffer, r = false) {
		let view = new DataView(buffer);
		let uintBuffer = new Uint8Array(buffer);
		let offset = r ? 0 : 4;
		let boolArrayKeys = [];
		let data = {};

		Object.entries(this._template)
			.sort(sortEntries)
			.forEach(([key, tempValue]) => {
				let typeName = tempValue;
				let decimalSpots = 0;
				let stringLength = 0;
				let dynamic = false;

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

						if (typeName == "string_big" || typeName == "string") {
							dynamic = true;
						}
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
						data[key] = parseInt(view.getBigUint64(offset).toString());
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
						data[key] = parseInt(view.getBigInt64(offset).toString());
						offset += typeData.byteLength;
						break;
					}
					case "string_big": {
						data[key] = "";

						if (dynamic) {
							// Retrieve the length of the String
							let strLength = view.getUint16(offset);
							offset += 2;

							// Iterate over all letters
							for (let x = 0; x < strLength; x++) {
								data[key] += String.fromCharCode(view.getUint16(offset));
								offset += typeData.byteLength;
							}
						} else {
							// Iterate over available letters
							for (let i = 0; i < stringLength; i++) {
								data[key] += String.fromCharCode(view.getUint16(offset));
								offset += typeData.byteLength;
							}

							data[key] = data[key].replace(/\x00/g, "");
						}

						break;
					}
					case "string": {
						data[key] = "";

						if (dynamic) {
							// Retrieve the length of the String
							let strLength = view.getUint16(offset);
							offset += 2;

							// Iterate over all letters
							for (let x = 0; x < strLength; x++) {
								data[key] += String.fromCharCode(view.getUint8(offset));
								offset += typeData.byteLength;
							}
						} else {
							// Iterate over available letters
							for (let i = 0; i < stringLength; i++) {
								data[key] += String.fromCharCode(view.getUint8(offset));
								offset += typeData.byteLength;
							}

							data[key] = data[key].replace(/\x00/g, "");
						}

						break;
					}
					case "boolean": {
						boolArrayKeys.push(key);

						break;
					}
					case "schema": {
						let length = view.getUint16(offset);
						let structBuffer = new Uint8Array(length);

						offset += 2;

						for (let i = 0; i < length; i++) {
							structBuffer[i] = uintBuffer[i + offset];
						}

						data = {
							...data,
							[key]: {
								...tempValue.deserialize(structBuffer.buffer, true)
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
							let length = view.getUint16(offset);
							let structBuffer = new Uint8Array(length);

							offset += 2;

							for (let i = 0; i < length; i++) {
								structBuffer[i] = uintBuffer[i + offset];
							}

							if (!data[key]) data[key] = [];

							data[key].push(tempValue[0].deserialize(structBuffer.buffer, true));

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
			for (let h = 0; h < Math.min(8, boolArrayKeys.length - 8 * i); h++) {
				data[boolArrayKeys[h + 8 * i]] = (bitSum & (1 << h % 32)) > 0;
			}

			offset++;
		}

		return data;
	}
}
