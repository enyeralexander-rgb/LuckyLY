// Utilidades para exportar datos a Excel y PDF
// @ts-ignore - Las librerías pueden no estar instaladas
import ExcelJS from "exceljs";
// @ts-ignore
import jsPDF from "jspdf";
// @ts-ignore
import "jspdf-autotable";

// Exportar a Excel
export async function exportToExcel(
  data: Array<Record<string, any>>,
  filename: string = "export.xlsx",
  sheetName: string = "Datos"
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (data.length === 0) {
    return Buffer.from([]);
  }

  // Agregar headers
  const headers = Object.keys(data[0]);
  worksheet.addRow(headers);
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  // Agregar datos
  data.forEach((row) => {
    const values = headers.map((header) => row[header] ?? "");
    worksheet.addRow(values);
  });

  // Auto-ajustar columnas
  worksheet.columns.forEach((column: any) => {
    let maxLength = 0;
    column.eachCell({ includeEmpty: false }, (cell: any) => {
      const columnLength = cell.value ? cell.value.toString().length : 10;
      if (columnLength > maxLength) {
        maxLength = columnLength;
      }
    });
    column.width = maxLength < 10 ? 10 : maxLength + 2;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// Exportar a PDF
export function exportToPDF(
  data: Array<Record<string, any>>,
  filename: string = "export.pdf",
  title: string = "Reporte"
): void {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.text(title, 14, 22);

  if (data.length === 0) {
    doc.setFontSize(12);
    doc.text("No hay datos para mostrar", 14, 30);
    doc.save(filename);
    return;
  }

  // Preparar datos para tabla
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((header) => String(row[header] ?? "")));

  // Agregar tabla
  (doc as any).autoTable({
    head: [headers],
    body: rows,
    startY: 30,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [133, 187, 101] },
  });

  doc.save(filename);
}

// Exportar usuarios a Excel
export async function exportUsers(users: Array<any>): Promise<Buffer> {
  const data = users.map((user) => ({
    ID: user.id,
    Nombre: user.name,
    Email: user.email,
    Username: user.username || "-",
    Cédula: user.nationalId || "-",
    Teléfono: user.phoneNumber || "-",
    Banco: user.bank || "-",
    Email_Verificado: user.emailVerified ? "Sí" : "No",
    Suspendido: user.suspended ? "Sí" : "No",
    Fecha_Registro: new Date(user.createdAt).toLocaleDateString("es-ES"),
  }));

  return exportToExcel(data, "usuarios.xlsx", "Usuarios");
}

// Exportar tickets a Excel
export async function exportTickets(tickets: Array<any>): Promise<Buffer> {
  const data = tickets.map((ticket) => ({
    ID: ticket.id,
    Sorteo: ticket.raffle?.title || "-",
    Usuario: ticket.user?.name || "-",
    Items: Array.isArray(ticket.items) ? ticket.items.join(", ") : "-",
    Monto: `Bs. ${Number(ticket.totalPaid).toFixed(2)}`,
    Método_Pago: ticket.paymentMethod || "-",
    Referencia: ticket.paymentMobileRef || "-",
    Estado: ticket.status,
    Fecha_Compra: new Date(ticket.purchasedAt).toLocaleString("es-ES"),
  }));

  return exportToExcel(data, "tickets.xlsx", "Tickets");
}

// Exportar sorteos a Excel
export async function exportRaffles(raffles: Array<any>): Promise<Buffer> {
  const data = raffles.map((raffle) => ({
    ID: raffle.id,
    Título: raffle.title,
    Tipo: raffle.type,
    Precio_Por_Cupo: `Bs. ${Number(raffle.pricePerSlot).toFixed(2)}`,
    Total_Cupos: raffle.slots,
    Ganadores: raffle.winnersCount,
    Estado: raffle.status,
    Fecha_Inicio: raffle.startsAt ? new Date(raffle.startsAt).toLocaleString("es-ES") : "-",
    Fecha_Cierre: raffle.closesAt ? new Date(raffle.closesAt).toLocaleString("es-ES") : "-",
    Fecha_Ejecución: raffle.executedAt ? new Date(raffle.executedAt).toLocaleString("es-ES") : "-",
    Ganador: raffle.winningItem || "-",
  }));

  return exportToExcel(data, "sorteos.xlsx", "Sorteos");
}
