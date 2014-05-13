var Ix = require('ix');
var BloomCollection = require('./BloomCollection');
var util = require('./util');
var cmpObj = util.cmpObj;
var genCmpArrKeys = util.genCmpArrKeys;

var Bloom = function() { };

var prototype = Bloom.prototype;

prototype.addCollection = function(name, type, keys, vals) {
  if (keys === undefined) {
    keys = type === 'channel' ? ['@address', 'val'] : ['key'];
  }
  if (vals === undefined) {
    vals = type === 'channel' ? [] : ['val'];
  }
  this._collections[name] = new BloomCollection(name, type);
  this._collectionKeys[name] = keys;
  return this._collections[name];
};

prototype.addCollectionFromArray = function(arr) {
  var name = 'anon' + Object.keys(this._anonCollections).length;
  this._anonCollections[name] = new BloomCollection('', 'anon', arr);
  return this._anonCollections[name];
};

prototype.op = function(type, lhsName, rhs, opStratum, blockType) {
  var op, ops, opStrata;
  ops = blockType === 'Bloom' ? this._bloomOps : this._bootstrapOps;
  opStrata = blockType === 'Bloom' ? this._bloomOpStrata :
    this._bootstrapOpStrata;
  if (Object.prototype.toString.call(rhs) === '[object Array]') {
    rhs = this.addCollectionFromArray(rhs);
  }
  op = {
    type: type,
    lhs: this._collections[lhsName],
    rhs: rhs
  };
  ops.push(op);
  if (opStratum !== -1) {
    if (opStrata[opStratum] === undefined) {
      opStrata[opStratum] = {
        targets: {},
        ops: []
      };
    }
    opStrata[opStratum].targets[lhsName] = true;
    opStrata[opStratum].ops.push(op);
  }
};

prototype.tick = function() {
  if (!this._bootstrapRun) {
    this.evalOps(this._bootstrapOps, this._bootstrapOpStrata);
    for (name in this._collections) {
      if (this._collections.hasOwnProperty(name)) {
        collection = this._collections[name];
        collection._replaceData = Ix.Enumerable.fromArray(
          collection._data.union(collection._replaceData, cmpObj).toArray()
        );
        collection._data = Ix.Enumerable.empty();
      }
    }
    this._bootstrapRun = true;
  }
  this.evalOps(this._bloomOps, this._bloomOpStrata);
}

