const express = require('express');
const router = express.Router();
const prisma = require('../config/db');

// Middleware to check if user is therapist
const isTherapist = (req, res, next) => {
  if (req.session.role === 'therapist') {
    next();
  } else {
    res.redirect('/staff/login');
  }
};

router.use(isTherapist);

router.get('/dashboard', async (req, res) => {
  const therapistId = req.session.userId;
  const assignments = await prisma.appointment.findMany({
    where: { therapistId },
    include: { user: true, service: true, driver: true },
    orderBy: { datetime: 'asc' }
  });
  
  res.render('therapist/dashboard', { 
    title: 'Therapist Dashboard', 
    assignments,
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
    let title = 'Session Update';
    let body = `Your session status is now ${status.replace(/_/g, ' ')}.`;

    if (status === 'in_progress') {
      title = 'Session Started! ✨';
      body = `Your ${appointment.service.name} session has now started. Enjoy!`;
    } else if (status === 'completed') {
      title = 'Session Completed! ✅';
      body = `Your ${appointment.service.name} session is finished. We hope you enjoyed it!`;
    }

    await sendPushNotification(appointment.user.pushToken, title, body, {}, appointment.user.id);
  }

  res.redirect('/therapist/dashboard');
});

module.exports = router;
