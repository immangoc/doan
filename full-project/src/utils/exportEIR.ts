/**
 * Export an Equipment Interchange Receipt (EIR) / Phiếu Giao Nhận Container
 * as a styled Excel workbook matching the company template.
 */
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface EIRData {
  containerId: string;
  sealNumber?: string;
  containerTypeName?: string;
  cargoTypeName?: string;
  grossWeight?: number | string;
  statusName?: string;
  declaredValue?: number | string;
  yardName?: string;
  zoneName?: string;
  blockName?: string;
  rowNo?: number;
  bayNo?: number;
  tier?: number;
  orderId?: number;
  customerName?: string;
  phone?: string;
  email?: string;
  address?: string;
  importDate?: string;
  exportDate?: string;
  paidAmount?: number | string;
  bookingNo?: string;
  note?: string;
  gateInTime?: string;
  gateOutTime?: string;
}

const COMPANY = 'CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VÀ VẬN TẢI BỐC XẾP HÙNG THỦY';
const COMPANY_EN = '(HUNG THUY TRANSPORT LOADING UNLOADING AND TRADING SERVICE COMPANY LIMITED)';
const BLUE = 'DCE6F1';

function border(): Partial<ExcelJS.Borders> {
  const s: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: '000000' } };
  return { top: s, left: s, bottom: s, right: s };
}

function fmtDate(d?: string | null): string {
  if (!d) return '';
  try { const dt = new Date(d); return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('vi-VN'); } catch { return d; }
}

function fmtMoney(v?: number | string | null): string {
  if (v == null || v === '') return '';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? String(v) : n.toLocaleString('vi-VN') + ' VND';
}

function pos(d: EIRData): string {
  const p = [d.yardName, d.zoneName, d.blockName].filter(Boolean);
  const s = d.rowNo != null && d.bayNo != null ? `R${d.rowNo}B${d.bayNo}${d.tier ? `/T${d.tier}` : ''}` : '';
  return [...p, s].filter(Boolean).join(' · ');
}

