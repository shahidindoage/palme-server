const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const { register, login, getMe, updatePushToken } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/push-token', protect, updatePushToken);
router.get('/notifications', protect, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});
router.post('/update-push-token', protect, updatePushToken);
module.exports = router;
