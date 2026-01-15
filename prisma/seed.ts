import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Limpiando todos los datos del sistema...");

  // Eliminar todas las notificaciones
  await prisma.notification.deleteMany({});
  console.log("  ✓ Notificaciones eliminadas");

  // Eliminar todos los ticketItems
  await prisma.ticketItem.deleteMany({});
  console.log("  ✓ TicketItems eliminados");

  // Eliminar todos los prizeClaims
  await prisma.prizeClaim.deleteMany({});
  console.log("  ✓ PrizeClaims eliminados");

  // Eliminar todos los tickets
  await prisma.ticket.deleteMany({});
  console.log("  ✓ Tickets eliminados");

  // Eliminar todos los sorteos
  await prisma.raffle.deleteMany({});
  console.log("  ✓ Ruletas eliminadas");

  // Eliminar todos los auditLogs
  await prisma.auditLog.deleteMany({});
  console.log("  ✓ AuditLogs eliminados");

  // Eliminar TODOS los usuarios (sin excepciones)
  await prisma.user.deleteMany({});
  console.log("  ✓ Todos los usuarios eliminados");

  console.log("\n✅ Limpieza completada. Base de datos limpia.\n");

  console.log("👥 Creando usuarios de prueba...\n");

  // Crear 5 usuarios de prueba de cada tipo
  const testUsers = [
    // 5 usuarios USER (clientes)
    { email: "cliente1@test.com", password: "Cliente123!", role: Role.USER, name: "Cliente Uno", username: "cliente1", birthDate: new Date("1995-01-15") },
    { email: "cliente2@test.com", password: "Cliente123!", role: Role.USER, name: "Cliente Dos", username: "cliente2", birthDate: new Date("1996-05-22") },
    { email: "cliente3@test.com", password: "Cliente123!", role: Role.USER, name: "Cliente Tres", username: "cliente3", birthDate: new Date("1997-08-30") },
    { email: "cliente4@test.com", password: "Cliente123!", role: Role.USER, name: "Cliente Cuatro", username: "cliente4", birthDate: new Date("1998-11-12") },
    { email: "cliente5@test.com", password: "Cliente123!", role: Role.USER, name: "Cliente Cinco", username: "cliente5", birthDate: new Date("1999-02-28") },
    
    // 5 usuarios AGENT
    { email: "agent1@test.com", password: "Agent123!", role: Role.AGENT, name: "Agente Uno", username: "agent1", birthDate: new Date("1990-03-15") },
    { email: "agent2@test.com", password: "Agent123!", role: Role.AGENT, name: "Agente Dos", username: "agent2", birthDate: new Date("1991-06-20") },
    { email: "agent3@test.com", password: "Agent123!", role: Role.AGENT, name: "Agente Tres", username: "agent3", birthDate: new Date("1992-09-10") },
    { email: "agent4@test.com", password: "Agent123!", role: Role.AGENT, name: "Agente Cuatro", username: "agent4", birthDate: new Date("1993-12-25") },
    { email: "agent5@test.com", password: "Agent123!", role: Role.AGENT, name: "Agente Cinco", username: "agent5", birthDate: new Date("1994-04-05") },
    
    // 5 usuarios SUPERADMIN
    { email: "superadmin1@test.com", password: "Super123!", role: Role.SUPERADMIN, name: "Superadmin Uno", username: "superadmin1", birthDate: new Date("1985-01-15") },
    { email: "superadmin2@test.com", password: "Super123!", role: Role.SUPERADMIN, name: "Superadmin Dos", username: "superadmin2", birthDate: new Date("1986-05-22") },
    { email: "superadmin3@test.com", password: "Super123!", role: Role.SUPERADMIN, name: "Superadmin Tres", username: "superadmin3", birthDate: new Date("1987-08-30") },
    { email: "superadmin4@test.com", password: "Super123!", role: Role.SUPERADMIN, name: "Superadmin Cuatro", username: "superadmin4", birthDate: new Date("1988-11-12") },
    { email: "superadmin5@test.com", password: "Super123!", role: Role.SUPERADMIN, name: "Superadmin Cinco", username: "superadmin5", birthDate: new Date("1989-02-28") },
    
    // 5 usuarios MASTER
    { email: "master1@test.com", password: "Master123!", role: Role.MASTER, name: "Master Uno", username: "master1", birthDate: new Date("1980-01-15") },
    { email: "master2@test.com", password: "Master123!", role: Role.MASTER, name: "Master Dos", username: "master2", birthDate: new Date("1981-05-22") },
    { email: "master3@test.com", password: "Master123!", role: Role.MASTER, name: "Master Tres", username: "master3", birthDate: new Date("1982-08-30") },
    { email: "master4@test.com", password: "Master123!", role: Role.MASTER, name: "Master Cuatro", username: "master4", birthDate: new Date("1983-11-12") },
    { email: "master5@test.com", password: "Master123!", role: Role.MASTER, name: "Master Cinco", username: "master5", birthDate: new Date("1984-02-28") }
  ];

  for (const u of testUsers) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.create({
      data: {
        email: u.email,
        passwordHash,
        name: u.name,
        username: u.username,
        role: u.role,
        birthDate: u.birthDate
      }
    });
    console.log(`  ✅ ${u.role} creado: ${u.email} (username: ${u.username})`);
  }

  console.log("\n✅ Seed completado:");
  console.log("  • 5 usuarios USER (clientes)");
  console.log("  • 5 usuarios AGENT");
  console.log("  • 5 usuarios SUPERADMIN");
  console.log("  • 5 usuarios MASTER");
  console.log("  • Total: 20 usuarios de prueba");
  console.log("  • Base de datos limpia: sin ruletas, sin historiales");
  console.log("\n📝 Credenciales de acceso:");
  console.log("  • Clientes: cliente1@test.com - cliente5@test.com (password: Cliente123!)");
  console.log("  • Agentes: agent1@test.com - agent5@test.com (password: Agent123!)");
  console.log("  • Superadmins: superadmin1@test.com - superadmin5@test.com (password: Super123!)");
  console.log("  • Masters: master1@test.com - master5@test.com (password: Master123!)");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
