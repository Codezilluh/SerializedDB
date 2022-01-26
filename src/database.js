import fs from "fs";
import messages from "./messages.js";
import { forEach } from "./optimized.js";

const followDotNotation = (_obj, param, value) => {
	try {
		if (param.length > 0) {
			if (param.length == 1 && !!value) {
				_obj[param[0]] = value;
				return;
			}

			return followDotNotation(_obj[param[0]], param.slice(1), value);
		} else {
			return _obj;
		}
	} catch (e) {
		console.warn(messages.cantSetGet);
	}
};

export default class Database {
	/**
	 * Database class. Initializes a database file, loads it, and writes to it using serialization.
	 *
	 * @param {string} path The directory (preferrably absolute) of the Database
	 * @param {string} name The name of the Database
	 * @param {*} schema The DatabaseSchema to use
	 * @param {object} options Supply custom options
	 */
	constructor(
		path,
		name,
		schema,
		{
			shouldAutoLoad = false,
			shouldBackup = true,
			shouldAutoWrite = true
		} = {}
	) {
		this._location = `${path}/${name.replace(".dbsz", "")}.dbsz`; // .dbsz extension for .DataBaseSerialiZed
		this._retrievedData = null;
		this._schema = schema;
		this._dontLoadError = false;
		this._shouldAutoLoad = shouldAutoLoad;
		this._shouldAutoWrite = shouldAutoWrite;
		this._shouldBackup = shouldBackup;

		if (!this._schema || !this._schema.serialize) {
			console.warn(messages.noValidSchema);
			return false;
		}

		try {
			fs.mkdirSync(path, { recursive: true });
			// Create "empty" file if none exists
			if (!fs.existsSync(this._location)) {
				this._dontLoadError = true; // Keep the loader quiet for now
				fs.writeFileSync(this._location, messages.noData);
			}
		} catch (e) {
			console.warn(messages.cantStart);
		}

		this._load();
	}

	get noData() {
		try {
			let data = fs.readFileSync(this._location);

			if (data == messages.noData) return true;
		} catch (e) {
			console.warn(messages.cantLoad);
		}

		return false;
	}

	/**
	 * Templates the database
	 *
	 * @param {*} templateObject A template (everything empty) for the database
	 * @returns False if it failed, true if it worked
	 */
	template(templateObject) {
		return this._write(templateObject, true);
	}

	/**
	 * Returns requested data from the database.
	 *
	 * @param {string} param The parameter(s) in dot notation
	 * @returns The requested unserialized data
	 */
	get(param) {
		if (this._shouldAutoLoad) this._load();
		if (!param) return this._retrievedData || this._load();

		return followDotNotation(this._retrievedData, param.split("."));
	}

	/**
	 * Sets data in the database.
	 *
	 * @param {string} param The parameter(s) in dot notation
	 * @param {*} value The value you wish to use
	 */
	set(param, value) {
		followDotNotation(this._retrievedData, param.split("."), value);

		if (this._shouldAutoWrite) this._write(this._retrievedData);
	}

	/**
	 * Pushes data to a database array. Data must be follow a defined schema.
	 *
	 * @param {string} param The parameter(s) in dot notation
	 * @param {*} value The value you wish to push
	 * @returns
	 */
	push(param, value) {
		let result = followDotNotation(
			this._retrievedData,
			param.split(".")
		).push(value);

		if (this._shouldAutoWrite) this._write(this._retrievedData);

		return result;
	}

	/**
	 * Writes modified data to the database.
	 */
	write() {
		this._write(this._retrievedData);
	}

	/**
	 * Loads the database into an object. End user typically doesn't need to call this.
	 *
	 * @returns Data if it worked, false if it didn't
	 */
	_load() {
		try {
			let data = fs.readFileSync(this._location);

			if (data == messages.noData || data == messages.dontEdit)
				return false;

			this._retrievedData = this._schema.deserialize(data);

			return this._retrievedData;
		} catch (e) {
			if (!this._dontLoadError) console.warn(messages.cantLoad);

			this._dontLoadError = false;
		}
	}

	/**
	 * Writes an object to the database file. Only for use when replacing the entire database. End user typically doesn't need to call this.
	 *
	 * @param {*} object The object to serialize and write.
	 * @param {boolean} noBak Override backup creation?
	 * @returns True if it worked, false if it didn't
	 */
	_write(object, noBak = false) {
		try {
			let data = fs.readFileSync(this._location);

			if (data == messages.dontEdit) return false;
			if (this._shouldBackup || noBak)
				fs.writeFileSync(`${this._location}.bak`, data);

			fs.writeFileSync(this._location, this._schema.serialize(object));

			return true;
		} catch (e) {
			console.warn(messages.cantWrite);
		}
	}

	/**
	 * This erases the database. Irreversible.
	 *
	 * @param {boolean} should Do you really want to?
	 * @param {boolean} youSure Are you confident about that?
	 */
	erase(should, youSure) {
		if (!should || !youSure) return;

		this._retrievedData = {};

		fs.writeFileSync(this._location, messages.noData);
		fs.rmSync(`${this._location}.bak`);
	}
}
