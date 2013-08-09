require 'rubygems'
require 'bud'
require 'decision_tree.rb'

class DTreeTest
  include Bud
  include DecisionTree

  bootstrap do
    f = File.new('iris.data')
    training_data <+ f.read.strip.split(/\n/).each_with_index.map do |row, i|
      rsplit = row.split(',')
      [i].concat([rsplit[0...-1]]).concat([rsplit[-1]]).concat([''])
    end
    f.close
  end

end

d = DTreeTest.new
d.tick
d.tick
d.tick
d.tick
d.tick
d.tick
