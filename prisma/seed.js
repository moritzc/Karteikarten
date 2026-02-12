const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);

    // Create Admin
    const admin = await prisma.user.upsert({
        where: { email: 'admin@karteikarten.local' },
        update: { password: adminPassword },
        create: {
            email: 'admin@karteikarten.local',
            name: 'Super Admin',
            password: adminPassword,
            role: 'ADMIN',
        },
    });

    console.log({ admin });

    // Create Site
    const site = await prisma.site.upsert({
        where: { name: 'Hauptstandort' },
        update: {},
        create: {
            name: 'Hauptstandort',
            address: 'Musterstraße 1, 12345 Musterstadt',
        },
    });

    console.log({ site });

    // Create Site Manager
    const manager = await prisma.user.upsert({
        where: { email: 'manager@karteikarten.local' },
        update: { password: hashedPassword },
        create: {
            email: 'manager@karteikarten.local',
            name: 'Max Manager',
            password: hashedPassword,
            role: 'SITE_MANAGER',
            sites: {
                connect: { id: site.id },
            },
        },
    });

    console.log({ manager });

    // Create Teacher
    const teacher = await prisma.user.upsert({
        where: { email: 'teacher@karteikarten.local' },
        update: { password: hashedPassword },
        create: {
            email: 'teacher@karteikarten.local',
            name: 'Tanja Teacher',
            password: hashedPassword,
            role: 'TEACHER',
            sites: {
                connect: { id: site.id },
            },
        },
    });

    console.log({ teacher });

    // Create Subject
    const math = await prisma.subject.upsert({
        where: { name: 'Mathematik' },
        update: {},
        create: {
            name: 'Mathematik',
            color: 'blue',
        },
    });

    const german = await prisma.subject.upsert({
        where: { name: 'Deutsch' },
        update: {},
        create: {
            name: 'Deutsch',
            color: 'red',
        },
    });

    // Create Student
    const student = await prisma.student.create({
        data: {
            firstName: 'Heinz',
            lastName: 'Mustermann',
            birthDate: new Date('2010-01-01'),
            sites: {
                connect: { id: site.id },
            },
        },
    });

    console.log({ student });
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
