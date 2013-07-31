DROP TABLE IF EXISTS links CASCADE;
DROP TABLE IF EXISTS paths CASCADE;
DROP TABLE IF EXISTS shortest CASCADE;
DROP TYPE IF EXISTS paths_type CASCADE;

CREATE TABLE links (
  src VARCHAR(255),
  dest VARCHAR(255),
  cost INT,
  PRIMARY KEY (src, dest, cost)
);

CREATE TABLE paths (
  src VARCHAR(255),
  dest VARCHAR(255),
  nxt VARCHAR(255),
  cost INT,
  PRIMARY KEY (src, dest, nxt, cost)
);

CREATE TABLE shortest (
  src VARCHAR(255),
  dest VARCHAR(255),
  nxt VARCHAR(255),
  cost INT,
  PRIMARY KEY (src, dest)
);

CREATE OR REPLACE FUNCTION iter (
) RETURNS BOOL AS $$
DECLARE
  all_same BOOL := TRUE;
  row_count INT;
  new_row_count INT;
  r RECORD;
BEGIN
  DROP TABLE IF EXISTS tmp;
  DROP TABLE IF EXISTS new_links;
  DROP TABLE IF EXISTS new_paths;
  DROP TABLE IF EXISTS new_shortest;

  CREATE TABLE new_links AS SELECT * FROM links;
  CREATE TABLE new_paths AS SELECT * FROM paths;
  CREATE TABLE new_shortest AS SELECT * FROM shortest;

  CREATE TABLE tmp AS SELECT * from links WHERE 1=0;
  INSERT INTO tmp
  VALUES
    ('a', 'b', 1),
    ('a', 'b', 4),
    ('b', 'c', 1),
    ('c', 'd', 1),
    ('d', 'e', 1);
  INSERT INTO new_links
  SELECT DISTINCT ON (src, dest, cost) * FROM tmp
  WHERE (src, dest, cost) NOT IN
    (SELECT src, dest, cost FROM new_links);
  DROP TABLE tmp;

  CREATE TABLE tmp AS SELECT * FROM paths WHERE 1=0;
  FOR r IN (SELECT * FROM links) LOOP
    INSERT INTO tmp VALUES (r.src, r.dest, r.dest, r.cost);
  END LOOP;
  INSERT INTO new_paths
  SELECT DISTINCT ON (src, dest, nxt, cost) * FROM tmp
  WHERE (src, dest, nxt, cost) NOT IN
    (SELECT src, dest, nxt, cost FROM new_paths);
  DROP TABLE tmp;

  CREATE TABLE tmp AS SELECT * FROM paths WHERE 1=0;
  FOR r IN (SELECT links.src as links_src,links.dest as links_dest, links.cost as links_cost, paths.src as paths_src, paths.dest as paths_dest, paths.nxt as paths_nxt, paths.cost as paths_cost FROM links INNER JOIN paths ON links.dest = paths.src) LOOP
    INSERT INTO tmp VALUES (r.links_src, r.paths_dest, r.links_dest, r.links_cost + r.paths_cost);
  END LOOP;
  INSERT INTO new_paths
  SELECT DISTINCT ON (src, dest, nxt, cost) * FROM tmp
  WHERE (src, dest, nxt, cost) NOT IN
    (SELECT * FROM new_paths);
  DROP TABLE tmp;

  CREATE TABLE tmp AS SELECT * FROM shortest WHERE 1=0;
  INSERT INTO tmp
  SELECT * FROM paths
  WHERE (paths.src, paths.dest, paths.cost) IN (SELECT paths.src, paths.dest, MIN(paths.cost) FROM paths GROUP BY paths.src, paths.dest);
  INSERT INTO new_shortest
  SELECT DISTINCT ON (src, dest) * FROM tmp
  WHERE (src, dest) NOT IN
    (SELECT src, dest FROM new_shortest);
  DROP TABLE tmp;

  SELECT INTO row_count COUNT(*) FROM links;
  SELECT INTO new_row_count COUNT(*) FROM new_links;
  all_same := all_same AND row_count = new_row_count;
  SELECT INTO row_count COUNT(*) FROM paths;
  SELECT INTO new_row_count COUNT(*) FROM new_paths;
  all_same := all_same AND row_count = new_row_count;
  SELECT INTO row_count COUNT(*) FROM shortest;
  SELECT INTO new_row_count COUNT(*) FROM new_shortest;
  all_same := all_same AND row_count = new_row_count;

  DROP TABLE links;
  ALTER TABLE new_links RENAME TO links;
  DROP TABLE paths;
  ALTER TABLE new_paths RENAME TO paths;
  DROP TABLE shortest;
  ALTER TABLE new_shortest RENAME TO shortest;

  RETURN NOT all_same;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION naive_eval (
) RETURNS VOID AS $$
BEGIN
  WHILE iter() LOOP END LOOP;
END;
$$ LANGUAGE plpgsql;
