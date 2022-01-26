export default {
	// Placeholder messages
	noData: "|no_data|",
	dontEdit: "|do_not_edit|",

	// Errors and their meanings
	/**
	 * Most likely a permission issue. Make sure the selected path is correct.
	 */
	cantStart: "Couldn't initialize needed files/directories",
	/**
	 * Possibly a permission issue. Make sure you are using the correct schema for the file.
	 */
	cantLoad: "Couldn't load the database",
	/**
	 * Same as 'cantLoad' error
	 */
	cantWrite: "Couldn't write to the database",
	/**
	 * Make sure the value exists
	 */
	cantSetGet: "Couldn't get or set on the database",
	/**
	 * Make sure that you are supplying the correct schema object
	 */
	noValidSchema: "No valid schema provided",
	/**
	 * Make sure you are supplying all required parameters to the schema
	 */
	missingParameter: "Missing a schema parameter"
};
