import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AchievementService } from './achievement.service';

jest.mock('../storage/supabase-storage', () => ({
  createSignedStorageUrl: jest.fn().mockResolvedValue(null),
  removeStorageObjects: jest.fn().mockResolvedValue(undefined),
  uploadStorageObject: jest.fn(),
  validateImageFile: jest.fn(),
}));

describe('AchievementService', () => {
  const service = Object.create(
    AchievementService.prototype,
  ) as AchievementService;

  it('accepts a full permutation', () => {
    expect(() =>
      service.assertCompleteReorder(['a', 'b', 'c'], ['c', 'a', 'b']),
    ).not.toThrow();
  });

  it('rejects missing or extra ids', () => {
    expect(() => service.assertCompleteReorder(['a', 'b'], ['a'])).toThrow(
      BadRequestException,
    );
    expect(() =>
      service.assertCompleteReorder(['a', 'b'], ['a', 'b', 'c']),
    ).toThrow(BadRequestException);
  });

  it('rejects duplicates and foreign ids', () => {
    expect(() => service.assertCompleteReorder(['a', 'b'], ['a', 'a'])).toThrow(
      BadRequestException,
    );
    expect(() => service.assertCompleteReorder(['a', 'b'], ['a', 'z'])).toThrow(
      BadRequestException,
    );
  });

  describe('thành tích nổi bật', () => {
    const makeService = () => {
      const prisma = {
        staffInfo: {
          findUnique: jest.fn().mockResolvedValue({ id: 'UNISTAFF-x' }),
        },
        staffAchievement: {
          count: jest.fn().mockResolvedValue(0),
          create: jest.fn((args: { data: object }) => ({
            id: 'new',
            imagePath: null,
            imageWatermarkedPath: null,
            ...args.data,
          })),
          findMany: jest.fn(),
          findFirst: jest.fn(),
          update: jest.fn((args: unknown) => args),
          updateMany: jest.fn((args: unknown) => args),
          delete: jest.fn().mockResolvedValue(undefined),
        },
        $transaction: jest.fn().mockResolvedValue([]),
      };
      return {
        prisma,
        service: new AchievementService(prisma as never),
      };
    };

    it('đổi sao: bỏ sao cũ, đưa thành tích mới lên đầu, giữ thứ tự phần còn lại', async () => {
      const { prisma, service } = makeService();
      prisma.staffAchievement.findMany
        .mockResolvedValueOnce([
          { id: 'a', imagePath: 'a.png' },
          { id: 'b', imagePath: null },
          { id: 'c', imagePath: 'c.png' },
        ])
        .mockResolvedValueOnce([]);

      await service.setStaffHighlightAchievement('UNISTAFF-x', 'c');

      const ops = prisma.$transaction.mock.calls[0][0] as Array<{
        where: { id?: unknown; isHighlight?: boolean };
        data: { sortOrder?: number; isHighlight?: boolean };
      }>;
      expect(ops[0]).toEqual({
        where: { staffId: 'UNISTAFF-x', isHighlight: true, id: { not: 'c' } },
        data: { isHighlight: false },
      });
      expect(ops.slice(1)).toEqual([
        { where: { id: 'c' }, data: { sortOrder: 0, isHighlight: true } },
        { where: { id: 'a' }, data: { sortOrder: 1 } },
        { where: { id: 'b' }, data: { sortOrder: 2 } },
      ]);
    });

    it('thành tích đầu tiên (tự có sao) mà không kèm ảnh thì bị từ chối', async () => {
      const { prisma, service } = makeService();
      await expect(
        service.createStaffAchievement(
          'UNISTAFF-x',
          { title: 'Giải' },
          undefined,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.staffAchievement.create).not.toHaveBeenCalled();
    });

    it('thành tích thêm sau (không sao) được tạo không cần ảnh', async () => {
      const { prisma, service } = makeService();
      prisma.staffAchievement.count.mockResolvedValue(2);
      prisma.staffAchievement.findFirst.mockResolvedValue({ sortOrder: 1 });

      const row = await service.createStaffAchievement(
        'UNISTAFF-x',
        { title: 'Giải phụ' },
        undefined,
      );

      expect(prisma.staffAchievement.create).toHaveBeenCalledWith({
        data: {
          staffId: 'UNISTAFF-x',
          title: 'Giải phụ',
          sortOrder: 2,
          isHighlight: false,
        },
      });
      expect(row).toMatchObject({ id: 'new', isHighlight: false });
    });

    it('không gắn sao cho thành tích chưa có ảnh', async () => {
      const { prisma, service } = makeService();
      prisma.staffAchievement.findMany.mockResolvedValueOnce([
        { id: 'a', imagePath: 'a.png' },
        { id: 'b', imagePath: null },
      ]);
      await expect(
        service.setStaffHighlightAchievement('UNISTAFF-x', 'b'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('không gỡ ảnh của thành tích nổi bật', async () => {
      const { prisma, service } = makeService();
      prisma.staffAchievement.findFirst.mockResolvedValue({
        id: 'a',
        isHighlight: true,
        imagePath: 'a.png',
        imageWatermarkedPath: 'a.webp',
      });
      await expect(
        service.deleteStaffAchievementImage('UNISTAFF-x', 'a'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.staffAchievement.update).not.toHaveBeenCalled();
    });

    it('gỡ ảnh của thành tích không sao', async () => {
      const { prisma, service } = makeService();
      prisma.staffAchievement.findFirst.mockResolvedValue({
        id: 'b',
        isHighlight: false,
        imagePath: 'b.png',
        imageWatermarkedPath: 'b.webp',
      });

      await service.deleteStaffAchievementImage('UNISTAFF-x', 'b');

      expect(prisma.staffAchievement.update).toHaveBeenCalledWith({
        where: { id: 'b' },
        data: { imagePath: null, imageWatermarkedPath: null },
      });
    });

    it('đổi sao sang thành tích không thuộc hồ sơ thì báo không tìm thấy', async () => {
      const { prisma, service } = makeService();
      prisma.staffAchievement.findMany.mockResolvedValueOnce([{ id: 'a' }]);
      await expect(
        service.setStaffHighlightAchievement('UNISTAFF-x', 'z'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('sắp xếp luôn ghim thành tích nổi bật ở đầu', async () => {
      const { prisma, service } = makeService();
      prisma.staffAchievement.findMany
        .mockResolvedValueOnce([
          { id: 'a', isHighlight: false },
          { id: 'b', isHighlight: true },
          { id: 'c', isHighlight: false },
        ])
        .mockResolvedValueOnce([]);

      await service.reorderStaffAchievements('UNISTAFF-x', {
        orderedIds: ['c', 'a', 'b'],
      });

      const ops = prisma.$transaction.mock.calls[0][0] as Array<{
        where: { id: string };
        data: { sortOrder: number };
      }>;
      expect(ops.map((op) => op.where.id)).toEqual(['b', 'c', 'a']);
    });

    it('xoá thành tích nổi bật còn đúng 1 dòng thì dòng đó tự có sao', async () => {
      const { prisma, service } = makeService();
      prisma.staffAchievement.findFirst.mockResolvedValue({
        id: 'a',
        isHighlight: true,
        imagePath: null,
        imageWatermarkedPath: null,
      });
      prisma.staffAchievement.findMany.mockResolvedValue([
        { id: 'b', imagePath: 'b.png' },
      ]);

      await service.deleteStaffAchievement('UNISTAFF-x', 'a');

      expect(prisma.staffAchievement.update).toHaveBeenCalledWith({
        where: { id: 'b' },
        data: { isHighlight: true },
      });
    });

    it('dòng còn lại duy nhất chưa có ảnh thì không tự có sao', async () => {
      const { prisma, service } = makeService();
      prisma.staffAchievement.findFirst.mockResolvedValue({
        id: 'a',
        isHighlight: true,
        imagePath: null,
        imageWatermarkedPath: null,
      });
      prisma.staffAchievement.findMany.mockResolvedValue([
        { id: 'b', imagePath: null },
      ]);

      await service.deleteStaffAchievement('UNISTAFF-x', 'a');

      expect(prisma.staffAchievement.update).not.toHaveBeenCalled();
    });

    it('xoá thành tích nổi bật còn từ 2 dòng thì không tự chọn', async () => {
      const { prisma, service } = makeService();
      prisma.staffAchievement.findFirst.mockResolvedValue({
        id: 'a',
        isHighlight: true,
        imagePath: null,
        imageWatermarkedPath: null,
      });
      prisma.staffAchievement.findMany.mockResolvedValue([
        { id: 'b' },
        { id: 'c' },
      ]);

      await service.deleteStaffAchievement('UNISTAFF-x', 'a');

      expect(prisma.staffAchievement.update).not.toHaveBeenCalled();
    });
  });
});
