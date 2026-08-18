const {
  getCells,
  getDistricts,
  getSectors,
  getVillages,
} = require('../services/rwandaLocationService');

const districts = (req, res) =>
  res.status(200).json({ success: true, data: getDistricts() });

const sectors = (req, res) =>
  res.status(200).json({ success: true, data: getSectors(req.query.district) });

const cells = (req, res) =>
  res.status(200).json({
    success: true,
    data: getCells(req.query.district, req.query.sector),
  });

const villages = (req, res) =>
  res.status(200).json({
    success: true,
    data: getVillages(req.query.district, req.query.sector, req.query.cell),
  });

module.exports = { cells, districts, sectors, villages };
