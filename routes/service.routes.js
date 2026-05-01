const router = require('express').Router();
const auth   = require('../middlewares/auth.middleware');
const ctrl   = require('../controllers/service.controller');

router.post ('/',                      auth.protect, auth.restrictTo('cliente'), ctrl.createService);
router.get  ('/my',                    auth.protect,                             ctrl.myServices);
router.get  ('/pending',               auth.protect, auth.restrictTo('tecnico'), ctrl.pendingServices);
router.get  ('/:id',                   auth.protect,                             ctrl.getService);
router.patch('/:id/quote',             auth.protect, auth.restrictTo('tecnico'), ctrl.quoteService);
router.patch('/:id/respond',           auth.protect, auth.restrictTo('cliente'), ctrl.respondQuote);
router.patch('/:id/status',            auth.protect,                             ctrl.updateStatus);
router.patch('/:id/tech-location',     auth.protect, auth.restrictTo('tecnico'), ctrl.updateTechLocation);

module.exports = router;
