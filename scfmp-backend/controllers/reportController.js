const { Op } = require('sequelize');
const {
  Cooperative,
  Member,
  Farmer,
  Production,
  Product,
  Transaction,
  InventoryItem,
} = require('../models');

const REPORT_TEXT = {
  en: {
    members: 'Members Report', farmers: 'Farmers Report', production: 'Production Report',
    finance: 'Finance Report', inventory: 'Inventory Report', all: 'All cooperatives',
  },
  rw: {
    members: 'Raporo y’Abanyamuryango', farmers: 'Raporo y’Abahinzi', production: 'Raporo y’Umusaruro',
    finance: 'Raporo y’Imari', inventory: 'Raporo y’Ububiko', all: 'Amakoperative yose',
  },
  fr: {
    members: 'Rapport des membres', farmers: 'Rapport des agriculteurs', production: 'Rapport de production',
    finance: 'Rapport financier', inventory: 'Rapport d’inventaire', all: 'Toutes les coopératives',
  },
};

const LABELS = {
  en: {
    member_number: 'Member #', name: 'Name', gender: 'Gender', phone: 'Phone', address: 'Address',
    membership_date: 'Membership date', status: 'Status', cooperative: 'Cooperative', farm_size: 'Farm size (ha)',
    location: 'Location', crop_type: 'Crop type', product: 'Product', farmer: 'Farmer', quantity: 'Quantity',
    unit: 'Unit', unit_price: 'Unit price (RWF)', total_value: 'Total value (RWF)', season: 'Season',
    production_date: 'Production date', type: 'Type', category: 'Category', amount: 'Amount (RWF)',
    description: 'Description', transaction_date: 'Transaction date', item: 'Item', stock: 'Stock',
    reorder_level: 'Reorder level', unit_cost: 'Unit cost (RWF)', inventory_value: 'Inventory value (RWF)',
  },
  rw: {
    member_number: 'Nimero', name: 'Amazina', gender: 'Igitsina', phone: 'Telefoni', address: 'Aderesi',
    membership_date: 'Itariki yinjiyeho', status: 'Imimerere', cooperative: 'Koperative', farm_size: 'Ingano y’umurima (ha)',
    location: 'Aho uherereye', crop_type: 'Igihingwa', product: 'Igicuruzwa', farmer: 'Umuhinzi', quantity: 'Ingano',
    unit: 'Igipimo', unit_price: 'Igiciro kuri kimwe (RWF)', total_value: 'Agaciro kose (RWF)', season: 'Igihembwe',
    production_date: 'Itariki y’umusaruro', type: 'Ubwoko', category: 'Icyiciro', amount: 'Amafaranga (RWF)',
    description: 'Ibisobanuro', transaction_date: 'Itariki y’igikorwa', item: 'Igikoresho', stock: 'Ibisigaye',
    reorder_level: 'Urwego rwo kongera', unit_cost: 'Igiciro (RWF)', inventory_value: 'Agaciro k’ububiko (RWF)',
  },
  fr: {
    member_number: 'N° membre', name: 'Nom', gender: 'Genre', phone: 'Téléphone', address: 'Adresse',
    membership_date: 'Date d’adhésion', status: 'Statut', cooperative: 'Coopérative', farm_size: 'Surface (ha)',
    location: 'Localisation', crop_type: 'Culture', product: 'Produit', farmer: 'Agriculteur', quantity: 'Quantité',
    unit: 'Unité', unit_price: 'Prix unitaire (RWF)', total_value: 'Valeur totale (RWF)', season: 'Saison',
    production_date: 'Date de production', type: 'Type', category: 'Catégorie', amount: 'Montant (RWF)',
    description: 'Description', transaction_date: 'Date de transaction', item: 'Article', stock: 'Stock',
    reorder_level: 'Seuil de réapprovisionnement', unit_cost: 'Coût unitaire (RWF)', inventory_value: 'Valeur du stock (RWF)',
  },
};

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
  if (cooperativeId) where.cooperative_id = cooperativeId;
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
      gender: row.gender || '', phone: row.phone || '', address: row.address || '',
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
      phone: row.member.phone || '', farm_size: row.farm_size_ha || '', location: row.location || '',
      crop_type: row.crop_type || '', status: row.member.status,
      cooperative: row.member.cooperative?.name || '',
    })),
  };
};

const buildProduction = async (req, cooperativeId, language) => {
  const where = { ...dateWhere('production_date', req.query) };
  if (cooperativeId) where.cooperative_id = cooperativeId;
  if (req.user.role === 'farmer') where.farmer_id = await getOwnFarmerId(req.user.id);
  else if (req.query.farmer_id) where.farmer_id = Number(req.query.farmer_id);
  if (req.query.product_id) where.product_id = Number(req.query.product_id);
  if (req.query.season) where.season = req.query.season;
  if (req.query.status) where.status = req.query.status;
  const rows = await Production.findAll({
    where,
    include: [
      { model: Farmer, as: 'farmer', include: [{ model: Member, as: 'member', attributes: ['first_name', 'last_name'] }] },
      { model: Product, as: 'product', attributes: ['name'] },
      { model: Cooperative, as: 'cooperative', attributes: ['name'] },
    ],
    order: [['production_date', 'DESC']],
  });
  return {
    columns: columnSet(language, ['farmer', 'product', 'quantity', 'unit', 'unit_price', 'total_value', 'season', 'status', 'production_date', 'cooperative']),
    rows: rows.map((row) => ({
      farmer: row.farmer?.member ? `${row.farmer.member.first_name} ${row.farmer.member.last_name}` : '',
      product: row.product?.name || row.product_name, quantity: Number(row.quantity), unit: row.unit,
      unit_price: Number(row.unit_price), total_value: Number(row.total_amount), season: row.season || '',
      status: row.status, production_date: row.production_date, cooperative: row.cooperative?.name || '',
    })),
  };
};

const buildFinance = async (req, cooperativeId, language) => {
  const where = { ...dateWhere('transaction_date', req.query) };
  if (cooperativeId) where.cooperative_id = cooperativeId;
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
  if (cooperativeId) where.cooperative_id = cooperativeId;
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
      res.setHeader('Content-Disposition', `attachment; filename="scfmp-${moduleName}-${new Date().toISOString().slice(0, 10)}.csv"`);
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
