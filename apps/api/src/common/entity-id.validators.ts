import { registerDecorator, ValidationOptions } from 'class-validator';
import {
  isStudentId,
  isClassId,
  isStaffId,
  isLessonTaskId,
  isLessonResourceId,
  isLessonOutputId,
  isStaffLessonTaskId,
} from './entity-id';

function makeEntityIdDecorator(
  name: string,
  check: (value: unknown) => boolean,
  example: string,
) {
  return function (validationOptions?: ValidationOptions & { each?: boolean }) {
    return function (object: object, propertyName: string) {
      registerDecorator({
        name,
        target: object.constructor,
        propertyName,
        options: {
          message: `${propertyName} must be a valid ${name} (e.g. ${example})`,
          ...validationOptions,
        },
        validator: {
          validate(value: unknown) {
            if (Array.isArray(value)) {
              return value.every((v) => check(v));
            }
            return check(value);
          },
        },
      });
    };
  };
}

export const IsStudentId = makeEntityIdDecorator(
  'IsStudentId',
  isStudentId,
  'UNIST-xxxxxxxxxx',
);

export const IsClassId = makeEntityIdDecorator(
  'IsClassId',
  isClassId,
  'UNICL-xxxxxxxxxx',
);

export const IsStaffId = makeEntityIdDecorator(
  'IsStaffId',
  isStaffId,
  'UNISTAFF-xxxxxxxxxx',
);

export const IsLessonTaskId = makeEntityIdDecorator(
  'IsLessonTaskId',
  isLessonTaskId,
  'UNILTK-xxxxxxxxxx',
);

export const IsLessonResourceId = makeEntityIdDecorator(
  'IsLessonResourceId',
  isLessonResourceId,
  'UNILRS-xxxxxxxxxx',
);

export const IsLessonOutputId = makeEntityIdDecorator(
  'IsLessonOutputId',
  isLessonOutputId,
  'UNILOT-xxxxxxxxxx',
);

export const IsStaffLessonTaskId = makeEntityIdDecorator(
  'IsStaffLessonTaskId',
  isStaffLessonTaskId,
  'UNISLT-xxxxxxxxxx',
);
