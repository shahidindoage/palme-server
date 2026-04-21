const express = require('express');
const router = express.Router();
const prisma = require('../config/db');

// Middleware to check if user is driver
const isDriver = (req, res, next) => {
  if (req.session.role === 'driver') {
    next();
  } else {
    res.redirect('/staff/login');
  }
};

router.use(isDriver);

router.get('/dashboard', async (req, res) => {
  const driverId = req.session.userId;
  const trips = await prisma.appointment.findMany({
    where: { driverId },
    include: { user: true, service: true, therapist: true },
    orderBy: { datetime: 'asc' }
  });
  
  res.render('driver/dashboard', { 
    title: 'Driver Dashboard', 
    trips,
    layout: 'layouts/staff' 
  });
});

router.post('/appointments/:id/status', async (req, res) => {
  const { status } = req.body;
  const { sendPushNotification } = require('../utils/notifications');
  
  const appointment = await prisma.appointment.update({
    where: { id: req.params.id },
    data: { status },
    include: { user: true, service: true }
  });

  if (appointment.user && appointment.user.pushToken) {
    let title = 'Booking Update';
    let body = `Your booking status has changed to ${status.replace(/_/g, ' ')}.`;

    if (status === 'arrived') {
      title = 'Driver Arrived! 🚗';
      body = `Your driver has arrived for your ${appointment.service.name} session.`;
    } else if (status === 'on_the_way') {
      title = 'Driver on the way! 📍';
      body = `Your driver is heading to your location for your ${appointment.service.name} session.`;
    }

    await sendPushNotification(appointment.user.pushToken, title, body, {}, appointment.user.id);
  }

  res.redirect('/driver/dashboard');
});

module.exports = router;
