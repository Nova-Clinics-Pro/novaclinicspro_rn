import { create } from 'zustand';
import {
  type PendingMutationFailureCategory,
  type PendingMutationRecord,
  type PendingMutationScope,
  type PendingMutationState,
  parsePendingMutationRecord,
  transitionPendingMutation,
} from '../../domain/entities/pending-mutation.entity';

interface PendingMutationStoreState {
  readonly scope: PendingMutationScope | null;
  readonly records: readonly PendingMutationRecord[];
  readonly recoveryRequired: boolean;
  replaceScope(
    scope: PendingMutationScope,
    records: readonly PendingMutationRecord[]
  ): void;
  upsert(record: PendingMutationRecord): void;
  transition(
    mutationId: string,
    input: {
      state: PendingMutationState;
      now?: number;
      attemptCount?: number;
      nextAttemptAt?: number | null;
      failureCategory?: PendingMutationFailureCategory | null;
    }
  ): void;
  remove(mutationId: string): void;
  evict(): void;
  setRecoveryRequired(required: boolean): void;
}

export const usePendingMutationsStore = create<PendingMutationStoreState>(
  (set, get) => ({
    scope: null,
    records: [],
    recoveryRequired: false,

    replaceScope: (scope, records) => {
      const validated = records.map((record) =>
        parsePendingMutationRecord(record, scope)
      );
      set({
        scope: Object.freeze({ ...scope }),
        records: Object.freeze(validated),
        recoveryRequired: false,
      });
    },

    upsert: (record) => {
      const scope = get().scope;
      if (!scope) {
        throw new Error('pending_mutation.scope_not_loaded');
      }
      const validated = parsePendingMutationRecord(record, scope);
      const records = get().records;
      const existingIndex = records.findIndex(
        (item) => item.mutationId === validated.mutationId
      );
      const duplicateIdentityIndex = records.findIndex(
        (item) =>
          item.operationId === validated.operationId &&
          item.userId === validated.userId &&
          item.organizationId === validated.organizationId &&
          item.tenantId === validated.tenantId &&
          item.idempotencyKey === validated.idempotencyKey
      );
      const targetIndex =
        existingIndex >= 0 ? existingIndex : duplicateIdentityIndex;
      if (existingIndex < 0 && duplicateIdentityIndex >= 0) {
        return;
      }
      const next =
        targetIndex >= 0
          ? records.map((item, index) =>
            index === targetIndex ? validated : item
          )
          : [...records, validated];
      set({ records: Object.freeze(next) });
    },

    transition: (mutationId, input) => {
      const records = get().records;
      const index = records.findIndex((item) => item.mutationId === mutationId);
      if (index < 0) throw new Error('pending_mutation.not_found');
      const transitioned = transitionPendingMutation(records[index], input);
      set({
        records: Object.freeze(
          records.map((item, itemIndex) =>
            itemIndex === index ? transitioned : item
          )
        ),
      });
    },

    remove: (mutationId) => {
      set({
        records: Object.freeze(
          get().records.filter((item) => item.mutationId !== mutationId)
        ),
      });
    },

    evict: () => set({ scope: null, records: [], recoveryRequired: false }),
    setRecoveryRequired: (recoveryRequired) => set({ recoveryRequired }),
  })
);

export const selectPendingMutationRecords = (
  state: PendingMutationStoreState
) => state.records;
