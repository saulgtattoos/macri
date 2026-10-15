// Field mappings between app records (camelCase) and database rows (snake_case).
// Pure functions with no browser or Supabase imports, so tests can check them
// against the table structure.

// Numeric columns: a blank form field is saved as null (not ""), and zero stays zero.
// Reading back, null becomes "" again so form inputs stay blank.
const toNum = (v) => (v === undefined ? undefined : (v === null || (typeof v === 'string' && v.trim() === '')) ? null : v)
const fromNum = (v) => (v === undefined ? undefined : v === null ? '' : v)
const defined = (k, v) => (v !== undefined ? { [k]: v } : {})

export const MAPS = {
  'macri_inventory': {
    toDB(r) {
      const { unitCost, lowStockThreshold, quantity, createdAt, ...rest } = r
      return {
        ...rest,
        ...defined('quantity', toNum(quantity)),
        ...defined('unit_cost', toNum(unitCost)),
        ...defined('low_stock_threshold', toNum(lowStockThreshold)),
        ...(createdAt !== undefined && { created_at: createdAt }),
      }
    },
    fromDB(r) {
      const { unit_cost, low_stock_threshold, quantity, created_at, ...rest } = r
      return {
        ...rest,
        ...defined('quantity', fromNum(quantity)),
        ...defined('unitCost', fromNum(unit_cost)),
        ...defined('lowStockThreshold', fromNum(low_stock_threshold)),
        ...(created_at !== undefined && { createdAt: created_at }),
      }
    },
  },
  'macri_cart': {
    toDB(r) {
      const { quantityNeeded, estimatedCost, whereToBuy, inventoryItemId, purchasedAt, createdAt, ...rest } = r
      return {
        ...rest,
        ...defined('quantity_needed', toNum(quantityNeeded)),
        ...defined('estimated_cost', toNum(estimatedCost)),
        ...(whereToBuy !== undefined && { where_to_buy: whereToBuy }),
        ...(inventoryItemId !== undefined && { inventory_item_id: inventoryItemId }),
        ...(purchasedAt !== undefined && { purchased_at: purchasedAt }),
        ...(createdAt !== undefined && { created_at: createdAt }),
      }
    },
    fromDB(r) {
      const { quantity_needed, estimated_cost, where_to_buy, inventory_item_id, purchased_at, created_at, ...rest } = r
      return {
        ...rest,
        ...defined('quantityNeeded', fromNum(quantity_needed)),
        ...defined('estimatedCost', fromNum(estimated_cost)),
        ...(where_to_buy !== undefined && { whereToBuy: where_to_buy }),
        ...(inventory_item_id !== undefined && { inventoryItemId: inventory_item_id }),
        ...(purchased_at !== undefined && { purchasedAt: purchased_at }),
        ...(created_at !== undefined && { createdAt: created_at }),
      }
    },
  },
  'macri_colorlab_inks': {
    toDB(r) {
      const { colorHex, colorFamily, inStock, lastUsed, createdAt, ...rest } = r
      return {
        ...rest,
        ...(colorHex !== undefined && { color_hex: colorHex }),
        ...(colorFamily !== undefined && { color_family: colorFamily }),
        ...(inStock !== undefined && { in_stock: inStock }),
        ...(lastUsed !== undefined && { last_used: lastUsed }),
        ...(createdAt !== undefined && { created_at: createdAt }),
      }
    },
    fromDB(r) {
      const { color_hex, color_family, in_stock, last_used, created_at, ...rest } = r
      return {
        ...rest,
        ...(color_hex !== undefined && { colorHex: color_hex }),
        ...(color_family !== undefined && { colorFamily: color_family }),
        ...(in_stock !== undefined && { inStock: in_stock }),
        ...(last_used !== undefined && { lastUsed: last_used }),
        ...(created_at !== undefined && { createdAt: created_at }),
      }
    },
  },
  'macri_colorlab_palettes': {
    toDB(r) {
      const { inkIds, createdAt, ...rest } = r
      return {
        ...rest,
        ...(inkIds !== undefined && { ink_ids: inkIds }),
        ...(createdAt !== undefined && { created_at: createdAt }),
      }
    },
    fromDB(r) {
      const { ink_ids, created_at, ...rest } = r
      return {
        ...rest,
        ...(ink_ids !== undefined && { inkIds: ink_ids }),
        ...(created_at !== undefined && { createdAt: created_at }),
      }
    },
  },
  'macri_colorlab_brands': {
    toDB(r) {
      const { supplierContact, orderUrl, createdAt, ...rest } = r
      return {
        ...rest,
        ...(supplierContact !== undefined && { supplier_contact: supplierContact }),
        ...(orderUrl !== undefined && { order_url: orderUrl }),
        ...(createdAt !== undefined && { created_at: createdAt }),
      }
    },
    fromDB(r) {
      const { supplier_contact, order_url, created_at, ...rest } = r
      return {
        ...rest,
        ...(supplier_contact !== undefined && { supplierContact: supplier_contact }),
        ...(order_url !== undefined && { orderUrl: order_url }),
        ...(created_at !== undefined && { createdAt: created_at }),
      }
    },
  },
  'macri_content_drafts': {
    toDB(r) {
      const { clientId, clientName, clientTag, imageDescription, instagramCaption, facebookCaption, tiktokCaption, createdAt, ...rest } = r
      return {
        ...rest,
        ...(clientTag !== undefined && { client_tag: clientTag }),
        ...(clientId !== undefined && { client_id: clientId }),
        ...(clientName !== undefined && { client_name: clientName }),
        ...(imageDescription !== undefined && { image_description: imageDescription }),
        ...(instagramCaption !== undefined && { instagram_caption: instagramCaption }),
        ...(facebookCaption !== undefined && { facebook_caption: facebookCaption }),
        ...(tiktokCaption !== undefined && { tiktok_caption: tiktokCaption }),
        ...(createdAt !== undefined && { created_at: createdAt }),
      }
    },
    fromDB(r) {
      const { client_id, client_name, client_tag, image_description, instagram_caption, facebook_caption, tiktok_caption, created_at, ...rest } = r
      return {
        ...rest,
        ...(client_tag !== undefined && { clientTag: client_tag }),
        ...(client_id !== undefined && { clientId: client_id }),
        ...(client_name !== undefined && { clientName: client_name }),
        ...(image_description !== undefined && { imageDescription: image_description }),
        ...(instagram_caption !== undefined && { instagramCaption: instagram_caption }),
        ...(facebook_caption !== undefined && { facebookCaption: facebook_caption }),
        ...(tiktok_caption !== undefined && { tiktokCaption: tiktok_caption }),
        ...(created_at !== undefined && { createdAt: created_at }),
      }
    },
  },
  'macri_content_hashtags': {
    toDB(r) {
      const { createdAt, ...rest } = r
      return { ...rest, ...(createdAt !== undefined && { created_at: createdAt }) }
    },
    fromDB(r) {
      const { created_at, ...rest } = r
      return { ...rest, ...(created_at !== undefined && { createdAt: created_at }) }
    },
  },
  'macri_session_prep': {
    toDB(r) {
      const { sortOrder, createdAt, ...rest } = r
      return {
        ...rest,
        ...(sortOrder !== undefined && { sort_order: sortOrder }),
        ...(createdAt !== undefined && { created_at: createdAt }),
      }
    },
    fromDB(r) {
      const { sort_order, created_at, ...rest } = r
      return {
        ...rest,
        ...(sort_order !== undefined && { sortOrder: sort_order }),
        ...(created_at !== undefined && { createdAt: created_at }),
      }
    },
  },
  'macri_agent_queue': {
    toDB(r) {
      const { agentName, agentType, clientId, clientName, draftMessage, approvedAt, sentAt, dismissedAt, createdAt, ...rest } = r
      return {
        ...rest,
        ...(agentName !== undefined && { agent_name: agentName }),
        ...(agentType !== undefined && { agent_type: agentType }),
        ...(clientId !== undefined && { client_id: clientId }),
        ...(clientName !== undefined && { client_name: clientName }),
        ...(draftMessage !== undefined && { draft_message: draftMessage }),
        ...(approvedAt !== undefined && { approved_at: approvedAt }),
        ...(sentAt !== undefined && { sent_at: sentAt }),
        ...(dismissedAt !== undefined && { dismissed_at: dismissedAt }),
        ...(createdAt !== undefined && { created_at: createdAt }),
      }
    },
    fromDB(r) {
      const { agent_name, agent_type, client_id, client_name, draft_message, approved_at, sent_at, dismissed_at, created_at, ...rest } = r
      return {
        ...rest,
        ...(agent_name !== undefined && { agentName: agent_name }),
        ...(agent_type !== undefined && { agentType: agent_type }),
        ...(client_id !== undefined && { clientId: client_id }),
        ...(client_name !== undefined && { clientName: client_name }),
        ...(draft_message !== undefined && { draftMessage: draft_message }),
        ...(approved_at !== undefined && { approvedAt: approved_at }),
        ...(sent_at !== undefined && { sentAt: sent_at }),
        ...(dismissed_at !== undefined && { dismissedAt: dismissed_at }),
        ...(created_at !== undefined && { createdAt: created_at }),
      }
    },
  },
  'sessions_v4': {
    toDB(r) {
      const { clientId, clientName, total, tip, createdAt, ...rest } = r
      return {
        ...rest,
        ...defined('total', toNum(total)),
        ...defined('tip', toNum(tip)),
        ...(clientId !== undefined && { client_id: clientId }),
        ...(clientName !== undefined && { client_name: clientName }),
        ...(createdAt !== undefined && { created_at: createdAt }),
      }
    },
    fromDB(r) {
      const { client_id, client_name, total, tip, created_at, ...rest } = r
      return {
        ...rest,
        ...defined('total', fromNum(total)),
        ...defined('tip', fromNum(tip)),
        ...(client_id !== undefined && { clientId: client_id }),
        ...(client_name !== undefined && { clientName: client_name }),
        ...(created_at !== undefined && { createdAt: created_at }),
      }
    },
  },
  'macri_expenses': {
    toDB(r) {
      const { amount, paymentMethod, createdAt, ...rest } = r
      return {
        ...rest,
        ...defined('amount', toNum(amount)),
        ...(paymentMethod !== undefined && { payment_method: paymentMethod }),
        ...(createdAt !== undefined && { created_at: createdAt }),
      }
    },
    fromDB(r) {
      const { amount, payment_method, created_at, ...rest } = r
      return {
        ...rest,
        ...defined('amount', fromNum(amount)),
        ...(payment_method !== undefined && { paymentMethod: payment_method }),
        ...(created_at !== undefined && { createdAt: created_at }),
      }
    },
  },
  'macri_finance_goals': {
    toDB(r) {
      const { targetAmount, createdAt, ...rest } = r
      return {
        ...rest,
        ...defined('target_amount', toNum(targetAmount)),
        ...(createdAt !== undefined && { created_at: createdAt }),
      }
    },
    fromDB(r) {
      const { target_amount, created_at, ...rest } = r
      return {
        ...rest,
        ...defined('targetAmount', fromNum(target_amount)),
        ...(created_at !== undefined && { createdAt: created_at }),
      }
    },
  },
  'studio_inventory_v1': {
    toDB: (r) => r,
    fromDB: (r) => r,
  },
  'studio_cart_v1': {
    toDB: (r) => r,
    fromDB: (r) => r,
  },
}

export function crmToDB(client) {
  // Explicit allowlist — only send columns that exist in crm_clients_v1.
  // All deeper consultation form fields live inside the consultations JSONB array.
  const row = {}
  if (client.id                    !== undefined) row.id                     = client.id
  if (client.name                  !== undefined) row.name                   = client.name
  if (client.email                 !== undefined) row.email                  = client.email
  if (client.phone                 !== undefined) row.phone                  = client.phone
  if (client.instagram             !== undefined) row.instagram              = client.instagram
  if (client.notes                 !== undefined) row.notes                  = client.notes
  if (client.communications        !== undefined) row.communications         = client.communications
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

export function crmFromDB(row) {
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
