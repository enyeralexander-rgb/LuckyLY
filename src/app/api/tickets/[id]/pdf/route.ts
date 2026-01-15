import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role } from "@prisma/client";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    const ticketId = params.id;

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        raffle: true,
        user: true
      }
    });

    if (!ticket || ticket.userId !== auth.userId) {
      return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
    }

    // Obtener términos y condiciones y reglas
    const [terms, rules] = await Promise.all([
      prisma.termsAndConditions.findFirst(),
      prisma.rules.findFirst()
    ]);

    // Generar HTML del PDF
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Ticket #${ticket.id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .ticket-info {
              margin-bottom: 30px;
            }
            .section {
              margin-bottom: 20px;
            }
            .section h3 {
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            table td {
              padding: 8px;
              border-bottom: 1px solid #eee;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #000;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="/images/LuckyLy-Logo.png" alt="LuckyLY Logo" style="max-width: 200px; height: auto; margin: 0 auto;" />
            </div>
            <h1>TICKET DE COMPRA</h1>
            <p>ID: ${ticket.id}</p>
            <p>Fecha: ${new Date(ticket.purchasedAt).toLocaleString()}</p>
          </div>

          <div class="ticket-info">
            <div class="section">
              <h3>Información del Sorteo</h3>
              <table>
                <tr><td><strong>Título:</strong></td><td>${ticket.raffle.title}</td></tr>
                <tr><td><strong>Tipo:</strong></td><td>${ticket.raffle.type}</td></tr>
                <tr><td><strong>Precio por cupo:</strong></td><td>${Number(ticket.raffle.pricePerSlot).toFixed(2)} Bs</td></tr>
                <tr><td><strong>Cupos comprados:</strong></td><td>${Array.isArray(ticket.items) ? ticket.items.join(", ") : "N/A"}</td></tr>
                <tr><td><strong>Total pagado:</strong></td><td>${Number(ticket.totalPaid).toFixed(2)} Bs</td></tr>
                ${ticket.raffle.prizes && Array.isArray(ticket.raffle.prizes) ? `
                <tr><td><strong>Premios:</strong></td><td>${ticket.raffle.prizes.join(", ")}</td></tr>
                ` : ""}
              </table>
            </div>

            <div class="section">
              <h3>Información del Usuario</h3>
              <table>
                <tr><td><strong>Nombre:</strong></td><td>${ticket.user.name}</td></tr>
                <tr><td><strong>Email:</strong></td><td>${ticket.user.email}</td></tr>
              </table>
            </div>
          </div>

          ${terms ? `
          <div class="section">
            <h3>Términos y Condiciones</h3>
            <div>${terms.content.replace(/\n/g, "<br>")}</div>
          </div>
          ` : ""}

          ${rules ? `
          <div class="section">
            <h3>Reglas</h3>
            <div>${rules.content.replace(/\n/g, "<br>")}</div>
          </div>
          ` : ""}

          <div class="footer">
            <p>Este ticket es válido únicamente para el sorteo indicado.</p>
            <p>Conserve este documento como comprobante de compra.</p>
          </div>
        </body>
      </html>
    `;

    // Retornar HTML (en producción, usar una librería como puppeteer o jsPDF para generar PDF real)
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="ticket-${ticket.id}.html"`
      }
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al generar ticket" }, { status: 500 });
  }
}

