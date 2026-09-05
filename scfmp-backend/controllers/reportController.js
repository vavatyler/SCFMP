const { Op } = require('sequelize');
const {
  Cooperative,
  Member,
  Farmer,
  FarmerGroup,
  Production,
  Product,
  Transaction,
  InventoryItem,
} = require('../models');
const { formatMemberAddress } = require('../utils/memberAddress');
const { formatFarmSize } = require('../utils/farmSize');

const REPORT_TEXT = {
  en: {
    members: 'Members Report', farmers: 'Farmers Report', production: 'Production Report',
    finance: 'Finance Report', inventory: 'Inventory Report', all: 'All organizations',
  },
  rw: {
    members: 'Raporo y’Abanyamuryango', farmers: 'Raporo y’Abahinzi', production: 'Raporo y’Umusaruro',
    finance: 'Raporo y’Imari', inventory: 'Raporo y’Ububiko', all: 'Imiryango yose',
  },
  fr: {
    members: 'Rapport des membres', farmers: 'Rapport des agriculteurs', production: 'Rapport de production',
    finance: 'Rapport financier', inventory: 'Rapport d’inventaire', all: 'Toutes les organisations',
  },
};

const LABELS = {
  en: {
    member_number: 'Member #', name: 'Name', gender: 'Gender', phone: 'Phone', address: 'Member address',
    membership_date: 'Membership date', status: 'Status', cooperative: 'Organization', farm_size: 'Farm size',
    location: 'Farm location', crop_type: 'Crop type', product: 'Product', farmer: 'Farmer', quantity: 'Quantity',
    unit: 'Unit', unit_price: 'Unit price (RWF)', total_value: 'Total value (RWF)', season: 'Season',
    production_date: 'Production date', type: 'Type', category: 'Category', amount: 'Amount (RWF)',
    description: 'Description', transaction_date: 'Transaction date', item: 'Item', stock: 'Stock',
    reorder_level: 'Reorder level', unit_cost: 'Unit cost (RWF)', inventory_value: 'Inventory value (RWF)',
  },
  rw: {
    member_number: 'Nimero', name: 'Amazina', gender: 'Igitsina', phone: 'Telefoni', address: 'Aderesi',
    membership_date: 'Itariki yinjiyeho', status: 'Imimerere', cooperative: 'Umuryango', farm_size: 'Ingano y’umurima',
    location: 'Aho uherereye', crop_type: 'Igihingwa', product: 'Igicuruzwa', farmer: 'Umuhinzi', quantity: 'Ingano',
    unit: 'Igipimo', unit_price: 'Igiciro kuri kimwe (RWF)', total_value: 'Agaciro kose (RWF)', season: 'Igihembwe',
    production_date: 'Itariki y’umusaruro', type: 'Ubwoko', category: 'Icyiciro', amount: 'Amafaranga (RWF)',
    description: 'Ibisobanuro', transaction_date: 'Itariki y’igikorwa', item: 'Igikoresho', stock: 'Ibisigaye',
    reorder_level: 'Urwego rwo kongera', unit_cost: 'Igiciro (RWF)', inventory_value: 'Agaciro k’ububiko (RWF)',
  },
  fr: {
    member_number: 'N° membre', name: 'Nom', gender: 'Genre', phone: 'Téléphone', address: 'Adresse',
    membership_date: 'Date d’adhésion', status: 'Statut', cooperative: 'Organisation', farm_size: 'Surface',
    location: 'Localisation', crop_type: 'Culture', product: 'Produit', farmer: 'Agriculteur', quantity: 'Quantité',
    unit: 'Unité', unit_price: 'Prix unitaire (RWF)', total_value: 'Valeur totale (RWF)', season: 'Saison',
    production_date: 'Date de production', type: 'Type', category: 'Catégorie', amount: 'Montant (RWF)',
    description: 'Description', transaction_date: 'Date de transaction', item: 'Article', stock: 'Stock',
    reorder_level: 'Seuil de réapprovisionnement', unit_cost: 'Coût unitaire (RWF)', inventory_value: 'Valeur du stock (RWF)',
  },
};

