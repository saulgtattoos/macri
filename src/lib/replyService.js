// Reply sent status (spec: Context/spec-replies-sent-status-and-glance.md, Part 1).
// Every change goes through database functions (supabase/security/07_replies.sql), which
// refuse duplicate confirmations and update the reply, journey step, stage and activity
// log together. Resolves to { ok, result, reply, client }; ok false means nothing changed.

import supabase from './supabase'
import { reportSyncIssue } from './syncStatus'
import { cacheClientRow } from './crmService'

// One reply record per generated draft and channel.
export const replyId = (draftId, channel) => `${draftId}-${channel}`

async function rpc(name, args) {
  try {
    const { data, error } = await supabase.rpc(name, args)
    if (error) {
      reportSyncIssue({ kind: 'save', table: 'macri_replies', message: error.message })
      return { ok: false, error }
    }
    const client = data?.client ? cacheClientRow(data.client) : null
    return { ok: true, result: data?.result, reply: data?.reply ?? null, client }
  } catch (error) {
    reportSyncIssue({ kind: 'save', table: 'macri_replies', message: error?.message })
    return { ok: false, error }
  }
}

export function recordReplyOpened({ id, clientId, channel, subject, body, app }) {
  return rpc('reply_record_opened', { p_id: id, p_client_id: clientId, p_channel: channel, p_subject: subject ?? null, p_body: body ?? '', p_app: app })
}

// via: saul_gmail | saul_messages (Saul's confirmation) or resend | twilio (provider accepted, needs providerId)
export function markReplySent({ id, clientId, channel, subject, body, via, providerId = null }) {
  return rpc('reply_mark_sent', { p_id: id, p_client_id: clientId, p_channel: channel, p_subject: subject ?? null, p_body: body ?? '', p_via: via, p_provider_id: providerId })
}

export function undoReplySent(id) {
  return rpc('reply_undo_sent', { p_id: id })
}

export async function loadReplies(clientId) {
  try {
    const { data, error } = await supabase.from('macri_replies').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
    if (error) {
      reportSyncIssue({ kind: 'load', table: 'macri_replies', message: error.message })
      return { ok: false, replies: [] }
    }
    return { ok: true, replies: data ?? [] }
  } catch (error) {
    reportSyncIssue({ kind: 'load', table: 'macri_replies', message: error?.message })
    return { ok: false, replies: [] }
  }
}

const VIA_LABEL = {
  saul_gmail: 'Marked sent by Saul (Gmail)',
  saul_messages: 'Marked sent by Saul (Messages)',
  resend: 'Accepted by Resend',
  twilio: 'Accepted by Twilio',
}

export function sentLabel(reply) {
  if (!reply || reply.status !== 'sent') return ''
  const date = new Date(reply.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const extra = reply.provider && reply.provider !== reply.sent_via ? `, also accepted by ${reply.provider === 'resend' ? 'Resend' : 'Twilio'}` : ''
  return `${VIA_LABEL[reply.sent_via] ?? 'Sent'} ${date}${extra}`
}

// Undo applies only to Saul's own confirmations; a provider acceptance means it really went out.
export const canUndo = (reply) => reply?.status === 'sent' && !reply.provider_id
