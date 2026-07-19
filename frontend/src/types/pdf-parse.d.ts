declare module "pdf-parse" {
  type PdfParseResult = {
    text: string;
  };

  export default function pdfParse(data: Buffer | Uint8Array | ArrayBuffer): Promise<PdfParseResult>;
}
