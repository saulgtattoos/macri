// @vitest-environment jsdom
// Rendered consultation screens: the owner wizard and the client form, step by step.
// The snapshots are the Phase A baseline: refactoring the questions into shared components must
// leave every step's rendered markup unchanged. The field checks guard what each mode can edit.
import { test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// No database or paid services in screen tests.
vi.mock('../../src/lib/supabase', () => ({ default: {}, supabase: {}, authLink: { recovery: false, linkError: '' } }))
vi.mock('../../src/lib/crmService', () => ({
  loadClients: vi.fn(async () => []), loadClientsResult: vi.fn(async () => ({ ok: true, rows: [] })),
  saveClient: vi.fn(async () => ({ ok: true })), deleteClient: vi.fn(async () => ({ ok: true })),
  seedFromLocalStorage: vi.fn(async () => 0), cacheClientRow: vi.fn(),
}))
vi.mock('../../src/lib/api', () => ({
  ttsFetch: vi.fn(async () => ({ ok: false })), claudeFetch: vi.fn(), sttFetch: vi.fn(), apiPost: vi.fn(async () => ({ ok: false })),
}))

const { default: Consultation } = await import('../../src/pages/Consultation.jsx')
const { default: ConsultationClient } = await import('../../src/pages/ConsultationClient.jsx')

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-16T12:00:00Z'))
  localStorage.clear()
})
afterEach(() => { cleanup(); vi.useRealTimers() })

// The rendered markup, with each style attribute's declarations in a fixed order (the browser may list
// the same styles in a different order when React rebuilds an element; the look is identical).
function markup() {
  return document.body.innerHTML.replace(/style="([^"]*)"/g, (_, css) =>
    `style="${css.split(';').map(d => d.trim()).filter(Boolean).sort().join('; ')}"`)
}

const stepIcons = () => screen.getAllByRole('button').filter(b => /^\p{Extended_Pictographic}/u.test(b.textContent.trim()) && b.textContent.trim().length <= 3)
const stepTitle = () => (document.body.textContent.match(/Step \d of \d: [A-Za-z &]+?(?=\d|$)/) || [''])[0]

async function renderOwner() {
  render(<MemoryRouter initialEntries={['/consultation']}><Consultation /></MemoryRouter>)
  await act(async () => {})
}
async function renderClient() {
  render(<ConsultationClient />)
  await act(async () => {})
}
async function goToStep(i) {
  await act(async () => { fireEvent.click(stepIcons()[i]) })
}

// Visible field labels, placeholders and choice buttons on the current step.
function inventory() {
  const main = document.body
  return {
    labels: [...main.querySelectorAll('label, span')].map(e => e.textContent.trim()).filter(t => t && t.length < 40 && /^[A-Z]/.test(t)),
    inputs: [...main.querySelectorAll('input, textarea, select')].map(e => e.placeholder || e.type),
    buttons: [...main.querySelectorAll('button')].map(b => b.textContent.trim()).filter(Boolean),
  }
}

test('owner wizard: every step renders the same as the baseline', async () => {
  await renderOwner()
  expect(stepIcons()).toHaveLength(8)
  for (let i = 0; i < 8; i++) {
    await goToStep(i)
    expect(markup()).toMatchSnapshot(`owner step ${i + 1}`)
  }
})

test('client form: every step renders the same as the baseline', async () => {
  await renderClient()
  expect(stepIcons()).toHaveLength(7)
  for (let i = 0; i < 7; i++) {
    await goToStep(i)
    expect(markup()).toMatchSnapshot(`client step ${i + 1}`)
  }
})

test('step order is the same on both pages, ending client questions with The Experience', async () => {
  await renderClient()
  const client = []
  for (let i = 0; i < 7; i++) { await goToStep(i); client.push(stepTitle()) }
  cleanup()
  await renderOwner()
  const owner = []
  for (let i = 0; i < 8; i++) { await goToStep(i); owner.push(stepTitle()) }
  const names = list => list.map(t => t.replace(/^Step \d of \d: /, ''))
  expect(names(client)).toEqual(['Client Info', 'The Vision', 'Design Details', 'Health and Skin', 'The Experience', 'Pricing and Deposit', 'Client Summary'])
  expect(names(owner).slice(0, 7)).toEqual(names(client))
  expect(names(owner)[7]).toBe('Artist Vault')
})

test('client form never shows a control for an artist controlled field', async () => {
  await renderClient()
  const seen = new Set()
  for (let i = 0; i < 7; i++) {
    await goToStep(i)
    const inv = inventory()
    for (const x of [...inv.labels, ...inv.buttons]) seen.add(x)
  }
  for (const ownerOnly of [
    'Medical Clearance', 'No Issues', 'Note on File', 'Needs Clearance',
    'Pricing Type', 'Estimated Total', 'Session Estimate Notes', 'Deposit Amount', 'Deposit Status',
    'Deposit Requirement', 'Consultation Date', 'Appointment Date', 'Client Tier', 'Apply to Estimate',
    'Artist Notes', 'Artist Vault', 'Save to Studio Database',
  ]) expect(seen.has(ownerOnly), ownerOnly).toBe(false)
})

test('owner wizard keeps the artist controls', async () => {
  await renderOwner()
  const seen = new Set()
  for (let i = 0; i < 8; i++) {
    await goToStep(i)
    const inv = inventory()
    for (const x of [...inv.labels, ...inv.buttons]) seen.add(x)
  }
  for (const ownerControl of ['Medical Clearance', 'Needs Clearance', 'Pricing Type', 'Deposit Status', 'Client Tier', 'Appointment Date', 'Save to Studio Database']) {
    expect(seen.has(ownerControl), ownerControl).toBe(true)
  }
})

test('client form: the name is required before moving on, and the draft saves without health answers', async () => {
  await renderClient()
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Next' })) })
  expect(stepTitle()).toMatch(/^Step 1 of 7/)
  expect(document.body.textContent).toContain('Name is required')
  await act(async () => { fireEvent.change(screen.getByPlaceholderText('Client full name'), { target: { value: 'Synthetic Client' } }) })
  await goToStep(3)
  await act(async () => { fireEvent.change(screen.getByPlaceholderText('Known allergies'), { target: { value: 'Synthetic allergy' } }) })
  const draft = localStorage.getItem('macri_consultation_client_draft') || ''
  expect(draft).toContain('Synthetic Client')
  expect(draft).not.toContain('Synthetic allergy')
})

test('owner wizard: the draft saves without health answers', async () => {
  await renderOwner()
  await act(async () => { fireEvent.change(screen.getByPlaceholderText('Client full name'), { target: { value: 'Synthetic Owner Entry' } }) })
  await goToStep(3)
  await act(async () => { fireEvent.change(screen.getByPlaceholderText('Known allergies'), { target: { value: 'Synthetic allergy' } }) })
  const draft = localStorage.getItem('macri_consultation_draft') || ''
  expect(draft).toContain('Synthetic Owner Entry')
  expect(draft).not.toContain('Synthetic allergy')
})
