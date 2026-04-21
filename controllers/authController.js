const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

exports.register = async (req, res) => {
  const { name, email, password, phone, gender } = req.body;

  try {
    // Check if user exists
    const userExist = await prisma.user.findUnique({
      where: { email },
    });
    
    if (userExist) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        gender,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Generate JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    res.status(201).json({
      user,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        role: true,
      },
    });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updatePushToken = async (req, res) => {
  const userId = req.user.id;
  const { pushToken } = req.body;

  try {
    // 🔥 REMOVE token from other users (VERY IMPORTANT)
    await prisma.user.updateMany({
      where: {
        pushToken: pushToken,
        NOT: { id: userId }
      },
      data: {
        pushToken: null
      }
    });

    // ✅ ASSIGN token to current user
    await prisma.user.update({
      where: { id: userId },
      data: { pushToken }
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update push token' });
  }
};
