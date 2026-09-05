const {
  getDocumentClassification,
  isValidDocumentClassification,
  normalizeOrganizationType,
} = require('../config/documentClassification');

describe('organization-aware document classification', () => {
  it('offers categories appropriate to each supported organization type', () => {
    expect(getDocumentClassification('cooperative').find((category) => category.id === 'meetings').types)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'general_assembly_minutes' })]));
    expect(getDocumentClassification('sme').find((category) => category.id === 'registration').types)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'business_registration' })]));
    expect(getDocumentClassification('school').find((category) => category.id === 'education').types)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'student_records' })]));
  });

  it('rejects category/type combinations from a different organization type', () => {
    expect(isValidDocumentClassification('cooperative', 'meetings', 'general_assembly_minutes')).toBe(true);
    expect(isValidDocumentClassification('sme', 'meetings', 'general_assembly_minutes')).toBe(false);
    expect(isValidDocumentClassification('ngo', 'finance', 'student_records')).toBe(false);
  });

  it('falls back unknown legacy organization types to a safe Other classification', () => {
    expect(normalizeOrganizationType('legacy-type')).toBe('other');
    expect(isValidDocumentClassification('legacy-type', 'other', 'other')).toBe(true);
  });
});
