var fs = require('fs');
var Bloom = require('../Bloom');
var Ix = require('ix');

var DecisionTree = function() {
  this._collections = {};
  this._anonCollections = {};
  this._collectionKeys = {};
  this._collectionNodes = {};
  this._connectedComponents = {};
  this._ops = [];
  this._opStrata = null;
  this.initializeState();
  this.initializeOps();
};

DecisionTree.prototype = new Bloom();

var i, numFeatures;
var data = fs.readFileSync('iris.data', 'utf8');
var dataRows = data.trim().split('\n');
var dataArr = [];
var locArr = [];
var dataCols = [];
for (i = 0; i < dataRows.length; i++) {
  dataArr.push([i].concat(dataRows[i].split(',')));
  locArr.push([i, '[]']);
}
numFeatures = dataArr[0].length - 2;
for (i = 0; i < numFeatures; i++) {
  dataCols.push('c' + i);
}
dataCols.push('class');

DecisionTree.prototype.initializeState = function() {
  this.addCollection('training_data', 'table', ['id'], dataCols);
  this.addCollection('training_loc', 'table', ['id'], ['tree_loc']);
  this.addCollection('decision_tree', 'table', ['tree_loc'], ['feature_idx', 'split_val']);

  this.addCollection('training_data_loc', 'scratch', ['id'], dataCols.concat('tree_loc'));
  this.addCollection('training_data_groups', 'scratch', [], []);
  this.addCollection('feature_entropy', 'scratch', ['tree_loc', 'feature_idx'], ['split_val', 'entropy']);
  this.addCollection('best_features', 'scratch', ['tree_loc'], ['feature_idx', 'split_val', 'entropy'])
};

DecisionTree.prototype.initializeOps = function() {
  var i;

  this.op(':=', this._collections.training_data, dataArr, {target: 'training_data'});
  this.op(':=', this._collections.training_loc, [], {target: 'training_loc'});
  this.addDelta(this._collections.training_loc, locArr);

  this.op(':=', this._collections.training_data_loc, this._collections.training_data.join(
    this._collections.training_loc,
    function(data) { return data[0]; },
    function(loc) { return loc[0]; },
    function(data, loc) {
      return data.concat(loc[1]);
    }
  ), {
    target: 'training_data_loc',
    monotonicDeps: ['training_data', 'training_loc']
  });

  this.op(':=', this._collections.training_data_groups, this._collections.training_data_loc.groupBy(
    function(data_loc) { return data_loc[numFeatures+2]; },
    function(data_loc) { return data_loc; }
  ), {
    target: 'training_data_groups',
    nonMonotonicDeps: ['training_data_loc']
  });

  this.op(':=', this._collections.feature_entropy, this._collections.training_data_groups.selectMany(
    function(dataGroup) {
      var i, name, res = Ix.Enumerable.empty(), totalClassCounts = {},
        totalCount = 0, prob, totalEntropy = 0, currentClassCounts = {},
        currentCount, oldAcc;
      dataGroup.groupBy(
        function(data_loc) { return data_loc[numFeatures+1]; },
        function(data_loc) { return data_loc; },
        function(k, xs) {
          return [k, xs.count()];
        }
      ).forEach(function(classCountPair) {
        totalCount += classCountPair[1];
        totalClassCounts[classCountPair[0]] = classCountPair[1];
      });
      for (name in totalClassCounts) {
        if (totalClassCounts.hasOwnProperty(name)) {
          prob = totalClassCounts[name] / totalCount;
          totalEntropy -= prob * Math.log(prob) / Math.log(2);
        }
      }
      for (i = 0; i < numFeatures; i++) {
        currentCount = 0;
        for (name in totalClassCounts) {
          if (totalClassCounts.hasOwnProperty(name)) {
            currentClassCounts[name] = 0;
          }
        }
        res = res.concat(Ix.Enumerable.fromArray(
          [dataGroup.orderBy(function(data_loc) { return data_loc[i+1]; }).aggregate(
            [dataGroup.key, i, Number.NEGATIVE_INFINITY, totalEntropy],
            function(acc, data_loc) {
              var leftProb, rightProb, leftEntropy = 0, rightEntropy = 0, entropy;
              currentCount++;
              currentClassCounts[data_loc[numFeatures+1]]++;
              for (name in currentClassCounts) {
                if (currentClassCounts.hasOwnProperty(name)) {
                  leftProb = currentClassCounts[name] / currentCount;
                  rightProb = (totalClassCounts[name] - currentClassCounts[name]) / (totalCount - currentCount);
                  if (leftProb !== 0) {
                    leftEntropy -= leftProb * Math.log(leftProb) / Math.log(2);
                  }
                  if (rightProb !== 0) {
                    rightEntropy -= rightProb * Math.log(rightProb) / Math.log(2);
                  }
                }
              }
              leftProb = currentCount / totalCount;
              rightProb = 1 - leftProb;
              entropy = leftProb * leftEntropy + rightProb * rightEntropy;
              if (data_loc[i+1] === acc[2]) {
                if (entropy < oldAcc[3]) {
                  return [dataGroup.key, i, data_loc[i+1], entropy];
                }
                return oldAcc;
              } else if (entropy < acc[3]) {
                oldAcc = acc;
                return [dataGroup.key, i, data_loc[i+1], entropy];
              }
              return acc;
            }
          )]
        ));
      }
      return res;
    }
  ), {
    target: 'feature_entropy',
    nonMonotonicDeps: ['training_data_groups']
  });

  this.op(':=', this._collections.best_features, this._collections.feature_entropy.groupBy(
    function(fe) { return fe[0]; },
    function(fe) { return fe; },
    function(k, xs) {
      var res, min = Number.POSITIVE_INFINITY;
      xs.forEach(function(x) {
        if (x[3] < min) {
          min = x[3];
          res = x;
        }
      });
      return res;
    }
  ), {
    target: 'best_features',
    nonMonotonicDeps: ['feature_entropy']
  });

  this.op(':=', this._collections.decision_tree, this._collections.best_features.select(
    function(feature) {
      return [feature[0], feature[1], feature[2]];
    }
  ), {
    target: 'decision_tree',
    monotonicDeps: ['best_features']
  });

  this.op('<+-', this._collections.training_loc, this._collections.training_data_loc.join(
    this._collections.decision_tree,
    function(dataLoc) { return dataLoc[numFeatures+2]; },
    function(node) { return node[0]; },
    function(dataLoc, node) {
      var nodeLoc = JSON.parse(node[0]);
      if (node[2] !== Number.NEGATIVE_INFINITY) {
        if (parseFloat(dataLoc[node[1]+1]) <= parseFloat(node[2])) {
          nodeLoc.push(0);
        } else {
          nodeLoc.push(1);
        }
      }
      return [dataLoc[0], JSON.stringify(nodeLoc)];
    }
  ));
};

var d = new DecisionTree();

d.tick();
d.tick();
d.tick();
d.tick();
d.tick();
d.tick();
d.tick();

//console.log(d._collections.feature_entropy._data.toArray());
//console.log(d._collections.training_loc._data.toArray());
console.log(d._collections.decision_tree._data.toArray());
