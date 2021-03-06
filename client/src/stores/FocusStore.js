import { EventEmitter } from 'events';
import assign from 'object-assign';

import AppDispatcher from '../dispatcher/AppDispatcher';
import FocusActionTypes from '../constants/FocusActionTypes';

import DataStore from './DataStore';

var CHANGE_EVENT = 'change';

var _itemTypes = {
  student: "student",
  book   : "book",
  code   : "code"
}

var _scopes = {
  general: "general",
  create : "create",
  update : "update"
}

// `itemType`: `displayTitle`
var _generalDisplayTitles = {
  student: "STUDENTS",
  book   : "BOOKS",
  code   : "CODES"
}

// default:
//    scope = general
//    item type = student
var _scope = _scopes.general;
var _itemType = _itemTypes.student;

var _focusItem = null;
var _showPopup = false;
var _pastFocusItems = [];
var _displayTitle = updateDisplayTitle();


let FocusStore = assign({}, EventEmitter.prototype, {

  getFocusScope: function() {
    return _scope;
  },

  getDisplayTitle: function() {
    return _displayTitle;
  },

  getItemType: function() {
    return _itemType;
  },

  getFocusItem: function() {
    return _focusItem;
  },

  getGeneralDisplayTitle: function(itemType) {
    return _generalDisplayTitles[itemType];
  },

  getPastFocusItem: function(index) {
    return _pastFocusItems[index];
  },

  showPopup: function() {
    return _showPopup;
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

FocusStore.dispatchToken = AppDispatcher.register(function(action) {
  switch(action.type) {
    case FocusActionTypes.VIEW_CHANGED:
      var args = action.args;
      if ( args !== {} ) {
        changeView(args);
        FocusStore.emitChange();
      }
    break;
    case FocusActionTypes.POPUP_CLOSED:
      _showPopup = false;
      changeView({
        newScope: "general",
      });
      FocusStore.emitChange();
    break;
    case FocusActionTypes.POPUP_OPENED:
      if (Object.values(_scopes).includes(action.action)) {
        changeView({
          newScope: action.action,
        });
      }
      FocusStore.emitChange();
    break;
    default:
  }
});

export default FocusStore;


// args = {
//   newScope    : scope,
//   newItemType : itemType,
//   itemId      : itemId  (only if the scope is not general)
//   itemIndex   : itemIndex (only if the scope is not general)
// }
function changeView (args) {

  var newScope    = args.newScope;
  var newItemType = args.newItemType;
  var itemId      = args.itemId;
  var itemIndex   = args.itemIndex

  if (Object.values(_scopes).includes(newScope)) {
    _scope = newScope;

    // Check if zoomed into specific item
    if (_scope === _scopes.create || _scope === _scopes.update) {
      _showPopup = true;
    } else {
      _showPopup = false;
    }
  }

  if (Object.values(_itemTypes).includes(newItemType)) {
    _itemType = newItemType;
  }

  if (itemId) {
    _focusItem = DataStore.getItemById(_itemType, itemId);
  } else if (itemIndex) {
    _focusItem = DataStore.getItemByIndex(_itemType, itemIndex);
  } else {
    if (_focusItem) {
      _pastFocusItems.unshift(_focusItem);
    }
    _focusItem = null;
  }

  updateDisplayTitle();
  FocusStore.emitChange();
}

function updateDisplayTitle() {

  if (_scope === _scopes.general) {

    _displayTitle = _generalDisplayTitles[_itemType];

  } else if (_scope === _scopes.update) {
    var item = _focusItem ? _focusItem : _pastFocusItems[0];

    if (_itemType === _itemTypes.student) {

      // Student title view
      _displayTitle = `${item.lastName}, ${item.firstName}`;

    } else if (_itemType === _itemTypes.book) {

      // Book title view
      _displayTitle = `${item.title} by ${item.author}`;

    } else if (_itemType === _itemTypes.code) {

      // Code title view
      _displayTitle = `Code: ${item.code}`;

    }
  }

  return _displayTitle;
}
