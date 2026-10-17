// Consultation questions shared by the owner wizard and the client form (one copy of each step).
import { REFERRAL_OPTIONS, MUSIC_OPTIONS, SOCIAL_PLATFORMS, STYLE_OPTIONS, COLOR_OPTIONS, ORIENT_OPTIONS, SIZE_OPTIONS, LABEL_STYLE, INPUT_STYLE } from '../../constants/consultationOptions'
import { Field, PillToggle } from './FormParts'

export function ClientInfoStep({ formData, set, nameError }) {
  return (
    <>
      <Field label="Full Name">
        <input
          type="text"
          value={formData.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Client full name"
          style={{
            ...INPUT_STYLE,
            border: nameError ? '1px solid #f09595' : '1px solid #2a2a27',
          }}
        />
        {nameError && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#f09595', marginTop: 4, display: 'block' }}>
            Name is required
          </span>
        )}
      </Field>
      <Field label="Phone Number">
        <input
          type="tel"
          value={formData.phone}
          onChange={e => set('phone', e.target.value)}
          placeholder="(916) 000-0000"
          style={INPUT_STYLE}
        />
      </Field>
      <Field label="Email Address">
        <input
          type="email"
          value={formData.email}
          onChange={e => set('email', e.target.value)}
          placeholder="client@email.com"
          style={INPUT_STYLE}
        />
      </Field>
      <Field label="Referral Source">
        <PillToggle
          options={REFERRAL_OPTIONS}
          value={formData.referralSource}
          onChange={v => set('referralSource', v)}
        />
      </Field>
      <Field label="First Time Client">
        <PillToggle
          options={['Yes', 'No']}
          value={formData.firstTimeClient === null ? '' : formData.firstTimeClient ? 'Yes' : 'No'}
          onChange={v => set('firstTimeClient', v === 'Yes')}
        />
      </Field>
      <div style={{ marginBottom: 20 }}>
        <span style={LABEL_STYLE}>Social Media</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0 }}>
            <PillToggle
              options={SOCIAL_PLATFORMS}
              value={formData.socialPlatform}
              onChange={v => set('socialPlatform', v)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <span style={LABEL_STYLE}>Handle or profile link</span>
            <input
              type="text"
              value={formData.socialHandle}
              onChange={e => set('socialHandle', e.target.value)}
              placeholder="e.g. @saulgtattoos"
              style={INPUT_STYLE}
            />
          </div>
        </div>
      </div>
    </>
  )
}

