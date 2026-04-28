const router = require('express').Router();
const auth   = require('../middlewares/auth.middleware');
const ctrl   = require('../controllers/notification.controller');

router.get ('/',              auth.protect, ctrl.getNotifications);
router.patch('/read-all',     auth.protect, ctrl.readAll);
router.patch('/:id/read',     auth.protect, ctrl.readOne);

module.exports = router;
