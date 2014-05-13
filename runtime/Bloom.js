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
  this._collectionNodes[name] = {
    children: {},
    parents: {}
  };
  return this._collections[name];
};

prototype.addCollectionFromArray = function(arr) {
  var name = 'anon' + Object.keys(this._anonCollections).length;
  this._anonCollections[name] = new BloomCollection('', 'anon', arr);
  return this._anonCollections[name];
};

prototype.addDelta = function(lhs, rhs) {
  if (Object.prototype.toString.call(rhs) === '[object Array]') {
    rhs = new BloomCollection('', 'anon', rhs);
    rhs._delta = rhs._data;
  }
  lhs._delta = Ix.Enumerable.fromArray(
    rhs._delta.union(lhs._delta, cmpObj).toArray()
  );
}

prototype.op = function(type, lhs, rhs, spec) {
  var targetNode, self = this;
  if (Object.prototype.toString.call(rhs) === '[object Array]') {
    rhs = this.addCollectionFromArray(rhs);
  }
  if (type !== ':=') {
    spec = {};
  }
  if (spec.monotonicDeps === undefined) {
    spec.monotonicDeps = [];
  }
  if (spec.nonMonotonicDeps === undefined) {
    spec.nonMonotonicDeps = [];
  }
  this._ops.push({
    type: type,
    lhs: lhs,
    rhs: rhs,
    target: spec.target,
    fullyNonMonotonic: spec.monotonicDeps.length === 0 &&
      spec.nonMonotonicDeps.length > 0
  });
  if (type === ':=') {
    targetNode = this._collectionNodes[spec.target]
    spec.monotonicDeps.forEach(function(parentName) {
      if (targetNode.parents[parentName] !== 'non-monotonic') {
        targetNode.parents[parentName] = 'monotonic';
        self._collectionNodes[parentName].children[spec.target] = 'monotonic';
      }
    });
    spec.nonMonotonicDeps.forEach(function(parentName) {
      targetNode.parents[parentName] = 'non-monotonic';
      self._collectionNodes[parentName].children[spec.target] = 'non-monotonic';
    });
    this._opStrata = null;
  }
};

prototype.stratifyOps = function() {
  var name, node, parentName, childName, childNode, toVisit = [],
    postOrder = [], ccToVisit = [], ccCounter = -1, comp, num, childNum,
    childComp, topoToVisit = [], ccStratum, opStratum, self = this;
  for (name in this._collectionNodes) {
    if (this._collectionNodes.hasOwnProperty(name)) {
      this._collectionNodes[name].visited = false;
      this._collectionNodes[name].visitedTwice = false;
      this._collectionNodes[name].ccNum = -1;
      toVisit.push(name);
    }
  }
  // Run a DFS on the reverse of our dependency graph (following parent pointers
  // rather than children), so by the end of the traversal the end of the
  // postOrder array will be a sink in our original graph
  while (toVisit.length > 0) {
    name = toVisit.pop();
    node = this._collectionNodes[name];
    if (!node.visited) {
      node.visited = true;
      toVisit.push(name);
      for (parentName in node.parents) {
        if (node.parents.hasOwnProperty(parentName)) {
          if (!this._collectionNodes[parentName].visited) {
            toVisit.push(parentName);
          }
        }
      }
    } else if (!node.visitedTwice) {
      node.visitedTwice = true;
      postOrder.push(name);
    }
  }
  // Find the connected components of our graph by running a DFS from each node,
  // starting from the end of our postOrder array (processing sinks first)
  while (postOrder.length > 0) {
    name = postOrder.pop();
    if (this._collectionNodes[name].ccNum === -1) {
      ccCounter++;
      this._connectedComponents[ccCounter] = {
        stratum: -1,
        members: [],
        children: {},
        numParents: 0
      };
      comp = this._connectedComponents[ccCounter];
      ccToVisit.push(name);
    }
    while (ccToVisit.length > 0) {
      name = ccToVisit.pop();
      node = this._collectionNodes[name];
      if (node.ccNum === -1) {
        node.ccNum = ccCounter;
        comp.members.push(name);
        for (childName in node.children) {
          if (node.children.hasOwnProperty(childName)) {
            childNode = this._collectionNodes[childName];
            if (childNode.ccNum === -1 || childNode.ccNum === ccCounter) {
              if (node.children[childName] === 'non-monotonic') {
                console.error('Error: Non-monotonic loop detected in ' +
                              'collection dependency graph, caused by the ' +
                              'non-monotonic op from %s into %s',
                              name, childName);
              }
              if (childNode.ccNum === -1) {
                ccToVisit.push(childName);
              }
            } else {
              if (comp.children[childNode.ccNum] !== 'non-monotonic') {
                if (comp.children[childNode.ccNum] === undefined) {
                  this._connectedComponents[childNode.ccNum].numParents++;
                }
                comp.children[childNode.ccNum] = node.children[childName];
              }
            }
          }
        }
      }
    }
  }
  // Topologically sort the connected components into layers separated by
  // non-monotonic operations
  for (num in this._connectedComponents) {
    if (this._connectedComponents.hasOwnProperty(num) &&
        this._connectedComponents[num].numParents === 0) {
      this._connectedComponents[num].stratum = 0;
      topoToVisit.push(num);
    }
  }
  while (topoToVisit.length > 0) {
    num = topoToVisit.pop();
    comp = this._connectedComponents[num];
    for (childNum in comp.children) {
      if (comp.children.hasOwnProperty(childNum)) {
        childComp = this._connectedComponents[childNum];
        if (comp.children[childNum] === 'monotonic') {
          childComp.stratum = Math.max(childComp.stratum, comp.stratum);
        } else if (comp.children[childNum] === 'non-monotonic') {
          childComp.stratum = Math.max(childComp.stratum, comp.stratum + 1);
        }
        childComp.numParents--;
        if (childComp.numParents === 0) {
          topoToVisit.push(childNum);
        }
      }
    }
  }
  this._opStrata = [];
  this._ops.forEach(function(op) {
    if (op.type === ':=') {
      num = self._collectionNodes[op.target].ccNum;
      ccStratum = self._connectedComponents[num].stratum;
      opStratum = op.fullyNonMonotonic ? 2 * ccStratum - 1: 2 * ccStratum;
      if (self._opStrata[opStratum] === undefined) {
        self._opStrata[opStratum] = {
          targets: {},
          ops: []
        };
      }
      self._connectedComponents[num].members.forEach(function(collectionName) {
        self._opStrata[opStratum].targets[collectionName] = true;
      });
      self._opStrata[opStratum].ops.push(op);
    }
  });
};

