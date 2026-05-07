const router = require('express').Router();
const auth   = require('../middlewares/auth.middleware');
const ctrl   = require('../controllers/user.controller');

router.get  ('/technicians',            ctrl.getTechnicians);
router.get  ('/:id',                    ctrl.getUser);
router.patch('/me',         auth.protect, ctrl.updateMe);
router.patch('/me/plan',    auth.protect, auth.restrictTo('tecnico'), ctrl.updatePlan);
router.patch('/me/whatsapp',auth.protect, auth.restrictTo('tecnico'), ctrl.updateWhatsapp);
router.post ('/me/whatsapp/test', auth.protect, auth.restrictTo('tecnico'), ctrl.testWhatsapp);

module.exports = router;
