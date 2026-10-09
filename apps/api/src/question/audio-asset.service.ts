import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRole } from 'generated/enums';
import { PrismaService } from '../prisma/prisma.service';
import type { LmsProfileConfig } from '../lms-profile/lms-profile';
import { LmsProfileService } from '../lms-profile/lms-profile.service';
import { CourseAccessService } from '../class/course-access.service';
import type { AudioRefDto } from '../dtos/audio-asset.dto';
import { QUESTION_AUDIO_STORAGE_BUCKET } from '../storage/media-buckets';
import {
  tryGetSupabaseAdminClient,
  uploadStorageObject,
} from '../storage/supabase-storage';
import { audioExtension, audioFileError } from './audio-rules';

/** Đủ dài cho một lượt làm bài; trang tải lại sẽ nhận URL mới. */
const AUDIO_URL_TTL_SECONDS = 6 * 60 * 60;
const ORIGINAL_NAME_MAX = 200;

export type AudioUploadFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
};

type AudioActor = { userId?: string; roleType?: UserRole };

async function signAudioPaths(paths: string[]): Promise<Map<string, string>> {
  const supabase = tryGetSupabaseAdminClient();
  if (!supabase || paths.length === 0) return new Map();
  const { data, error } = await supabase.storage
    .from(QUESTION_AUDIO_STORAGE_BUCKET)
    .createSignedUrls(paths, AUDIO_URL_TTL_SECONDS);
  if (error || !data) return new Map();
  return new Map(
    data.flatMap((d) =>
      d.path && d.signedUrl && !d.error ? [[d.path, d.signedUrl] as const] : [],
    ),
  );
}

/**
 * Audio theo id kèm signed URL (một lần gọi storage cho cả lô). Chỉ gọi từ
 * endpoint đã kiểm quyền xem câu — học sinh chỉ nhận URL audio của câu mình xem.
 */
export async function resolveAudioRefs(
  prisma: PrismaService,
  ids: Array<string | null | undefined>,
): Promise<Map<string, AudioRefDto>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();
  const rows = await prisma.audioAsset.findMany({
    where: { id: { in: unique } },
    select: { id: true, storagePath: true, originalName: true },
  });
  const urls = await signAudioPaths(rows.map((r) => r.storagePath));
  return new Map(
    rows.map((r) => [
      r.id,
      {
        id: r.id,
        originalName: r.originalName,
        url: urls.get(r.storagePath) ?? null,
      },
    ]),
  );
}

/** Gắn `audio` (id + URL) vào từng dòng có `audioId`. */
export async function withAudioRefs<T extends { audioId: string | null }>(
  prisma: PrismaService,
  rows: T[],
): Promise<Array<T & { audio: AudioRefDto | null }>> {
  const refs = await resolveAudioRefs(
    prisma,
    rows.map((r) => r.audioId),
  );
  return rows.map((r) => ({
    ...r,
    audio: r.audioId ? (refs.get(r.audioId) ?? null) : null,
  }));
}

/**
 * Gắn audio vào câu / tư liệu: hồ sơ phải bật và audio cùng khoá.
 * `undefined` = không đổi, `null` = gỡ audio (luôn hợp lệ).
 */
export async function assertAudioAttachable(
  prisma: PrismaService,
  profile: LmsProfileConfig,
  audioId: string | null | undefined,
  courseId: string,
): Promise<void> {
  if (audioId == null) return;
  if (!profile.questionAudio) {
    throw new BadRequestException('Hồ sơ môn này không dùng audio.');
  }
  const audio = await prisma.audioAsset.findUnique({
    where: { id: audioId },
    select: { courseId: true },
  });
  if (!audio || audio.courseId !== courseId) {
    throw new BadRequestException('Audio không thuộc khoá của câu hỏi.');
  }
}

/** Multer đọc tên file UTF-8 như latin1 — đổi lại để giữ tên tiếng Nhật/Việt. */
function decodeOriginalName(name: string | undefined): string {
  if (!name) return 'audio';
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return (decoded.includes('�') ? name : decoded).slice(0, ORIGINAL_NAME_MAX);
}

@Injectable()
export class AudioAssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courseAccess: CourseAccessService,
    private readonly lmsProfile: LmsProfileService = new LmsProfileService(),
  ) {}

  /** Tải audio lên bucket private; asset bất biến (thay audio = tải bản mới). */
  async upload(
    courseId: string,
    file: AudioUploadFile | undefined,
    actor: AudioActor,
  ): Promise<AudioRefDto> {
    if (!this.lmsProfile.config.questionAudio) {
      throw new BadRequestException('Hồ sơ môn này không dùng audio.');
    }
    if (!actor.userId) {
      throw new BadRequestException('Missing actor for audio upload');
    }
    await this.courseAccess.assertCourseExists(courseId);
    const courseActor = await this.courseAccess.resolveActor(
      actor.userId,
      actor.roleType ?? UserRole.staff,
    );
    await this.courseAccess.assertCanWriteCourseQuestions(
      courseActor,
      courseId,
    );
    const error = audioFileError(file);
    if (error || !file) throw new BadRequestException(error);

    const id = randomUUID();
    const storagePath = `${courseId}/${id}.${audioExtension(file.mimetype)}`;
    await uploadStorageObject({
      bucket: QUESTION_AUDIO_STORAGE_BUCKET,
      path: storagePath,
      body: file.buffer,
      contentType: file.mimetype,
      upsert: false,
    });
    const row = await this.prisma.audioAsset.create({
      data: {
        id,
        courseId,
        storagePath,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        originalName: decodeOriginalName(file.originalname),
      },
    });
    const refs = await resolveAudioRefs(this.prisma, [row.id]);
    return (
      refs.get(row.id) ?? { id, originalName: row.originalName, url: null }
    );
  }
}
