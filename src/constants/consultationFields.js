// Consultation fields the owner controls. Answers sent from Client Mode (the client form window)
// are merged with mergeClientAnswers in src/lib/clientResume.js.

// Set only on the owner's Consultation page, never by Client Mode: artist notes, deposit tier,
// the medical clearance assessment and the Artist Vault.
export const OWNER_ONLY_FIELDS = [
  'artistNotes', 'clientTier', 'medicalClearance',
  'projectRating', 'strategyNotes', 'postSessionDebrief', 'technicalDifficulty', 'executionPlan',
]

// Pricing, deposit and dates: Client Mode may fill them in, but never replaces what the owner set.
export const OWNER_MANAGED_FIELDS = [
  'pricingType', 'estimatedTotal', 'estimatedHours', 'sessionEstimateNotes',
  'depositAmount', 'depositStatus', 'consultationDate', 'appointmentDate',
]
