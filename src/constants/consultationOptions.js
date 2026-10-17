// Shared by the owner consultation wizard and the client form: choices, styles and estimate
// rounding. One copy, so both forms always offer the same options.

export const REFERRAL_OPTIONS  = ['Instagram', 'Google', 'Word of Mouth', 'Existing Client', 'Other']
export const SOCIAL_PLATFORMS  = ['Instagram', 'TikTok', 'Facebook']
export const STYLE_OPTIONS     = ['Watercolor', 'Black and Gray Realism', 'Sketch Art', 'Abstract', 'Stippled Shading', 'Color Realism', 'Black and Gray Portrait', 'Other']
export const COLOR_OPTIONS     = ['Full Color', 'Limited Color', 'Black and Gray']
export const ORIENT_OPTIONS    = ['Vertical', 'Horizontal', 'Wrapping', 'Flexible']
export const MUSIC_OPTIONS     = ['Hip Hop', 'Lo-Fi', 'Rock', 'R&B', 'Latin', 'Country', 'Silence', 'Other']
export const SIZE_OPTIONS      = ['Small (1 to 3 inches)', 'Medium (3.5 to 6 inches)', 'Large (6.6 inches and above)']
export const EST_STYLE_OPTIONS = ['Watercolor', 'Black and Gray Realism', 'Color Realism', 'Black and Gray Portrait', 'Stippled Shading', 'Per Session', 'Fine Line', 'Simple Design']
export const HOURLY_STYLES     = ['Watercolor', 'Black and Gray Realism', 'Color Realism', 'Black and Gray Portrait', 'Stippled Shading']
export const LABEL_STYLE = {
  display: 'block',
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  color: '#7a786f',
  marginBottom: 6,
  letterSpacing: '0.04em',
}
export const INPUT_STYLE = {
  width: '100%',
  background: '#1e1e1b',
  border: '1px solid #2a2a27',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#e8e6df',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
}

export const roundTo50 = (n) => Math.ceil(n / 50) * 50
export const shopMin   = (n) => Math.max(100, n)
