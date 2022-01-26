# Serialized-DB
A simple, compact, zero-dependency, efficiency-based database for JS devs
## Premise
I have a personal fascination with data-storage, so I wanted to make this. I wanted to make a database that could be as efficient as possible when it comes to storage space. I also wanted it to be a light package that anyone could enjoy, not chock-full of dependencies used only once. This package has no dependencies. I have commented the code while it was created in an attempt to make it easily modifiable. A lot of other database packages for NodeJS are needlessly complicated and they waste precious space.
## Serialization
Something you commonly see in JavaScript databases is that they store the inputed data as JSON (or some other filetype) and merely give methods for interacting with the file. Those types of files waste needless space. They store property names, quotation marks, colons, commas, brackets, new-lines, etc. With ArrayBuffer serialization like that of this package, that useless data is eliminated.

This package takes a supplied object, maps it in a calculated order, and then strips the values away to be compressed. This is made possible using user-defined schemas.
## Usage
Firstly install this package via `npm`.
```shell
$ npm install serialized-db
```
Next, import it into your project
```js
import { Database, DatabaseSchema } from "serialized-db";
```
Now you can create a MainSchema to use for your Database.
```js
// Possibly a schema for a user profile?
const mainSchema = new DatabaseSchema({
	// You can store strings (as long as you specify a length)
	firstName: { type: "string", stringLength: 12 },
	lastName: { type:"string", stringLength: 12 },
	username: { type: "string", stringLength: 12 },
	// You can store numbers (uint/int 8, 16, 32, & 64)
	dateJoined: "uint64",
	profileColor: "uint32",
	// You can store booleans
	isVerified: "boolean",
	isEighteen: "boolean",
	proMember: "boolean",
	// You can store arrays of schemas
	posts: [postSchema],
	// You can store an object as a schema
	currentPos: vectorSchema
	lastPos: vectorSchema
});

// You would define vectorSchema and postSchema here (same way as mainSchema)
```
With a MainSchema, you can now initialize a Database.
```js
// To initialize a database, you simply provide a directory, name, and schema
// Optionally, you can add special commands
// Non-existing folders and files will be created
const db = new Database("/path/to/db_storage", "database_name", mainSchema, {
	// These are the default values
	shouldBackup: true,		// should backups be saved when writing?
	shouldAutoLoad: false,	// should the database be loaded when calling get?
	shouldAutoWrite: true	// should the database save after calling set?
});
```
With the Database initialized you can now start adding data.
```js
// Check to see if the database is empty
// Only template the database if it is empty to avoid data loss
if (db.noData) {
	// It is important to template the database before you try modifying it
	d.template({
		firstName: "",
		lastName: "",
		...
		proMember: false,
		...
		posts: [], // you can keep the arrays empty
		...
		lastPos: { // assuming vectorSchema had this structure
			lat: 0,
			long: 0
		}
	});
}

// Once the database has been templated, you can modify data at your will
db.set("username", "Codezilluh");
db.set("lastPos.lat", 45.6);

// Pushed objects must match the schema of their array
db.push("posts", { // assuming you have made a postSchema
	title: "Boring Day",
	body: "My boring day was so boring tha...",
	likes: 23
});

// If you disabled "shouldAutoWrite" you need to write after set and push
db.write();

// If you enabled "shouldAutoLoad" calling get will undo unsaved changes!
db.get("posts.0.likes"); // 23
```
## Conclusion
Depending on the type of data, results will vary with serialization. However, there will never be a case where storing as JSON is smaller than storing in a serialized form. This package works best with numbers and booleans (things that in string form take up around 1 byte per character). A more string heavy project (currently) won't notice a huge difference as there isn't much serialization that can be done with strings. Projects that rely heavily on numbers and booleans can see compression rates into the high 90s. My favorite part of this project is the boolean storage. Rather than storing a boolean as one byte or a 5 character string, this package stores each boolean in 1 bit (as it should be). The only catch is that I had to use bytes to store the bits (I couldn't just have a schema that was 23B with 2b strung along). This isn't too big of a deal and the more booleans you use, the less of an impact it is. Storing one boolean takes a byte, storing two takes a byte, storing eight takes a byte, storing 10 takes two bytes, and so on. It is a lot better than 10 booleans taking up 10 bytes or 5 booleans taking up 25 bytes. I look forward to using this package in my own projects and I hope you enjoy it too.
## To-do
- Create dynamic-lengthed strings (they wouldn't play nicely with arrays)
- Add optional zipping of the database file (would help compress paragraphs)
- Scrutinize everything to get maximum performance (not that it is currently slow)
- Dynamic `uInts` (wouldn't play nicely with arrays)