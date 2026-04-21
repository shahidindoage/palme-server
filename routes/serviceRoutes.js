const express = require('express');
const router = express.Router();
const { getCategories, getServices, getServiceById, getTherapists } = require('../controllers/serviceController');

router.get('/categories', getCategories);
router.get('/services', getServices);
router.get('/services/:id', getServiceById);
router.get('/therapists', getTherapists);

module.exports = router;
