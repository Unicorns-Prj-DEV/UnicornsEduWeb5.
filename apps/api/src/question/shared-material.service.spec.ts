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
    question: {
      updateMany: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
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
      { courseId: 'c1', moduleId: 'm1', title: 'Bài nghe 1', content: '<p>Đoạn văn</p>' },
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
        { courseId: 'c1', moduleId: 'm9', title: 'X', content: '<p>Đoạn</p>' },
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
      content: '<p>Đoạn</p>',
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

  describe('phần đầu bộ', () => {
    it('thiếu cả văn bản, ảnh lẫn audio → từ chối', async () => {
      await expect(
        service.create(
          { courseId: 'c1', moduleId: 'm1', title: 'X', content: '<p> &nbsp;</p>' },
          actor,
        ),
      ).rejects.toThrow('Phần đầu bộ cần có văn bản, ảnh hoặc audio.');
      expect(prisma.sharedMaterial.create).not.toHaveBeenCalled();
    });

    it('chỉ có ảnh vẫn hợp lệ', async () => {
      prisma.sharedMaterial.create.mockResolvedValue({ id: 's1', audioId: null });
      await service.create(
        {
          courseId: 'c1',
          moduleId: 'm1',
          title: 'X',
          content: '<p><img src="https://x/a.png"></p>',
        },
        actor,
      );
      expect(prisma.sharedMaterial.create).toHaveBeenCalled();
    });

    it('sửa xoá hết văn bản của bộ chỉ có văn bản → từ chối', async () => {
      prisma.sharedMaterial.findUnique.mockResolvedValue({
        id: 's1',
        courseId: 'c1',
        moduleId: 'm1',
        content: '<p>Đoạn</p>',
        audioId: null,
      });
      await expect(
        service.update('s1', { content: '<p></p>' }, actor),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.sharedMaterial.update).not.toHaveBeenCalled();
    });
  });

  describe('sắp thứ tự câu trong bộ', () => {
    beforeEach(() => {
      prisma.sharedMaterial.findUnique.mockResolvedValue({
        id: 's1',
        courseId: 'c1',
        moduleId: 'm1',
        content: '<p>Đoạn</p>',
        audioId: null,
      });
      prisma.question.findMany.mockResolvedValue([{ id: 'q1' }, { id: 'q2' }]);
    });

    it('lưu vị trí theo thứ tự gửi lên', async () => {
      await service.reorderQuestions('s1', ['q2', 'q1'], actor);
      expect(prisma.question.update).toHaveBeenCalledWith({
        where: { id: 'q2' },
        data: { setPosition: 0 },
      });
      expect(prisma.question.update).toHaveBeenCalledWith({
        where: { id: 'q1' },
        data: { setPosition: 1 },
      });
    });

    it('danh sách không khớp đúng các câu của bộ → từ chối', async () => {
      await expect(
        service.reorderQuestions('s1', ['q1', 'q9'], actor),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.reorderQuestions('s1', ['q1'], actor),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.question.update).not.toHaveBeenCalled();
    });
  });
});
