import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import * as QRCode from "qrcode";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

@Injectable()
export class QrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getEventUrl(token: string): string {
    const base = this.config.get<string>("app.publicUrl") ?? "http://localhost:3000";
    return `${base}/e/${token}`;
  }

  private async getEvent(eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });
    if (!event) throw new NotFoundException("Event not found");
    return event;
  }

  async generatePng(eventId: string): Promise<Buffer> {
    const event = await this.getEvent(eventId);
    const url = this.getEventUrl(event.token);
    return QRCode.toBuffer(url, { type: "png", width: 600, margin: 2 });
  }

  async generateSvg(eventId: string): Promise<string> {
    const event = await this.getEvent(eventId);
    const url = this.getEventUrl(event.token);
    return QRCode.toString(url, { type: "svg", width: 600, margin: 2 });
  }

  async generatePdf(eventId: string): Promise<Buffer> {
    const event = await this.getEvent(eventId);
    const url = this.getEventUrl(event.token);

    const qrBuffer = await QRCode.toBuffer(url, {
      type: "png",
      width: 400,
      margin: 2,
    });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const qrImage = await pdfDoc.embedPng(qrBuffer);
    const qrSize = 280;
    const qrX = (595 - qrSize) / 2;

    page.drawImage(qrImage, { x: qrX, y: 380, width: qrSize, height: qrSize });

    page.drawText(event.name, {
      x: 50,
      y: 720,
      size: 28,
      font,
      color: rgb(0.07, 0.09, 0.15),
    });

    if (event.eventDate) {
      page.drawText(new Date(event.eventDate).toLocaleDateString("tr-TR"), {
        x: 50,
        y: 685,
        size: 14,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    page.drawText("Fotoğraf ve videolarını paylaşmak için QR kodu tara", {
      x: 50,
      y: 355,
      size: 13,
      font: fontRegular,
      color: rgb(0.35, 0.35, 0.35),
    });

    page.drawText(url, {
      x: 50,
      y: 330,
      size: 11,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.9),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
