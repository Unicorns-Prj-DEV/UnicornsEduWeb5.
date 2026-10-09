jest.mock('src/prisma/prisma.service', () => ({
  PrismaService: class PrismaServiceMock {},
}));

import { BadRequestException } from '@nestjs/common';
import { lmsProfileConfig } from '../lms-profile/lms-profile';
import { SharedMaterialService } from './shared-material.service';

describe('SharedMaterialService — chuyên đề của bộ', () => {
  const prisma = {
    sharedMaterial: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    question: { updateMany: jest.fn(), count: jest.fn() },
    module: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const actionHistory = { recordCreate: jest.fn(), recordUpdate: jest.fn() };
  const courseAccess = {
    assertCourseExists: jest.fn(),
    resolveActor: jest.fn(),
    assertCanWriteCourseQuestions: jest.fn(),
  };
  const actor = { userId: 'u1' };
  let service: SharedMaterialService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (cb: (tx: typeof prisma) => unknown) => cb(prisma),
    );
    prisma.module.findUnique.mockResolvedValue({ courseId: 'c1' });
    prisma.question.count.mockResolvedValue(2);
    service = new SharedMaterialService(
      prisma as never,
      actionHistory as never,
      courseAccess as never,
      { config: lmsProfileConfig('jp') } as never,
    );
  });

  it('tạo bộ lưu chuyên đề của bộ', async () => {
    prisma.sharedMaterial.create.mockResolvedValue({ id: 's1', audioId: null });
    await service.create(
      { courseId: 'c1', moduleId: 'm1', title: 'Bài nghe 1', content: '<p/>' },
      actor,
    );
    expect(prisma.sharedMaterial.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ moduleId: 'm1' }) as unknown,
    });
  });

  it('chuyên đề khác khoá bị từ chối', async () => {
    prisma.module.findUnique.mockResolvedValue({ courseId: 'c2' });
    await expect(
      service.create(
        { courseId: 'c1', moduleId: 'm9', title: 'X', content: '<p/>' },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.sharedMaterial.create).not.toHaveBeenCalled();
  });

  it('đổi chuyên đề của bộ thì mọi câu trong bộ đi theo', async () => {
    prisma.sharedMaterial.findUnique.mockResolvedValue({
      id: 's1',
      courseId: 'c1',
      moduleId: 'm1',
      audioId: null,
    });
    prisma.sharedMaterial.update.mockResolvedValue({
      id: 's1',
      moduleId: 'm2',
      audioId: null,
    });
    await service.update('s1', { moduleId: 'm2' }, actor);
    expect(prisma.question.updateMany).toHaveBeenCalledWith({
      where: { sharedMaterialId: 's1' },
      data: { moduleId: 'm2' },
    });
  });
});
