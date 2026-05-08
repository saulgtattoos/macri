import supabase from './supabase'

function lsParseArray(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.items)) return parsed.items
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

function lsWriteArray(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr))
}

const MAPS = {
  'macri_inventory': {
    toDB(r) {
      const { unitCost, lowStockThreshold, createdAt, ...rest } = r
      return {
        ...rest,
        ...(unitCost !== undefined && { unit_cost: unitCost }),
        ...(lowStockThreshold !== undefined && { low_stock_threshold: lowStockThreshold }),
        ...(createdAt !== undefined && { created_at: createdAt }),
      }
    },
    fromDB(r) {
      const { unit_cost, low_stock_threshold, created_at, ...rest } = r
      return {
        ...rest,
        ...(unit_cost !== undefined && { unitCost: unit_cost }),
        ...(low_stock_threshold !== undefined && { lowStockThreshold: low_stock_threshold }),
        ...(created_at !== undefined && { createdAt: created_at }),
      }
    },
  },
  'macri_cart': {
    toDB(r) {
      const { quantityNeeded, estimatedCost, whereToBuy, inventoryItemId, purchasedAt, createdAt, ...rest } = r
      return {
        ...rest,
        ...(quantityNeeded !== undefined && { quantity_needed: quantityNeeded }),
        ...(estimatedCost !== undefined && { estimated_cost: estimatedCost }),
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
        ...(quantity_needed !== undefined && { quantityNeeded: quantity_needed }),
        ...(estimated_cost !== undefined && { estimatedCost: estimated_cost }),
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
      const { clientId, clientName, imageDescription, instagramCaption, facebookCaption, tiktokCaption, createdAt, ...rest } = r
      return {
        ...rest,
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
      const { client_id, client_name, image_description, instagram_caption, facebook_caption, tiktok_caption, created_at, ...rest } = r
      return {
        ...rest,
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
      const { clientId, clientName, createdAt, ...rest } = r
      return {
        ...rest,
        ...(clientId !== undefined && { client_id: clientId }),
        ...(clientName !== undefined && { client_name: clientName }),
        ...(createdAt !== undefined && { created_at: createdAt }),
      }
    },
    fromDB(r) {
      const { client_id, client_name, created_at, ...rest } = r
      return {
        ...rest,
        ...(client_id !== undefined && { clientId: client_id }),
        ...(client_name !== undefined && { clientName: client_name }),
        ...(created_at !== undefined && { createdAt: created_at }),
      }
    },
  },
  'macri_expenses': {
    toDB(r) {
      const { createdAt, ...rest } = r
      return { ...rest, ...(createdAt !== undefined && { created_at: createdAt }) }
    },
    fromDB(r) {
      const { created_at, ...rest } = r
      return { ...rest, ...(created_at !== undefined && { createdAt: created_at }) }
    },
  },
  'macri_finance_goals': {
    toDB(r) {
      const { targetAmount, createdAt, ...rest } = r
      return {
        ...rest,
        ...(targetAmount !== undefined && { target_amount: targetAmount }),
        ...(createdAt !== undefined && { created_at: createdAt }),
      }
    },
    fromDB(r) {
      const { target_amount, created_at, ...rest } = r
      return {
        ...rest,
        ...(target_amount !== undefined && { targetAmount: target_amount }),
        ...(created_at !== undefined && { createdAt: created_at }),
      }
    },
  },
}

export function makeService(tableName, lsKey) {
  const { toDB, fromDB } = MAPS[tableName] || { toDB: (r) => r, fromDB: (r) => r }

  async function loadAll() {
    try {
      const { data, error } = await supabase.from(tableName).select('*')
      if (!error && data && data.length > 0) return data.map(fromDB)
    } catch {}
    return lsParseArray(lsKey)
  }

  function saveRecord(record) {
    supabase.from(tableName).upsert(toDB(record)).then(({ error }) => {
      if (error) console.error(`[MACRI] ${tableName} saveRecord:`, error.message)
    })
    const list = lsParseArray(lsKey)
    const idx = list.findIndex((r) => r.id === record.id)
    if (idx >= 0) list[idx] = record
    else list.push(record)
    lsWriteArray(lsKey, list)
  }

  function deleteRecord(id) {
    supabase.from(tableName).delete().eq('id', id).then(({ error }) => {
      if (error) console.error(`[MACRI] ${tableName} deleteRecord:`, error.message)
    })
    lsWriteArray(lsKey, lsParseArray(lsKey).filter((r) => r.id !== id))
  }

  async function seedTable() {
    const list = lsParseArray(lsKey)
    if (!list.length) return 0
    const { error } = await supabase.from(tableName).upsert(list.map(toDB))
    if (error) console.error(`[MACRI] ${tableName} seedTable:`, error.message)
    return list.length
  }

  return { loadAll, saveRecord, deleteRecord, seedTable }
}

export const sessionsService = makeService('sessions_v4', 'sessions_v4')
export const expensesService = makeService('macri_expenses', 'macri_expenses')
export const goalsService = makeService('macri_finance_goals', 'macri_finance_goals')
export const inventoryService = makeService('macri_inventory', 'macri_inventory')
export const cartService = makeService('macri_cart', 'macri_cart')
export const inksService = makeService('macri_colorlab_inks', 'macri_colorlab_inks')
export const palettesService = makeService('macri_colorlab_palettes', 'macri_colorlab_palettes')
export const brandsService = makeService('macri_colorlab_brands', 'macri_colorlab_brands')
export const draftsService = makeService('macri_content_drafts', 'macri_content_drafts')
export const hashtagsService = makeService('macri_content_hashtags', 'macri_content_hashtags')
export const sessionPrepService = makeService('macri_session_prep', 'macri_session_prep')
export const agentQueueService = makeService('macri_agent_queue', 'macri_agent_queue')
