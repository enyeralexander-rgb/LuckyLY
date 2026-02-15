import { NextResponse } from "next/server";
import * as db from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import { logger } from "@/lib/logger";
import type { Role } from "@/lib/db-types";

function normalizeBaseUrl(url: string): string {
  const u = url.trim();
  if (!u) return "http://localhost:3000";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return u.startsWith("localhost") ? `http://${u}` : `https://${u}`;
}

function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(request, ["USER"] as Role[]);
    const { id: ticketId } = await params;

    const ticket = await db.tickets.findById(ticketId);
    if (!ticket || ticket.userId !== auth.userId) {
      return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
    }

    const [raffle, user, terms] = await Promise.all([
      db.raffles.findById(ticket.raffleId),
      db.users.findById(ticket.userId),
      db.termsAndConditions.findFirst(),
    ]);

    if (!raffle || !user) {
      return NextResponse.json({ error: "Datos del ticket no encontrados" }, { status: 404 });
    }

    const logoUrl = `${getAppUrl()}/images/LuckyLy-Logo.png`;

    const html = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Ticket - ${raffle.title}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              padding: 0;
              margin: 0;
              background: #f5f5f5;
            }
            .toolbar {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              background: #228D57;
              padding: 15px 20px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              z-index: 1000;
              box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            }
            .toolbar h2 {
              color: #fff;
              margin: 0;
              font-size: 1.2rem;
            }
            .toolbar-buttons {
              display: flex;
              gap: 10px;
            }
            .toolbar button {
              padding: 10px 20px;
              border: none;
              border-radius: 6px;
              font-weight: 600;
              cursor: pointer;
              font-size: 0.9rem;
            }
            .btn-print {
              background: #85BB65;
              color: #fff;
            }
            .btn-close {
              background: #fff;
              color: #228D57;
            }
            .container {
              max-width: 800px;
              margin: 80px auto 40px;
              padding: 20px;
            }
            .ticket {
              background: #fff;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
              padding: 30px;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #228D57;
              padding-bottom: 20px;
              margin-bottom: 25px;
            }
            .logo {
              max-width: 180px;
              height: auto;
              margin-bottom: 15px;
            }
            .header h1 {
              color: #228D57;
              margin: 10px 0 5px;
              font-size: 1.8rem;
            }
            .header p {
              color: #666;
              margin: 5px 0;
            }
            .section {
              margin-bottom: 25px;
            }
            .section h3 {
              color: #228D57;
              border-bottom: 2px solid #e5e5e5;
              padding-bottom: 8px;
              margin-bottom: 15px;
              font-size: 1.1rem;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            table td {
              padding: 10px 0;
              border-bottom: 1px solid #f0f0f0;
            }
            table td:first-child {
              color: #666;
              width: 40%;
            }
            table td:last-child {
              font-weight: 600;
              color: #333;
            }
            .cupos {
              display: flex;
              gap: 8px;
              flex-wrap: wrap;
            }
            .cupo {
              background: #85BB65;
              color: #fff;
              padding: 8px 15px;
              border-radius: 6px;
              font-weight: 600;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 3px solid #228D57;
              font-size: 0.85rem;
              color: #888;
              text-align: center;
            }
            .terms-rules {
              margin-top: 25px;
              padding: 15px;
              background: #f9f9f9;
              border-radius: 8px;
              font-size: 0.85rem;
              color: #666;
            }
            @media print {
              .toolbar { display: none !important; }
              .container { margin-top: 0; }
              body { background: #fff; }
              .ticket { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="toolbar">
            <h2>Vista Previa del Ticket</h2>
            <div class="toolbar-buttons">
              <button class="btn-print" onclick="window.print()">📄 Imprimir / Guardar PDF</button>
              <button class="btn-close" onclick="window.close()">✕ Cerrar</button>
            </div>
          </div>

          <div class="container">
            <div class="ticket">
              <div class="header">
                <img src="${logoUrl}" alt="LuckyLY Logo" class="logo" onerror="this.style.display='none'" />
                <h1>TICKET DE COMPRA</h1>
                <p><strong>ID:</strong> ${ticket.id.slice(0, 8).toUpperCase()}</p>
                <p><strong>Fecha:</strong> ${new Date(ticket.purchasedAt).toLocaleString("es-ES")}</p>
              </div>

              <div class="section">
                <h3>📋 Información del Sorteo</h3>
                <table>
                  <tr><td>Título:</td><td>${raffle.title}</td></tr>
                  <tr><td>Tipo:</td><td>${raffle.type}</td></tr>
                  <tr><td>Precio por cupo:</td><td>Bs. ${Number(raffle.pricePerSlot).toFixed(2)}</td></tr>
                  <tr><td>Total pagado:</td><td style="color: #228D57; font-size: 1.2rem;">Bs. ${Number(ticket.totalPaid).toFixed(2)}</td></tr>
                  ${raffle.prizes && Array.isArray(raffle.prizes) ? `
                  <tr><td>Premios:</td><td>${(raffle.prizes as string[]).join(", ")}</td></tr>
                  ` : ""}
                </table>
              </div>

              <div class="section">
                <h3>🎲 Cupos Comprados</h3>
                <div class="cupos">
                  ${Array.isArray(ticket.items) ? (ticket.items as unknown[]).map((item) => `<span class="cupo">${String(item)}</span>`).join("") : "N/A"}
                </div>
              </div>

              <div class="section">
                <h3>👤 Información del Usuario</h3>
                <table>
                  <tr><td>Nombre:</td><td>${user.name}</td></tr>
                  <tr><td>Email:</td><td>${user.email}</td></tr>
                </table>
              </div>

              ${terms?.content ? `
              <div class="terms-rules">
                <p><strong>Términos:</strong> ${terms.content.substring(0, 300)}${terms.content.length > 300 ? '...' : ''}</p>
              </div>
              ` : ""}

              <div class="footer">
                <p>Este ticket es válido únicamente para el sorteo indicado.</p>
                <p>Conserve este documento como comprobante de compra.</p>
                <p style="margin-top: 10px;">© ${new Date().getFullYear()} LuckyLY - Todos los derechos reservados</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al generar ticket", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al generar ticket" }, { status: 500 });
  }
}
