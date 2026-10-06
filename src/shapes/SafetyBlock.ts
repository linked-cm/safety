import { Shape } from '@_linked/core/shapes/Shape';
import { literalProperty, objectProperty } from '@_linked/core/shapes/SHACL';
import { xsd } from '@_linked/xsd/ontologies/xsd';
import * as safety from '../ontologies/safety.js';
import { linkedShape } from '../package.js';

@linkedShape({ description: 'A silent, bilateral-visibility block between two subjects.' })
export class SafetyBlockShape extends Shape {
  static targetClass = safety.SafetyBlock;

  @objectProperty({ path: safety.blockedBy, required: true, maxCount: 1 })
  get blockedBy(): Shape { return undefined as any; }

  @objectProperty({ path: safety.blockedSubject, required: true, maxCount: 1 })
  get blocked(): Shape { return undefined as any; }

  @literalProperty({ path: safety.createdAt, datatype: xsd.dateTime, required: true, maxCount: 1 })
  get createdAt(): string { return ''; }

  @literalProperty({ path: safety.blockActive, datatype: xsd.boolean, required: true, maxCount: 1, defaultValue: true })
  get active(): boolean { return true; }

  @literalProperty({ path: safety.avoidFutureInteraction, datatype: xsd.boolean, maxCount: 1 })
  get avoidFutureInteraction(): boolean { return false; }
}