async function fetchLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch('/logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

export async function exportEIR(data: EIRData) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'WMS System';
  wb.created = new Date();

  const ws = wb.addWorksheet('Phiếu Giao Nhận', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1,
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
  });

  ws.columns = [
    { width: 4 }, { width: 14 }, { width: 16 }, { width: 14 },
    { width: 10 }, { width: 14 }, { width: 14 }, { width: 12 },
    { width: 10 }, { width: 8 }, { width: 8 }, { width: 8 },
  ];

  const now = new Date();
  const issuedDate = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const issuedTime = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  // ─── Add logo ─────────────────────────────────────────────────────────
  const logoB64 = await fetchLogoBase64();
  if (logoB64) {
    const imgId = wb.addImage({ base64: logoB64, extension: 'png' });
    ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 120, height: 80 } });
  }

  let row = 1;

  // Row 1-2: Company header
  ws.mergeCells(`C${row}:L${row}`);
  ws.getCell(`C${row}`).value = COMPANY;
  ws.getCell(`C${row}`).font = { name: 'Times New Roman', size: 13, bold: true, color: { argb: '1F4E79' } };
  ws.getCell(`C${row}`).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  ws.getRow(row).height = 26;
  row++;

  ws.mergeCells(`C${row}:L${row}`);
  ws.getCell(`C${row}`).value = COMPANY_EN;
  ws.getCell(`C${row}`).font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: '4472C4' } };
  ws.getCell(`C${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row).height = 16;
  row++;

  // Row 3-4: Address & Phone
  ws.mergeCells(`A${row}:L${row}`);
  ws.getCell(`A${row}`).value = `Địa chỉ (Address): ${data.address || '...........................................................................'}`;
  ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 10 };
  ws.getCell(`A${row}`).alignment = { horizontal: 'center' };
  row++;

  ws.mergeCells(`A${row}:L${row}`);
  ws.getCell(`A${row}`).value = `Số điện thoại (Telephone): ${data.phone || '...........................................................................'}`;
  ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 10 };
  ws.getCell(`A${row}`).alignment = { horizontal: 'center' };
  row++;

  row++; // empty

  // Row 6-7: Title + Badge
  ws.mergeCells(`A${row}:H${row}`);
  ws.getCell(`A${row}`).value = 'PHIẾU GIAO NHẬN CONTAINER';
  ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 16, bold: true };
  ws.getCell(`A${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(row).height = 28;
  ws.mergeCells(`I${row}:L${row}`);
  ws.getCell(`I${row}`).value = 'NHẬP BÃI';
  ws.getCell(`I${row}`).font = { name: 'Times New Roman', size: 12, bold: true };
  ws.getCell(`I${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getCell(`I${row}`).border = border();
  row++;

  ws.mergeCells(`A${row}:L${row}`);
  ws.getCell(`A${row}`).value = 'EQUIPMENT INTERCHANGE RECEIPT (EIR)';
  ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 10, italic: true };
  ws.getCell(`A${row}`).alignment = { horizontal: 'center' };
  row++;

  row += 2; // empty rows

  // Barcode placeholder
  ws.mergeCells(`I${row}:L${row + 1}`);
  ws.getCell(`I${row}`).value = '║║║║║║║║║║║';
  ws.getCell(`I${row}`).font = { name: 'Courier New', size: 16 };
  ws.getCell(`I${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
  row++;

  row++;
  // Registration / Booking
  ws.mergeCells(`A${row}:F${row}`);
  ws.getCell(`A${row}`).value = `Số đăng ký: ${data.orderId ? `#${data.orderId}` : '..............................'}`;
  ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 11, bold: true };
  ws.mergeCells(`G${row}:L${row}`);
  ws.getCell(`G${row}`).value = `Số booking: ${data.bookingNo || data.orderId || '..................'}`;
  ws.getCell(`G${row}`).font = { name: 'Times New Roman', size: 11 };
  ws.getCell(`G${row}`).alignment = { horizontal: 'right' };
  row++;

  row++; // empty

  // Customer
  ws.mergeCells(`A${row}:F${row}`);
  ws.getCell(`A${row}`).value = `Khách hàng: ${data.customerName || '...............................................................'}`;
  ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 11, bold: true };
  ws.mergeCells(`G${row}:L${row}`);
  ws.getCell(`G${row}`).value = `Số điện thoại: ${data.phone || '..........................................'}`;
  ws.getCell(`G${row}`).font = { name: 'Times New Roman', size: 11 };
  row++;
  ws.mergeCells(`A${row}:L${row}`);
  ws.getCell(`A${row}`).value = '(Customer)';
  ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: '808080' } };
  row++;

  // Delivery to
  ws.mergeCells(`A${row}:L${row}`);
  ws.getCell(`A${row}`).value = `Giao cho / Nhận của: ${COMPANY}`;
  ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 11, bold: true };
  row++;
  ws.mergeCells(`A${row}:L${row}`);
  ws.getCell(`A${row}`).value = '(Delivery to / Receive from)';
  ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: '808080' } };
  row++;

  // Issued date / CCCD
  ws.mergeCells(`A${row}:F${row}`);
  ws.getCell(`A${row}`).value = `Ngày phát hành: ${issuedDate} lúc ${issuedTime}`;
  ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 11, bold: true };
  ws.mergeCells(`G${row}:L${row}`);
  ws.getCell(`G${row}`).value = 'Số CCCD: ..........................................';
  ws.getCell(`G${row}`).font = { name: 'Times New Roman', size: 11 };
  row++;
  ws.mergeCells(`A${row}:L${row}`);
  ws.getCell(`A${row}`).value = '(Issued date)                                                                                             (ID NO)';
  ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: '808080' } };
  row++;

  row++; // separator

  // ─── Container details table ──────────────────────────────────────────
  const tbl: [string, string, string, string, string, string][] = [
    ['Container số', data.containerId, 'Hãng cont', COMPANY.substring(0, 20) + '...', 'Thời gian xuất', data.exportDate ? fmtDate(data.exportDate) : '...............'],
    ['Số seal', data.sealNumber || '...............', 'Loại', data.cargoTypeName || '...............', 'Thời gian', data.importDate ? fmtDate(data.importDate) : '...............'],
    ['Trọng lượng (Kg)', data.grossWeight != null && data.grossWeight !== '' ? `${Number(data.grossWeight).toLocaleString('vi-VN')} kg` : '...............', 'Cỡ', data.containerTypeName || '...............', 'Vị trí chỉ định', pos(data) || '...............'],
    ['Loại nguy hiểm', '...............', 'Trạng thái', data.statusName || '...............', 'Thanh toán', data.paidAmount != null && data.paidAmount !== '' ? fmtMoney(data.paidAmount) : '...............'],
  ];
  const sub: [string, string, string][] = [
    ['(Container No.)', '(Cntr Operator)', '(Export time)'],
    ['(Seal No.)', '(Type)', '(Import time)'],
    ['(Gross Weight in kg)', '(Size)', '(Yard position)'],
    ['(IMO DG Class)', '(Status)', '(Payments)'],
  ];

  const startR = row;
  for (let i = 0; i < tbl.length; i++) {
    const [l1, v1, l2, v2, l3, v3] = tbl[i];
    const [s1, s2, s3] = sub[i];
    const r = startR + i * 2;
    const sr = r + 1;

    // Data row
    const pairs: [string, string, string, boolean][] = [
      [`A${r}:B${r}`, l1, `C${r}:D${r}`, true],
      [`E${r}:F${r}`, l2, `G${r}:H${r}`, true],
      [`I${r}:J${r}`, l3, `K${r}:L${r}`, true],
    ];
    const vals = [v1, v2, v3];
    pairs.forEach(([lRange, label, vRange], idx) => {
      ws.mergeCells(lRange);
      const lc = ws.getCell(lRange.split(':')[0]);
      lc.value = label;
      lc.font = { name: 'Times New Roman', size: 10, bold: true };
      lc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
      lc.border = border();
      lc.alignment = { vertical: 'middle' };

      ws.mergeCells(vRange);
      const vc = ws.getCell(vRange.split(':')[0]);
      vc.value = vals[idx];
      vc.font = { name: 'Times New Roman', size: 10, bold: idx === 0 };
      vc.border = border();
      vc.alignment = { vertical: 'middle' };
    });

    // Sub-label row
    const subs = [s1, s2, s3];
    const sPairs = [[`A${sr}:B${sr}`, `C${sr}:D${sr}`], [`E${sr}:F${sr}`, `G${sr}:H${sr}`], [`I${sr}:J${sr}`, `K${sr}:L${sr}`]];
    sPairs.forEach(([lR, vR], idx) => {
      ws.mergeCells(lR);
      const c = ws.getCell(lR.split(':')[0]);
      c.value = subs[idx];
      c.font = { name: 'Times New Roman', size: 8, italic: true, color: { argb: '808080' } };
      c.border = border();
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
      ws.mergeCells(vR);
      ws.getCell(vR.split(':')[0]).border = border();
    });

    ws.getRow(r).height = 20;
    ws.getRow(sr).height = 14;
  }

  row = startR + tbl.length * 2 + 2;

  // Remarks
  ws.mergeCells(`A${row}:L${row}`);
  ws.getCell(`A${row}`).value = 'Ghi chú: Nếu không ghi chú gì, Container được coi giao nhận trong tình trạng tốt';
  ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 10, bold: true };
  row++;
  ws.mergeCells(`A${row}:L${row}`);
  ws.getCell(`A${row}`).value = '(If there is no remark, container is considered to be in good condition).';
  ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: '808080' } };
  row++;
  for (let i = 0; i < 3; i++) {
    ws.mergeCells(`A${row}:L${row}`);
    ws.getCell(`A${row}`).value = i === 0
      ? `Ghi chú (Remarks): ${data.note || '........................................................................................................'}`
      : '..............................................................................................................................................................................';
    ws.getCell(`A${row}`).font = { name: 'Times New Roman', size: 10 };
    row++;
  }

  row += 2;

  // Signatures
  const sigs = [['A', 'D', 'Người giao hàng'], ['E', 'H', 'Người nhận hàng'], ['I', 'L', 'Người lập phiếu']];
  sigs.forEach(([c1, c2, label]) => {
    ws.mergeCells(`${c1}${row}:${c2}${row}`);
    ws.getCell(`${c1}${row}`).value = label;
    ws.getCell(`${c1}${row}`).font = { name: 'Times New Roman', size: 11, bold: true };
    ws.getCell(`${c1}${row}`).alignment = { horizontal: 'center' };
  });
  row++;
  sigs.forEach(([c1, c2]) => {
    ws.mergeCells(`${c1}${row}:${c2}${row}`);
    ws.getCell(`${c1}${row}`).value = '(Ký, họ tên)';
    ws.getCell(`${c1}${row}`).font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: '808080' } };
    ws.getCell(`${c1}${row}`).alignment = { horizontal: 'center' };
  });

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `Phieu_Giao_Nhan_${data.containerId}_${now.toISOString().split('T')[0]}.xlsx`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Export styled Excel for all containers (replaces plain CSV)
// ═══════════════════════════════════════════════════════════════════════════

