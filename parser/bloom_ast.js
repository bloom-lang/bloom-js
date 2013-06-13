exports.program = function(statements) {
  return {
    type: 'program',
    statements: statements
  };
};

exports.classBlock = function(statements) {
  return {
    type: 'class_block',
    statements: statements
  };
};

exports.stateBlock = function(stateDecls) {
  return {
    type: 'state_block',
    stateDecls: stateDecls
  };
};

exports.bloomBlock = function(name, statements) {
  return {
    type: 'bloom_block',
    name: name === undefined ? '' : name,
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

exports.attributeRef = function(obj, attribute) {
  return {
    type: 'attribute_ref',
    obj: obj,
    attribute: attribute
  };
};

exports.subscription = function(obj, attribute) {
  return {
    type: 'subscription',
    obj: obj,
    subscription: attribute
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

exports.hashDisplay = function(kvPairs) {
  var hash = {};
  kvPairs.forEach(function(kvPair) {
    hash[kvPair[0]] = kvPair[1];
  });
  return {
    type: 'hash_display',
    hash: hash
  };
};

exports.symbolLiteral = function(sym) {
  return {
    type: 'symbol_literal'
  };
};