export function VisionStep({ formData, set, fileInputRef, imageURLs, addImages, removeImage, updateImageNote, isDragging, setIsDragging }) {
  return (
    <>
      <Field label="Tattoo Concept and Description">
        <textarea
          value={formData.concept}
          onChange={e => set('concept', e.target.value)}
          placeholder="Describe the tattoo idea..."
          style={{ ...INPUT_STYLE, minHeight: 80, resize: 'vertical' }}
        />
      </Field>
      <Field label="Inspiration Images Note">
        <input
          type="text"
          value={formData.inspirationNotes}
          onChange={e => set('inspirationNotes', e.target.value)}
          placeholder="Reference links or notes"
          style={INPUT_STYLE}
        />
      </Field>
      <Field label="Cover Up">
        <PillToggle
          options={['Yes', 'No']}
          value={formData.isCoverUp ? 'Yes' : 'No'}
          onChange={v => set('isCoverUp', v === 'Yes')}
        />
      </Field>
      {formData.isCoverUp && (
        <Field label="Cover Up Description">
          <textarea
            value={formData.coverUpDescription}
            onChange={e => set('coverUpDescription', e.target.value)}
            placeholder="What is being covered..."
            style={{ ...INPUT_STYLE, minHeight: 60, resize: 'vertical' }}
          />
        </Field>
      )}
      <Field label="Meaningful to Client">
        <PillToggle
          options={['Yes', 'No']}
          value={formData.isMeaningful ? 'Yes' : 'No'}
          onChange={v => set('isMeaningful', v === 'Yes')}
        />
      </Field>
      {formData.isMeaningful && (
        <Field label="Meaning or Story">
          <textarea
            value={formData.meaningStory}
            onChange={e => set('meaningStory', e.target.value)}
            placeholder="What does this mean to them..."
            style={{ ...INPUT_STYLE, minHeight: 60, resize: 'vertical' }}
          />
        </Field>
      )}

      {/* Visual Reference Manager */}
      <div style={{ marginBottom: 20 }}>
        <span style={{ ...LABEL_STYLE, marginBottom: 10 }}>Visual References</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => { addImages(e.target.files); e.target.value = '' }}
        />
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragEnter={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => {
            e.preventDefault()
            setIsDragging(false)
            addImages(e.dataTransfer.files)
          }}
          style={{
            border: isDragging
              ? '1.5px dashed rgba(201,169,110,0.5)'
              : '1.5px dashed rgba(201,169,110,0.2)',
            borderRadius: 12,
            padding: 24,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.15s',
            marginBottom: (formData.referenceImages?.length > 0) ? 14 : 0,
          }}
        >
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#7a786f' }}>
            Drag reference photos here or tap to browse
          </span>
        </div>
        {(formData.referenceImages || []).map(img => (
          <div
            key={img.id}
            style={{
              display: 'flex',
              gap: 12,
              marginBottom: 12,
              alignItems: 'flex-start',
            }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img
                src={imageURLs.current[img.id]}
                alt={img.fileName}
                style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', display: 'block' }}
              />
              <button
                onClick={() => removeImage(img.id)}
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.7)',
                  border: 'none',
                  color: '#e8e6df',
                  fontSize: 11,
                  lineHeight: 1,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ flex: 1 }}>
              <span style={LABEL_STYLE}>What elements do you like about this reference?</span>
              <textarea
                value={img.note}
                onChange={e => updateImageNote(img.id, e.target.value)}
                style={{ ...INPUT_STYLE, minHeight: 60, resize: 'vertical' }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export function DesignStep({ formData, set }) {
  return (
    <>
      <Field label="Placement">
        <input
          type="text"
          value={formData.placement}
          onChange={e => set('placement', e.target.value)}
          placeholder="Where on the body"
          style={INPUT_STYLE}
        />
      </Field>
      <Field label="Approximate Size">
        <PillToggle
          options={SIZE_OPTIONS}
          value={formData.size}
          onChange={v => set('size', v)}
        />
      </Field>
      <Field label="Style">
        <PillToggle
          options={STYLE_OPTIONS}
          value={formData.style}
          onChange={v => set('style', v)}
          multi
        />
      </Field>
      <Field label="Color Profile">
        <PillToggle
          options={COLOR_OPTIONS}
          value={formData.colorProfile}
          onChange={v => set('colorProfile', v)}
        />
      </Field>
      <Field label="Orientation">
        <PillToggle
          options={ORIENT_OPTIONS}
          value={formData.orientation}
          onChange={v => set('orientation', v)}
        />
      </Field>
      <Field label="Additional Design Notes">
        <textarea
          value={formData.designNotes}
          onChange={e => set('designNotes', e.target.value)}
          placeholder="Any other design details..."
          style={{ ...INPUT_STYLE, minHeight: 60, resize: 'vertical' }}
        />
      </Field>
    </>
  )
}

// The Experience: the client page passes its privacy note as `notice`.
export function ExperienceStep({ formData, set, notice }) {
  return (
    <>
      {notice}
      <Field label="Shows or Movies for Studio TV">
        <input
          type="text"
          value={formData.tvShows}
          onChange={e => set('tvShows', e.target.value)}
          placeholder="What they like to watch"
          style={INPUT_STYLE}
        />
      </Field>
      <Field label="Comfort Notes">
        <textarea
          value={formData.comfortNotes}
          onChange={e => set('comfortNotes', e.target.value)}
          placeholder="Breaks, water, snacks, sensitivities..."
          style={{ ...INPUT_STYLE, minHeight: 60, resize: 'vertical' }}
        />
      </Field>
      <div style={{ marginBottom: 20 }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: '#c9a96e',
          letterSpacing: '0.08em',
          display: 'block',
          marginBottom: 8,
        }}>TATTOO EXPERIENCE</span>
        <PillToggle
          options={['None', '1 to 5', '5 or more']}
          value={formData.tattooCount}
          onChange={v => set('tattooCount', v)}
        />
      </div>
      <div style={{ marginBottom: 20 }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: '#c9a96e',
          letterSpacing: '0.08em',
          display: 'block',
          marginBottom: 8,
        }}>SITTING ENDURANCE</span>
        <PillToggle
          options={['2 hours', '4 hours', '6 hours', 'Full Day']}
          value={formData.sittingEndurance}
          onChange={v => set('sittingEndurance', v)}
        />
      </div>
      {/* Music closes the personal questions on a lighter note. */}
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: '#e8e6df', margin: '8px 0 16px' }}>
        One last thing before we wrap up! What kind of music do you enjoy listening to? Any favorite artists, genres, or playlists? I want you to feel comfortable during your session, and music is part of that experience.
      </p>
      <Field label="Music Genre">
        <PillToggle
          options={MUSIC_OPTIONS}
          value={formData.musicGenre}
          onChange={v => set('musicGenre', v)}
          multi
        />
      </Field>
      <Field label="Specific Artists or Playlists">
        <input
          type="text"
          value={formData.playlist}
          onChange={e => set('playlist', e.target.value)}
          placeholder="Artists, album, playlist name"
          style={INPUT_STYLE}
        />
      </Field>
    </>
  )
}

