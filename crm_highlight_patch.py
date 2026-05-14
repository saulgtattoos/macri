#!/usr/bin/env python3
"""
Run from project root:
    python3 crm_highlight_patch.py
Two changes:
  1. InquiryAssistant.jsx — pass clientId in navigate state
  2. CRM.jsx — read state, pulse the matching card
"""
import sys, os

# ─── CHANGE 1: InquiryAssistant.jsx ──────────────────────────────────────────

IA_PATH = os.path.join('src', 'pages', 'InquiryAssistant.jsx')

with open(IA_PATH, 'r') as f:
    ia = f.read()

OLD_IA = "setTimeout(() => navigate('/crm'), 1200)"
NEW_IA = "setTimeout(() => navigate('/crm', { state: { highlightClientId: client.id } }), 1200)"

if OLD_IA in ia:
    ia = ia.replace(OLD_IA, NEW_IA, 1)
    print('CHANGE 1 applied: navigate passes highlightClientId')
else:
    print('CHANGE 1 FAILED: anchor not found in InquiryAssistant.jsx')
    sys.exit(1)

with open(IA_PATH, 'w') as f:
    f.write(ia)

# ─── CHANGE 2: CRM.jsx ───────────────────────────────────────────────────────

CRM_PATH = os.path.join('src', 'pages', 'CRM.jsx')

with open(CRM_PATH, 'r') as f:
    crm = f.read()

# 2a: Add highlightId state declaration after syncToast state
OLD_CRM_STATE = "  const [syncToast,    setSyncToast]    = useState(null)"
NEW_CRM_STATE = """  const [syncToast,    setSyncToast]    = useState(null)
  const [highlightId,  setHighlightId]  = useState(null)"""

if OLD_CRM_STATE in crm:
    crm = crm.replace(OLD_CRM_STATE, NEW_CRM_STATE, 1)
    print('CHANGE 2a applied: highlightId state added')
else:
    print('CHANGE 2a FAILED: state anchor not found')
    sys.exit(1)

# 2b: Add useEffect to read location.state and trigger highlight
# Insert after the existing location.state useEffect that opens the drawer
OLD_CRM_EFFECT = """  useEffect(() => {
    const id = location.state?.openClientId
    if (!id) return
    const client = clients.find(c => c.id === id)
    if (client) openDrawer(client, null)
  }, [location.state])"""

NEW_CRM_EFFECT = """  useEffect(() => {
    const id = location.state?.openClientId
    if (!id) return
    const client = clients.find(c => c.id === id)
    if (client) openDrawer(client, null)
  }, [location.state])

  useEffect(() => {
    const id = location.state?.highlightClientId
    if (!id) return
    setHighlightId(id)
    const timer = setTimeout(() => setHighlightId(null), 2200)
    return () => clearTimeout(timer)
  }, [location.state])"""

if OLD_CRM_EFFECT in crm:
    crm = crm.replace(OLD_CRM_EFFECT, NEW_CRM_EFFECT, 1)
    print('CHANGE 2b applied: highlight useEffect added')
else:
    print('CHANGE 2b FAILED: useEffect anchor not found')
    sys.exit(1)

# 2c: Pass highlightId into ClientCard and add pulse style
# Find the ClientCard usage in the grid and pass the prop
OLD_CARD = """          {filtered.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              onOpen={openDrawer}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              onDelete={handleDeleteClient}
            />
          ))}"""

NEW_CARD = """          {filtered.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              onOpen={openDrawer}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              onDelete={handleDeleteClient}
              highlight={highlightId === client.id}
            />
          ))}"""

if OLD_CARD in crm:
    crm = crm.replace(OLD_CARD, NEW_CARD, 1)
    print('CHANGE 2c applied: highlight prop passed to ClientCard')
else:
    print('CHANGE 2c FAILED: ClientCard grid anchor not found')
    sys.exit(1)

# 2d: Add highlight prop to ClientCard component and apply pulse style
OLD_CARD_FN = "function ClientCard({ client, onOpen, onArchive, onUnarchive, onDelete }) {"
NEW_CARD_FN = "function ClientCard({ client, onOpen, onArchive, onUnarchive, onDelete, highlight = false }) {"

if OLD_CARD_FN in crm:
    crm = crm.replace(OLD_CARD_FN, NEW_CARD_FN, 1)
    print('CHANGE 2d applied: highlight prop added to ClientCard signature')
else:
    print('CHANGE 2d FAILED: ClientCard function signature not found')
    sys.exit(1)

# 2e: Apply highlight ring to the card scene wrapper
OLD_SCENE = """      <div className="crm-card-scene" style={{ height: '100%', cursor: 'pointer' }} onClick={handleOuterClick}>"""
NEW_SCENE = """      <div
        className="crm-card-scene"
        style={{
          height: '100%', cursor: 'pointer',
          borderRadius: 12,
          boxShadow: highlight ? '0 0 0 2px #c9a96e, 0 0 18px rgba(201,169,110,0.45)' : 'none',
          transition: 'box-shadow 0.4s ease',
          animation: highlight ? 'macri-pulse 2.2s ease-out forwards' : 'none',
        }}
        onClick={handleOuterClick}
      >"""

if OLD_SCENE in crm:
    crm = crm.replace(OLD_SCENE, NEW_SCENE, 1)
    print('CHANGE 2e applied: pulse ring style applied to card scene')
else:
    print('CHANGE 2e FAILED: card scene anchor not found')
    sys.exit(1)

with open(CRM_PATH, 'w') as f:
    f.write(crm)

# ─── CHANGE 3: inject keyframe into index.css or App.css ─────────────────────
# Find the main CSS file
css_candidates = [
    os.path.join('src', 'index.css'),
    os.path.join('src', 'App.css'),
]
css_path = None
for p in css_candidates:
    if os.path.exists(p):
        css_path = p
        break

if css_path:
    with open(css_path, 'r') as f:
        css = f.read()
    keyframe = """
@keyframes macri-pulse {
  0%   { box-shadow: 0 0 0 2px #c9a96e, 0 0 18px rgba(201,169,110,0.55); }
  60%  { box-shadow: 0 0 0 2px rgba(201,169,110,0.6), 0 0 12px rgba(201,169,110,0.25); }
  100% { box-shadow: none; }
}
"""
    if 'macri-pulse' not in css:
        css += keyframe
        with open(css_path, 'w') as f:
            f.write(css)
        print(f'CHANGE 3 applied: macri-pulse keyframe added to {css_path}')
    else:
        print('CHANGE 3 skipped: macri-pulse already exists')
else:
    print('CHANGE 3 FAILED: no CSS file found')
    sys.exit(1)

print('\nAll changes applied. Test with: npm run dev')
