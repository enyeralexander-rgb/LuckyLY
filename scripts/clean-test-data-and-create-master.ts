import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Limpiando todos los datos de prueba del proyecto...\n");

  // 1. Eliminar notificaciones
  console.log("📧 Eliminando notificaciones...");
  await prisma.notification.deleteMany({});
  console.log("✅ Notificaciones eliminadas");

  // 2. Eliminar reclamos de premios
  console.log("🏆 Eliminando reclamos de premios...");
  await prisma.prizeClaim.deleteMany({});
  console.log("✅ Reclamos eliminados");

  // 3. Eliminar ticket items
  console.log("🎫 Eliminando cupos (ticket items)...");
  await prisma.ticketItem.deleteMany({});
  console.log("✅ Cupos eliminados");

  // 4. Eliminar tickets
  console.log("🎟️ Eliminando tickets...");
  await prisma.ticket.deleteMany({});
  console.log("✅ Tickets eliminados");

  // 5. Eliminar favoritos
  console.log("⭐ Eliminando favoritos...");
  await prisma.favoriteRaffle.deleteMany({});
  console.log("✅ Favoritos eliminados");

  // 6. Eliminar ruletas
  console.log("🎰 Eliminando ruletas...");
  await prisma.raffle.deleteMany({});
  console.log("✅ Ruletas eliminadas");

  // 7. Eliminar plantillas
  console.log("📋 Eliminando plantillas...");
  await prisma.raffleTemplate.deleteMany({});
  console.log("✅ Plantillas eliminadas");

  // 8. Eliminar visitas de referidos
  console.log("🔗 Eliminando visitas de referidos...");
  await prisma.referralVisit.deleteMany({});
  console.log("✅ Visitas de referidos eliminadas");

  // 9. Eliminar links de referidos
  console.log("🔗 Eliminando links de referidos...");
  await prisma.referralLink.deleteMany({});
  console.log("✅ Links de referidos eliminadas");

  // 10. Eliminar logs de auditoría
  console.log("📝 Eliminando logs de auditoría...");
  await prisma.auditLog.deleteMany({});
  console.log("✅ Logs eliminados");

  // 11. Eliminar tokens de reset de contraseña
  console.log("🔑 Eliminando tokens de reset de contraseña...");
  await prisma.passwordResetToken.deleteMany({});
  console.log("✅ Tokens de reset eliminados");

  // 12. Eliminar tokens de verificación de email
  console.log("📧 Eliminando tokens de verificación de email...");
  await prisma.emailVerificationToken.deleteMany({});
  console.log("✅ Tokens de verificación eliminados");

  // 13. Eliminar 2FA
  console.log("🔐 Eliminando configuraciones 2FA...");
  await prisma.twoFactorAuth.deleteMany({});
  console.log("✅ 2FA eliminado");

  // 14. Eliminar usuarios de prueba (excepto el que vamos a crear)
  console.log("👥 Eliminando usuarios de prueba...");
  await prisma.user.deleteMany({
    where: {
      email: {
        not: "enyeralexander@gmail.com"
      }
    }
  });
  console.log("✅ Usuarios de prueba eliminados");

  // 15. Verificar si existe el administrador MASTER
  console.log("\n👤 Verificando/creando administrador MASTER...");
  const existingMaster = await prisma.user.findUnique({
    where: { email: "enyeralexander@gmail.com" }
  });

  if (existingMaster) {
    // Actualizar el usuario existente
    const passwordHash = await bcrypt.hash("0995697717", 10);
    await prisma.user.update({
      where: { email: "enyeralexander@gmail.com" },
      data: {
        passwordHash,
        role: Role.MASTER,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        suspended: false
      }
    });
    console.log("✅ Administrador MASTER actualizado");
  } else {
    // Crear nuevo administrador MASTER
    const passwordHash = await bcrypt.hash("0995697717", 10);
    await prisma.user.create({
      data: {
        email: "enyeralexander@gmail.com",
        passwordHash,
        name: "Administrador Master",
        username: "master",
        role: Role.MASTER,
        emailVerified: true,
        emailVerifiedAt: new Date(),
        documentId: "V-0995697717"
      }
    });
    console.log("✅ Administrador MASTER creado");
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ LIMPIEZA COMPLETA");
  console.log("=".repeat(60));
  console.log("📊 Resumen:");
  console.log("   - Todos los datos de prueba eliminados");
  console.log("   - Administrador MASTER creado/actualizado");
  console.log("   - Email: enyeralexander@gmail.com");
  console.log("   - Password: 0995697717");
  console.log("=".repeat(60));
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
