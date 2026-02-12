const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'teacher@karteikarten.local';
    console.log(`--- Test-Start: Verifiziere Passwort-Update für ${email} ---`);

    // 1. User holen
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        console.error("KRITISCHER FEHLER: Test-User nicht gefunden.");
        process.exit(1);
    }
    const originalPasswordHash = user.password;

    // 2. Szenario: Neues Passwort setzen (wie API es tut)
    const newPassword = 'TemporaryTestPassword_999!';
    console.log(`Simuliere API-Update mit neuem Passwort: '${newPassword}'`);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
    });
    console.log("Update in Datenbank ausgeführt.");

    // 3. Verifikation: Login-Check
    const updatedUser = await prisma.user.findUnique({ where: { email } });
    const isValid = await bcrypt.compare(newPassword, updatedUser.password);

    if (isValid) {
        console.log("VERIFIKATION ERFOLGREICH: Das neue Passwort wurde korrekt gehasht und gespeichert.");
        console.log("Login-Check via bcrypt.compare() war positiv.");
    } else {
        console.error("VERIFIKATION FEHLGESCHLAGEN: Gespeichertes Passwort stimmt nicht überein.");
        // Versuch Revert
        await prisma.user.update({ where: { id: user.id }, data: { password: originalPasswordHash } });
        process.exit(1);
    }

    // 4. Aufräumen (Revert auf altes Passwort)
    console.log("Setze Passwort auf ursprünglichen Wert zurück...");
    await prisma.user.update({
        where: { id: user.id },
        data: { password: originalPasswordHash }
    });
    console.log("--- Test-Ende: Systemzustand wiederhergestellt ---");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
