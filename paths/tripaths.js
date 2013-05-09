var triflow = require('triflow');
var OutputElement = require('./OutputElement');
var TableElement = require('./TableElement');

var evalFunc = function(oldLinks, oldPaths) {
  var newPaths = new TableElement();

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

  oldLinks.wire([linkBuffer]);
  oldPaths.wire([pathBuffer]);
  oldLinks.go();
  oldPaths.go();
  oldLinks.stopConsumer(linkBuffer);
  oldPaths.stopConsumer(pathBuffer);

  return newPaths;
};


links = new TableElement();
paths = new TableElement();

links.consume(['a', 'b', 1]);
links.consume(['a', 'b', 4]);
links.consume(['b', 'c', 1]);
links.consume(['c', 'd', 1]);
links.consume(['d', 'e', 1]);
links.consumeEOS();

paths.consumeEOS();

do {
  var oldCount = paths.count();
  paths = evalFunc(links, paths);
} while (oldCount !== paths.count());

var output = new OutputElement();
paths.wire([output]);
paths.go();

