const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const { sendPushNotification } = require('../utils/notifications');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.session.adminId) {
    next();
  } else {
    res.redirect('/admin/login');
  }
};

// Login Route
router.get('/login', (req, res) => {
  if (req.session.adminId) return res.redirect('/admin');
  res.render('login', { title: 'Admin Login', layout: false }); // No sidebar for login
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.role === 'admin') {
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        req.session.adminId = user.id;
        return res.redirect('/admin');
      }
    }
    res.render('login', { title: 'Admin Login', error: 'Invalid admin credentials', layout: false });
  } catch (err) {
    res.render('login', { title: 'Admin Login', error: 'Something went wrong', layout: false });
  }
});

// Logout Route
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// PROTECTED ROUTES BELOW
router.use(isAdmin);

// Dashboard Overview
router.get('/', async (req, res) => {
  const userCount = await prisma.user.count();
  const serviceCount = await prisma.service.count();
  const appointmentCount = await prisma.appointment.count();
  const recentAppointments = await prisma.appointment.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { user: true, service: true }
  });
  
  res.render('dashboard', { 
    title: 'Dashboard',
    userCount, 
    serviceCount, 
    appointmentCount,
    recentAppointments 
  });
});

// Users Management
router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });
  res.render('users', { title: 'Manage Users', users });
});

router.post('/users', async (req, res) => {
  const { name, email, password, phone, gender } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  
  await prisma.user.create({
    data: { name, email, password: hashedPassword, phone, gender }
  });
  res.redirect('/admin/users');
});

router.post('/users/:id/delete', async (req, res) => {
  await prisma.appointment.deleteMany({ where: { userId: parseInt(req.params.id) } });
  await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
  res.redirect('/admin/users');
});

router.post('/users/:id/edit', async (req, res) => {
  const { name, email, phone, gender } = req.body;
  await prisma.user.update({
    where: { id: parseInt(req.params.id) },
    data: { name, email, phone, gender }
  });
  res.redirect('/admin/users');
});

// Categories Management
router.get('/categories', async (req, res) => {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { services: true } } }
  });
  res.render('categories', { title: 'Manage Categories', categories });
});

router.post('/categories', async (req, res) => {
  const { name, image, description } = req.body;
  await prisma.category.create({
    data: { name, image, description }
  });
  res.redirect('/admin/categories');
});

router.post('/categories/:id/edit', async (req, res) => {
  const { name, image, description } = req.body;
  await prisma.category.update({
    where: { id: req.params.id },
    data: { name, image, description }
  });
  res.redirect('/admin/categories');
});

router.post('/categories/:id/delete', async (req, res) => {
  const servicesCount = await prisma.service.count({ where: { categoryId: req.params.id } });
  if (servicesCount > 0) {
    return res.status(400).send('Cannot delete category with active services.');
  }
  await prisma.category.delete({ where: { id: req.params.id } });
  res.redirect('/admin/categories');
});

// Services Management
router.get('/services', async (req, res) => {
  const services = await prisma.service.findMany({
    include: { category: true }
  });
  const categories = await prisma.category.findMany();
  res.render('services', { title: 'Manage Services', services, categories });
});

router.post('/services', async (req, res) => {
  const { name, durationLabels, durationPrices, description, image, categoryId } = req.body;
  
  // Format durations array
  const durations = Array.isArray(durationLabels) 
    ? durationLabels.map((label, i) => ({ label, price: parseFloat(durationPrices[i]) }))
    : [{ label: durationLabels, price: parseFloat(durationPrices) }];

  await prisma.service.create({
    data: { 
      name, 
      price: durations[0].price, 
      duration: durations[0].label, 
      description, 
      image, 
      categoryId,
      durations,
      availableSlots: [] 
    }
  });
  res.redirect('/admin/services');
});

router.post('/services/:id/edit', async (req, res) => {
  const { name, durationLabels, durationPrices, description, image, categoryId } = req.body;
  
  const durations = Array.isArray(durationLabels) 
    ? durationLabels.map((label, i) => ({ label, price: parseFloat(durationPrices[i]) }))
    : [{ label: durationLabels, price: parseFloat(durationPrices) }];

  await prisma.service.update({
    where: { id: req.params.id },
    data: { 
      name, 
      price: durations[0].price, 
      duration: durations[0].label, 
      description, 
      image, 
      categoryId,
      durations
    }
  });
  res.redirect('/admin/services');
});

