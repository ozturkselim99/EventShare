import { Controller, Get, Param, Res } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import type { Response } from "express";
import { QrService } from "./qr.service";

@ApiTags("qr")
@Controller("admin/events/:eventId")
export class QrController {
  constructor(private readonly qr: QrService) {}

  @Get("qr.png")
  @ApiOperation({ summary: "Download QR code as PNG" })
  async png(@Param("eventId") eventId: string, @Res() res: Response) {
    const buf = await this.qr.generatePng(eventId);
    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="qr-${eventId}.png"`,
    });
    res.send(buf);
  }

  @Get("qr.svg")
  @ApiOperation({ summary: "Download QR code as SVG" })
  async svg(@Param("eventId") eventId: string, @Res() res: Response) {
    const svg = await this.qr.generateSvg(eventId);
    res.set({
      "Content-Type": "image/svg+xml",
      "Content-Disposition": `attachment; filename="qr-${eventId}.svg"`,
    });
    res.send(svg);
  }

  @Get("qr.pdf")
  @ApiOperation({ summary: "Download QR code as printable PDF" })
  async pdf(@Param("eventId") eventId: string, @Res() res: Response) {
    const buf = await this.qr.generatePdf(eventId);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="qr-${eventId}.pdf"`,
    });
    res.send(buf);
  }
}
