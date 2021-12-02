File system for browser localStorage API
====

Introduction
----

This is JavaScript library for using localStorage API as file system with file and directory.


Features
---

### Persistently store any JS object in browser localStorage.

Modern browsers support [localStorage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage),
a set of key-associated data store that persists even after the browser shutdown.
This library utilizes the localStorage API to persistently store any JS object and load it later.
Thus, the stored objects can be recovered after the browser shutdown.
  
### Organizing stored data in terms of files and directory.

The stored JS objects are organized similar to files in common file system.
The library provides functions to manage hierarchical structure of files using directories. Directories store files and subdirectories. 

### Representing directory and file as an abstract pointer, which is implemented as JS object to be used in other JS code.

The library provides pointer-based high-level API to access files and directories.
The API functions allow to read list of files and subdirectories, add a file or a subdirectory,
modify the content of the file, and remove a file or a subdirectory.
For the initial access to the file system, the library provides API function to return the root directory.


Installation
----

Add to your NPM package dependency.

```json
{
  "dependencies": {
    "@systemop/localstorage-fs": "1.0.0"
  }
}
   
```


Usage
----

The module `fs-pointer` is exported as default upon import. Programmer can use all exported function in `fs-pointer` by import.

```js
// import the module with `require` statement
const fsp = require("@systemop/localstorage-fs");

// every exports in `fs-pointer` module are available.
let root = fsp.get_root_pointer();
let files = fsp.get_file_list(root)
```

Refer to [API documentations](https://github.com/yusungsim/localstorage-fs/wiki) for the details.
