import { Shape } from '@_linked/core/shapes/Shape';
import { literalProperty, objectProperty } from '@_linked/core/shapes/SHACL';
import { xsd } from '@_linked/xsd/ontologies/xsd';
import * as safety from '../ontologies/safety.js';
import { linkedShape } from '../package.js';

@linkedShape({ description: 'A silent, one-way, optionally expiring subject mute.' })
export class SafetyMuteShape extends Shape {
  static targetClass = safety.SafetyMute;

  @objectProperty({ path: safety.mutedBy, required: true, maxCount: 1 })
  get mutedBy(): Shape { return undefined as any; }

  @objectProperty({ path: safety.mutedSubject, required: true, maxCount: 1 })
  get muted(): Shape { return undefined as any; }

  @literalProperty({ path: safety.createdAt, datatype: xsd.dateTime, required: true, maxCount: 1 })
  get createdAt(): string { return ''; }

  @literalProperty({ path: safety.muteUntil, datatype: xsd.dateTime, maxCount: 1 })
  get until(): string { return ''; }

  @literalProperty({ path: safety.muteActive, datatype: xsd.boolean, required: true, maxCount: 1, defaultValue: true })
  get active(): boolean { return true; }
}
