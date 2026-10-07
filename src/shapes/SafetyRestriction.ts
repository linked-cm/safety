import { Shape } from '@_linked/core/shapes/Shape';
import { literalProperty, objectProperty } from '@_linked/core/shapes/SHACL';
import { xsd } from '@_linked/xsd/ontologies/xsd';
import * as safety from '../ontologies/safety.js';
import { linkedShape } from '../package.js';

@linkedShape({
  description: 'A durable, host-enforced restriction on a subject.',
})
export class SafetyRestrictionShape extends Shape {
  static targetClass = safety.SafetyRestriction;

  @objectProperty({
    path: safety.restrictedSubject,
    required: true,
    maxCount: 1,
  })
  get restrictedSubject(): Shape {
    return undefined as any;
  }

  @literalProperty({
    path: safety.restrictionScope,
    datatype: xsd.string,
    required: true,
    maxCount: 1,
    in: [...safety.RESTRICTION_SCOPES],
  })
  get scope(): string {
    return '';
  }

  @literalProperty({
    path: safety.restrictionStatus,
    datatype: xsd.string,
    required: true,
    maxCount: 1,
    in: [...safety.RESTRICTION_STATUSES],
    defaultValue: 'active',
  })
  get status(): string {
    return 'active';
  }

  @literalProperty({
    path: safety.reasonCode,
    datatype: xsd.string,
    required: true,
    maxCount: 1,
    in: [...safety.REPORT_REASONS],
  })
  get reasonCode(): string {
    return '';
  }

  @literalProperty({
    path: safety.restrictionSource,
    datatype: xsd.string,
    required: true,
    maxCount: 1,
    in: [...safety.RESTRICTION_SOURCES],
  })
  get restrictionSource(): string {
    return '';
  }

  @literalProperty({
    path: safety.createdAt,
    datatype: xsd.dateTime,
    required: true,
    maxCount: 1,
  })
  get createdAt(): string {
    return '';
  }

  @literalProperty({
    path: safety.restrictionExpiresAt,
    datatype: xsd.dateTime,
    maxCount: 1,
  })
  get expiresAt(): string {
    return '';
  }

  @objectProperty({ path: safety.resolvedBy, maxCount: 1 })
  get resolvedBy(): Shape {
    return undefined as any;
  }

  @literalProperty({
    path: safety.resolvedAt,
    datatype: xsd.dateTime,
    maxCount: 1,
  })
  get resolvedAt(): string {
    return '';
  }
}
