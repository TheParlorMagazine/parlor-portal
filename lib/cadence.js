// Alternating bi-weekly cadence for the Newsletter and the Bi-weekly Digest.
// Both crons run every Monday; each one only fires on its half of the rotation,
// keyed off the ISO week number, so subscribers get one or the other each week.
//   even ISO weeks → Bi-weekly Digest (portal activity)
//   odd  ISO weeks → Newsletter (public issue)

export function isoWeekNumber(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = (date.getUTCDay() + 6) % 7          // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3)    // nearest Thursday
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  return 1 + Math.round(((date - firstThursday) / 86400000 - 3 + firstDayNum) / 7)
}

export function isDigestWeek(d = new Date()) { return isoWeekNumber(d) % 2 === 0 }
export function isNewsletterWeek(d = new Date()) { return isoWeekNumber(d) % 2 === 1 }