LABELS.rw.address = "Aderesi y'umunyamuryango";
LABELS.rw.location = 'Aho umurima uherereye';
LABELS.fr.address = 'Adresse du membre';
LABELS.fr.location = 'Emplacement agricole';
Object.assign(LABELS.en, {
  production_mode: 'Production mode',
  expected_production: 'Expected production',
  production_location: 'Production location',
  harvest_date: 'Harvest date',
  notes: 'Notes',
  reporting_period: 'Reporting period', variety: 'Variety', production_category: 'Production category',
  quality_grade: 'Quality / grade', storage_location: 'Storage location', storage_quantity: 'Storage quantity',
  sold_quantity: 'Sold quantity', remaining_quantity: 'Remaining quantity', buyer: 'Buyer',
});
Object.assign(LABELS.rw, {
  production_mode: 'Uburyo bw’umusaruro',
  expected_production: 'Umusaruro witezwe',
  production_location: 'Aho umusaruro ukorerwa',
  harvest_date: 'Itariki yo gusarura',
  notes: 'Ibisobanuro',
  reporting_period: 'Igihe cya raporo', variety: 'Ubwoko', production_category: 'Icyiciro cy’umusaruro',
  quality_grade: 'Ubwiza / urwego', storage_location: 'Aho ubitswe', storage_quantity: 'Ingano ibitswe',
  sold_quantity: 'Ingano yagurishijwe', remaining_quantity: 'Ingano isigaye', buyer: 'Umuguzi',
});
Object.assign(LABELS.fr, {
  production_mode: 'Mode de production',
  expected_production: 'Production prévue',
  production_location: 'Lieu de production',
  harvest_date: 'Date de récolte',
  notes: 'Notes',
  reporting_period: 'Période de rapport', variety: 'Variété', production_category: 'Catégorie de production',
  quality_grade: 'Qualité / grade', storage_location: 'Lieu de stockage', storage_quantity: 'Quantité stockée',
  sold_quantity: 'Quantité vendue', remaining_quantity: 'Quantité restante', buyer: 'Acheteur',
});

const columnSet = (language, keys) => keys.map((key) => ({ key, label: LABELS[language][key] }));

const resolveCooperativeId = (req) => {
  if (req.user.role === 'super_admin') return req.query.cooperative_id ? Number(req.query.cooperative_id) : null;
  return req.user.cooperative_id;
};

const dateWhere = (field, { from, to }) => {
  if (!from && !to) return {};
  const range = {};
  if (from) range[Op.gte] = from;
  if (to) range[Op.lte] = to;
  return { [field]: range };
};

const memberScope = (req, cooperativeId) => {
  const where = {};
  if (req.user.role !== 'super_admin' || cooperativeId) {
    where.cooperative_id = cooperativeId;
  }
  if (req.user.role === 'farmer') where.user_id = req.user.id;
  if (req.query.status) where.status = req.query.status;
  if (req.query.search) {
    where[Op.or] = [
      { first_name: { [Op.like]: `%${req.query.search}%` } },
      { last_name: { [Op.like]: `%${req.query.search}%` } },
      { phone: { [Op.like]: `%${req.query.search}%` } },
    ];
  }
  return where;
};

const getOwnFarmerId = async (userId) => {
  const farmer = await Farmer.findOne({
    include: [{ model: Member, as: 'member', required: true, where: { user_id: userId } }],
  });
  return farmer?.id || -1;
};

const buildMembers = async (req, cooperativeId, language) => {
  const rows = await Member.findAll({
    where: memberScope(req, cooperativeId),
    include: [{ model: Cooperative, as: 'cooperative', attributes: ['name'] }],
    order: [['last_name', 'ASC'], ['first_name', 'ASC']],
  });
  return {
    columns: columnSet(language, ['member_number', 'name', 'gender', 'phone', 'address', 'membership_date', 'status', 'cooperative']),
    rows: rows.map((row) => ({
      member_number: row.id,
      name: `${row.first_name} ${row.last_name}`,
      gender: row.gender || '', phone: row.phone || '', address: formatMemberAddress(row),
      membership_date: row.membership_date || '', status: row.status,
      cooperative: row.cooperative?.name || '',
    })),
  };
};

