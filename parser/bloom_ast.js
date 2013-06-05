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
