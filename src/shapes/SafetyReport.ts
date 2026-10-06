import { Shape } from '@_linked/core/shapes/Shape';
import { literalProperty, objectProperty } from '@_linked/core/shapes/SHACL';
import { xsd } from '@_linked/xsd/ontologies/xsd';
import * as safety from '../ontologies/safety.js';
import { linkedShape } from '../package.js';

@linkedShape({ description: 'A durable user report and its moderation lifecycle.' })
export class SafetyReportShape extends Shape {
  static targetClass = safety.SafetyReport;

  @objectProperty({ path: safety.reportedBy, required: true, maxCount: 1 })
  get reportedBy(): Shape { return undefined as any; }

  @objectProperty({ path: safety.reportTarget, required: true, maxCount: 1 })
  get target(): Shape { return undefined as any; }

  @literalProperty({ path: safety.targetKind, datatype: xsd.string, required: true, maxCount: 1, in: [...safety.REPORT_TARGET_KINDS] })
  get targetKind(): string { return ''; }

  @literalProperty({ path: safety.reasonCode, datatype: xsd.string, required: true, maxCount: 1, in: [...safety.REPORT_REASONS] })
  get reasonCode(): string { return ''; }

  @literalProperty({ path: safety.inPersonIncident, datatype: xsd.boolean, maxCount: 1 })
  get inPersonIncident(): boolean { return false; }

  @literalProperty({ path: safety.reportDetail, datatype: xsd.string, maxCount: 1 })
  get detail(): string { return ''; }

  @literalProperty({ path: safety.createdAt, datatype: xsd.dateTime, required: true, maxCount: 1 })
  get createdAt(): string { return ''; }

  @literalProperty({ path: safety.reportStatus, datatype: xsd.string, required: true, maxCount: 1, in: [...safety.REPORT_STATUSES], defaultValue: 'open' })
  get reportStatus(): string { return 'open'; }

  @objectProperty({ path: safety.resolvedBy, maxCount: 1 })
  get resolvedBy(): Shape { return undefined as any; }

  @literalProperty({ path: safety.resolvedAt, datatype: xsd.dateTime, maxCount: 1 })
  get resolvedAt(): string { return ''; }

  @literalProperty({ path: safety.resolution, datatype: xsd.string, maxCount: 1, in: [...safety.REPORT_RESOLUTIONS] })
  get resolution(): string { return ''; }

  @literalProperty({ path: safety.legalHold, datatype: xsd.boolean, maxCount: 1 })
  get legalHold(): boolean { return false; }
}
