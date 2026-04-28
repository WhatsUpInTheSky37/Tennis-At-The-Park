-- Seed the "When Salisbury Was the Tennis Capital" article as a DRAFT.
-- Attaches to the first admin user. Idempotent via ON CONFLICT (slug).
-- If no admin user exists yet at deploy time, this is a no-op.

INSERT INTO "articles" (
  "id", "author_id", "slug", "title", "excerpt", "body", "cover_image",
  "published", "published_at", "created_at", "updated_at"
)
SELECT
  'seed_salisbury_indoor',
  (SELECT "id" FROM "users" WHERE "is_admin" = true ORDER BY "created_at" ASC LIMIT 1),
  'when-salisbury-was-the-tennis-capital',
  $$When Salisbury Was the Tennis Capital$$,
  $$For a stretch in the 1970s, the Wicomico Youth & Civic Center hosted the U.S. National Indoor Championships and the biggest names in tennis. Here's how it happened — and how it ended.$$,
  $$Hard to believe now when you drive past the Wicomico Youth & Civic Center, but for a stretch in the 1970s that building was where the biggest names in tennis showed up every February. The **U.S. National Indoor Championships** moved to Salisbury back in 1964 — and stayed for over a decade.

It got there thanks to a man named **Bill Riordan**.

Riordan was the son of a New York department store president. He moved to Salisbury in 1954, bought into a small clothing business, and ended up starting a junior tennis program from scratch with about five kids. From that little beginning, he grew into one of the loudest, most successful tennis promoters in the country.

He was a showman. The buttoned-up tennis establishment didn't like him much — he was flashy, he didn't follow their rules — but he packed the Civic Center every year. He brought them all to the Eastern Shore: Rod Laver, Roy Emerson, Stan Smith, Chuck McKinley, Arthur Ashe. He discovered Ilie Nastase. He brought along a 19-year-old **Jimmy Connors** and pushed him to be controversial, which Connors took to right away.

And the matches were the real deal.

- The **1971 final** went five sets — Clark Graebner saved two match points to beat Cliff Richey 2-6, 7-6, 1-6, 7-6, 6-0 for the $9,000 first prize. Real money in 1971.
- **Stan Smith** took the 1972 title, beating Nastase in four sets.
- **Connors** won it in 1973 over Karl Meiler in four sets — his fourth title of the year and the tenth of his career.

Connors was Riordan's guy, and Riordan rode that all the way to Vegas. After Connors won Wimbledon and the U.S. Open in 1974, Riordan set him up in a "winner-take-all" challenge match against Rod Laver, televised nationally on CBS from Las Vegas in February 1975. That was a Salisbury, Maryland promoter pulling those strings.

Picture it — February on the Eastern Shore, freezing outside, and inside the Civic Center you've got the world No. 1 hitting a two-handed backhand a few feet from your seat. People drove down from Baltimore for a few days as a sort of midwinter getaway. Hotels packed. Restaurants slammed. National TV crews rolling into a town most people couldn't find on a map.

Then 1977 came, and it was over.

Memphis cotton merchant **Billy Dunavant Jr.** had bought the Memphis Athletic Club in 1974 and spent $7 million turning it into the Racquet Club of Memphis. They wanted the tournament — and Memphis had the money, the new building, and the connections. In 1977 the U.S. National Indoor Tennis Championships moved from Salisbury to Memphis, and the prize money jumped to **$220,000** — from $9,000 to $220,000 in basically one move. To make sure no one missed the news, Bjorn Borg committed to playing in the first Memphis tournament, giving Mid-South tennis a star-studded foundation for years to come. Borg, McEnroe, Connors, Edberg, Agassi, Sampras, Lendl, Courier — they all showed up in Memphis over the next twenty-plus years.

Salisbury got nothing. After 1976, big-time tennis in Maryland was basically down to a one-night-a-year exhibition. The Civic Center went back to high school graduations and Harlem Globetrotters games. The pros stopped coming. The TV trucks stopped coming. The Baltimore tennis crowd that used to drive down every February had nowhere to drive to.

Riordan himself moved on to other things — even tried his hand at promoting skateboarding — then drifted out of sports. He died in 1991 at 71 in Naples, Florida.

Would love to hear from anyone who knew him, or knows more about the matches down there at the Civic Center.

---

**Sources**

Salisbury tournament history:
https://en.wikipedia.org/wiki/1971_U.S._National_Indoor_Tennis_Championships
https://en.wikipedia.org/wiki/1972_U.S._National_Indoor_Tennis_Championships
https://en.wikipedia.org/wiki/1973_U.S._National_Indoor_Tennis_Championships
https://en.wikipedia.org/wiki/U.S._National_Indoor_Championships

Bill Riordan:
https://www.baltimoresun.com/1991/01/23/tennis-promoter-bill-riordan-former-salisbury-resident-is-dead-at-71/
https://www.baltimoresun.com/1991/01/24/local-tennis-fans-lost-a-big-time-friend-in-riordan/$$,
  NULL,
  false,
  NULL,
  NOW(),
  NOW()
WHERE EXISTS (SELECT 1 FROM "users" WHERE "is_admin" = true)
ON CONFLICT ("slug") DO NOTHING;
