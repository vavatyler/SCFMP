const OTHER_TYPE = { id: 'other', label: 'Other' };

const categories = {
  registration: 'Registration',
  governance: 'Governance',
  meetings: 'Meetings',
  membership: 'Membership',
  finance: 'Financial',
  strategy: 'Strategy & Planning',
  operations: 'Operations',
  legal: 'Legal & Compliance',
  people: 'People & Records',
  projects: 'Projects & Programs',
  education: 'Academic & School Records',
  other: 'Other',
};

const type = (id, label) => ({ id, label });
const category = (id, types) => ({ id, label: categories[id], types });

const DOCUMENT_CLASSIFICATION = Object.freeze({
  cooperative: [
    category('registration', [type('cooperative_registration_certificate', 'Cooperative Registration Certificate'), type('certificates', 'Certificates')]),
    category('governance', [type('cooperative_bylaws_constitution', 'Cooperative Bylaws / Constitution'), type('policies', 'Policies')]),
    category('meetings', [type('general_assembly_minutes', 'General Assembly Minutes'), type('board_meeting_minutes', 'Board Meeting Minutes'), type('management_meeting_minutes', 'Management Meeting Minutes'), type('meeting_agenda', 'Meeting Agenda'), type('annual_general_meeting_documents', 'Annual General Meeting Documents')]),
    category('membership', [type('member_register', 'Member Register'), type('membership_documents', 'Membership Documents')]),
    category('finance', [type('financial_reports', 'Financial Reports'), type('audit_reports', 'Audit Reports')]),
    category('strategy', [type('annual_reports', 'Annual Reports'), type('strategic_plan', 'Strategic Plan'), type('business_plan', 'Business Plan')]),
    category('operations', [type('production_reports', 'Production Reports')]),
    category('legal', [type('contracts_agreements', 'Contracts / Agreements'), type('government_correspondence', 'Government Correspondence')]),
    category('other', [OTHER_TYPE]),
  ],
  farmer_group: [
    category('registration', [type('group_registration', 'Group Registration'), type('certificates', 'Certificates')]),
    category('governance', [type('group_constitution', 'Group Constitution'), type('group_rules', 'Group Rules')]),
    category('meetings', [type('meeting_minutes', 'Meeting Minutes'), type('meeting_agenda', 'Meeting Agenda'), type('attendance_records', 'Attendance Records')]),
    category('membership', [type('member_register', 'Member Register')]),
    category('finance', [type('financial_records', 'Financial Records')]),
    category('strategy', [type('annual_reports', 'Annual Reports')]),
    category('operations', [type('production_records', 'Production Records'), type('training_documents', 'Training Documents')]),
    category('legal', [type('agreements', 'Agreements')]),
    category('other', [OTHER_TYPE]),
  ],
  sme: [
    category('registration', [type('business_registration', 'Business Registration'), type('business_license', 'Business License'), type('certificates', 'Certificates')]),
    category('governance', [type('company_policies', 'Company Policies')]),
    category('meetings', [type('board_minutes', 'Board Minutes'), type('meeting_minutes', 'Meeting Minutes')]),
    category('finance', [type('financial_statements', 'Financial Statements'), type('invoices', 'Invoices')]),
    category('strategy', [type('business_plan', 'Business Plan'), type('annual_reports', 'Annual Reports')]),
    category('legal', [type('tax_documents', 'Tax Documents'), type('contracts', 'Contracts'), type('compliance_documents', 'Compliance Documents')]),
    category('people', [type('employee_documents', 'Employee Documents')]),
    category('other', [OTHER_TYPE]),
  ],
  ngo: [
    category('registration', [type('registration_certificate', 'Registration Certificate'), type('certificates', 'Certificates')]),
    category('governance', [type('constitution', 'Constitution'), type('policies', 'Policies')]),
    category('meetings', [type('board_minutes', 'Board Minutes'), type('meeting_minutes', 'Meeting Minutes'), type('meeting_agenda', 'Meeting Agenda')]),
    category('finance', [type('financial_reports', 'Financial Reports')]),
    category('strategy', [type('annual_reports', 'Annual Reports'), type('strategic_plan', 'Strategic Plan')]),
    category('projects', [type('project_documents', 'Project Documents'), type('monitoring_evaluation_reports', 'Monitoring & Evaluation Reports')]),
    category('legal', [type('donor_agreements', 'Donor Agreements')]),
    category('other', [OTHER_TYPE]),
  ],
  school: [
    category('registration', [type('registration_documents', 'Registration Documents'), type('certificates', 'Certificates')]),
    category('governance', [type('school_policies', 'School Policies')]),
    category('meetings', [type('meeting_minutes', 'Meeting Minutes'), type('meeting_agenda', 'Meeting Agenda')]),
    category('finance', [type('financial_reports', 'Financial Reports')]),
    category('strategy', [type('strategic_plan', 'Strategic Plan')]),
    category('education', [type('academic_reports', 'Academic Reports'), type('student_records', 'Student Records')]),
    category('people', [type('staff_documents', 'Staff Documents')]),
    category('legal', [type('government_correspondence', 'Government Correspondence')]),
    category('other', [OTHER_TYPE]),
  ],
  association: [
    category('registration', [type('registration_certificate', 'Registration Certificate'), type('certificates', 'Certificates')]),
    category('governance', [type('constitution', 'Constitution'), type('bylaws', 'Bylaws'), type('policies', 'Policies')]),
    category('meetings', [type('meeting_minutes', 'Meeting Minutes'), type('meeting_agenda', 'Meeting Agenda')]),
    category('membership', [type('member_register', 'Member Register')]),
    category('finance', [type('financial_reports', 'Financial Reports')]),
    category('strategy', [type('annual_reports', 'Annual Reports'), type('strategic_plan', 'Strategic Plan')]),
    category('legal', [type('contracts', 'Contracts')]),
    category('other', [OTHER_TYPE]),
  ],
  other: [category('other', [OTHER_TYPE])],
});

const normalizeOrganizationType = (value) => (
  Object.prototype.hasOwnProperty.call(DOCUMENT_CLASSIFICATION, value) ? value : 'other'
);

const getDocumentClassification = (organizationType) => (
  DOCUMENT_CLASSIFICATION[normalizeOrganizationType(organizationType)]
);

const isValidDocumentClassification = (organizationType, categoryId, documentTypeId) => {
  const selectedCategory = getDocumentClassification(organizationType)
    .find((item) => item.id === categoryId);
  return Boolean(selectedCategory?.types.some((item) => item.id === documentTypeId));
};

module.exports = {
  DOCUMENT_CLASSIFICATION,
  getDocumentClassification,
  isValidDocumentClassification,
  normalizeOrganizationType,
};
