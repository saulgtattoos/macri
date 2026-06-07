import supabase from './supabase'

const LS_KEY = 'macri_crm_clients'

function toDB(client) {
  // Explicit allowlist — only send columns that exist in crm_clients_v1.
  // All deeper consultation form fields live inside the consultations JSONB array.
  const row = {}
  if (client.id                    !== undefined) row.id                     = client.id
  if (client.name                  !== undefined) row.name                   = client.name
  if (client.email                 !== undefined) row.email                  = client.email
  if (client.phone                 !== undefined) row.phone                  = client.phone
  if (client.style                 !== undefined) row.style                  = client.style
  if (client.placement             !== undefined) row.placement              = client.placement
  if (client.size                  !== undefined) row.size                   = client.size
  if (client.status                !== undefined) row.status                 = client.status
  if (client.stage                 !== undefined) row.stage                  = client.stage
  if (client.tattooIdea            !== undefined) row.tattoo_idea            = client.tattooIdea
  if (client.nextAction            !== undefined) row.next_action            = client.nextAction
  if (client.projectStage          !== undefined) row.project_stage          = client.projectStage
  if (client.projectOrder          !== undefined) row.project_order          = client.projectOrder
  if (client.consultationCount     !== undefined) row.consultation_count     = client.consultationCount
  if (client.journeyChecklist      !== undefined) row.journey_checklist      = client.journeyChecklist
  if (client.aftercareChecklist    !== undefined) row.aftercare_checklist    = client.aftercareChecklist
  if (client.consultations         !== undefined) row.consultations          = client.consultations
  if (client.sessions              !== undefined) row.sessions               = client.sessions
  if (client.activityLog           !== undefined) row.activity_log           = client.activityLog
  if (client.createdAt             !== undefined) row.created_at             = client.createdAt
  if (client.updatedAt             !== undefined) row.updated_at             = client.updatedAt
  if (client.agentIntakeSummary    !== undefined) row.agent_intake_summary   = client.agentIntakeSummary
  if (client.agentConciergeMessage !== undefined) row.agent_concierge_message = client.agentConciergeMessage
  if (client.agentCallLog          !== undefined) row.agent_call_log         = client.agentCallLog
  if (client.depositReceived       !== undefined) row.deposit_received       = client.depositReceived
  if (client.depositStatus         !== undefined) row.deposit_status         = client.depositStatus
  return row
}

function fromDB(row) {
  const {
    tattoo_idea,
    next_action,
    project_stage,
    project_order,
    consultation_count,
    journey_checklist,
    aftercare_checklist,
    activity_log,
    created_at,
    updated_at,
    agent_intake_summary,
    agent_concierge_message,
    agent_call_log,
    deposit_received,
    deposit_status,
    ...rest
  } = row
  return {
    ...rest,
    ...(tattoo_idea             !== undefined && { tattooIdea:            tattoo_idea }),
    ...(next_action             !== undefined && { nextAction:            next_action }),
    ...(project_stage           !== undefined && { projectStage:          project_stage }),
    ...(project_order           !== undefined && { projectOrder:          project_order }),
    ...(consultation_count      !== undefined && { consultationCount:     consultation_count }),
    ...(journey_checklist       !== undefined && { journeyChecklist:      journey_checklist }),
    ...(aftercare_checklist     !== undefined && { aftercareChecklist:    aftercare_checklist }),
    ...(activity_log            !== undefined && { activityLog:           activity_log }),
    ...(created_at              !== undefined && { createdAt:             created_at }),
    ...(updated_at              !== undefined && { updatedAt:             updated_at }),
    ...(agent_intake_summary    !== undefined && { agentIntakeSummary:    agent_intake_summary }),
    ...(agent_concierge_message !== undefined && { agentConciergeMessage: agent_concierge_message }),
    ...(agent_call_log          !== undefined && { agentCallLog:          agent_call_log ?? [] }),
    ...(deposit_received        !== undefined && { depositReceived:       deposit_received }),
    ...(deposit_status          !== undefined && { depositStatus:         deposit_status }),
  }
}

function lsRead() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') }
  catch { return [] }
}

function lsWrite(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}

export async function loadClients() {
  try {
    const { data, error } = await supabase.from('crm_clients_v1').select('*')
    if (!error && data && data.length > 0) return data.map(fromDB)
  } catch {}
  return lsRead()
}

export async function saveClient(client) {
  try {
    const mapped = toDB(client)
    const { error } = await supabase
      .from('crm_clients_v1')
      .upsert(mapped, { onConflict: 'id' })
    if (error) console.error('[MACRI] saveClient error:', error.message, error)
  } catch (err) {
    console.error('[MACRI] saveClient caught:', err.message)
  }

  try {
    const arr = JSON.parse(localStorage.getItem('macri_crm_clients') || '[]')
    const idx = arr.findIndex(c => c.id === client.id)
    if (idx >= 0) arr[idx] = client
    else arr.push(client)
    localStorage.setItem('macri_crm_clients', JSON.stringify(arr))
  } catch {}
}

export async function deleteClient(id) {
  supabase.from('crm_clients_v1').delete().eq('id', id).then(({ error }) => {
    if (error) console.error('[MACRI] deleteClient error:', error.message, error)
  })
  lsWrite(lsRead().filter(c => c.id !== id))
}

export async function seedFromLocalStorage() {
  const list = lsRead()
  if (!list.length) return 0

  const mapped = list.map(toDB)
  const { error } = await supabase.from('crm_clients_v1').upsert(mapped)
  if (error) {
    console.error('[MACRI] seedFromLocalStorage failed:', {
      message: error.message,
      code:    error.code,
      details: error.details,
      hint:    error.hint,
    })
    throw error
  }
  return list.length
}