BEGIN;
SET LOCAL search_path TO cemetery,pg_catalog;
SELECT pg_advisory_xact_lock(6761842026);
INSERT INTO drafts(name,fields,updated_at,revision) VALUES('__migration_test__','{}','2026-10-01T00:00:00Z',1);
DO $$ DECLARE r integer; BEGIN
  INSERT INTO drafts(name,fields,updated_at,revision) VALUES('__migration_test__','{}','test',1)
    ON CONFLICT(name) DO UPDATE SET fields=excluded.fields,updated_at=excluded.updated_at,revision=drafts.revision+1
    WHERE drafts.revision=1 RETURNING revision INTO r;
  IF r<>2 THEN RAISE EXCEPTION 'Draft revision check failed'; END IF;
  r:=NULL;
  INSERT INTO drafts(name,fields,updated_at,revision) VALUES('__migration_test__','{}','test',1)
    ON CONFLICT(name) DO UPDATE SET fields=excluded.fields,revision=drafts.revision+1
    WHERE drafts.revision=1 RETURNING revision INTO r;
  IF r IS NOT NULL THEN RAISE EXCEPTION 'Stale save was accepted'; END IF;
END $$;
INSERT INTO records(id,sheet,number,payload,created_at,token)
  SELECT '__migration_test__','__migration_test__',COALESCE(MAX(number),0)+1,'{"receipt":"000123","mobile":"09123456789","revision":0}','2026-10-01T00:00:00Z','__migration_test__'
  FROM records WHERE sheet='__migration_test__'
  HAVING EXISTS(SELECT 1 FROM drafts WHERE name='__migration_test__' AND revision=2);
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM records WHERE id='__migration_test__' AND number=1 AND payload::jsonb->>'receipt'='000123' AND payload::jsonb->>'mobile'='09123456789')
  THEN RAISE EXCEPTION 'Record values were not preserved'; END IF;
END $$;
WITH inserted AS (
  INSERT INTO site_comments(id,author,message,page,created_at) VALUES('__migration_test__','Test','Test','Test','Test')
  ON CONFLICT DO NOTHING RETURNING id
) INSERT INTO comment_anchors(comment_id,anchor) SELECT id,'{"x":1}' FROM inserted ON CONFLICT DO NOTHING;
WITH inserted AS (
  INSERT INTO site_comments(id,author,message,page,created_at) VALUES('__migration_test__','Test','Retry','Test','Test')
  ON CONFLICT DO NOTHING RETURNING id
) INSERT INTO comment_anchors(comment_id,anchor) SELECT id,'{"x":2}' FROM inserted ON CONFLICT DO NOTHING;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM comment_anchors WHERE comment_id='__migration_test__' AND anchor='{"x":1}')
  THEN RAISE EXCEPTION 'Retry moved a comment'; END IF;
END $$;
ROLLBACK;