// Seminaive Evaluation
prototype.tick = function() {
  var i, name, collection, allEmpty, firstIter,
    prevCollections = [], self = this;
  if (this._opStrata === null) {
    this.stratifyOps();
  }
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
  // Handle instantaneous merges
  for (i = 0; i < this._opStrata.length; i++) {
    if (this._opStrata[i] !== undefined) {
      // If i is odd, all operations are purely non-monotonic, so there is no
      // need to run a loop and we operate on previous data rather than deltas
      if (i % 2 === 1) {
        this._opStrata[i].ops.forEach(function(op) {
          op.lhs._newData = Ix.Enumerable.fromArray(
            op.rhs.getData().union(op.lhs._newData, cmpObj).toArray()
          );
        });
        for (name in this._opStrata[i].targets) {
          if (this._opStrata[i].targets.hasOwnProperty(name)) {
            collection = this._collections[name];
            collection._delta = Ix.Enumerable.fromArray(
              collection._newData.except(collection._data, cmpObj).toArray()
            );
            collection._newData = Ix.Enumerable.empty();
          }
        }
        // If next stratum is undefined (incl. if this is the last stratum),
        // or if this target is not found in next stratum, move deltas into data
        for (name in this._opStrata[i].targets) {
          if (this._opStrata[i].targets.hasOwnProperty(name)) {
            if (this._opStrata[i+1] === undefined ||
                !this._opStrata[i+1].targets.hasOwnProperty(name)) {
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
          this._opStrata[i].ops.forEach(function(op) {
            op.lhs._newData = Ix.Enumerable.fromArray(
              op.rhs.getDelta().union(op.lhs._newData, cmpObj).toArray()
            );
          });
          allEmpty = true;
          for (name in this._opStrata[i].targets) {
            if (this._opStrata[i].targets.hasOwnProperty(name)) {
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
        for (name in this._opStrata[i].targets) {
          if (this._opStrata[i].targets.hasOwnProperty(name)) {
            prevCollections[name] = true;
          }
        }
      }
    }
  }
  // Handle deferred operators
  this._ops.forEach(function(op) {
    if (op.type === '<+-') {
      op.lhs._replaceData = Ix.Enumerable.fromArray(
        op.rhs.getData().union(op.lhs._replaceData, cmpObj).toArray()
      );
    }
  });
};

module.exports = Bloom;

