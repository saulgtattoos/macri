// Calendar dates in the device's own time zone. toISOString() is UTC, which in
// California turns into tomorrow after 5 PM.
const pad = (n) => String(n).padStart(2, '0')

export const localDateISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const localMonthISO = (d = new Date()) => localDateISO(d).slice(0, 7)
