import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { isStudentId, isClassId, isStaffId } from './entity-id';

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
          validate(value: unknown, args: ValidationArguments) {
            if (args.constraints?.[0]?.each) {
              return Array.isArray(value) && value.every((v) => check(v));
            }
            if (validationOptions?.each) {
              return Array.isArray(value) && value.every((v) => check(v));
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
  'UNIST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
);

export const IsClassId = makeEntityIdDecorator(
  'IsClassId',
  isClassId,
  'UNICL-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
);

export const IsStaffId = makeEntityIdDecorator(
  'IsStaffId',
  isStaffId,
  'UNISTAFF-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
);
