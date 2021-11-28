import * as lfs from "./localstorage-fs";

////////////////////////////////////////////////////////////////////////////////
// fsPointer
// provides safe wrapper of fs access functions
// instead of directly working with id, use fsPointer and helper functions.
////////////////////////////////////////////////////////////////////////////////
export const fsPointer = (id) => {
  try {
    // get file type
    const ty = lfs.get_fs_type(id);
    // 1) file case
    if (ty == "file") {
      const file = lfs.read_file(id);
      return {
        type: "file",
        name: file.name,
        id: id,
        parent: () => fsPointer(file.parent),
        // file has no sub-file or sub-directory
        children: () => {
          return { type: "error", msg: "file has no children" };
        },
        files: () => {
          return { type: "error", msg: "file has no subfiles" };
        },
        dirs: () => {
          return { type: "error", msg: "file has no subdirs" };
        },
        data: () => file.data,
        // TODO : safer access to this file
        raw: file,
      };
    }
    // 2) directory case
    else if (ty == "directory") {
      const dir = lfs.read_directory(id);
      return {
        type: "directory",
        name: dir.name,
        id: id,
        parent: () => fsPointer(dir.parent),
        // get pointers to all subfiles and subdirectories
        children: () => {
          return dir.children.map((child) => fsPointer(child));
        },
        // get pointers to all subfiles
        files: () => {
          return dir.children
            .filter((child) => lfs.get_fs_type(child) == "file")
            .map((child) => fsPointer(child));
        },
        // get pointers to all subdirectories
        dirs: () => {
          return dir.children
            .filter((child) => lfs.get_fs_type(child) == "directory")
            .map((child) => fsPointer(child));
        },
        // TODO : safer access to this dir
        raw: dir,
        data: () => dir.data,
      };
    }
  } catch (e) {
    // 3) error case
    // return 'error' pointer
    return {
      type: "error",
      msg: e.message,
    };
  }
};

// fsPointer methods

////////////////////////////////////////////////////////////////////////////////
// get the root pointer
export const get_root_pointer = () => {
  lfs.init_fs();
  // assume: index 0 already initialized to root directory
  return fsPointer(0);
};

// error pointer
export const error_pointer = (msg) => {
  return {
    type: "error",
    msg: msg,
  };
};

////////////////////////////////////////////////////////////////////////////////
// getters for file list
export const get_file_list = (fp) => {
  console.log(fp);
  return fp.files();
};

// getters for dir list
export const get_dir_list = (fp) => {
  return fp.dirs();
};

////////////////////////////////////////////////////////////////////////////////
/////////////////////////////// helper fns  ////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// given a pointer, get the file pointer given name
// only searches direct children
export const child_file_pointer = (fp, name) => {
  // if given fp is not directory, error
  if (fp.type != "directory") return error_pointer("not a dir pointer");
  // if dir with the name exist, error
  if (fp.dirs().filter((p) => p.name == name).length > 0)
    return error_pointer("given name is dir");
  // assume: only one file with given name exist
  return fp.files().filter((p) => p.name == name)[0];
};

// given a pointer, get the dir pointer given name
export const child_dir_pointer = (fp, name) => {
  // if given fp is not directory, error
  if (fp.type != "directory") return error_pointer("not a dir pointer");
  // if file with the name exist, error
  if (fp.files().filter((p) => p.name == name).length > 0)
    return error_pointer("given name is file");
  // assume: only one file with given name exist
  return fp.dirs().filter((p) => p.name == name)[0];
};

// given a pointer, get the parent dir pointer
export const parent_dir_pointer = (fp) => {
  return fp.parent();
};

////////////////////////////////////////////////////////////////////////////////
// add file to given dir pointer
export const add_file_to_pointer = (fp, filename, filedata) => {
  if (fp.type != "directory") return error_pointer("not a dir pointer");
  // check filename already exists
  if (fp.files().filter((p) => p.name == filename).length > 0) {
    return error_pointer(`file ${filename} already exist`);
  }
  let new_file = lfs.new_file(filename, fp.id, filedata);
  // return pointer to newly made file
  return fsPointer(lfs.add_file_to_dir(fp.id, new_file));
};

// add dir to given dir pointer
export const add_dir_to_pointer = (fp, dirname, dirdata) => {
  if (fp.type != "directory") return error_pointer("not a dir pointer");
  // check dirname already exists
  if (fp.dirs().filter((p) => p.name == dirname).length > 0) {
    return error_pointer(`dir ${dirname} already exist`);
  }
  let new_dir = lfs.new_directory(dirname, fp.id, dirdata);
  // return pointer to newly made dir
  return fsPointer(lfs.add_dir_to_dir(fp.id, new_dir));
};

