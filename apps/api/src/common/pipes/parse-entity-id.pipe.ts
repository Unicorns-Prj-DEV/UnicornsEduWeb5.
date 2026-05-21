import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isStudentId, isClassId, isStaffId } from '../entity-id';

@Injectable()
export class ParseStudentIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isStudentId(value)) {
      throw new BadRequestException(
        `Invalid student id: "${value}". Expected format: UNIST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`,
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
        `Invalid class id: "${value}". Expected format: UNICL-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`,
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
        `Invalid staff id: "${value}". Expected format: UNISTAFF-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`,
      );
    }
    return value;
  }
}
