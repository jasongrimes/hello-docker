-- 
-- SQL executed by the build process when the $PGDATA directory is empty.
--
CREATE TABLE IF NOT EXISTS hello (
  id SERIAL PRIMARY KEY, 
  message TEXT
);