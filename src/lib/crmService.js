import supabase from './supabase'

const LS_KEY = 'macri_crm_clients'

function toDB(client) {
  const {
    tattooIdea,
    nextAction,
    projectStage,
    projectOrder,
    consultationCount,
    journeyChecklist,
    aftercareChecklist,
    activityLog,
    createdAt,
    updatedAt,
    agentIntakeSummary,
    agentConciergeMessage,
    agentCallLog,
    depositReceived,
    depositStatus,
    ...rest
  } = client
  return {
    ...rest,
    ...(tattooIdea             !== undefined && { tattoo_idea:              tattooIdea }),
    ...(nextAction             !== undefined && { next_action:              nextAction }),
    ...(projectStage           !== undefined && { project_stage:            projectStage }),
    ...(projectOrder           !== undefined && { project_order:            projectOrder }),
    ...(consultationCount      !== undefined && { consultation_count:       consultationCount }),
    ...(journeyChecklist       !== undefined && { journey_checklist:        journeyChecklist }),
    ...(aftercareChecklist     !== undefined && { aftercare_checklist:      aftercareChecklist }),
    ...(activityLog            !== undefined && { activity_log:             activityLog }),
    ...(createdAt              !== undefined && { created_at:               createdAt }),
    ...(updatedAt              !== undefined && { updated_at:               updatedAt }),
    ...(agentIntakeSummary     !== undefined && { agent_intake_summary:     agentIntakeSummary }),
    ...(agentConciergeMessage  !== undefined && { agent_concierge_message:  agentConciergeMessage }),
    ...(agentCallLog           !== undefined && { agent_call_log:           agentCallLog }),
    ...(depositReceived        !== undefined && { deposit_received:         depositReceived }),
    ...(depositStatus          !== undefined && { deposit_status:           depositStatus }),
  }
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