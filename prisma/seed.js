const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Password for all demo accounts
  const commonPassword = await bcrypt.hash('pass123', 10);

  // 1. Admin User
  await prisma.user.upsert({
    where: { email: 'admin@palme.com' },
    update: {},
    create: {
      name: 'Palme Admin',
      email: 'admin@palme.com',
      password: commonPassword,
      role: 'admin',
    },
  });

  // 2. Therapists
  const therapists = [
    { name: 'Sarah Johnson', email: 'sarah@palme.com' },
    { name: 'Michael Chen', email: 'michael@palme.com' },
    { name: 'Elena Rodriguez', email: 'elena@palme.com' },
  ];

  for (const t of therapists) {
    await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        name: t.name,
        email: t.email,
        password: commonPassword,
        role: 'therapist',
        phone: '+971501234567',
        gender: 'Other'
      },
    });
  }

  // 3. Drivers
  const drivers = [
    { name: 'Ahmed Khan', email: 'ahmed@palme.com' },
    { name: 'John Smith', email: 'john@palme.com' },
  ];

  for (const d of drivers) {
    await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        name: d.name,
        email: d.email,
        password: commonPassword,
        role: 'driver',
        phone: '+971507654321',
      },
    });
  }

  // 4. Categories
  const categories = [
    { id: 'cat1', name: 'Massage', image: 'https://images.unsplash.com/photo-1544161515-4af6b1d8d16c?q=80&w=800', description: 'Relaxing treatments' },
    { id: 'cat2', name: 'Makeup', image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=800', description: 'Professional makeup' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: cat,
    });
  }

  // 5. Services
  await prisma.service.upsert({
    where: { id: 's1' },
    update: {},
    create: {
      id: 's1',
      name: 'Sport Massage',
      categoryId: 'cat1',
      price: 650,
      duration: '60 min',
      description: 'Deep tissue recovery.',
      image: 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?q=80&w=800',
      durations: [{ label: '1 hr', price: 650 }, { label: '1.5 hr', price: 850 }],
      availableSlots: [{ date: '2026-04-21', slots: ['10:00AM', '02:00PM'] }],
    },
  });

  console.log('Seeding finished. Staff accounts created with password: pass123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