// Health and Skin. `notice`: the page's note at the top. `ownerAssessment`: the artist's medical
// clearance, passed only by the owner wizard (the client form never shows it).
export function HealthStep({ formData, set, notice, ownerAssessment }) {
  return (
    <>
      {notice}
      <Field label="Allergies">
        <input
          type="text"
          value={formData.allergies}
          onChange={e => set('allergies', e.target.value)}
          placeholder="Known allergies"
          style={INPUT_STYLE}
        />
      </Field>
      <Field label="Skin Conditions">
        <input
          type="text"
          value={formData.skinConditions}
          onChange={e => set('skinConditions', e.target.value)}
          placeholder="Eczema, psoriasis, keloids, etc."
          style={INPUT_STYLE}
        />
      </Field>
      <Field label="Medications">
        <input
          type="text"
          value={formData.medications}
          onChange={e => set('medications', e.target.value)}
          placeholder="Blood thinners, topicals, etc."
          style={INPUT_STYLE}
        />
      </Field>
      <Field label="Previous Reactions">
        <textarea
          value={formData.previousReactions}
          onChange={e => set('previousReactions', e.target.value)}
          placeholder="Any past reactions to ink or healing issues..."
          style={{ ...INPUT_STYLE, minHeight: 60, resize: 'vertical' }}
        />
      </Field>
      {ownerAssessment}
    </>
  )
}

