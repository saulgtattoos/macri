// Business dates are always in the studio's time zone (America/Los_Angeles), whatever
// the device's own setting. toISOString() is UTC, which in California turns into
// tomorrow after 5 PM.
export const BUSINESS_TIME_ZONE = 'America/Los_Angeles'

const PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
})

// 'YYYY-MM-DD' for the given moment, in Los Angeles.
export const localDateISO = (d = new Date()) => PARTS.format(d)
export const localMonthISO = (d = new Date()) => localDateISO(d).slice(0, 7)

// Calendar arithmetic on 'YYYY-MM-DD' strings (no time zone involved).
export function addDaysISO(iso, days) {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return t.toISOString().slice(0, 10)
}

// 0 = Monday ... 6 = Sunday, for a 'YYYY-MM-DD' string.
export function weekdayMondayFirst(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}
