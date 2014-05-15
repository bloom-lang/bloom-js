DROP TABLE IF EXISTS link;
CREATE TABLE link (
src text,
dest text,
cost int,
PRIMARY KEY (src, dest, cost)
);
DROP TABLE IF EXISTS path;
CREATE TABLE path (
src text,
dest text,
nxt text,
cost int,
PRIMARY KEY (src, dest, nxt, cost)
);
DROP TABLE IF EXISTS shortest;
CREATE TABLE shortest (
src text,
dest text,
nxt text,
cost int,
PRIMARY KEY (src, dest)
);
CREATE OR REPLACE FUNCTION bootstrap (
) RETURNS VOID AS $$
DECLARE
all_same BOOL;
row_count INT;
new_row_count INT;
BEGIN
all_same := FALSE;
WHILE NOT all_same LOOP
CREATE TABLE new_link AS SELECT * FROM link;
DROP TABLE IF EXISTS tmp;
CREATE TABLE tmp AS SELECT * FROM link WHERE 1=0;
INSERT INTO tmp
VALUES
('a', 'b', 1),
('a', 'b', 4),
('b', 'c', 1),
('c', 'd', 1),
('d', 'e', 1);
INSERT INTO new_link
SELECT DISTINCT ON (src, dest, cost) * FROM tmp
WHERE (src, dest, cost) NOT IN (SELECT src, dest, cost FROM new_link);
all_same := TRUE;
SELECT INTO row_count COUNT(*) FROM link;
SELECT INTO new_row_count COUNT(*) FROM new_link;
all_same := all_same AND row_count = new_row_count;
DROP TABLE link;
ALTER TABLE new_link RENAME TO link;
END LOOP;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION bloom (
) RETURNS VOID AS $$
DECLARE
all_same BOOL;
row_count INT;
new_row_count INT;
BEGIN
all_same := FALSE;
WHILE NOT all_same LOOP
CREATE TABLE new_path AS SELECT * FROM path;
DROP TABLE IF EXISTS tmp;
CREATE TABLE tmp AS SELECT * FROM path WHERE 1=0;
INSERT INTO tmp
SELECT l.src, l.dest, l.dest, l.cost FROM link l;
INSERT INTO new_path
SELECT DISTINCT ON (src, dest, nxt, cost) * FROM tmp
WHERE (src, dest, nxt, cost) NOT IN (SELECT src, dest, nxt, cost FROM new_path);
DROP TABLE IF EXISTS tmp;
CREATE TABLE tmp AS SELECT * FROM path WHERE 1=0;
INSERT INTO tmp
SELECT l.src, p.dest, l.dest, (l.cost + p.cost) FROM link l INNER JOIN path p
ON l.dest = p.src;
INSERT INTO new_path
SELECT DISTINCT ON (src, dest, nxt, cost) * FROM tmp
WHERE (src, dest, nxt, cost) NOT IN (SELECT src, dest, nxt, cost FROM new_path);
all_same := TRUE;
SELECT INTO row_count COUNT(*) FROM path;
SELECT INTO new_row_count COUNT(*) FROM new_path;
all_same := all_same AND row_count = new_row_count;
DROP TABLE path;
ALTER TABLE new_path RENAME TO path;
END LOOP;
CREATE TABLE new_shortest AS SELECT * FROM shortest;
DROP TABLE IF EXISTS tmp;
CREATE TABLE tmp AS SELECT * FROM shortest WHERE 1=0;
INSERT INTO tmp
SELECT * FROM path
WHERE (src, dest, cost) IN (SELECT src, dest, MIN(cost) FROM path GROUP BY src, dest);
INSERT INTO new_shortest
SELECT DISTINCT ON (src, dest) * FROM tmp
WHERE (src, dest) NOT IN (SELECT src, dest FROM new_shortest);
DROP TABLE shortest;
ALTER TABLE new_shortest RENAME TO shortest;
END;
$$ LANGUAGE plpgsql;

