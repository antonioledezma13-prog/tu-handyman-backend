const router = require('express').Router();
const auth   = require('../middlewares/auth.middleware');
const ctrl   = require('../controllers/review.controller');

router.post('/',                   auth.protect, auth.restrictTo('cliente'), ctrl.createReview);
router.get ('/technician/:id',                                               ctrl.getByTechnician);

module.exports = router;
