import { Injectable } from '@nestjs/common';

export interface ActionHistoryActor {
  userId?: string | null;
  userEmail?: string | null;
  roleType?: string | null;
}

export type ActionHistoryActionType = 'create' | 'update' | 'delete';

interface ActionHistoryWriteClient {
  actionHistory: {
    create(args: unknown): Promise<unknown> | unknown;
  };
}

interface RecordActionHistoryParams {
  actor?: ActionHistoryActor | null;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  beforeValue?: unknown;
  afterValue?: unknown;
}

type ChangedFieldMap = Record<
  string,
  {
    old: unknown;
    new: unknown;
  }
>;

@Injectable()
export class ActionHistoryService {
  async recordCreate(
    db: ActionHistoryWriteClient,
    params: Omit<RecordActionHistoryParams, 'beforeValue'> & { afterValue: unknown },
  ) {
    return this.recordAction(db, {
      ...params,
      beforeValue: null,
      actionType: 'create',
    });
  }

  async recordUpdate(
    db: ActionHistoryWriteClient,
    params: RecordActionHistoryParams & {
      beforeValue: unknown;
      afterValue: unknown;
    },
  ) {
    return this.recordAction(db, {
      ...params,
      actionType: 'update',
    });
  }

  async recordDelete(
    db: ActionHistoryWriteClient,
    params: Omit<RecordActionHistoryParams, 'afterValue'> & { beforeValue: unknown },
  ) {
    return this.recordAction(db, {
      ...params,
      afterValue: null,
      actionType: 'delete',
    });
  }

  private async recordAction(
    db: ActionHistoryWriteClient,
    params: RecordActionHistoryParams & { actionType: ActionHistoryActionType },
  ) {
    const beforeValue = this.normalizeJson(params.beforeValue);
    const afterValue = this.normalizeJson(params.afterValue);

    await db.actionHistory.create({
      data: {
        userId: params.actor?.userId ?? null,
        userEmail: params.actor?.userEmail ?? null,
        entityId: params.entityId ?? null,
        entityType: params.entityType,
        actionType: params.actionType,
        beforeValue,
        afterValue,
        changedFields: this.buildChangedFields(beforeValue, afterValue),
        description: params.description ?? null,
      },
    });
  }

  private normalizeJson(value: unknown): unknown {
    if (value === undefined) {
      return null;
    }

    return JSON.parse(
      JSON.stringify(value, (_key, nestedValue: unknown) => {
        if (nestedValue instanceof Date) {
          return nestedValue.toISOString();
        }
        return nestedValue;
      }),
    );
  }

  private buildChangedFields(beforeValue: unknown, afterValue: unknown) {
    const changes: ChangedFieldMap = {};
    this.collectChangedFields(changes, '', beforeValue, afterValue);
    return changes;
  }

  private collectChangedFields(
    changes: ChangedFieldMap,
    path: string,
    beforeValue: unknown,
    afterValue: unknown,
  ) {
    if (this.areEqual(beforeValue, afterValue)) {
      return;
    }

    const beforeIsObject = this.isPlainObject(beforeValue);
    const afterIsObject = this.isPlainObject(afterValue);

    if ((beforeValue == null || beforeValue === undefined) && afterIsObject) {
      Object.entries(afterValue as Record<string, unknown>).forEach(
        ([key, value]) => {
          this.collectChangedFields(
            changes,
            path ? `${path}.${key}` : key,
            undefined,
            value,
          );
        },
      );
      return;
    }

    if ((afterValue == null || afterValue === undefined) && beforeIsObject) {
      Object.entries(beforeValue as Record<string, unknown>).forEach(
        ([key, value]) => {
          this.collectChangedFields(
            changes,
            path ? `${path}.${key}` : key,
            value,
            undefined,
          );
        },
      );
      return;
    }

    if (beforeIsObject && afterIsObject) {
      const beforeRecord = beforeValue as Record<string, unknown>;
      const afterRecord = afterValue as Record<string, unknown>;
      const keys = new Set([
        ...Object.keys(beforeRecord),
        ...Object.keys(afterRecord),
      ]);

      keys.forEach((key) => {
        this.collectChangedFields(
          changes,
          path ? `${path}.${key}` : key,
          beforeRecord[key],
          afterRecord[key],
        );
      });
      return;
    }

    const fieldPath = path || 'value';
    changes[fieldPath] = {
      old: beforeValue ?? null,
      new: afterValue ?? null,
    };
  }

  private areEqual(left: unknown, right: unknown) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object') {
      return false;
    }

    if (Array.isArray(value)) {
      return false;
    }

    return true;
  }
}
