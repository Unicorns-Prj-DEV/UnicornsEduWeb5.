import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isStudentId, isClassId, isStaffId, isLessonTaskId, isLessonResourceId, isLessonOutputId, isStaffLessonTaskId } from '../entity-id';

@Injectable()
export class ParseStudentIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isStudentId(value)) {
      throw new BadRequestException(
        `Invalid student id: "${String(value)}". Expected format: UNIST-xxxxxxxxxx`,
      );
    }
    return value;
  }
}

@Injectable()
export class ParseClassIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isClassId(value)) {
      throw new BadRequestException(
        `Invalid class id: "${String(value)}". Expected format: UNICL-xxxxxxxxxx`,
      );
    }
    return value;
  }
}

@Injectable()
export class ParseStaffIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isStaffId(value)) {
      throw new BadRequestException(
        `Invalid staff id: "${String(value)}". Expected format: UNISTAFF-xxxxxxxxxx`,
      );
    }
    return value;
  }
}

@Injectable()
export class ParseLessonTaskIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isLessonTaskId(value)) {
      throw new BadRequestException(
        `Invalid lesson task id: "${String(value)}". Expected format: UNILTK-xxxxxxxxxx`,
      );
    }
    return value;
  }
}

@Injectable()
export class ParseLessonResourceIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isLessonResourceId(value)) {
      throw new BadRequestException(
        `Invalid lesson resource id: "${String(value)}". Expected format: UNILRS-xxxxxxxxxx`,
      );
    }
    return value;
  }
}

@Injectable()
export class ParseLessonOutputIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isLessonOutputId(value)) {
      throw new BadRequestException(
        `Invalid lesson output id: "${String(value)}". Expected format: UNILOT-xxxxxxxxxx`,
      );
    }
    return value;
  }
}

@Injectable()
export class ParseStaffLessonTaskIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isStaffLessonTaskId(value)) {
      throw new BadRequestException(
        `Invalid staff lesson task id: "${String(value)}". Expected format: UNISLT-xxxxxxxxxx`,
      );
    }
    return value;
  }
}
