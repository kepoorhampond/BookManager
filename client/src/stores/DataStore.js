import { EventEmitter } from 'events';
import assign from 'object-assign';

import request from 'request';

import AppDispatcher from '../dispatcher/AppDispatcher';
import DataActionTypes from '../constants/DataActionTypes';

var CHANGE_EVENT = 'change';

var PROD_SERVER_URL = "https://miskatonic-book-manager-server.herokuapp.com";
var DEV_SERVER_URL = "http://localhost:5100";

var SERVER_URL = process.env.NODE_ENV === "production" 
                  ? PROD_SERVER_URL 
                  : DEV_SERVER_URL;

var _data = {
  student: [],
  book   : [],
  code   : [],
};

var _itemTypes = {
  student: "student",
  book   : "book",
  code   : "code"
}

var _itemTypeDomains = {
  student: "students",
  book: "books",
  code: "codes"
}

var _itemSortKeys = {
  student: "lastName",
  book: "title",
  code: (c) => {
    var book = DataStore.getItemById(_itemTypes.book, c.book);
    if (book) { return book.title; }
  }
}

readItems(_itemTypes.student);
readItems(_itemTypes.book);
readItems(_itemTypes.code);

let DataStore = assign({}, EventEmitter.prototype, {
  getItems: function(itemType) {
    return _data[itemType];
  },

  // Returns code object if found, else, return null
  getItemById: function(itemType, id) {
    return _data[itemType].find(obj => {
      return obj._id === id;
    });
  },

  getItemByIndex: function(itemType, index) {
    return _data[itemType][index];
  },

  getServerURL: function() {
    return SERVER_URL;
  },

  emitChange: function() {
    this.emit(CHANGE_EVENT);
  },

  addChangeListener: function(callback) {
    this.on(CHANGE_EVENT, callback);
  },

  removeChangeListener: function(callback) {
    this.removeListener(CHANGE_EVENT, callback);
  }

});

DataStore.dispatchToken = AppDispatcher.register(function(action) {
  switch(action.type) {
    case DataActionTypes.CREATE_ITEM:
      if ( action.itemType !== undefined &&
           action.data !== undefined ) {
        createItem(action.itemType, action.data);
      }
    break;
    case DataActionTypes.READ_ITEMS:
      if ( action.itemType !== undefined ) {
        readItems(action.itemType);
      }
    break;
    case DataActionTypes.UPDATE_ITEM:
      if ( action.itemType !== undefined &&
           action.id !== undefined &&
           action.data !== undefined ) {
        updateItem(action.itemType, action.id, action.data);
      }
    break;
    case DataActionTypes.DELETE_ITEM:
      if ( action.itemType !== undefined &&
           action.id !== undefined ) {
        deleteItem(action.itemType, action.id, action.data);
      }
    break;
    default:
  }
});

export default DataStore;

function createItem(itemType, data) {
  var url = SERVER_URL + `/${_itemTypeDomains[itemType]}/create`;

  var req = {
    requestType: "post",
    itemType: itemType,
    data: data
  }

  request.post(url, { form: data }, function (err, res, body) {
    changeData(err, res, body, req)
  });
}

function readItems(itemType) {
  var url = SERVER_URL + `/${_itemTypeDomains[itemType]}`;

  var req = {
    requestType: "get",
    itemType: itemType,
  }

  request.get(url, { json: true }, function (err, res, body) {
    changeData(err, res, body, req)
  });
}

function updateItem(itemType, id, data) {
  var url = SERVER_URL + `/${_itemTypeDomains[itemType]}/${id}/update`;


  var req = {
    requestType: "put",
    itemType: itemType,
    id: id,
    data: data
  }

  request.put(url, { form: data }, function (err, res, body) {
    changeData(err, res, body, req);
  });
}

function deleteItem(itemType, id) {
  var url = SERVER_URL + `/${_itemTypeDomains[itemType]}/${id}/delete`;

  var req = {
    requestType: "delete",
    itemType: itemType,
    id: id,
  }

  request.delete(url, { json: true }, function (err, res, body) {
    changeData(err, res, body, req);
  });
}

function changeData(err, res, body, req) {
  if (err) {
    return console.log(err);
  }

  var itemType = req.itemType;
  var requestType = req.requestType;

  if (requestType === "get") { // Read
    body = sortData(_itemSortKeys[itemType], body); // Sort the data
    _data[itemType] = body; // Update the data in corresponding key
  } else {
    /* Otherwise, an item had been created, updated, or deleted, so
       update our cache */
    readItems(itemType);

    setTimeout(() => {
      readItems(_itemTypes.student);
      readItems(_itemTypes.book);
      readItems(_itemTypes.code);
    }, 1000);

    setTimeout(() => {
      readItems(_itemTypes.student);
      readItems(_itemTypes.book);
      readItems(_itemTypes.code);
    }, 3000);

    setTimeout(() => {
      readItems(_itemTypes.student);
      readItems(_itemTypes.book);
      readItems(_itemTypes.code);
    }, 10000);
  }

  DataStore.emitChange();
}

function sortData(key, data) {
  return [].slice.call(data).sort(function(a, b) {
    if (typeof key === "function") {
      return funcSort(key, a, b);
    } else {
      return keySort(key, a, b);
    }
  });
}

function keySort(key, a, b) {
  if (a[key] < b[key]) { return -1; }
  if (a[key] > b[key]) { return 1; }
  return 0;
}

function funcSort(func, a, b) {
  if (func(a) < func(b)) { return -1; }
  if (func(a) > func(b)) {return 1; }
  return 0;
}