////////////////////////////////////////////////////////////////////////////////
// remove file or directory of given pointer
export const remove_pointer = (fp) => {
  if (fp.type == "file") {
    lfs.remove_file(fp.id);
    return true;
  } else if (fp.type == "directory") {
    lfs.remove_directory(fp.id);
    return true;
  } else return false; // TODO should return some id
};

////////////////////////////////////////////////////////////////////////////////
// update file data of given pointer
export const update_data_file_pointer = (fp, filedata) => {
  if (fp.type != "file") return false;
  let file = fp.raw;
  file.data = filedata;
  lfs.write_file(fp.id, file);
  return true; // TODO more error catching and returning written file id
};

////////////////////////////////////////////////////////////////////////////////
// parse the path
// assume: name of file or directory does not contain "/" character (except root)
// ex. "/a/b/c/d" : absolute path, root -> dir a -> dir b -> dir c -> (dir or file) d
// ex. "a/b/c/d" : relative path, fp -> dir a -> dir b -> dir c -> (dir or file) d
// use recursion
export const get_path_pointer = (fp, path) => {
  // check fp is directory pointer
  if (fp.type != "directory") return error_pointer("not a dir pointer");
  // split the path
  let splitted = path.split("/");
  // 1) absolute path case
  if (path.startsWith("/")) {
    let root = get_root_pointer();
    // remove starting "" from path tokens
    let relative_path = splitted.slice(1).join("/");
    get_path_pointer(root, relative_path);
  }
  // 2) relative path case
  else {
    // base case: path.length == 1, final token
    if (splitted.length == 1) {
      // try with file first
      let file_result = child_file_pointer(fp, splitted[0]);
      if (file_result.type == "file") return file_result;
      // try with dir
      else {
        let dir_result = child_dir_pointer(fp, splitted[0]);
        if (dir_result.type == "directory") return dir_result;
        else return error_pointer("no such file or directory");
      }
    }
    // inductive case: path.length > 1, should be dir
    else {
      let dir_result = child_dir_pointer(fp, splitted[0]);
      if (dir_result.type == "directory") {
        return get_path_pointer(dir_result, splitted.slice(1).join("/"));
      } else {
        return error_pointer("no such directory");
      }
    }
  }
};

// get the path of a pointer
// use recursion
export const get_pointer_path = (fp) => {
  // base case: root
  if (fp.type == "directory" && fp.name == "/") return "ROOT";
  // inductive case: get parent path first, examine it's not a error
  else if (fp.type == "directory" || fp.type == "file") {
    let parent_path = get_pointer_path(fp.parent());
    // assume: errornous case -> ""
    if (parent_path == "") return "";
    // correct case -> append name
    return parent_path + "/" + fp.name;
  }
  // errornous fp -> return ""
  else return "";
};

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
///////////////////////////////Main fns for memo-localstorage //////////////////
////////////////////////////////////////////////////////////////////////////////
// getters for file data by predicate of file data
export const get_file_data_list_by_data_predicate = (fp, predicate) => {
  let targetFileDatas = fp
    .files()
    .filter((fp) => predicate(fp.data()))
    .map((fp) => fp.data());
  return targetFileDatas;
};

export const get_file_data_list = (fp) => {
  return get_file_data_list_by_data_predicate(fp, (m) => true);
};

////////////////////////////////////////////////////////////////////////////////
// modifiers for file pointers
export const delete_file_by_data_predicate = (fp, predicate) => {
  let targetFiles = fp.files().filter((fp) => predicate(fp.data()));
  if (targetFiles.length == 0) return false;
  targetFiles.forEach((fp) => {
    remove_pointer(fp);
  });
  return true;
};

export const modify_file_data_by_data_predicate = (fp, predicate, newData) => {
  let targetFiles = fp.files().filter((fp) => predicate(fp.data()));
  // assert only one target file to modify
  if (targetFiles.length != 1) return false;
  update_data_file_pointer(targetFiles[0], newData);
  return true;
};

export const store_file_in_dir = (fp, name, data) => {
  add_file_to_pointer(fp, name, data);
};

export const reload_pointer = (fp) => {
  let id = fp.id;
  return fsPointer(id);
};

////////////////////////////////////////////////////////////////////////////////
// directory related
export const get_dir_name_list = (fp) => {
  return get_dir_list(fp).map((p) => p.name);
};

export const get_dir_data_list = (fp) => {
  return get_dir_list(fp).map((p) => p.data());
};

export const store_dir_in_dir = (fp, name, data) => {
  add_dir_to_pointer(fp, name, data);
};

export const get_dir_by_name = (fp, name) => {
  let resPointer = child_dir_pointer(fp, name);
  // console.log('respointer');
  // console.log(resPointer);
  if (resPointer.type != "directory") return fp;
  else return resPointer;
};

export const get_parent_dir = (fp) => {
  let resPointer = parent_dir_pointer(fp);
  if (resPointer.type != "directory") return fp;
  else return resPointer;
};