const buildFarmers = async (req, cooperativeId, language) => {
  const rows = await Farmer.findAll({
    include: [{
      model: Member, as: 'member', required: true, where: memberScope(req, cooperativeId),
      include: [{ model: Cooperative, as: 'cooperative', attributes: ['name'] }],
    }],
    order: [['created_at', 'DESC']],
  });
  return {
    columns: columnSet(language, ['member_number', 'name', 'phone', 'farm_size', 'location', 'crop_type', 'status', 'cooperative']),
    rows: rows.map((row) => ({
      member_number: row.member_id, name: `${row.member.first_name} ${row.member.last_name}`,
      phone: row.member.phone || '', farm_size: formatFarmSize(row), location: row.location || '',
      crop_type: row.crop_type || '', status: row.member.status,
      cooperative: row.member.cooperative?.name || '',
    })),
  };
};

const buildProduction = async (req, cooperativeId, language) => {
  const where = { ...dateWhere('production_date', req.query) };
  if (req.user.role !== 'super_admin' || cooperativeId) {
    where.cooperative_id = cooperativeId;
  }
  if (req.user.role === 'farmer') where.farmer_id = await getOwnFarmerId(req.user.id);
  else if (req.query.farmer_id) where.farmer_id = Number(req.query.farmer_id);
  if (req.query.production_mode) where.production_mode = req.query.production_mode;
  if (req.query.farmer_group_id && req.user.role !== 'farmer') {
    where.farmer_group_id = Number(req.query.farmer_group_id);
  }
  if (req.query.product_id) where.product_id = Number(req.query.product_id);
  if (req.query.season) where.season = req.query.season;
  if (req.query.status) where.status = req.query.status;
  const rows = await Production.findAll({
    where,
    include: [
      { model: Farmer, as: 'farmer', include: [{ model: Member, as: 'member', attributes: ['first_name', 'last_name'] }] },
      { model: FarmerGroup, as: 'farmerGroup', attributes: ['name'] },
      { model: Product, as: 'product', attributes: ['name'] },
      { model: Cooperative, as: 'cooperative', attributes: ['name'] },
    ],
    order: [['production_date', 'DESC']],
  });
  return {
    columns: columnSet(language, [
      'production_mode', 'farmer', 'product', 'expected_production', 'quantity', 'unit',
      'unit_price', 'total_value', 'season', 'reporting_period', 'variety', 'production_category',
      'production_location', 'harvest_date', 'quality_grade', 'storage_location', 'storage_quantity',
      'sold_quantity', 'remaining_quantity', 'buyer', 'status', 'notes', 'cooperative',
    ]),
    rows: rows.map((row) => ({
      production_mode: row.production_mode,
      farmer: row.production_mode === 'group'
        ? row.farmerGroup?.name || ''
        : (row.farmer?.member ? `${row.farmer.member.first_name} ${row.farmer.member.last_name}` : ''),
      product: row.product?.name || row.product_name,
      expected_production: row.expected_production == null ? '' : Number(row.expected_production),
      quantity: Number(row.actual_harvest ?? row.quantity), unit: row.unit,
      unit_price: Number(row.unit_price), total_value: Number(row.total_amount), season: row.season || '',
      reporting_period: row.reporting_period || '', variety: row.variety || '',
      production_category: row.production_category || '',
      production_location: row.production_location || '',
      harvest_date: row.harvest_date || row.production_date,
      quality_grade: row.quality_grade || '', storage_location: row.storage_location || '',
      storage_quantity: row.storage_quantity == null ? '' : Number(row.storage_quantity),
      sold_quantity: Number(row.sold_quantity || 0),
      remaining_quantity: row.remaining_quantity == null ? '' : Number(row.remaining_quantity),
      buyer: row.buyer || '',
      status: row.status,
      notes: row.notes || '',
      cooperative: row.cooperative?.name || '',
    })),
  };
};

