////////////////////////////////////////////////////////////////////////////////
// Initial fns for file system
////////////////////////////////////////////////////////////////////////////////

// key used to access the localStorage
const fs_key = "local-fs"

// check if localStorage entry exists
// and correctly initialized with root directory
const check_fs = () => {
  if (localStorage.getItem(fs_key) === null) return false;
  let root = read_directory(0);
  if (!(root.type == "directory" && root.name == "/")) return false;

  return true;
};

// initialize the fs
// if fs does not exist, add localStorage entry and add root directory.
export const init_fs = () => {
  if (!check_fs()) {
    let rootDir = new_directory("/", 0, {
      // parent of root = root
      type: "directory",
      name: "/",
      createAt: new Date(),
    });
    write_directory(0, rootDir);
  }
};

// clear out the fs
const clear_fs = () => {
  localStorage.removeItem(fs_key);
  init_fs();
};

// load the file array from localStorage
const load_fs = () => {
  return JSON.parse(localStorage.getItem(fs_key)) || [];
};

// store the given file arrya to localStorage
const store_fs = (fsList) => {
  return localStorage.setItem(fs_key, JSON.stringify(fsList));
};

// get_new_id: finding new array index for allocation
// tries to find first empty cell,
// if such cell does not exist, the array is extended
export const get_new_id = () => {
  const fsList = load_fs();
  for (let i = 0; i < fsList.length; i++) {
    if (fsList[i] == undefined) {
      // empty element is undefined
      return i;
    }
  }
  return fsList.length; // else, return the length
};

////////////////////////////////////////////////////////////////////////////////
// Default object constructors of file / directory
////////////////////////////////////////////////////////////////////////////////

// default constructor for file object
// name: string, parent: id of parent dir, data: object
export const new_file = (name, parent, data) => {
  return {
    type: "file",
    name: name,
    parent: parent,
    data: data,
  };
};

// default constructor for directory
// name: string, parent: id of parent dir,
// children: array of id of children file / directory
export const new_directory = (name, parent, data) => {
  return {
    type: "directory",
    name: name,
    parent: parent,
    children: [],
    data: data,
  };
};

////////////////////////////////////////////////////////////////////////////////
// atomic fs access functions
////////////////////////////////////////////////////////////////////////////////
const NotFileError = new Error("Not a file");
const NotDirectoryError = new Error("Not a directory");
const NotExistError = new Error("Not exist");
const AlreadyExistError = new Error("Already exist");

// Implementation Detail
// each funciton start with load_fs, end with store_fs, each exactly once
// (except read functions)
// think fsList as "cache" of the actual fs inside the localStorage

// return file type at id
export const get_fs_type = (id) => {
  let fsList = load_fs();
  let loaded = fsList[id] || { type: "error" };
  return loaded.type;
};

// return file at id
export const read_file = (id) => {
  let fsList = load_fs();
  let loaded = fsList[id] || { type: "error" };
  if (loaded.type != "file") {
    throw NotFileError;
  }
  return loaded;
};

// return directory at id
export const read_directory = (id) => {
  let fsList = load_fs();
  let loaded = fsList[id] || { type: "error" };
  if (loaded.type != "directory") {
    throw NotDirectoryError;
  }
  return loaded;
};

// write a file at id
export const write_file = (id, file) => {
  if (file.type != "file") {
    throw NotFileError;
  }
  let fsList = load_fs();
  fsList[id] = file;
  store_fs(fsList);
};

// write file, but only changing data
export const write_file_data = (id, data) => {
  let fsList = load_fs();
  let file = fsList[id] || { type: "error" };
  if (file.type != "file") {
    throw NotFileError;
  }
  file.data = data;
  store_fs(fsList);
};

// write directory at id
export const write_directory = (id, directory) => {
  if (directory.type != "directory") {
    throw NotDirectoryError;
  }
  let fsList = load_fs();
  fsList[id] = directory;
  store_fs(fsList);
};

////////////////////////////////////////////////////////////////////////////////
// adding new files / directories under directory
////////////////////////////////////////////////////////////////////////////////

// add file to directory at id
// also assigns new id to file
// return id of new file
export const add_file_to_dir = (id, new_file) => {
  let fsList = load_fs();
  // check directory
  let dir = fsList[id] || { type: "error" };
  if (dir.type != "directory") {
    throw NotFileError;
  }
  let new_id = get_new_id();
  fsList[new_id] = new_file;
  dir.children.push(new_id);
  store_fs(fsList);
  return new_id;
};

// add directory to directory at id
// also assigns new id to file
// return id of new dir
export const add_dir_to_dir = (id, new_dir) => {
  let fsList = load_fs();
  let dir = fsList[id] || { type: "error" };
  if (dir.type != "directory") {
    throw NotFileError;
  }
  let new_id = get_new_id();
  fsList[new_id] = new_dir;
  dir.children.push(new_id);
  store_fs(fsList);
  return new_id;
};

////////////////////////////////////////////////////////////////////////////////
// remove file at id
////////////////////////////////////////////////////////////////////////////////

export const remove_file = (id) => {
  console.log("remove_file");
  let fsList = load_fs();
  console.log(fsList);
  let file = fsList[id] || { type: "error" };
  if (file.type != "file") {
    throw NotFileError;
  }
  // 1) delete link to this child from parent
  let parent = fsList[file.parent] || { type: "error" };
  if (parent.type != "directory") {
    throw NotDirectoryError;
  }
  parent.children = parent.children.filter((child) => child != id);
  // 2) actually delete
  delete fsList[id];
  console.log(fsList);
  store_fs(fsList);
};

// remove directory at id
export const remove_directory = (id) => {
  let fsList = load_fs();
  let directory = fsList[id] || { type: "error" };
  if (directory.type != "directory") {
    throw NotDirectoryError;
  }
  // recursively delete all children
  directory.children.forEach((child) => {
    if (child.type == "file") {
      remove_file(child);
    } else if (child.type == "directory") {
      remove_directory(child);
    }
  });
  // finally delete the directory
  delete fsList[id];
  store_fs(fsList);
};
