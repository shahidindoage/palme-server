const express = require('express');
const router = express.Router();
const { 
  createAppointment, 
  getMyAppointments, 
  cancelAppointment, 
  payForAppointment 
} = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // Protect all appointment routes

router.post('/', createAppointment);
router.get('/my', getMyAppointments);
router.put('/:id/cancel', cancelAppointment);
router.put('/:id/pay', payForAppointment);

module.exports = router;
