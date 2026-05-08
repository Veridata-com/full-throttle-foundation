-- Add embed_code (unique tracking code embedded in TikTok descriptions)
-- and tiktok_caption (pre-built caption string shown to user in editor)
-- to the slideshows table.
--
-- import-tiktok-posts will regex-match the embed_code from the scraped
-- TikTok description and auto-set posted_slideshows.slideshow_id.

ALTER TABLE slideshows
  ADD COLUMN IF NOT EXISTS embed_code text,
  ADD COLUMN IF NOT EXISTS tiktok_caption text;

-- Unique index so we can look up by code quickly
CREATE UNIQUE INDEX IF NOT EXISTS slideshows_embed_code_idx ON slideshows (embed_code)
  WHERE embed_code IS NOT NULL;
