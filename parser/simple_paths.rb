class ShortestPaths

  state do
    table 'link', ['from', 'to', 'cost']
    scratch 'path', ['from', 'to', 'nxt', 'cost']
  end

  # recursive rules to define all paths from links
  bloom make_paths do
    # base case: every link is a path
    path := link {|l| {from: l.from, to: l.to, nxt: l.to, cost: l.cost}}

    # inductive case: make path of length n+1 by connecting a link to a path of
    # length n
    path := (link*path).pairs({'to': 'from'}) do |l,p|
      {from: l.from, to: p.to, nxt: l.to, cost: l.cost+p.cost}
    end
  end
end

# compute shortest paths.
program = new ShortestPaths()

# populate our little example.  we put two links between 'a' and 'b'
# to see whether our shortest-paths code does the right thing.
program.link := [{from: 'a', to: 'b', cost: 1}, \
                 {from: 'a', to: 'b', cost: 4}, \
                 {from: 'b', to: 'c', cost: 1}, \
                 {from: 'c', to: 'd', cost: 1}, \
                 {from: 'd', to: 'e', cost: 1}]

program.tick() # one timestamp is enough for this simple program

puts "----"

# now lets add an extra link and recompute
program.link := [{from: 'e', to: 'f', cost: 1}]
program.tick()
