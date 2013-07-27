DROP TABLE IF EXISTS links;
DROP TABLE IF EXISTS paths;
DROP TABLE IF EXISTS shortest;

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
BEGIN
  DROP TABLE IF EXISTS tmp;
  DROP TABLE IF EXISTS new_links;
  DROP TABLE IF EXISTS new_paths;

  CREATE TABLE new_links AS SELECT * FROM links;
  CREATE TABLE new_paths AS SELECT * FROM paths;

  CREATE TABLE tmp (src, dest, cost) AS
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

  CREATE TABLE tmp (src, dest, nxt, cost) AS
  SELECT src, dest, dest, cost FROM links;
  INSERT INTO new_paths
  SELECT DISTINCT ON (src, dest, nxt, cost) * FROM tmp
  WHERE (src, dest, nxt, cost) NOT IN
    (SELECT src, dest, nxt, cost FROM new_paths);
  DROP TABLE tmp;

  CREATE TABLE tmp (src, dest, nxt, cost) AS
  SELECT links.src, paths.dest, links.dest, links.cost + paths.cost
  FROM links INNER JOIN paths
  ON links.dest = paths.src;
  INSERT INTO new_paths
  SELECT DISTINCT ON (src, dest, nxt, cost) * FROM tmp
  WHERE (src, dest, nxt, cost) NOT IN
    (SELECT * FROM new_paths);
  DROP TABLE tmp;

  SELECT INTO row_count COUNT(*) FROM links;
  SELECT INTO new_row_count COUNT(*) FROM new_links;
  all_same := all_same AND row_count = new_row_count;
  SELECT INTO row_count COUNT(*) FROM paths;
  SELECT INTO new_row_count COUNT(*) FROM new_paths;
  all_same := all_same AND row_count = new_row_count;

  DROP TABLE links;
  ALTER TABLE new_links RENAME TO links;
  DROP TABLE paths;
  ALTER TABLE new_paths RENAME TO paths;

  RETURN NOT all_same;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION naive_eval (
) RETURNS VOID AS $$
BEGIN
  WHILE iter() LOOP END LOOP;
END;
$$ LANGUAGE plpgsql;
