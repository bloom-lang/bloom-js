exports.stateBlock = function(stateDecls) {
  return {
    type: 'state_block',
    stateDecls: stateDecls
  };
};

exports.bloomBlock = function(statements) {
  return {
    type: 'bloom_block',
    statements: statements
  };
};

exports.stateDecl = function(collectionType, name, keys, vals) {
  return {
    type: 'state_decl',
    collectionType: collectionType,
    name: name,
    keys: keys,
    vals: vals
  };
};

exports.cons = function(el, arr) {
  if (arr === undefined) {
    return [el];
  }
  arr.unshift(el);
  return arr;
};

exports.bloomStmt = function(destCollection, bloomOp, srcCollection) {
  return {
    type: 'bloom_stmt',
    destCollection: destCollection,
    bloomOp: bloomOp,
    srcCollection: srcCollection
  };
};

exports.propertyRef = function(obj, property) {
  return {
    type: 'property_ref',
    obj: obj,
    property: property
  };
};

exports.subscription = function(obj, property) {
  return {
    type: 'subscription',
    obj: obj,
    subscription: property
  };
};

exports.call = function(func, args) {
  return {
    type: 'call',
    func: func,
    args: args
  };
};

exports.arrDisplay = function(arr) {
  return {
    type: 'arr_display',
    arr: arr
  };
};

exports.objDisplay = function(kvPairs) {
  var obj = {};
  kvPairs.forEach(function(kvPair) {
    obj[kvPair[0]] = kvPair[1];
  });
  return {
    type: 'obj_display',
    obj: obj
  };
};
