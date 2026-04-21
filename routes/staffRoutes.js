const express = require('express');
const router = express.Router();
const prisma = require('../config/db');
const bcrypt = require('bcryptjs');

router.get('/login', (req, res) => {
  res.render('staff/login', { title: 'Staff Login', layout: false });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (user && (user.role === 'therapist' || user.role === 'driver')) {
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      req.session.userId = user.id;
      req.session.role = user.role;
      req.session.name = user.name;
      
      if (user.role === 'therapist') return res.redirect('/therapist/dashboard');
      if (user.role === 'driver') return res.redirect('/driver/dashboard');
    }
  }
  res.render('staff/login', { title: 'Staff Login', error: 'Invalid staff credentials', layout: false });
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/staff/login');
});

module.exports = router;