// Seminaive Evaluation
prototype.evalOps = function(ops, opStrata) {
  var i, name, collection, allEmpty, firstIter, allTargets = {}
    prevCollections = {}, self = this;
  // Clear scratch collections
  for (name in this._collections) {
    if (this._collections.hasOwnProperty(name)) {
      collection = this._collections[name];
      if (collection._type === 'scratch') {
        collection._data = Ix.Enumerable.empty();
        collection._delta = Ix.Enumerable.empty();
      }
    }
  }
  // Include updates from deferred operations
  for (name in this._collections) {
    if (this._collections.hasOwnProperty(name)) {
      collection = this._collections[name];
      if (collection._replaceData.count() !== 0) {
        // This assumes no other delta already exists for this collection
        collection._delta = Ix.Enumerable.fromArray(
            collection._replaceData.except(collection._data, cmpObj).toArray()
        );
        collection._data = Ix.Enumerable.fromArray(
            collection._data.except(
                collection._delta,
                genCmpArrKeys(this._collectionKeys[name].length)
            ).toArray()
        );
        collection._replaceData = Ix.Enumerable.empty();
      }
    }
  }
  // Save old data
  for (name in this._collections) {
    if (this._collections.hasOwnProperty(name)) {
      this._collections[name]._oldData = Ix.Enumerable.fromArray(
        this._collections[name]._data.toArray()
      );
      this._collections[name]._stratumDelta = Ix.Enumerable.empty();
    }
  }
  // Find all targets from any stratum
  for (i = 0; i < opStrata.length; i++) {
    if (opStrata[i] !== undefined) {
      for (name in opStrata[i].targets) {
        if (opStrata[i].targets.hasOwnProperty(name)) {
          allTargets[name] = true;
        }
      }
    }
  }
  // If a collection is not a target in any stratum, treat it as a
  // prevCollection from the beginning
  for (name in this._collections) {
    if (this._collections.hasOwnProperty(name) && !allTargets[name]) {
      collection = this._collections[name];
      collection._stratumDelta = collection._delta;
      collection._data = collection._oldData.concat(collection._stratumDelta);
      collection._delta = Ix.Enumerable.empty();
      prevCollections[name] = true;
    }
  }
  // Handle instantaneous merges
  for (i = 0; i < opStrata.length; i++) {
    if (opStrata[i] !== undefined) {
      // If i is even, all operations are purely non-monotonic, so there is no
      // need to run a loop and we operate on previous data rather than deltas
      if (i % 2 === 0) {
        opStrata[i].ops.forEach(function(op) {
          op.lhs._newData = Ix.Enumerable.fromArray(
            op.rhs.getData().union(op.lhs._newData, cmpObj).toArray()
          );
        });
        for (name in opStrata[i].targets) {
          if (opStrata[i].targets.hasOwnProperty(name)) {
            collection = this._collections[name];
            collection._newData = collection._newData.union(collection._delta,
                                                            cmpObj);
            collection._delta = Ix.Enumerable.fromArray(
              collection._newData.except(collection._data, cmpObj).toArray()
            );
            collection._newData = Ix.Enumerable.empty();
          }
        }
        // If next stratum is undefined (incl. if this is the last stratum),
        // or if this target is not found in next stratum, move deltas into data
        for (name in opStrata[i].targets) {
          if (opStrata[i].targets.hasOwnProperty(name)) {
            if (opStrata[i+1] === undefined ||
                !opStrata[i+1].targets.hasOwnProperty(name)) {
              collection = this._collections[name];
              collection._stratumDelta = collection._delta;
              collection._data =
                collection._oldData.concat(collection._stratumDelta);
              collection._delta = Ix.Enumerable.empty();
              prevCollections[name] = true;
            }
          }
        }
      } else {
        // First, repopulate the deltas of collections from previous strata
        // and anonymous collections
        for (name in prevCollections) {
          if (prevCollections.hasOwnProperty(name)) {
            collection = this._collections[name];
            collection._data = collection._oldData;
            collection._delta = collection._stratumDelta;
          }
        };
        for (name in this._anonCollections) {
          if (this._anonCollections.hasOwnProperty(name)) {
            collection = this._anonCollections[name];
            collection._delta = collection._data;
            collection._data = Ix.Enumerable.empty();
          }
        }
        // Then, run the seminaive evaluation loop, but only for the targets
        // in our current stratum
        firstIter = true;
        do {
          opStrata[i].ops.forEach(function(op) {
            op.lhs._newData = Ix.Enumerable.fromArray(
              op.rhs.getDelta().union(op.lhs._newData, cmpObj).toArray()
            );
          });
          allEmpty = true;
          for (name in opStrata[i].targets) {
            if (opStrata[i].targets.hasOwnProperty(name)) {
              collection = this._collections[name];
              collection._stratumDelta = Ix.Enumerable.fromArray(
                collection._stratumDelta.concat(collection._delta).toArray()
              );
              collection._data =
                collection._oldData.concat(collection._stratumDelta);
              collection._delta = Ix.Enumerable.fromArray(
                collection._newData.except(collection._data, cmpObj).toArray()
              );
              collection._newData = Ix.Enumerable.empty();
              if (collection._delta.count() !== 0) {
                allEmpty = false;
              }
            }
          }
          // If this is the first iteration, move delta into data for
          // collections from all previous strata
          if (firstIter) {
            for (name in prevCollections) {
              if (prevCollections.hasOwnProperty(name)) {
                collection = this._collections[name];
                collection._data =
                  collection._oldData.concat(collection._stratumDelta);
                collection._delta = Ix.Enumerable.empty();
              }
            }
            for (name in this._anonCollections) {
              if (this._anonCollections.hasOwnProperty(name)) {
                collection = this._anonCollections[name];
                collection._data = collection._delta;
                collection._delta = Ix.Enumerable.empty();
              }
            }
            firstIter = false;
          }
        } while (!allEmpty);
        // Update prevCollections with targets from this stratum
        for (name in opStrata[i].targets) {
          if (opStrata[i].targets.hasOwnProperty(name)) {
            prevCollections[name] = true;
          }
        }
      }
    }
  }
  // Handle deferred operators
  ops.forEach(function(op) {
    if (op.type === '<+-') {
      op.lhs._replaceData = Ix.Enumerable.fromArray(
        op.rhs.getData().union(op.lhs._replaceData, cmpObj).toArray()
      );
    }
  });
};

module.exports = Bloom;

