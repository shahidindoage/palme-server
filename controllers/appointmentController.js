const prisma = require('../config/db');
const { sendPushNotification } = require('../utils/notifications');

exports.createAppointment = async (req, res) => {
  const { serviceId, date, time, selectedDuration, selectedPrice, preferredTherapistId } = req.body;
  const userId = req.user.id;

  try {
    const appointment = await prisma.appointment.create({
      data: {
        userId,
        serviceId,
        date,
        time,
        datetime: `${date} ${time}`,
        selectedDuration,
        selectedPrice,
        preferredTherapistId: preferredTherapistId ? parseInt(preferredTherapistId) : null,
        status: 'pending',
      },
      include: {
        service: true,
        user: true,
      },
    });

    // Notify all admins about new booking
    const admins = await prisma.user.findMany({ 
      where: { role: 'admin' } 
    });

    for (const admin of admins) {
      await sendPushNotification(
        admin.pushToken,
        '📅 New Booking Received!',
        `${req.user.name} booked ${appointment.service.name} for ${date} at ${time}.`,
        { appointmentId: appointment.id, type: 'new_booking' },
        admin.id
      );
    }

    res.status(201).json(appointment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMyAppointments = async (req, res) => {
  const userId = req.user.id;
  try {
    const appointments = await prisma.appointment.findMany({
      where: { userId },
      include: {
        service: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(appointments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.cancelAppointment = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment || appointment.userId !== userId) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.payForAppointment = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment || appointment.userId !== userId) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'paid',
      },
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
