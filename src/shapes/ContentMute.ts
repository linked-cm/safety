import { Shape } from '@_linked/core/shapes/Shape';
import { literalProperty, objectProperty } from '@_linked/core/shapes/SHACL';
import { xsd } from '@_linked/xsd/ontologies/xsd';
import * as safety from '../ontologies/safety.js';
import { linkedShape } from '../package.js';

@linkedShape({ description: 'A viewer preference to hide content carrying a host-defined label.' })
export class ContentMuteShape extends Shape {
  static targetClass = safety.ContentMute;

  @objectProperty({ path: safety.mutedBy, required: true, maxCount: 1 })
  get mutedBy(): Shape { return undefined as any; }

  @literalProperty({ path: safety.mutedLabel, datatype: xsd.string, required: true, maxCount: 1 })
  get label(): string { return ''; }

  @literalProperty({ path: safety.createdAt, datatype: xsd.dateTime, required: true, maxCount: 1 })
  get createdAt(): string { return ''; }

  @literalProperty({ path: safety.muteActive, datatype: xsd.boolean, required: true, maxCount: 1, defaultValue: true })
  get active(): boolean { return true; }
}
