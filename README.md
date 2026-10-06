# THRIVIKRAM CATERINGS — READY TO TEST

A local-first catering booking website for Thrivikram Caterings, Devan/Kadapa.

## What is included
- Premium responsive customer website
- Event selection: marriage, engagement, birthday, bachelor, college, freshers, corporate, traditional, family, reception, general catering and other
- Andhra/Kadapa-inspired menu suggestions
- Dish-by-dish selection
- Catering request form
- Manual confirmation flow — NO online payment
- Two phone numbers + WhatsApp buttons
- Private owner dashboard
- Admin booking status management
- Live visitor count (heartbeat based)
- CSV export
- Local persistent JSON data store; no Firebase, Supabase, Render or other hosted service required
- Poster supplied by the owner included as a brand reference image

## Run on Windows
1. Install Node.js 20+.
2. Open Command Prompt in this folder.
3. Run:
   npm install
   npm start
4. Open http://localhost:3000
5. Admin: http://localhost:3000/admin

## Admin credentials
Username: thrivikram
Password: theivikram123

You can change them with environment variables:
ADMIN_USER=yourname
ADMIN_PASSWORD=yourpassword

## Customer numbers
9989311579
8523011579

## Data
Booking data is saved in `data/store.json`. Back it up before moving the project to another computer.

## Important
This is intentionally designed as a local/test-ready release. It does not process payments and does not depend on an external database or hosting provider. For public production deployment, add HTTPS, a real database, rate limiting and secure environment secrets.