interface ContainerExportRow {
  containerId: string;
  containerTypeName?: string;
  cargoTypeName?: string;
  grossWeight?: number | string;
  yardName?: string;
  zoneName?: string;
  blockName?: string;
  rowNo?: number;
  bayNo?: number;
  tier?: number;
  statusLabel?: string;
  sealNumber?: string;
  createdAt?: string;
  declaredValue?: number | string;
}

const STATUS_COLORS: Record<string, string> = {
  'Sẵn sàng': 'C0C0C0', 'Chờ hạ bãi': 'FFF2CC', 'Trong bãi': 'D6E4F0',
  'Chờ xuất': 'FCE4D6', 'Đã xuất': 'D5F5D5', 'Hư hỏng': 'F4CCCC',
  'Quá hạn': 'F4CCCC', 'Đã hủy': 'D9D9D9',
};

export async function exportContainerListExcel(rows: ContainerExportRow[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'WMS System';
  wb.created = new Date();

  const ws = wb.addWorksheet('Danh sách Container', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  const now = new Date();

  // ─── Logo ─────────────────────────────────────────────────────────────
  const logoB64 = await fetchLogoBase64();
  if (logoB64) {
    const imgId = wb.addImage({ base64: logoB64, extension: 'png' });
    ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 100, height: 65 } });
  }

  // ─── Header ───────────────────────────────────────────────────────────
  ws.mergeCells('C1:J1');
  ws.getCell('C1').value = COMPANY;
  ws.getCell('C1').font = { name: 'Times New Roman', size: 14, bold: true, color: { argb: '1F4E79' } };
  ws.getCell('C1').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells('C2:J2');
  ws.getCell('C2').value = COMPANY_EN;
  ws.getCell('C2').font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: '4472C4' } };
  ws.getCell('C2').alignment = { horizontal: 'center', vertical: 'middle' };

  // Title
  ws.mergeCells('A4:J4');
  ws.getCell('A4').value = 'BÁO CÁO DANH SÁCH CONTAINER';
  ws.getCell('A4').font = { name: 'Times New Roman', size: 16, bold: true, color: { argb: '1F4E79' } };
  ws.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(4).height = 30;

  ws.mergeCells('A5:J5');
  ws.getCell('A5').value = `Ngày xuất báo cáo: ${now.toLocaleDateString('vi-VN')} lúc ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}   |   Tổng số: ${rows.length} container`;
  ws.getCell('A5').font = { name: 'Times New Roman', size: 10, italic: true, color: { argb: '666666' } };
  ws.getCell('A5').alignment = { horizontal: 'center' };

  // ─── Table headers ────────────────────────────────────────────────────
  const headers = ['STT', 'Mã Container', 'Loại', 'Hàng hóa', 'Trọng lượng (kg)', 'Kho · Zone · Block', 'Vị trí', 'Trạng thái', 'Số Seal', 'Ngày tạo'];
  const colWidths = [5, 18, 8, 16, 16, 24, 12, 12, 14, 14];
  ws.columns = colWidths.map(w => ({ width: w }));

  const hdrRow = ws.getRow(7);
  headers.forEach((h, i) => {
    const cell = hdrRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Times New Roman', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1F4E79' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = border();
  });
  hdrRow.height = 24;

  // ─── Data rows ────────────────────────────────────────────────────────
  rows.forEach((c, idx) => {
    const r = ws.getRow(8 + idx);
    const posStr = [c.yardName, c.zoneName, c.blockName].filter(Boolean).join(' · ');
    const slotStr = c.rowNo != null && c.bayNo != null ? `R${c.rowNo}B${c.bayNo}${c.tier ? `/T${c.tier}` : ''}` : '';
    const weight = c.grossWeight != null && c.grossWeight !== '' ? Number(c.grossWeight).toLocaleString('vi-VN') : '';
    const dateStr = c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : '';

    const vals = [idx + 1, c.containerId, c.containerTypeName || '', c.cargoTypeName || '', weight, posStr, slotStr, c.statusLabel || '', c.sealNumber || '', dateStr];

    const isEven = idx % 2 === 0;
    vals.forEach((v, i) => {
      const cell = r.getCell(i + 1);
      cell.value = v;
      cell.font = { name: 'Times New Roman', size: 10 };
      cell.border = border();
      cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'center' : (i === 4 ? 'right' : 'left') };

      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F7FB' } };
      }

      // Bold container ID
      if (i === 1) cell.font = { name: 'Consolas', size: 10, bold: true, color: { argb: '1F4E79' } };

      // Color status
      if (i === 7 && v) {
        const sc = STATUS_COLORS[String(v)] || 'F2F7FB';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sc } };
        cell.font = { name: 'Times New Roman', size: 10, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
    r.height = 20;
  });

  // ─── Footer ───────────────────────────────────────────────────────────
  const footerRow = 8 + rows.length + 1;
  ws.mergeCells(`A${footerRow}:J${footerRow}`);
  ws.getCell(`A${footerRow}`).value = `Tổng cộng: ${rows.length} container   |   Xuất bởi hệ thống WMS Hùng Thủy   |   ${now.toLocaleString('vi-VN')}`;
  ws.getCell(`A${footerRow}`).font = { name: 'Times New Roman', size: 9, italic: true, color: { argb: '999999' } };
  ws.getCell(`A${footerRow}`).alignment = { horizontal: 'center' };

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `Bao_Cao_Container_${now.toISOString().split('T')[0]}.xlsx`);
}
