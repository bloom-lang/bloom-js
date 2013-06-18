class ShortestPaths

  state do
    table 'link', ['from', 'to', 'cost']
    scratch 'path', ['from', 'to', 'nxt', 'cost']
  end

  # recursive rules to define all paths from links
  bloom make_paths do
    # base case: every link is a path
    path := link {|l| [l.from, l.to, l.to, l.cost]}

    # inductive case: make path of length n+1 by connecting a link to a path of
    # length n
  end
end

# compute shortest paths.
program = new ShortestPaths()

# populate our little example.  we put two links between 'a' and 'b'
# to see whether our shortest-paths code does the right thing.
program.link := [['a', 'b', 1], \
                 ['a', 'b', 4], \
                 ['b', 'c', 1], \
                 ['c', 'd', 1], \
                 ['d', 'e', 1]]

program.path := (program.link*program.path).pairs({'to': 'from'}) do |l,p|
  [l.from, p.to, l.to, l.cost+p.cost]
end

program.tick() # one timestamp is enough for this simple program

puts "----"

# now lets add an extra link and recompute
program.link := [['e', 'f', 1]]
program.tick()
