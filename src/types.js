export default {
	/**
	 * A boolean value stored as 1 bit each (rounded up to the nearest byte)
	 *
	 * Example: 3 booleans in an object would be stored as 1 byte
	 */
	boolean: { byteLength: 0.125 },
	/**
	 * Any whole number from 0 to 255
	 */
	uint8: { byteLength: 1 },
	/**
	 * Any whole number from 0 to 65,535
	 */
	uint16: { byteLength: 2 },
	/**
	 * Any whole number from 0 to 4,294,967,295
	 */
	uint32: { byteLength: 4 },
	/**
	 * Any whole number from 0 to 18,446,744,073,709,551,615
	 */
	uint64: { byteLength: 8 },
	/**
	 * Any whole number from -128 to 127
	 */
	int8: { byteLength: 1, canDoNegative: true },
	/**
	 * Any whole number from -32,768 to 32,767
	 */
	int16: { byteLength: 2, canDoNegative: true },
	/**
	 * Any whole number from -2,147,483,648 to 2,147,483,647
	 */
	int32: { byteLength: 4, canDoNegative: true },
	/**
	 * Any whole number from -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807
	 */
	int64: { byteLength: 8, canDoNegative: true },
	/**
	 * A string for which each letter is two bytes. Usefull for storing advanced characters. I don't recommend using if you only need the basic 255.
	 */
	string: { byteLength: 2 },
	/**
	 * A string for which each letter is a byte
	 */
	string_small: { byteLength: 1 }
};