// Client Summary. `showComfortNotes`: the owner wizard also lists comfort notes. `actions`: the
// page's own button at the end (owner: export; client: Ready to Finalize).
export function SummaryStep({ formData, imageURLs, showComfortNotes = false, actions }) {
  const f = formData

  const SECTION_CARD = {
    background: 'rgba(201,169,110,0.04)',
    border: '1px solid rgba(201,169,110,0.12)',
    borderRadius: 12,
    padding: '16px 18px',
    marginBottom: 16,
  }
  const SECTION_LABEL = {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: '#c9a96e',
    letterSpacing: '0.08em',
    marginBottom: 10,
    display: 'block',
  }
  const ROW_KEY = {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: '#7a786f',
    minWidth: 120,
    flexShrink: 0,
  }
  const ROW_VAL = {
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    color: '#e8e6df',
    lineHeight: 1.4,
  }

  function row(label, value) {
    if (!value) return null
    return (
      <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
        <span style={ROW_KEY}>{label}</span>
        <span style={ROW_VAL}>{value}</span>
      </div>
    )
  }

  return (
    <>
      <div style={SECTION_CARD}>
        <span style={SECTION_LABEL}>PROJECT OVERVIEW</span>
        {row('Client', f.name)}
        {row('Concept', f.concept)}
        {row('Placement', f.placement)}
        {row('Size', f.size)}
        {row('Style', f.style?.length ? f.style.join(', ') : '')}
        {row('Color Profile', f.colorProfile)}
        {row('Orientation', f.orientation)}
      </div>

      {(f.referenceImages?.length > 0) && (
        <div style={SECTION_CARD}>
          <span style={SECTION_LABEL}>REFERENCE GALLERY</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {f.referenceImages.map(img => (
              <div key={img.id} style={{ width: 120 }}>
                <img
                  src={imageURLs.current[img.id]}
                  alt={img.fileName}
                  style={{ width: 120, height: 120, borderRadius: 8, objectFit: 'cover', display: 'block', marginBottom: 6 }}
                />
                {img.note && (
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#7a786f', lineHeight: 1.4, display: 'block' }}>
                    {img.note}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Who the client is in the chair: music first, then comfort and pace. */}
      {(f.musicGenre?.length > 0 || f.playlist || f.tvShows || f.tattooCount || f.sittingEndurance || (showComfortNotes && f.comfortNotes)) && (
        <div style={SECTION_CARD}>
          <span style={SECTION_LABEL}>SESSION EXPERIENCE</span>
          {row('Music', f.musicGenre?.length ? f.musicGenre.join(', ') : '')}
          {row('Artists or Playlists', f.playlist)}
          {row('Studio TV', f.tvShows)}
          {row('Tattoo Experience', f.tattooCount)}
          {row('Sitting Endurance', f.sittingEndurance)}
          {showComfortNotes && row('Comfort Notes', f.comfortNotes)}
        </div>
      )}

      <div style={SECTION_CARD}>
        <span style={SECTION_LABEL}>PRICING AND DEPOSIT TERMS</span>
        {row('Pricing Type', f.pricingType)}
        {f.estimatedTotal && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
            <span style={ROW_KEY}>Estimated Total</span>
            <span style={ROW_VAL}>${f.estimatedTotal}</span>
          </div>
        )}
        {row('Deposit Amount', f.depositAmount)}
        {row('Deposit Status', f.depositStatus)}
        {row('Appointment', f.appointmentDate)}
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          color: '#7a786f',
          lineHeight: 1.7,
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid rgba(122,120,111,0.15)',
        }}>
          This estimate is a ballpark figure based on size and your specific style choice. Simpler designs may be more efficient, while complex and intricate pieces may require more time. This serves as a flexible guide to provide a clear idea of the investment involved.
        </div>
      </div>

      {actions}
    </>
  )
}

// Studio pricing information (published policy text), the same on both pages.
export function StudioPricingInfo({ cardStyle, labelStyle }) {
  return (
      <div style={cardStyle}>
        <div style={labelStyle}>STUDIO PRICING INFO</div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#7a786f', lineHeight: 1.8 }}>
          <p style={{ margin: '0 0 10px 0' }}>
            Saul charges $250 per hour. As a general guideline, plan approximately one hour for every one square inch of tattoo area.
          </p>
          <p style={{ margin: '0 0 10px 0' }}>
            Consultations are always complimentary.
          </p>
          <p style={{ margin: 0 }}>
            Tattoo sessions are considered full day events. Duration depends on design complexity and size. Please reserve your entire day and avoid scheduling any other commitments on your session date.
          </p>
        </div>
      </div>
  )
}
