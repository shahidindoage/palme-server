const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const { sendPushNotification } = require('../utils/notifications');

// ─── DRIVER ROUTES ────────────────────────────────────────────────────────────

// Get all trips assigned to the logged-in driver
router.get('/driver/trips', protect, async (req, res) => {
  try {
    const trips = await prisma.appointment.findMany({
      where: { driverId: req.user.id },
      include: { user: true, service: true, therapist: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(trips);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch trips' });
  }
});

// Driver updates trip status
router.post('/driver/trips/:id/status', protect, async (req, res) => {
  const { status } = req.body;
  try {
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
      include: { user: true, service: true },
    });

    // Notify customer
    if (appointment.user) {
      let title = 'Trip Update';
      let body = `Your booking status is now ${status.replace(/_/g, ' ')}.`;
      if (status === 'arrived') {
        title = 'Driver Arrived! 🚗';
        body = `Your driver has arrived for your ${appointment.service.name} session.`;
      } else if (status === 'on_the_way') {
        title = 'Driver on the Way! 📍';
        body = `Your driver is heading to you for your ${appointment.service.name} session.`;
      }
      await sendPushNotification(appointment.user.pushToken, title, body, {}, appointment.user.id);
    }

    // Notify admins about driver status updates
    const admins = await prisma.user.findMany({ where: { role: 'admin' } });
    for (const admin of admins) {
      const title = status === 'arrived' ? '🚗 Driver Arrived' : '📍 Driver On the Way';
      const body = `${appointment.service.name} — Driver is ${status.replace(/_/g, ' ')} for customer ${appointment.user?.name}.`;
      await sendPushNotification(admin.pushToken, title, body, {}, admin.id);
    }

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// ─── THERAPIST ROUTES ─────────────────────────────────────────────────────────

// Get all appointments assigned to the logged-in therapist
router.get('/therapist/appointments', protect, async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { therapistId: req.user.id },
      include: { user: true, service: true, driver: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch appointments' });
  }
});

// Therapist updates appointment status
router.post('/therapist/appointments/:id/status', protect, async (req, res) => {
  const { status } = req.body;
  try {
    const appointment = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status },
      include: { user: true, service: true },
    });

    // Notify customer
    if (appointment.user) {
      let title = 'Session Update';
      let body = `Your session status is now ${status.replace(/_/g, ' ')}.`;
      if (status === 'in_progress') {
        title = 'Session Started! ✨';
        body = `Your ${appointment.service.name} session has started. Enjoy!`;
      } else if (status === 'completed') {
        title = 'Session Completed! ✅';
        body = `Your ${appointment.service.name} session is complete. Hope you loved it!`;
      }
      await sendPushNotification(appointment.user.pushToken, title, body, {}, appointment.user.id);
    }

    // Notify admins about session updates
    const admins = await prisma.user.findMany({ where: { role: 'admin' } });
    for (const admin of admins) {
      const title = status === 'in_progress' ? '✨ Session Started' : '✅ Session Completed';
      const body = `${appointment.service.name} — ${appointment.user?.name}'s session is now ${status.replace(/_/g, ' ')}.`;
      await sendPushNotification(admin.pushToken, title, body, {}, admin.id);
    }

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────────

// Admin overview stats
router.get('/admin/overview', protect, async (req, res) => {
  try {
    const [totalBookings, pendingBookings, completedBookings, recentBookings] = await Promise.all([
      prisma.appointment.count(),
      prisma.appointment.count({ where: { status: 'pending' } }),
      prisma.appointment.count({ where: { status: 'completed' } }),
      prisma.appointment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: true, service: true, therapist: true, driver: true },
      }),
    ]);
    res.json({ totalBookings, pendingBookings, completedBookings, recentBookings });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch overview' });
  }
});

module.exports = router;
