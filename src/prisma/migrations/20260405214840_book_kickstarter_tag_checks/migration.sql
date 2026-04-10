-- Non-null tags must be 1–128 chars with no whitespace (VARCHAR(128) caps length).
ALTER TABLE "books" ADD CONSTRAINT "books_kickstarter_ebook_item_tag_valid"
  CHECK ("kickstarter_ebook_item_tag" IS NULL OR "kickstarter_ebook_item_tag" ~ '^[^[:space:]]{1,128}$');

ALTER TABLE "books" ADD CONSTRAINT "books_kickstarter_print_item_tag_valid"
  CHECK ("kickstarter_print_item_tag" IS NULL OR "kickstarter_print_item_tag" ~ '^[^[:space:]]{1,128}$');
