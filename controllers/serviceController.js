const prisma = require('../config/db');

exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getServices = async (req, res) => {
  const { categoryId } = req.query;
  try {
    const services = await prisma.service.findMany({
      where: categoryId ? { categoryId } : {},
    });
    res.json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getServiceById = async (req, res) => {
  const { id } = req.params;
  try {
    const service = await prisma.service.findUnique({
      where: { id },
    });
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTherapists = async (req, res) => {
  try {
    const therapists = await prisma.user.findMany({
      where: { role: 'therapist' },
      select: {
        id: true,
        name: true,
        gender: true,
      },
    });
    res.json(therapists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