router.post('/services/:id/delete', async (req, res) => {
  await prisma.appointment.deleteMany({ where: { serviceId: req.params.id } });
  await prisma.service.delete({ where: { id: req.params.id } });
  res.redirect('/admin/services');
});

// Appointments Management
router.get('/appointments', async (req, res) => {
  const appointments = await prisma.appointment.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: true, service: true, therapist: true, driver: true, preferredTherapist: true }
  });
  const therapists = await prisma.user.findMany({ where: { role: 'therapist' } });
  const drivers = await prisma.user.findMany({ where: { role: 'driver' } });
  
  res.render('appointments', { title: 'Manage Appointments', appointments, therapists, drivers });
});

router.post('/appointments/:id/assign', async (req, res) => {
  const { therapistId, driverId } = req.body;
  const appointmentId = req.params.id;

  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { 
      therapistId: therapistId ? parseInt(therapistId) : null,
      driverId: driverId ? parseInt(driverId) : null,
      status: therapistId ? 'therapist_assigned' : 'booked'
    },
    include: { therapist: true, driver: true, service: true, user: true }
  });

  // Notify ONLY Therapist (if assigned)
if (therapistId && appointment.therapist) {
  await sendPushNotification(
    appointment.therapist.pushToken,
    'New Assignment',
    `You have been assigned to ${appointment.service.name} on ${appointment.date} at ${appointment.time}.`,
    {},
    appointment.therapist.id
  );
}

// Notify ONLY Driver (if assigned)
if (driverId && appointment.driver) {
  await sendPushNotification(
    appointment.driver.pushToken,
    'New Trip Assigned',
    `New trip for ${appointment.service.name} on ${appointment.date} at ${appointment.time}.`,
    {},
    appointment.driver.id
  );
}

// Notify ONLY Customer (if therapist was assigned)
if (therapistId && appointment.user) {
  await sendPushNotification(
    appointment.user.pushToken,
    'Staff Assigned',
    `Staff has been assigned to your booking for ${appointment.service.name}.`,
    {},
    appointment.user.id
  );
}

  res.redirect('/admin/appointments');
});

router.post('/appointments/:id/confirm', async (req, res) => {
  const appointment = await prisma.appointment.update({
    where: { id: req.params.id },
    data: { status: 'booked' },
    include: { user: true, service: true }
  });

  if (appointment.user) {
    await sendPushNotification(
      appointment.user.pushToken,
      'Booking Confirmed!',
      `Your booking for ${appointment.service.name} has been confirmed.`,
      {},
      appointment.user.id
    );
  }

  res.redirect('/admin/appointments');
});

router.post('/appointments/:id/cancel', async (req, res) => {
  await prisma.appointment.update({
    where: { id: req.params.id },
    data: { status: 'cancelled', cancelledAt: new Date() }
  });
  res.redirect('/admin/appointments');
});

router.post('/appointments/:id/delete', async (req, res) => {
  await prisma.appointment.delete({
    where: { id: req.params.id }
  });
  res.redirect('/admin/appointments');
});

// Slot Management
router.get('/services/:id/slots', async (req, res) => {
  const service = await prisma.service.findUnique({ where: { id: req.params.id } });
  res.render('slots', { title: `Slots: ${service.name}`, service });
});

router.post('/services/:id/slots', async (req, res) => {
  const { date, slots } = req.body;
  const service = await prisma.service.findUnique({ where: { id: req.params.id } });
  
  let availableSlots = service.availableSlots || [];
  const slotList = slots.split(',').map(s => s.trim());
  
  const existingIdx = availableSlots.findIndex(s => s.date === date);
  if (existingIdx > -1) {
    availableSlots[existingIdx].slots = slotList;
  } else {
    availableSlots.push({ date, slots: slotList });
  }
  
  await prisma.service.update({
    where: { id: req.params.id },
    data: { availableSlots }
  });
  res.redirect(`/admin/services/${req.params.id}/slots`);
});

router.post('/services/:id/slots/delete', async (req, res) => {
  const { date } = req.body;
  const service = await prisma.service.findUnique({ where: { id: req.params.id } });
  const availableSlots = (service.availableSlots || []).filter(s => s.date !== date);
  
  await prisma.service.update({
    where: { id: req.params.id },
    data: { availableSlots }
  });
  res.redirect(`/admin/services/${req.params.id}/slots`);
});

module.exports = router;
