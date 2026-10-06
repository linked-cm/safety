import { linkedPackage } from '@_linked/core/utils/Package';

export const safetyPackageName = '@linked.cm/safety' as const;
export const safetyPackageBaseUri = 'https://linked.cm/' as const;

const registration = linkedPackage(safetyPackageName, { baseUri: safetyPackageBaseUri });

export const {
  getPackageShape,
  linkedOntology,
  linkedShape,
  linkedUtil,
  packageExports,
  packageMetadata,
  registerPackageExport,
  registerPackageModule,
} = registration;

export const packageName = registration.packageName;
