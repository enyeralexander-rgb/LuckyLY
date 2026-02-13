import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import { getContabilidadGlobal } from "../../../../../lib/accounting";
import { parsePeriodRange } from "../../../../../lib/dateRange";
import { Role } from "@prisma/client";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.CONTABLE, Role.MASTER]);
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const { dateStart, dateEnd } = parsePeriodRange(period, startDate, endDate);

    // Obtener datos del administrador
    const admin = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true, email: true }
    });

    // Contabilidad del período (fuente única: lib/accounting)
    const contabilidad = await getContabilidadGlobal({ dateStart, dateEnd });
    const { ingresos, egresos, ganancias } = contabilidad;

    // Listados para tablas del PDF
    const tickets = await prisma.ticket.findMany({
      where: {
        status: "CONFIRMED",
        purchasedAt: { gte: dateStart, lte: dateEnd }
      },
      include: {
        user: { select: { name: true, email: true } },
        raffle: { select: { title: true } }
      },
      orderBy: { purchasedAt: "desc" }
    });

    const paidClaims = await prisma.prizeClaim.findMany({
      where: {
        status: "PAID",
        processedAt: { gte: dateStart, lte: dateEnd }
      },
      include: {
        user: { select: { name: true, email: true } },
        ticket: {
          select: {
            totalPaid: true,
            raffle: { select: { title: true } }
          }
        }
      },
      orderBy: { processedAt: "desc" }
    });

    // Crear PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Encabezado con logo (simulado con texto, puedes agregar imagen real)
    doc.setFontSize(20);
    doc.setTextColor(133, 187, 101); // Color verde LuckyLY
    doc.text("LuckyLY", pageWidth / 2, yPos, { align: "center" });
    
    yPos += 10;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("REPORTE ADMINISTRATIVO", pageWidth / 2, yPos, { align: "center" });
    
    yPos += 8;
    const startDateStr = dateStart.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    const endDateStr = dateEnd.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
    doc.setFontSize(14);
    doc.text(`DESDE ${startDateStr} HASTA ${endDateStr}`, pageWidth / 2, yPos, { align: "center" });
    
    yPos += 15;
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`, 14, yPos);
    
    yPos += 6;
    doc.text(`Generado por: ${admin?.name || "Administrador"} (${admin?.email || ""})`, 14, yPos);
    
    yPos += 15;

    // Resumen de totales
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("RESUMEN FINANCIERO", 14, yPos);
    
    yPos += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Ingresos:`, 20, yPos);
    doc.text(`Bs. ${ingresos.toFixed(2)}`, pageWidth - 20, yPos, { align: "right" });
    
    yPos += 7;
    doc.text(`Egresos (Premios pagados):`, 20, yPos);
    doc.setTextColor(220, 38, 38); // Rojo para egresos
    doc.text(`-Bs. ${egresos.toFixed(2)}`, pageWidth - 20, yPos, { align: "right" });
    
    yPos += 7;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`Ganancias:`, 20, yPos);
    doc.setTextColor(133, 187, 101); // Verde para ganancias
    doc.text(`Bs. ${ganancias.toFixed(2)}`, pageWidth - 20, yPos, { align: "right" });
    
    yPos += 15;
    doc.setTextColor(0, 0, 0);

    // Tabla de Ingresos
    if (tickets.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("INGRESOS", 14, yPos);
      yPos += 8;

      const incomeData = tickets.map((ticket, index) => [
        (index + 1).toString(),
        new Date(ticket.purchasedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }),
        ticket.user.name,
        ticket.raffle.title,
        ticket.paymentMethod || "-",
        `Bs. ${Number(ticket.totalPaid).toFixed(2)}`
      ]);

      autoTable(doc, {
        head: [["#", "Fecha", "Usuario", "Sorteo", "Método Pago", "Monto"]],
        body: incomeData,
        startY: yPos,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [133, 187, 101], textColor: [255, 255, 255] },
        columnStyles: {
          5: { halign: "right" }
        },
        margin: { left: 14, right: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Tabla de Egresos
    if (paidClaims.length > 0) {
      // Nueva página si es necesario
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("EGRESOS (PREMIOS PAGADOS)", 14, yPos);
      yPos += 8;

      const expenseData = paidClaims.map((claim, index) => [
        (index + 1).toString(),
        claim.processedAt ? new Date(claim.processedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "-",
        claim.user.name,
        claim.ticket.raffle.title,
        claim.paymentRef || "-",
        `Bs. ${Number(claim.paidAmount ?? 0).toFixed(2)}`
      ]);

      autoTable(doc, {
        head: [["#", "Fecha Pago", "Ganador", "Sorteo", "Referencia", "Monto"]],
        body: expenseData,
        startY: yPos,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255] },
        columnStyles: {
          5: { halign: "right" }
        },
        margin: { left: 14, right: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Resumen final
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("RESUMEN FINAL", 14, yPos);
    yPos += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Total Ingresos:`, 20, yPos);
    doc.text(`Bs. ${ingresos.toFixed(2)}`, pageWidth - 20, yPos, { align: "right" });
    
    yPos += 7;
    doc.text(`Total Egresos:`, 20, yPos);
    doc.setTextColor(220, 38, 38);
    doc.text(`Bs. ${egresos.toFixed(2)}`, pageWidth - 20, yPos, { align: "right" });
    
    yPos += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`GANANCIAS:`, 20, yPos);
    doc.setTextColor(133, 187, 101);
    doc.setFontSize(14);
    doc.text(`Bs. ${ganancias.toFixed(2)}`, pageWidth - 20, yPos, { align: "right" });

    // Pie de página
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
      doc.text("© LuckyLY - Todos los derechos reservados", pageWidth / 2, pageHeight - 5, { align: "center" });
    }

    // Generar buffer del PDF
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Reporte_Administrativo_LuckyLY_${startDateStr.replace(/\//g, "-")}_${endDateStr.replace(/\//g, "-")}.pdf"`
      }
    });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al generar PDF", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al generar PDF" }, { status: 500 });
  }
}
