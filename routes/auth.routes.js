const router = require('express').Router();
const auth   = require('../middlewares/auth.middleware');
const ctrl   = require('../controllers/auth.controller');

router.post('/register',                  ctrl.register);
router.post('/login',                     ctrl.login);
router.get ('/me',       auth.protect,    ctrl.me);
router.post('/forgot-password',           ctrl.forgotPassword);
router.patch('/reset-password/:token',    ctrl.resetPassword);

module.exports = router;
