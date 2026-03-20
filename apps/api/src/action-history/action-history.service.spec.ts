import { ActionHistoryService } from './action-history.service';

describe('ActionHistoryService', () => {
  const tx = {
    actionHistory: {
      create: jest.fn(),
    },
  };

  let service: ActionHistoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ActionHistoryService();
  });

  it('records create actions with a full after snapshot and actor metadata', async () => {
    tx.actionHistory.create.mockResolvedValue({ id: 'history-1' });

    await service.recordCreate(tx as never, {
      actor: {
        userId: 'user-1',
        userEmail: 'admin@example.com',
        roleType: 'admin',
      },
      entityType: 'session',
      entityId: 'session-1',
      description: 'Tạo buổi học',
      afterValue: {
        id: 'session-1',
        date: '2026-03-20',
        attendance: [{ studentId: 'student-1', status: 'present' }],
      },
    });

    expect(tx.actionHistory.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        userEmail: 'admin@example.com',
        entityId: 'session-1',
        entityType: 'session',
        actionType: 'create',
        beforeValue: null,
        afterValue: {
          id: 'session-1',
          date: '2026-03-20',
          attendance: [{ studentId: 'student-1', status: 'present' }],
        },
        changedFields: {
          id: { old: null, new: 'session-1' },
          date: { old: null, new: '2026-03-20' },
          attendance: {
            old: null,
            new: [{ studentId: 'student-1', status: 'present' }],
          },
        },
        description: 'Tạo buổi học',
      },
    });
  });

  it('records update actions with nested field diffs', async () => {
    tx.actionHistory.create.mockResolvedValue({ id: 'history-2' });

    await service.recordUpdate(tx as never, {
      actor: {
        userId: 'user-1',
        userEmail: 'admin@example.com',
      },
      entityType: 'class',
      entityId: 'class-1',
      description: 'Cập nhật lớp học',
      beforeValue: {
        name: 'Math 1',
        tuition: {
          perSession: 100,
        },
        schedule: [{ from: '19:00:00', to: '20:30:00' }],
      },
      afterValue: {
        name: 'Math 2',
        tuition: {
          perSession: 200,
        },
        schedule: [{ from: '20:00:00', to: '21:30:00' }],
      },
    });

    expect(tx.actionHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityType: 'class',
        entityId: 'class-1',
        actionType: 'update',
        changedFields: {
          name: { old: 'Math 1', new: 'Math 2' },
          'tuition.perSession': { old: 100, new: 200 },
          schedule: {
            old: [{ from: '19:00:00', to: '20:30:00' }],
            new: [{ from: '20:00:00', to: '21:30:00' }],
          },
        },
      }),
    });
  });
});
