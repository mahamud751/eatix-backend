import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsBangladeshPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isBangladeshPhoneNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const PHONE_REGEX = /^(\+8801[3-9]\d{8}|01[3-9]\d{8})$/;
          return typeof value === 'string' && PHONE_REGEX.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return 'Invalid Bangladesh phone number';
        },
      },
    });
  };
}
