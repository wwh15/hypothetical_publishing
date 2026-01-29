Bulk Entry
  - [x] Add author royalty as an optional value 
    - [x] If no royalty rate inlcuded in input, calculate based on book's rate
    - [x] If royalty rate included, mark as overriden only if different from calculation
         with book's rate
  - [x] Force publishers to input valid data
  - [x] If ISBN is unknown, prompt inline to add author/title and block submission until resolved
  - [x] Show author royalty in the preview (derived from the matched book’s rate)
    
Individual Entry
  - [] Define specific next steps (e.g., validate fields, auto- []calc royalty, handle overrides)

Data
  - [] Replace mock data with real data from the database

Missing/considerations
  - [] Surface “unknown ISBN” in the pending table (badge/warning)
  - [] Provide a CTA/modal to create a new book when ISBN is unknown
  - [] Wire bulk “Add valid rows” and submit flow to persistence once DB is connected

Validation
  - [x] Ensure for override that author royalty is not greater than (90-100%, or whatevr
       makes the most sense) the publisher revenue (unless there are cases where this
       is somehow possiboe, in which case, alert publisher).
  - [] Update parsing to account for dollar sign