const router = require('express').Router();
const auth   = require('../middlewares/auth.middleware');
const ctrl   = require('../controllers/service.controller');

router.post('/',                    auth.protect, auth.restrictTo('cliente'), ctrl.createService);
router.get ('/my',                  auth.protect,                             ctrl.myServices);
router.get ('/pending',             auth.protect, auth.restrictTo('tecnico'), ctrl.pendingServices);
router.patch('/:id/accept',         auth.protect, auth.restrictTo('tecnico'), ctrl.acceptService);
router.patch('/:id/status',         auth.protect,                             ctrl.updateStatus);

module.exports = router;
