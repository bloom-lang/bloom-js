var Ix = require('ix');
var BloomCollection = require('./BloomCollection');
var cmpObj = require('./util').cmpObj;

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

prototype.op = function(type, lhs, rhs, spec) {
  var targetNode, self = this;
  if (Object.prototype.toString.call(rhs) === '[object Array]') {
    rhs = this.addCollectionFromArray(rhs);
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
  });
};

/*
// Naive Evaluation
prototype.tick = function() {
  var name, allSame, self = this;
  do {
    for (name in this._collections) {
      this._collections[name]._newData = this._collections[name]._data;
    }
    this._ops.forEach(function(op) {
      if (op.type === ':=') {
        op.lhs._newData = Ix.Enumerable.fromArray(
          op.rhs.getData().union(op.lhs._newData, cmpObj).toArray()
        );
      }
    });
    allSame = true;
    for (name in this._collections) {
      if (this._collections[name]._newData.count() !==
          this._collections[name]._data.count()) {
        allSame = false;
      }
    }
    for (name in this._collections) {
      this._collections[name]._data = this._collections[name]._newData;
    }
  } while (!allSame);

  for (name in this._collections) {
    console.log(name, this._collections[name]._data.toArray());
  }
};*/

// Seminaive Evaluation
prototype.tick = function() {
  var i, name, collection, allEmpty, firstIter, prevCollections = [],
    self = this;
  if (this._opStrata === null) {
    this.stratifyOps();
  }
  for (name in this._collections) {
    if (this._collections.hasOwnProperty(name)) {
      this._collections[name]._oldData = Ix.Enumerable.fromArray(
        this._collections[name]._data.toArray()
      );
      this._collections[name]._stratumDelta = Ix.Enumerable.empty();
    }
  }
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
          }
        }
        // If this is the last stratum, move deltas into data
        if (i === this._opStrata.length - 1) {
          for (name in this._opStrata[i].targets) {
            if (this._opStrata[i].targets.hasOwnProperty(name)) {
              collection = this._collections[name];
              collection._data = collection._data.concat(collection._delta);
              collection._delta = Ix.Enumerable.empty();
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

  for (name in this._collections) {
    if (this._collections.hasOwnProperty(name)) {
      console.log(name, this._collections[name]._data.toArray());
    }
  }
  for (name in this._anonCollections) {
    if (this._anonCollections.hasOwnProperty(name)) {
      console.log(name, this._anonCollections[name]._data.toArray());
    }
  }
};

module.exports = Bloom;

