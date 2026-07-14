/**
 * Compatibility marker only. The Supabase Finance foundation must not import,
 * mutate, mirror or reconcile the browser-local financeStore/cariStore or ledger.
 */
export const FINANCE_LEGACY_BOUNDARY={supabaseSource:"business_parties.party_id",legacyStores:["financeStore","cariStore"],synchronized:false,ledgerPosting:false} as const;