const buildFinance = async (req, cooperativeId, language) => {
  const where = { ...dateWhere('transaction_date', req.query) };
  if (req.user.role !== 'super_admin' || cooperativeId) {
    where.cooperative_id = cooperativeId;
  }
  if (req.query.type) where.type = req.query.type;
  if (req.user.role === 'farmer') {
    const member = await Member.findOne({ where: { user_id: req.user.id } });
    where.member_id = member?.id || -1;
  } else if (req.query.member_id) where.member_id = Number(req.query.member_id);
  const rows = await Transaction.findAll({
    where,
    include: [
      { model: Member, as: 'member', attributes: ['first_name', 'last_name'] },
      { model: Cooperative, as: 'cooperative', attributes: ['name'] },
    ],
    order: [['transaction_date', 'DESC']],
  });
  return {
    columns: columnSet(language, ['transaction_date', 'type', 'category', 'name', 'amount', 'description', 'cooperative']),
    rows: rows.map((row) => ({
      transaction_date: row.transaction_date, type: row.type, category: row.category || '',
      name: row.member ? `${row.member.first_name} ${row.member.last_name}` : '',
      amount: Number(row.amount), description: row.description || '', cooperative: row.cooperative?.name || '',
    })),
  };
};

const buildInventory = async (req, cooperativeId, language) => {
  const where = {};
  if (req.user.role !== 'super_admin' || cooperativeId) {
    where.cooperative_id = cooperativeId;
  }
  if (req.query.category) where.category = req.query.category;
  if (req.query.status) where.status = req.query.status;
  if (req.query.search) where.item_name = { [Op.like]: `%${req.query.search}%` };
  const rows = await InventoryItem.findAll({
    where,
    include: [{ model: Cooperative, as: 'cooperative', attributes: ['name'] }],
    order: [['item_name', 'ASC']],
  });
  return {
    columns: columnSet(language, ['item', 'category', 'stock', 'unit', 'reorder_level', 'unit_cost', 'inventory_value', 'status', 'cooperative']),
    rows: rows.map((row) => ({
      item: row.item_name, category: row.category, stock: Number(row.quantity_in_stock), unit: row.unit,
      reorder_level: Number(row.reorder_level), unit_cost: Number(row.unit_cost || 0),
      inventory_value: Number(row.quantity_in_stock) * Number(row.unit_cost || 0), status: row.status,
      cooperative: row.cooperative?.name || '',
    })),
  };
};

const builders = { members: buildMembers, farmers: buildFarmers, production: buildProduction, finance: buildFinance, inventory: buildInventory };

const safeCsvValue = (value) => {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const download = async (req, res) => {
  try {
    const moduleName = req.params.module;
    if (!builders[moduleName]) return res.status(404).json({ success: false, message: 'Unknown report module' });
    const language = ['en', 'rw', 'fr'].includes(req.query.language) ? req.query.language : req.user.preferred_language || 'en';
    const cooperativeId = resolveCooperativeId(req);
    const cooperative = cooperativeId ? await Cooperative.findByPk(cooperativeId, { attributes: ['name'] }) : null;
    const report = await builders[moduleName](req, cooperativeId, language);
    const metadata = {
      module: moduleName,
      title: REPORT_TEXT[language][moduleName],
      cooperative: cooperative?.name || REPORT_TEXT[language].all,
      generated_at: new Date().toISOString(),
      generated_by: `${req.user.first_name} ${req.user.last_name}`,
      language,
      filters: Object.fromEntries(Object.entries(req.query).filter(([key]) => !['format', 'language'].includes(key))),
      record_count: report.rows.length,
    };

    if (req.query.format === 'csv') {
      const csvRows = [
        [metadata.title],
        [metadata.cooperative],
        [`Generated: ${metadata.generated_at}`],
        [`Generated by: ${metadata.generated_by}`],
        [],
        report.columns.map((column) => column.label),
        ...report.rows.map((row) => report.columns.map((column) => row[column.key])),
      ];
      const csv = `\uFEFF${csvRows.map((row) => row.map(safeCsvValue).join(',')).join('\r\n')}`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="agribridge-${moduleName}-${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.status(200).send(csv);
    }

    return res.status(200).json({ success: true, data: { metadata, ...report } });
  } catch (err) {
    console.error('Report generation failed:', err.message);
    return res.status(500).json({ success: false, message: 'Unable to generate the report right now' });
  }
};

module.exports = {
  download,
  _private: { safeCsvValue, REPORT_TEXT, LABELS },
};
