# simple shortest paths
# note use of program.tick at bottom to run a single timestep
# and inspect relations
require 'rubygems'
require 'bud'

class ShortestPaths
  include Bud

  state do
    table :link, [text :src,  text :dest, int :cost]
    table :path, [text :src, text :dest, text :nxt, int :cost]
    scratch :shortest, [text :src, text :dest] => [text :nxt, int :cost]
  end

  bootstrap do
    link <= [['a', 'b', 1], ['a', 'b', 4], ['b', 'c', 1], ['c', 'd', 1], ['d', 'e', 1]]
  end

  # recursive rules to define all paths src links
  bloom :make_paths do
    # base case: every link is a path
    path <= link {|l| [l.src, l.dest, l.dest, l.cost]}

    # inductive case: make path of length n+1 by connecting a link to a path of
    # length n
    path <= (link*path).pairs({:dest => :src}) do |l,p|
      [l.src, p.dest, l.dest, l.cost+p.cost]
    end
  end

  # find the shortest path between each connected pair of nodes
  bloom :find_shortest do
    shortest <= path.argmin([:src, :dest], :cost)
    #link <+- [['a', 'b', 5]]
  end
end

# compute shortest paths.
program = ShortestPaths.new

# populate our little example.  we put two links between a and b
# to see whether our shortest-paths code does the right thing.

program.tick # one timestamp is enough for this simple program
puts "links:"
program.link.to_a.sort.each {|t| puts t.inspect}

puts "----"

# now lets add an extra link and recompute
#program.link <- [["d", "e", 1]]
program.tick
puts "links:"
program.link.to_a.sort.each {|t| puts t.inspect}
puts "paths:"
program.path.to_a.sort.each {|t| puts t.inspect}
puts "shortest:"
program.shortest.to_a.sort.each {|t| puts t.inspect}
puts "----"
program.tick
program.shortest.to_a.sort.each {|t| puts t.inspect}
