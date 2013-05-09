var triflow = require('triflow');
var triutil = require('./triutil');
var OutputElement = require('./OutputElement');
var TableElement = require('./TableElement');

var evalFunc = function(oldTables) {
  var newLinks = new TableElement();
  var newPaths = new TableElement();
  var newShortestPaths = new TableElement();
  var unionPaths = new triflow.element.Union();
  unionPaths.wire([newPaths]);

  var joinMapper = function(data) {
    return [data[0], data[4], data[1], data[2] + data[6]];
  };
  joinMapper.outputArity = 4;
  var joinPaths = new triflow.element.HashJoin({
    buildJoinColumns: [1],
    probeJoinColumns: [0]
  }, [joinMapper]);
  joinPaths.wire([unionPaths]);

  var mapper = function(data) {
    return [data[0], data[1], data[1], data[2]];
  };
  mapper.outputArity = 4;
  var mapPaths = new triflow.element.Buffer({}, [mapper]);
  mapPaths.wire([unionPaths]);

  var linkBuffer = new triflow.element.Buffer();
  linkBuffer.wire([joinPaths]);
  linkBuffer.wire([mapPaths]);
  var pathBuffer = new triflow.element.Buffer();
  pathBuffer.wire([joinPaths]);

  oldTables['links'].wire([linkBuffer]);
  oldTables['paths'].wire([pathBuffer]);
  oldTables['links'].go();
  oldTables['paths'].go();
  oldTables['links'].stopConsumer(linkBuffer);
  oldTables['paths'].stopConsumer(pathBuffer);

  return {
    links: newLinks,
    paths: newPaths,
    shortestPaths: newShortestPaths
  };
};

var aggFunc = function(oldTables) {
  var newLinks = new TableElement();
  var newPaths = new TableElement();
  var newShortestPaths = new TableElement();

  var mapper = function(data) {
    return [data[0], data[1], data[2][0], data[2][1]];
  };
  mapper.outputArity = 4;
  var mapShortestPaths = new triflow.element.Map({}, [mapper]);
  mapShortestPaths.wire([newShortestPaths]);

  var group0 = function(data) { return data[0]; };
  var group1 = function(data) { return data[1]; };
  var agg = function() {
    var minCost = Infinity;
    var res = [];
    return {
      open: function() {},
      next: function(data) {
        if (data[3] < minCost) {
          minCost = data[3];
          res = [data[2], data[3]];
        }
      },
      close: function() {
        return res;
      }
    };
  }
  var aggPaths = new triflow.element.Aggregate({
    groups: [group0, group1],
    aggs: [agg]
  });
  aggPaths.wire([mapShortestPaths]);

  var pathBuffer = new triflow.element.Buffer();
  pathBuffer.wire([aggPaths]);

  oldTables['paths'].wire([pathBuffer]);
  oldTables['paths'].go();
  oldTables['paths'].stopConsumer(pathBuffer);

  return {
    links: newLinks,
    paths: newPaths,
    shortestPaths: newShortestPaths
  };
}


links = new TableElement();
paths = new TableElement();
shortestPaths = new TableElement();
links.consume(['a', 'b', 1]);
links.consume(['a', 'b', 4]);
links.consume(['b', 'c', 1]);
links.consume(['c', 'd', 1]);
links.consume(['d', 'e', 1]);
links.consumeEOS();
paths.consumeEOS();
tables = {
  links: links,
  paths: paths,
  shortestPaths: shortestPaths
};

tables = triutil.stratExec(tables, [evalFunc, aggFunc]);

var output = new OutputElement();
console.log('all paths');
tables['paths'].wire([output]);
tables['paths'].go();
console.log('shortest paths');
tables['shortestPaths'].wire([output]);
tables['shortestPaths'].go();

