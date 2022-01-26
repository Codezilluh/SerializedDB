// Taken from my Github rather than installed through NPM,
// find it here: https://github.com/Codezilluh/optimized.js

/**
 * @author Codezilluh
 *
 * @copyright
 * Copyright (c) 2021 Codezilluh (https://github.com/codezilluh)
 *
 * @description
 * A small file of useful JS Array optimizations. Achieves the power of
 * for-loops with the ease-of-use of modern Array prototypes.
 */

/**
 * User-friendly for-loop that can handle objects
 *
 * Up to 80% faster than Array.prototype.forEach
 * @param {any} arr The array/object to be iterated upon
 * @param {function} fn Function to be run
 */
export const forEach = (arr, fn) => {
	if (typeof arr == "object" && !arr.length) {
		let keysArr = Object.keys(arr);

		for (var i = 0; i < keysArr.length; i++) {
			fn(arr[keysArr[i]], i, keysArr[i]);
		}
	} else {
		for (var i = 0; i < arr.length; i++) {
			fn(arr[i], i);
		}
	}
};

/**
 * User-friendly filter that can handle objects
 *
 * Up to 70% faster than Array.prototype.filter
 * @param {any} arr The array/object to be iterated upon
 * @param {function} fn Function to be run
 */
export const filter = (arr, fn) => {
	let final = [];

	if (typeof arr == "object" && !arr.length) {
		final = {};
		let keysArr = Object.keys(arr);

		for (var i = 0; i < keysArr.length; i++) {
			let e = arr[keysArr[i]];

			if (fn(e, i, keysArr[i])) {
				final[keysArr[i]] = e;
			}
		}
	} else {
		for (var i = 0; i < arr.length; i++) {
			let e = arr[i];

			if (fn(e, i)) {
				final.push(e);
			}
		}
	}

	return final;
};

/**
 * User-friendly array map that can handle objects
 *
 * Up to 60% faster than Array.prototype.map
 * @param {any} arr The array/object to be iterated upon
 * @param {function} fn Function to be run
 */
export const map = (arr, fn) => {
	let final = new Array(arr.length);

	if (typeof arr == "object" && !arr.length) {
		final = {};
		let keysArr = Object.keys(arr);

		for (var i = 0; i < keysArr.length; i++) {
			let e = arr[keysArr[i]];

			final[keysArr[i]] = fn(e, i, keysArr[i]);
		}
	} else {
		for (var i = 0; i < arr.length; i++) {
			let e = arr[i];

			final[i] = fn(e, i);
		}
	}

	return final;
};
