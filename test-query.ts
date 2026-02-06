import dotenv from 'dotenv'
import path from 'path'
import { PrismaClient } from '@prisma/client'

// Use local env so this script hits your local DB (e.g. .env.local)
dotenv.config()
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

const prisma = new PrismaClient()

async function test() {
  const pageSize = 3;
  const pageNumber = 2
  const offset = (pageNumber - 1) * 3;
  const data = await prisma.$queryRaw`
    WITH book_author_ids AS (
  SELECT
    ab."B" AS book_id,
    array_agg(ab."A" ORDER BY ab."A") AS author_ids,
    string_agg(a.name, ', ' ORDER BY a.name) AS author_names
  FROM "_AuthorToBook" ab
  JOIN authors a ON a.id = ab."A"
  GROUP BY ab."B"
  -- SORT GROUPS FIRST: This ensures Page 1 and Page 2 don't overlap
  ORDER BY author_names ASC
  -- PAGINATION HAPPENS HERE:
  LIMIT ${pageSize}                 -- Replace with your 'pageSize'
  OFFSET ${offset}      -- Formula: (pageNumber - 1) * pageSize
)
SELECT
  bai.book_id,
  b.title AS book_title,
  bai.author_names,
  s.id AS sale_id,
  s.publisher_revenue,
  s.author_royalty,
  s.quantity,
  s.paid,
  s.date
FROM book_author_ids bai
INNER JOIN sales s ON s.book_id = bai.book_id
INNER JOIN books b ON b.id = bai.book_id
ORDER BY
  bai.author_names ASC,
  to_date(s.date, 'MM-YYYY') DESC;
  `
  console.table(data) // This creates a beautiful visual table in your terminal!
}

test()