const router = require('express').Router();
const ctrl   = require('../controllers/plan.controller');

router.get  ('/',     ctrl.getPlans);
router.post ('/seed', ctrl.seedPlans); // solo desarrollo

module.exports = router;
