import { useState, useEffect, useRef } from 'react'

const uid = () => crypto.randomUUID()
const now = () => new Date().toISOString()
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''

const STYLES = [
  'Watercolor',
  'Black and Gray',
  'Black and Gray Portrait',
  'Sketch Art',
  'Abstract',
  'Stippled Shading',
  'Color Realism',
]

const PLATFORMS = ['Instagram', 'Facebook', 'TikTok']

const S = {
  page: {
    minHeight: '100vh',
    background: '#0e0e0d',
    color: '#e8e6df',
    fontFamily: 'Inter, sans-serif',
    padding: '32px 24px',
    maxWidth: 900,
    margin: '0 auto',
  },
  panelLabel: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 10,
    color: '#c9a96e',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  h1: {
    fontFamily: 'Syne, sans-serif',
    fontSize: 28,
    fontWeight: 700,
    color: '#e8e6df',
    margin: 0,
  },
  subtitle: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    color: '#7a786f',
    marginTop: 4,
  },
  tabRow: {
    display: 'flex',
    gap: 8,
    marginTop: 28,
    marginBottom: 20,
  },
  tab: (active) => ({
    fontFamily: 'Syne, sans-serif',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 18px',
    borderRadius: 8,
    border: active ? '1.5px solid #c9a96e' : '1.5px solid #2a2a26',
    background: active ? 'rgba(201,169,110,0.08)' : '#161614',
    color: active ? '#c9a96e' : '#7a786f',
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),
  chip: (active) => ({
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 11,
    padding: '5px 12px',
    borderRadius: 20,
    border: active ? '1px solid #c9a96e' : '1px solid #2a2a26',
    background: active ? 'rgba(201,169,110,0.1)' : 'transparent',
    color: active ? '#c9a96e' : '#7a786f',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  }),
  btn: {
    fontFamily: 'Syne, sans-serif',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid #c9a96e',
    background: 'rgba(201,169,110,0.1)',
    color: '#c9a96e',
    cursor: 'pointer',
  },
  btnFull: (disabled) => ({
    fontFamily: 'Syne, sans-serif',
    fontSize: 14,
    fontWeight: 600,
    padding: '12px 24px',
    borderRadius: 8,
    border: disabled ? '1px solid #2a2a26' : '1px solid #c9a96e',
    background: disabled ? '#161614' : 'rgba(201,169,110,0.1)',
    color: disabled ? '#7a786f' : '#c9a96e',
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: '100%',
    transition: 'all 0.15s',
  }),
  btnSm: (color = '#c9a96e') => ({
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 11,
    padding: '4px 10px',
    borderRadius: 6,
    border: `1px solid ${color}33`,
    background: `${color}11`,
    color,
    cursor: 'pointer',
  }),
  btnDanger: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 11,
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid #f0959533',
    background: '#f0959511',
    color: '#f09595',
    cursor: 'pointer',
  },
  badge: (color) => ({
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 4,
    background: `${color}18`,
    color,
    border: `1px solid ${color}33`,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  }),
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 10,
    color: '#7a786f',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  input: {
    background: '#0e0e0d',
    border: '1px solid #2a2a26',
    borderRadius: 6,
    color: '#e8e6df',
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    padding: '7px 10px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  textarea: {
    background: '#0e0e0d',
    border: '1px solid #2a2a26',
    borderRadius: 6,
    color: '#e8e6df',
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    padding: '7px 10px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
    minHeight: 80,
  },
  select: {
    background: '#0e0e0d',
    border: '1px solid #2a2a26',
    borderRadius: 6,
    color: '#e8e6df',
    fontFamily: 'Inter, sans-serif',
    fontSize: 13,
    padding: '7px 10px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  uploadZone: (hover) => ({
    border: `2px dashed ${hover ? '#c9a96e' : '#2a2a26'}`,
    borderRadius: 10,
    padding: '40px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
    background: '#161614',
    marginBottom: 20,
  }),
  captionPanel: {
    background: '#1e1e1b',
    borderRadius: 10,
    padding: 20,
    lineHeight: 1.7,
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    color: '#e8e6df',
    whiteSpace: 'pre-wrap',
    minHeight: 120,
  },
  card: {
    background: '#161614',
    border: '1px solid #1e1e1b',
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  cardExpanded: {
    background: '#1e1e1b',
    border: '1px solid #2a2a26',
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  stepLabel: {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 10,
    color: '#7a786f',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 10,
    marginTop: 24,
  },
}

// ─── GenerateTab ──────────────────────────────────────────────────────────────
function GenerateTab({ clients }) {
  const [photoFile, setPhotoFile] = useState(null)
  const [photoURL, setPhotoURL] = useState(null)
  const [photoB64, setPhotoB64] = useState(null)
  const [uploadHover, setUploadHover] = useState(false)
  const [style, setStyle] = useState('Watercolor')
  const [concept, setConcept] = useState('')
  const [meaning, setMeaning] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientTag, setClientTag] = useState('')
  const [notes, setNotes] = useState('')
  const [hashtags, setHashtags] = useState(['', '', '', '', ''])
  const [hashtagsSaved, setHashtagsSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState(null)
  const [results, setResults] = useState(null)
  const [activePlatform, setActivePlatform] = useState('Instagram')
  const [copiedPlatform, setCopiedPlatform] = useState(null)
  const [draftSaved, setDraftSaved] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('macri_content_hashtags')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length === 5) setHashtags(parsed)
      } catch (_) {}
    }
  }, [])

  const handleFileChange = (file) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPhotoURL(url)
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      const b64 = e.target.result.split(',')[1]
      setPhotoB64(b64)
    }
    reader.readAsDataURL(file)
  }

  const clearPhoto = () => {
    if (photoURL) URL.revokeObjectURL(photoURL)
    setPhotoFile(null)
    setPhotoURL(null)
    setPhotoB64(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClientChange = (e) => {
    const id = e.target.value
    setClientId(id)
    if (id) {
      const client = clients.find((c) => c.id === id)
      if (client && client.instagramTag) setClientTag(client.instagramTag)
    }
  }

  const handleHashtagChange = (i, val) => {
    const updated = [...hashtags]
    updated[i] = val
    setHashtags(updated)
  }

  const saveDefaultHashtags = () => {
    localStorage.setItem('macri_content_hashtags', JSON.stringify(hashtags))
    setHashtagsSaved(true)
    setTimeout(() => setHashtagsSaved(false), 2000)
  }

  const parseResponse = (text) => {
    const igMarker = '[PLATFORM: Instagram]'
    const fbMarker = '[PLATFORM: Facebook]'
    const ttMarker = '[PLATFORM: TikTok]'
    const igIdx = text.indexOf(igMarker)
    const fbIdx = text.indexOf(fbMarker)
    const ttIdx = text.indexOf(ttMarker)
    const instagram = igIdx !== -1
      ? text.slice(igIdx + igMarker.length, fbIdx !== -1 ? fbIdx : undefined).trim()
      : ''
    const facebook = fbIdx !== -1
      ? text.slice(fbIdx + fbMarker.length, ttIdx !== -1 ? ttIdx : undefined).trim()
      : ''
    const tiktok = ttIdx !== -1
      ? text.slice(ttIdx + ttMarker.length).trim()
      : ''
    return { instagram, facebook, tiktok }
  }

  const handleGenerate = async () => {
    if (!photoB64 || !photoFile) return
    setLoading(true)
    setApiError(null)
    setResults(null)

    const apiKey = import.meta.env.VITE_ANTHROPIC_KEY
    const systemPrompt = `You are a social media content assistant for Saul Gutierrez, a tattoo artist in Elk Grove CA specializing in Watercolor, Black and Gray, Black and Gray Portrait, Sketch Art, Abstract, Stippled Shading, and Color Realism tattoos. Generate three separate captions for the same tattoo post tailored to Instagram, Facebook, and TikTok. Each caption must follow the required format below. Use zero hyphens or dashes anywhere. Write all ranges as X to Y. Keep tone warm, personal, and professional. Never mention sponsorships or paid partnerships.

Required format:

[PLATFORM: Instagram]
[Style name] tattoo title and short description of the tattoo.

To book an appointment, the booking link is at the top of my Instagram bio.

Thank you for your trust [clientTag].

Studio: Private Studio
Client: [clientTag]

[5 hashtags]

[PLATFORM: Facebook]
Longer warm conversational version of the caption. No hashtags. Personal tone. Include booking call to action directing to Instagram bio link.

[PLATFORM: TikTok]
Short punchy caption optimized for TikTok. Energetic tone. Include 5 hashtags. Max 150 words.`

    const userText = `Style: ${style}. Concept: ${concept}. Meaning: ${meaning}. Client tag: ${clientTag}. Consultation notes: ${notes}. Hashtags to use: ${hashtags.join(' ')}. Generate all three platform captions now.`

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: photoFile.type, data: photoB64 },
              },
              { type: 'text', text: userText },
            ],
          }],
        }),
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.error?.message || 'API request failed')
      }

      const data = await resp.json()
      const text = data.content?.[0]?.text || ''
      setResults(parseResponse(text))
      setActivePlatform('Instagram')
    } catch (e) {
      setApiError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (platform) => {
    const text = platform === 'Instagram' ? results.instagram
      : platform === 'Facebook' ? results.facebook
      : results.tiktok
    navigator.clipboard.writeText(text).catch(() => {})
    setCopiedPlatform(platform)
    setTimeout(() => setCopiedPlatform(null), 2000)
  }

  const handleSaveDraft = () => {
    if (!results) return
    const client = clientId ? clients.find((c) => c.id === clientId) : null
    const draft = {
      id: uid(),
      clientId: clientId || null,
      clientName: client ? (client.fullName || client.name || null) : null,
      style,
      concept,
      meaning,
      clientTag,
      instagramCaption: results.instagram,
      facebookCaption: results.facebook,
      tiktokCaption: results.tiktok,
      hashtags,
      createdAt: now(),
    }

    const existing = localStorage.getItem('macri_content_drafts')
    const drafts = existing ? JSON.parse(existing) : []
    drafts.push(draft)
    localStorage.setItem('macri_content_drafts', JSON.stringify(drafts))

    if (clientId) {
      const rawClients = localStorage.getItem('macri_crm_clients')
      if (rawClients) {
        const allClients = JSON.parse(rawClients)
        const updated = allClients.map((c) =>
          c.id === clientId
            ? { ...c, contentDrafts: [...(c.contentDrafts || []), draft.id] }
            : c
        )
        localStorage.setItem('macri_crm_clients', JSON.stringify(updated))
      }
    }

    setDraftSaved(true)
    setTimeout(() => setDraftSaved(false), 3000)
  }

  const activeCaption = results
    ? activePlatform === 'Instagram' ? results.instagram
      : activePlatform === 'Facebook' ? results.facebook
      : results.tiktok
    : ''

  const isDisabled = !photoB64 || loading

  return (
    <div>
      {/* Step 1: Photo Upload */}
      <p style={S.stepLabel}>Step 1: Photo Upload</p>

      {photoURL ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
          <img
            src={photoURL}
            alt="Tattoo preview"
            style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid #2a2a26' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#e8e6df' }}>
              {photoFile.name}
            </span>
            <button style={S.btnSm('#f09595')} onClick={clearPhoto}>Clear Photo</button>
          </div>
        </div>
      ) : (
        <div
          style={S.uploadZone(uploadHover)}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setUploadHover(true) }}
          onDragLeave={() => setUploadHover(false)}
          onDrop={(e) => { e.preventDefault(); setUploadHover(false); handleFileChange(e.dataTransfer.files[0]) }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            style={{ display: 'none' }}
            onChange={(e) => handleFileChange(e.target.files[0])}
          />
          <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: uploadHover ? '#c9a96e' : '#7a786f', margin: 0 }}>
            Upload a photo of the tattoo.
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#7a786f', marginTop: 6, marginBottom: 0 }}>
            JPEG and PNG supported
          </p>
        </div>
      )}

      {/* Step 2: Tattoo Details */}
      <p style={S.stepLabel}>Step 2: Tattoo Details</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 4 }}>
        <div style={S.field}>
          <span style={S.label}>Style</span>
          <select style={S.select} value={style} onChange={(e) => setStyle(e.target.value)}>
            {STYLES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div style={S.field}>
          <span style={S.label}>Tattoo Concept</span>
          <input
            type="text"
            style={S.input}
            placeholder="butterfly, wolf, family portrait"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
          />
        </div>

        <div style={{ ...S.field, gridColumn: '1 / -1' }}>
          <span style={S.label}>Meaning Behind the Tattoo</span>
          <textarea
            style={S.textarea}
            placeholder="what this piece means to the client"
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
          />
        </div>

        <div style={S.field}>
          <span style={S.label}>Link to Client (optional)</span>
          <select style={S.select} value={clientId} onChange={handleClientChange}>
            <option value="">No client linked</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.fullName || c.name}</option>
            ))}
          </select>
        </div>

        <div style={S.field}>
          <span style={S.label}>Client Instagram Tag</span>
          <input
            type="text"
            style={S.input}
            placeholder="@clienthandle"
            value={clientTag}
            onChange={(e) => setClientTag(e.target.value)}
          />
        </div>

        <div style={{ ...S.field, gridColumn: '1 / -1' }}>
          <span style={S.label}>Consultation Notes</span>
          <textarea
            style={S.textarea}
            placeholder="anything else relevant"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Step 3: Hashtags */}
      <p style={S.stepLabel}>Step 3: Hashtags</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {hashtags.map((tag, i) => (
          <div key={i} style={S.field}>
            <span style={S.label}>Hashtag {i + 1}</span>
            <input
              type="text"
              style={S.input}
              value={tag}
              onChange={(e) => handleHashtagChange(i, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button style={S.btn} onClick={saveDefaultHashtags}>Save as Default Hashtags</button>
        {hashtagsSaved && (
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7aab8f' }}>Saved</span>
        )}
      </div>

      {/* Step 4: Generate */}
      <button style={S.btnFull(isDisabled)} onClick={handleGenerate} disabled={isDisabled}>
        {loading ? 'Writing your captions...' : 'Generate Captions'}
      </button>

      {apiError && (
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#f09595', marginTop: 12 }}>
          {apiError}
        </p>
      )}

      {/* Step 5: Results */}
      {results && (
        <div style={{ marginTop: 32 }}>
          <p style={S.stepLabel}>Step 5: Captions</p>
          <div style={S.tabRow}>
            {PLATFORMS.map((p) => (
              <button key={p} style={S.tab(activePlatform === p)} onClick={() => setActivePlatform(p)}>
                {p}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <div style={S.captionPanel}>{activeCaption}</div>
            <button
              style={{ ...S.btnSm('#c9a96e'), position: 'absolute', top: 12, right: 12 }}
              onClick={() => handleCopy(activePlatform)}
            >
              {copiedPlatform === activePlatform ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button style={{ ...S.btn, marginTop: 16 }} onClick={handleSaveDraft}>
            Save Draft
          </button>
        </div>
      )}

      {/* Save draft toast */}
      {draftSaved && (
        <div style={{
          position: 'fixed',
          bottom: 80,
          right: 24,
          background: '#7aab8f22',
          border: '1px solid #7aab8f',
          color: '#7aab8f',
          borderRadius: 8,
          padding: '10px 16px',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
          zIndex: 999,
        }}>
          Draft saved
        </div>
      )}
    </div>
  )
}

// ─── DraftsTab ────────────────────────────────────────────────────────────────
function DraftsTab() {
  const [drafts, setDrafts] = useState([])
  const [activeFilter, setActiveFilter] = useState('All')
  const [expandedId, setExpandedId] = useState(null)
  const [expandedPlatform, setExpandedPlatform] = useState('Instagram')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [copiedKey, setCopiedKey] = useState(null)

  useEffect(() => {
    const raw = localStorage.getItem('macri_content_drafts')
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        parsed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setDrafts(parsed)
      } catch (_) {}
    }
  }, [])

  const clientNames = [...new Set(drafts.filter((d) => d.clientName).map((d) => d.clientName))]
  const filterOptions = ['All', ...clientNames]
  const filtered = activeFilter === 'All' ? drafts : drafts.filter((d) => d.clientName === activeFilter)

  const toggleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      setExpandedPlatform('Instagram')
    }
  }

  const handleDelete = (e, id) => {
    e.stopPropagation()
    if (confirmDelete === id) {
      const updated = drafts.filter((d) => d.id !== id)
      setDrafts(updated)
      localStorage.setItem('macri_content_drafts', JSON.stringify(updated))
      setConfirmDelete(null)
      if (expandedId === id) setExpandedId(null)
    } else {
      setConfirmDelete(id)
      setTimeout(() => setConfirmDelete(null), 3000)
    }
  }

  const handleCopy = (draft, platform) => {
    const text = platform === 'Instagram' ? draft.instagramCaption
      : platform === 'Facebook' ? draft.facebookCaption
      : draft.tiktokCaption
    navigator.clipboard.writeText(text).catch(() => {})
    const key = `${draft.id}:${platform}`
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  return (
    <div>
      {/* Filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {filterOptions.map((f) => (
          <button key={f} style={S.chip(activeFilter === f)} onClick={() => setActiveFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: '#7a786f', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
          No drafts yet. Generate and save your first caption.
        </p>
      )}

      {filtered.map((draft) => {
        const isExpanded = expandedId === draft.id
        return (
          <div key={draft.id} style={isExpanded ? S.cardExpanded : S.card}>
            {/* Card header row */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', cursor: 'pointer', userSelect: 'none', flexWrap: 'wrap' }}
              onClick={() => toggleExpand(draft.id)}
            >
              <span style={S.badge('#c9a96e')}>{draft.style}</span>

              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#e8e6df', flex: 1, minWidth: 120 }}>
                {draft.concept || 'No concept'}
              </span>

              {draft.clientTag && (
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7a786f', flexShrink: 0 }}>
                  {draft.clientTag}
                </span>
              )}

              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7a786f', flexShrink: 0 }}>
                {fmtDate(draft.createdAt)}
              </span>

              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {PLATFORMS.map((p) => (
                  <span
                    key={p}
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, padding: '2px 6px', borderRadius: 4, background: '#2a2a26', color: '#7a786f' }}
                  >
                    {p}
                  </span>
                ))}
              </div>

              <button
                style={confirmDelete === draft.id ? S.btnDanger : S.btnSm('#7a786f')}
                onClick={(e) => handleDelete(e, draft.id)}
              >
                {confirmDelete === draft.id ? 'Confirm Delete' : 'Delete'}
              </button>
            </div>

            {/* Expanded caption panel */}
            {isExpanded && (
              <div style={{ padding: '0 16px 20px', borderTop: '1px solid #2a2a26' }}>
                {draft.clientName && (
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7a786f', marginTop: 12, marginBottom: 0 }}>
                    Client: {draft.clientName}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 14, marginBottom: 14 }}>
                  {PLATFORMS.map((p) => (
                    <button key={p} style={S.tab(expandedPlatform === p)} onClick={() => setExpandedPlatform(p)}>
                      {p}
                    </button>
                  ))}
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={S.captionPanel}>
                    {expandedPlatform === 'Instagram' ? draft.instagramCaption
                      : expandedPlatform === 'Facebook' ? draft.facebookCaption
                      : draft.tiktokCaption}
                  </div>
                  <button
                    style={{ ...S.btnSm('#c9a96e'), position: 'absolute', top: 12, right: 12 }}
                    onClick={() => handleCopy(draft, expandedPlatform)}
                  >
                    {copiedKey === `${draft.id}:${expandedPlatform}` ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── ContentStudio (root) ─────────────────────────────────────────────────────
export default function ContentStudio() {
  const [activeTab, setActiveTab] = useState('generate')
  const [clients, setClients] = useState([])
  const [draftCount, setDraftCount] = useState(0)

  useEffect(() => {
    const raw = localStorage.getItem('macri_crm_clients')
    if (raw) {
      try { setClients(JSON.parse(raw)) } catch (_) {}
    }
    const drafts = localStorage.getItem('macri_content_drafts')
    if (drafts) {
      try { setDraftCount(JSON.parse(drafts).length) } catch (_) {}
    }
  }, [])

  return (
    <div style={S.page}>
      <p style={S.panelLabel}>panel / content studio</p>
      <h1 style={S.h1}>Content Studio</h1>
      <p style={S.subtitle}>{draftCount} saved draft{draftCount !== 1 ? 's' : ''}</p>

      <div style={S.tabRow}>
        <button style={S.tab(activeTab === 'generate')} onClick={() => setActiveTab('generate')}>
          Generate
        </button>
        <button style={S.tab(activeTab === 'drafts')} onClick={() => setActiveTab('drafts')}>
          Drafts
        </button>
      </div>

      {activeTab === 'generate' ? <GenerateTab clients={clients} /> : <DraftsTab />}
    </div>
  )
}
