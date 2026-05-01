import { useEffect, useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Pie, PieChart, Cell,
} from 'recharts';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';
import PageHeader from '../../../components/warehouse/PageHeader';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/* ─── Types ─────────────────────────────────────────────────── */
type RevenueReport = {
  totalInvoices: number;
  totalAmount: number;
  overdueAmount: number;
  overdueInvoices: number;
};
type DailyGate = { date: string; gateIn: number; gateOut: number };
type GateReport = { totalGateIn: number; totalGateOut: number; daily: DailyGate[] };
type InventoryReport = {
  totalContainers: number;
  byStatus: Record<string, number>;
  byCargoType: Record<string, number>;
  byContainerType: Record<string, number>;
};
type OrderReport = { totalOrders: number; ordersInPeriod: number; byStatus: Record<string, number> };
type ZoneReport = { totalCapacity: number; totalOccupied: number; overallOccupancyRate: number };
type AlertItem = {
  alertId: number; zoneId?: number; zoneName?: string;
  levelName?: string; description?: string; createdAt?: string; status?: number;
};
type ContainerItem = {
  containerId: string; containerTypeName?: string; statusName?: string;
  cargoTypeName?: string; grossWeight?: number; createdAt?: string;
  declaredValue?: number;
  compensationCost?: number;
  repairCost?: number;
};
type DamageHistoryItem = {
  reportId: number;
  containerId: string;
  containerCode?: string;
  cargoTypeName?: string;
  sizeType?: string;
  reportStatus?: string;
  repairStatus?: string;
  repairDate?: string;
  repairCost?: number;
  compensationCost?: number;
  compensationRefunded?: boolean;
  reportedAt?: string;
  severity?: string;
  reason?: string;
};

/* ─── Constants ─────────────────────────────────────────────── */
const PIE_COLORS = ['#10b981', '#06b6d4', '#a855f7', '#3b82f6', '#f59e0b', '#ef4444', '#84cc16'];

const REPORT_TABS = [
  { id: 'tongquan',  label: 'Tổng quan' },
  { id: 'hanghong',  label: 'Tổng hợp hàng hỏng' },
  { id: 'kho-lanh',  label: 'Tổng hợp kho lạnh' },
  { id: 'kho-kho',   label: 'Tổng hợp kho khô' },
  { id: 'kho-de-vo', label: 'Tổng hợp kho dễ vỡ' },
  { id: 'kho-khac',  label: 'Tổng hợp kho khác' },
] as const;

type TabId = (typeof REPORT_TABS)[number]['id'];

const KHO_KEYWORDS: Record<string, string[]> = {
  'kho-lanh':  ['lạnh', 'lanh', 'cold', 'reefer'],
  'kho-kho':   ['khô', 'kho'],
  'kho-de-vo': ['vỡ', 'vo', 'fragile'],
};

const STATUS_MAP: Record<string, string> = {
  'READY_FOR_IMPORT': 'Chờ nhập bãi',
  'LATE_CHECKIN': 'Nhập bãi trễ',
  'EDIT_REJECTED': 'Từ chối sửa',
  'PENDING': 'Chờ xử lý',
  'REPAIRED': 'Đã sửa chữa',
  'DAMAGED': 'Báo hỏng',
  'CANCELLED': 'Đã huỷ',
  'EDIT_APPROVED': 'Đã duyệt sửa',
  'REJECTED': 'Đã từ chối',
  'EXPORTED': 'Đã xuất bãi',
  'APPROVED': 'Đã duyệt',
  'STORED': 'Đang lưu kho',
  'IMPORTED': 'Đã nhập bãi',
  'IN_YARD': 'Trong bãi',
  'GATE_OUT': 'Ra cổng',
  'GATE_IN': 'Vào cổng'
};

function translateStatus(s: string) {
  return STATUS_MAP[s] || s;
}

function matchesKho(cargoTypeName: string | undefined, tabId: string): boolean {
  if (!cargoTypeName) return tabId === 'kho-khac';
  const lower = cargoTypeName.toLowerCase();
  const khoKeys = Object.values(KHO_KEYWORDS).flat();
  if (tabId === 'kho-khac') {
    return !khoKeys.some((k) => lower.includes(k));
  }
  return (KHO_KEYWORDS[tabId] || []).some((k) => lower.includes(k));
}

function getCargoCountForTab(byCargoType: Record<string, number> | undefined, tabId: string): number {
  if (!byCargoType) return 0;
  return Object.entries(byCargoType).reduce((sum, [name, count]) => {
    return matchesKho(name, tabId) ? sum + count : sum;
  }, 0);
}

function getDefaultDates() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return { from: `${y}-01-01`, to: `${y}-${m}-${d}` };
}

/** Normalize a date (Java LocalDateTime array or ISO string) to YYYY-MM-DD local date */
function normalizeDate(raw: unknown): string {
  if (!raw) return '';
  // Java serializes LocalDateTime as [2026,5,2,10,30,...]
  if (Array.isArray(raw) && raw.length >= 3) {
    const [y, m, d] = raw;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const s = String(raw);
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // ISO string or datetime — extract local date
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return s;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/* ─── Component ─────────────────────────────────────────────── */
export default function BaoCaoThongKe() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const def = getDefaultDates();
  const [tab, setTab]         = useState<TabId>('tongquan');
  const [from, setFrom]       = useState(def.from);
  const [to, setTo]           = useState(def.to);

  // shared inventory (loaded once)
  const [inventory, setInventory] = useState<InventoryReport | null>(null);
  const [invLoading, setInvLoading] = useState(true);

  // tongquan
  const [revenue, setRevenue]         = useState<RevenueReport | null>(null);
  const [gateReport, setGateReport]   = useState<GateReport | null>(null);
  const [orderReport, setOrderReport] = useState<OrderReport | null>(null);
  const [tqLoading, setTqLoading]     = useState(false);
  const [tqError, setTqError]         = useState('');

  // orders list
  const [ordersList, setOrdersList]   = useState<any[]>([]);
  const [ordersPage, setOrdersPage]   = useState(0);
  const [ordersTotalPages, setOrdersTotalPages] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // hanghong
  const [alerts, setAlerts]         = useState<AlertItem[]>([]);
  const [alertTotal, setAlertTotal] = useState(0);
  const [alertPage, setAlertPage]   = useState(0);
  const [alertTotalPages, setAlertTotalPages] = useState(0);
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertError, setAlertError] = useState('');

  // damage history (all reports, including repaired/returned)
  const [damageHistory, setDamageHistory] = useState<DamageHistoryItem[]>([]);
  const [damageLoading, setDamageLoading] = useState(false);
  const [damagePage, setDamagePage] = useState(0);
  const DAMAGE_PAGE_SIZE = 6;

  // damaged containers count (only current DAMAGED status)
  const [damagedCount, setDamagedCount] = useState(0);

  // financial summary from all damage reports (including repaired/returned)
  type FinancialSummary = {
    totalDamageReports: number;
    totalCompensationCost: number;
    totalRepairCost: number;
    totalRefunded: number;
  };
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [financialLoading, setFinancialLoading] = useState(false);

  // kho tabs
  const [containers, setContainers]   = useState<ContainerItem[]>([]);
  const [khoLoading, setKhoLoading]   = useState(false);
  const [khoError, setKhoError]       = useState('');

  /* ── fetch inventory on mount ── */
  useEffect(() => {
    const load = async () => {
      setInvLoading(true);
      try {
        const res = await fetch(`${API_BASE}/admin/reports/container-inventory`, { headers });
        const d = await res.json();
        if (res.ok) setInventory(d.data);
      } catch { /* silently fail */ } finally {
        setInvLoading(false);
      }
    };
    load();
  }, []);

  /* ── fetch tongquan reports ── */
  const fetchTongQuan = async (f = from, t = to) => {
    setTqLoading(true);
    setTqError('');
    try {
      const [revRes, gateRes, ordRes] = await Promise.all([
        fetch(`${API_BASE}/admin/reports/revenue?from=${f}&to=${t}`, { headers }),
        fetch(`${API_BASE}/admin/reports/gate-activity?from=${f}&to=${t}`, { headers }),
        fetch(`${API_BASE}/admin/reports/orders?from=${f}&to=${t}`, { headers }),
      ]);
      const [revData, gateData, ordData] = await Promise.all([
        revRes.json(), gateRes.json(), ordRes.json(),
      ]);
      if (revRes.ok)  setRevenue(revData.data);
      if (gateRes.ok) setGateReport(gateData.data);
      if (ordRes.ok)  setOrderReport(ordData.data);
      if (!revRes.ok && !gateRes.ok) throw new Error(revData.message || 'Lỗi tải báo cáo');
      
      // Also fetch first page of orders
      fetchOrdersList(0);
    } catch (e: any) {
      setTqError(e.message || 'Lỗi không xác định');
    } finally {
      setTqLoading(false);
    }
  };

  const fetchOrdersList = async (pg = 0) => {
    setOrdersLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/orders?page=${pg}&size=6&sortBy=createdAt&direction=desc`, { headers });
      const d = await res.json();
      if (res.ok) {
        setOrdersList(d.data?.content || []);
        setOrdersTotalPages(d.data?.totalPages || 0);
        setOrdersPage(pg);
      }
    } catch { /* ignore */ } finally {
      setOrdersLoading(false);
    }
  };

  /* ── fetch all damage history (from /admin/damage/history) ── */
  const fetchDamageHistory = async () => {
    setDamageLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/damage/history`, { headers });
      const d = await res.json();
      if (res.ok) {
        const list: DamageHistoryItem[] = (d.data || []).map((r: any) => ({
          reportId:           r.reportId,
          containerId:        r.containerId,
          containerCode:      r.containerCode,
          cargoTypeName:      r.cargoTypeName,
          sizeType:           r.sizeType,
          reportStatus:       r.reportStatus,
          repairStatus:       r.repairStatus,
          repairDate:         r.repairDate,
          repairCost:         r.repairCost ? Number(r.repairCost) : 0,
          compensationCost:   r.compensationCost ? Number(r.compensationCost) : 0,
          compensationRefunded: r.compensationRefunded,
          reportedAt:         normalizeDate(r.reportedAt),
          severity:           r.severity,
          reason:             r.reason,
        }));
        setDamageHistory(list);
        // Count current DAMAGED from list
        setDamagedCount(list.filter(r => r.reportStatus === 'STORED').length);
        setDamagePage(0);
      }
    } catch { /* ignore */ } finally {
      setDamageLoading(false);
    }
  };

  /* ── fetch financial summary (all historical damage reports) ── */
  const fetchFinancialSummary = async () => {
    setFinancialLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/damage/financial-summary`, { headers });
      const d = await res.json();
      if (res.ok) setFinancialSummary(d.data);
    } catch { /* ignore */ } finally {
      setFinancialLoading(false);
    }
  };

  /* ── fetch alerts (hanghong) ── */
  const fetchAlerts = async (pg = 0) => {
    setAlertLoading(true);
    setAlertError('');
    try {
      const res = await fetch(`${API_BASE}/admin/alerts?page=${pg}&size=20`, { headers });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Lỗi tải cảnh báo');
      setAlerts(d.data?.content || []);
      setAlertTotal(d.data?.totalElements ?? 0);
      setAlertTotalPages(d.data?.totalPages ?? 0);
      setAlertPage(pg);
    } catch (e: any) {
      setAlertError(e.message || 'Lỗi');
    } finally {
      setAlertLoading(false);
    }
  };

  /* ── fetch containers (kho tabs) ── */
  const fetchContainers = async () => {
    setKhoLoading(true);
    setKhoError('');
    try {
      const res = await fetch(`${API_BASE}/admin/containers?page=0&size=100&sortBy=createdAt&direction=desc`, { headers });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Lỗi tải container');
      setContainers(d.data?.content || []);
    } catch (e: any) {
      setKhoError(e.message || 'Lỗi');
    } finally {
      setKhoLoading(false);
    }
  };

  /* ── tab switch ── */
  useEffect(() => {
    if (tab === 'tongquan') fetchTongQuan();
    else if (tab === 'hanghong') {
      if (alerts.length === 0) fetchAlerts(0);
      if (damageHistory.length === 0) fetchDamageHistory();
      if (!financialSummary) fetchFinancialSummary();
    }
    else if (tab.startsWith('kho-')) { if (containers.length === 0) fetchContainers(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  /* ── chart data ── */
  const monthlyGate = useMemo(() => {
    if (!gateReport?.daily?.length) return [];
    const map: Record<string, { name: string; gateIn: number; gateOut: number }> = {};
    gateReport.daily.forEach(({ date, gateIn, gateOut }) => {
      const m = new Date(date + 'T00:00:00').getMonth() + 1;
      const key = `T${m}`;
      if (!map[key]) map[key] = { name: key, gateIn: 0, gateOut: 0 };
      map[key].gateIn  += gateIn;
      map[key].gateOut += gateOut;
    });
    return Object.values(map);
  }, [gateReport]);

  const pieSeries = useMemo(() => {
    if (!inventory?.byCargoType) return [];
    const total = Object.values(inventory.byCargoType).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(inventory.byCargoType).map(([name, count], i) => ({
      name,
      value: Math.round((count / total) * 100),
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [inventory]);

  const orderStatusData = useMemo(() => {
    if (!orderReport?.byStatus) return [];
    return Object.entries(orderReport.byStatus).map(([name, value]) => ({ name: translateStatus(name), value }));
  }, [orderReport]);

  /* ── kho tab containers ── */
  const khoContainers = useMemo(() => {
    return containers.filter((c) => matchesKho(c.cargoTypeName, tab));
  }, [containers, tab]);

  const khoCount     = getCargoCountForTab(inventory?.byCargoType, tab);
  const khoTabLabel  = REPORT_TABS.find((t) => t.id === tab)?.label || '';

  const filteredDamageHistory = useMemo(() => {
    return damageHistory.filter((r) => {
      if (!r.reportedAt) return true;
      // reportedAt is already normalized to YYYY-MM-DD by fetchDamageHistory
      return r.reportedAt >= from && r.reportedAt <= to;
    });
  }, [damageHistory, from, to]);

  async function handleExportReport() {
    // Ensure damage data is loaded for repair/refund amounts
    let dmgData = filteredDamageHistory;
    if (damageHistory.length === 0) {
      try {
        const res = await fetch(`${API_BASE}/admin/damage/history`, { headers });
        const d = await res.json();
        if (res.ok) {
          const list: DamageHistoryItem[] = (d.data || []).map((r: any) => ({
            reportId: r.reportId, containerId: r.containerId, containerCode: r.containerCode,
            cargoTypeName: r.cargoTypeName, sizeType: r.sizeType, reportStatus: r.reportStatus,
            repairStatus: r.repairStatus, repairDate: r.repairDate,
            repairCost: r.repairCost ? Number(r.repairCost) : 0,
            compensationCost: r.compensationCost ? Number(r.compensationCost) : 0,
            compensationRefunded: r.compensationRefunded,
            reportedAt: normalizeDate(r.reportedAt), severity: r.severity, reason: r.reason,
          }));
          setDamageHistory(list);
          dmgData = list.filter((r) => {
            if (!r.reportedAt) return true;
            return r.reportedAt >= from && r.reportedAt <= to;
          });
        }
      } catch { /* continue with empty */ }
    }

    let revAmt = revenue?.totalAmount;
    if (revAmt == null) {
      try {
        const query = new URLSearchParams({ from, to });
        const res = await fetch(`${API_BASE}/admin/reports/revenue?${query.toString()}`, { headers });
        if (res.ok) { const json = await res.json(); revAmt = json.data?.totalAmount ?? 0; }
      } catch { revAmt = 0; }
    }
    const finalRev = revAmt ?? 0;
    const finalRepair = dmgData.reduce((sum, r) => sum + (r.repairCost ?? 0), 0);
    const finalRefund = dmgData.reduce((sum, r) => sum + (r.compensationCost ?? 0), 0);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hùng Thủy WMS';
    const sheet = workbook.addWorksheet('Báo cáo thống kê');

    // ── Column widths ──
    sheet.columns = [
      { width: 6 },   // A: STT
      { width: 22 },  // B: Container
      { width: 18 },  // C: Loại hàng
      { width: 12 },  // D: Kích thước
      { width: 18 },  // E: Trạng thái
      { width: 16 },  // F: TT sửa chữa
      { width: 22 },  // G: Tiền sửa
      { width: 22 },  // H: Tiền hoàn
      { width: 16 },  // I: Ngày báo
    ];

    // ── Styles ──
    const titleFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 16, bold: true, color: { argb: '1E3A8A' } };
    const headerFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFF' } };
    const headerFill: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    const summaryLabelFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 11, bold: true };
    const summaryValueFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 11, bold: true, color: { argb: '059669' } };
    const borderThin: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'D1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
      left: { style: 'thin', color: { argb: 'D1D5DB' } },
      right: { style: 'thin', color: { argb: 'D1D5DB' } },
    };
    const vndFmt = '#,##0';

    // ── Title ──
    sheet.mergeCells('A1:I1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'BÁO CÁO THỐNG KÊ KHO BÃI';
    titleCell.font = titleFont;
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 36;

    // ── Subtitle ──
    sheet.mergeCells('A2:I2');
    const subCell = sheet.getCell('A2');
    subCell.value = `Kỳ báo cáo: ${from} → ${to}`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: '6B7280' } };
    subCell.alignment = { horizontal: 'center' };
    sheet.getRow(2).height = 22;

    // ── Summary section ──
    const summaryStart = 4;
    const summaryItems = [
      ['Tổng doanh thu (VND)', finalRev, '059669'],
      ['Tổng tiền sửa container (VND)', finalRepair, 'D97706'],
      ['Tổng tiền hoàn do hỏng (VND)', finalRefund, '3B82F6'],
      ['Tổng chi phí thiệt hại (VND)', finalRepair + finalRefund, 'DC2626'],
    ] as const;

    summaryItems.forEach(([label, value, color], i) => {
      const row = sheet.getRow(summaryStart + i);
      row.getCell(1).value = '';
      sheet.mergeCells(summaryStart + i, 2, summaryStart + i, 5);
      row.getCell(2).value = String(label);
      row.getCell(2).font = summaryLabelFont;
      row.getCell(2).border = borderThin;
      sheet.mergeCells(summaryStart + i, 6, summaryStart + i, 9);
      row.getCell(6).value = Number(value);
      row.getCell(6).numFmt = vndFmt;
      row.getCell(6).font = { ...summaryValueFont, color: { argb: color } };
      row.getCell(6).alignment = { horizontal: 'right' };
      row.getCell(6).border = borderThin;
      row.height = 26;
    });

    // ── Damage detail header ──
    const detailTitleRow = summaryStart + summaryItems.length + 1;
    sheet.mergeCells(detailTitleRow, 1, detailTitleRow, 9);
    const dtCell = sheet.getCell(`A${detailTitleRow}`);
    dtCell.value = 'CHI TIẾT HÀNG HỎNG';
    dtCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: '374151' } };
    sheet.getRow(detailTitleRow).height = 28;

    const hdrRow = detailTitleRow + 1;
    const headers = ['STT', 'Container', 'Loại hàng', 'Kích thước', 'Trạng thái', 'TT sửa chữa', 'Tiền sửa (VND)', 'Tiền hoàn (VND)', 'Ngày báo'];
    const headerRowObj = sheet.getRow(hdrRow);
    headers.forEach((h, i) => {
      const cell = headerRowObj.getCell(i + 1);
      cell.value = h;
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = borderThin;
    });
    headerRowObj.height = 28;

    // ── Data rows ──
    dmgData.forEach((r, idx) => {
      const rowNum = hdrRow + 1 + idx;
      const dataRow = sheet.getRow(rowNum);
      const isEven = idx % 2 === 0;
      const bgFill: ExcelJS.FillPattern = isEven
        ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } }
        : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };

      const vals: (string | number)[] = [
        idx + 1,
        r.containerId || '',
        r.cargoTypeName || '',
        r.sizeType || '',
        r.reportStatus === 'STORED' ? 'Trong kho hỏng'
          : r.reportStatus === 'RETURNED' ? 'Đã về kho'
          : r.reportStatus === 'PENDING' ? 'Chờ xử lý' : (r.reportStatus || ''),
        r.repairStatus === 'REPAIRED' ? 'Đã sửa'
          : r.repairStatus === 'IN_PROGRESS' ? 'Đang sửa'
          : r.repairStatus === 'PENDING' ? 'Chờ sửa' : (r.repairStatus || ''),
        r.repairCost ?? 0,
        r.compensationCost ?? 0,
        r.reportedAt || '',
      ];
      vals.forEach((v, i) => {
        const cell = dataRow.getCell(i + 1);
        cell.value = v;
        cell.border = borderThin;
        cell.fill = bgFill;
        cell.font = { name: 'Arial', size: 10 };
        if (i === 6 || i === 7) {
          cell.numFmt = vndFmt;
          cell.alignment = { horizontal: 'right' };
          if (Number(v) > 0) cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: i === 6 ? 'D97706' : '3B82F6' } };
        } else if (i === 0) {
          cell.alignment = { horizontal: 'center' };
        }
      });
      dataRow.height = 22;
    });

    // ── Footer total row ──
    if (dmgData.length > 0) {
      const footerRow = hdrRow + 1 + dmgData.length;
      const fr = sheet.getRow(footerRow);
      sheet.mergeCells(footerRow, 1, footerRow, 6);
      fr.getCell(1).value = 'TỔNG CỘNG';
      fr.getCell(1).font = { name: 'Arial', size: 11, bold: true };
      fr.getCell(1).alignment = { horizontal: 'right' };
      fr.getCell(1).border = borderThin;
      fr.getCell(7).value = finalRepair;
      fr.getCell(7).numFmt = vndFmt;
      fr.getCell(7).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'D97706' } };
      fr.getCell(7).border = borderThin;
      fr.getCell(7).alignment = { horizontal: 'right' };
      fr.getCell(8).value = finalRefund;
      fr.getCell(8).numFmt = vndFmt;
      fr.getCell(8).font = { name: 'Arial', size: 11, bold: true, color: { argb: '3B82F6' } };
      fr.getCell(8).border = borderThin;
      fr.getCell(8).alignment = { horizontal: 'right' };
      fr.getCell(9).border = borderThin;
      fr.height = 28;

      // Fill background for footer
      const footerFill: ExcelJS.FillPattern = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EEF2FF' } };
      for (let c = 1; c <= 9; c++) fr.getCell(c).fill = footerFill;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Bao_Cao_Thong_Ke_${from}_${to}.xlsx`);
  }

  return (
    <>
      <PageHeader
        title="Báo cáo & Thống kê"
        subtitle="Phân tích dữ liệu theo thời gian thực"
        action={null}
      />

      <div className="tabs">
        {REPORT_TABS.map((item) => (
          <button
            key={item.id}
            className={`tab-btn${tab === item.id ? ' active' : ''}`}
            type="button"
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* ── TỔNG QUAN ── */}
      {tab === 'tongquan' && (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <label className="form-label" style={{ margin: 0 }}>Từ:</label>
            <input className="form-input" type="date" style={{ width: 160 }} value={from} onChange={(e) => setFrom(e.target.value)} />
            <label className="form-label" style={{ margin: 0 }}>Đến:</label>
            <input className="form-input" type="date" style={{ width: 160 }} value={to} onChange={(e) => setTo(e.target.value)} />
            <button className="btn btn-secondary btn-sm" onClick={() => fetchTongQuan(from, to)} disabled={tqLoading}>
              {tqLoading ? 'Đang tải...' : 'Cập nhật'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleExportReport} style={{ background: '#6c47ff', color: '#fff', border: 'none' }}>
              Xuất báo cáo
            </button>
          </div>

          {tqError && (
            <div className="card" style={{ borderColor: 'var(--danger)', marginBottom: 12 }}>
              <div style={{ color: 'var(--danger)' }}>{tqError}</div>
            </div>
          )}

          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', marginBottom: 16 }}>
            <div className="card">
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Tổng doanh thu (hóa đơn lưu kho & đặt cọc)</div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>
                {tqLoading ? '...' : revenue ? `${Number(revenue.totalAmount ?? 0).toLocaleString('vi-VN')} VND` : '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
                {revenue ? `Từ ${from} đến ${to}` : ''}
              </div>
            </div>
            <div className="card">
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>Tổng container (kho)</div>
              <div style={{ marginTop: 8, fontSize: 24, fontWeight: 700, color: 'var(--primary)' }}>
                {invLoading ? '...' : inventory ? inventory.totalContainers : '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
                {inventory ? `${Object.keys(inventory.byCargoType ?? {}).length} loại hàng` : ''}
              </div>
            </div>
          </div>

          <div className="charts-grid" style={{ marginBottom: 16 }}>
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Hoạt động Gate theo tháng</div>
                  <div className="card-subtitle">Gate vào / Gate ra</div>
                </div>
              </div>
              {tqLoading ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 13 }}>Đang tải...</div>
              ) : monthlyGate.length === 0 ? (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 13 }}>Không có dữ liệu trong khoảng thời gian này.</div>
              ) : (
                <div style={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyGate} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="gateIn"  name="Gate-In"  fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="gateOut" name="Gate-Out" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Phân bổ container theo loại hàng</div>
                  <div className="card-subtitle">Số lượng container theo loại</div>
                </div>
              </div>
              {invLoading ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 13 }}>Đang tải...</div>
              ) : pieSeries.length === 0 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)', fontSize: 13 }}>Chưa có dữ liệu.</div>
              ) : (
                <div className="two-col" style={{ gap: 14, alignItems: 'center' }}>
                  <div style={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieSeries} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={4}>
                          {pieSeries.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ minWidth: 160 }}>
                    {pieSeries.map((entry) => (
                      <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: entry.color, flexShrink: 0, display: 'inline-block' }} />
                        <span>{entry.name}: {entry.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Tổng hợp đơn hàng theo trạng thái</div>
                <div className="card-subtitle">Kỳ từ {from} đến {to}</div>
              </div>
            </div>
            {tqLoading ? (
              <div style={{ padding: '24px', color: 'var(--text2)' }}>Đang tải...</div>
            ) : orderReport ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={orderStatusData} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={80} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#6c47ff" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Chi tiết trạng thái đơn hàng</div>
                  <div style={{ marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--text2)' }}>Tổng đơn (hệ thống):</span>{' '}
                    <strong>{orderReport.totalOrders}</strong>
                  </div>
                  <div style={{ marginBottom: 12, fontSize: 13 }}>
                    <span style={{ color: 'var(--text2)' }}>Đơn trong kỳ:</span>{' '}
                    <strong>{orderReport.ordersInPeriod}</strong>
                  </div>
                  {orderStatusData.map(({ name, value }) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                      <span>{name}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px', color: 'var(--text2)', fontSize: 13 }}>Chưa có dữ liệu đơn hàng.</div>
            )}
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header" style={{ justifyContent: 'space-between' }}>
              <div>
                <div className="card-title">Danh sách số tiền thanh toán của từng đơn hàng</div>
                <div className="card-subtitle">Chi tiết số tiền khách đã thanh toán theo từng đơn</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => fetchOrdersList(0)} disabled={ordersLoading}>Làm mới</button>
            </div>
            {ordersLoading ? (
              <div style={{ padding: '24px', color: 'var(--text2)', fontSize: 13 }}>Đang tải...</div>
            ) : ordersList.length > 0 ? (
              <>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID Đơn</th>
                        <th>Khách hàng</th>
                        <th>Trạng thái</th>
                        <th>Ngày tạo</th>
                        <th style={{ color: '#10b981' }}>Đã thanh toán (VND)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordersList.map((o) => (
                        <tr key={o.orderId}>
                          <td><code>#{o.orderId}</code></td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{o.customerName}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{o.email}</div>
                          </td>
                          <td>
                            <span className="badge" style={{ backgroundColor: 'var(--bg2)', color: 'var(--text1)' }}>
                              {translateStatus(o.statusName)}
                            </span>
                          </td>
                          <td>{o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '—'}</td>
                          <td style={{ fontWeight: 600, color: '#10b981' }}>
                            {o.paidAmount ? Number(o.paidAmount).toLocaleString('vi-VN') : '0'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {ordersTotalPages > 1 && (
                  <div style={{ display: 'flex', gap: 8, padding: '12px 0', justifyContent: 'center', alignItems: 'center' }}>
                    <button className="btn btn-secondary btn-sm" disabled={ordersPage === 0} onClick={() => fetchOrdersList(ordersPage - 1)}>←</button>
                    <span style={{ fontSize: 13 }}>Trang {ordersPage + 1} / {ordersTotalPages}</span>
                    <button className="btn btn-secondary btn-sm" disabled={ordersPage >= ordersTotalPages - 1} onClick={() => fetchOrdersList(ordersPage + 1)}>→</button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '24px', color: 'var(--text2)', fontSize: 13 }}>Chưa có đơn hàng nào.</div>
            )}
          </div>
        </>
      )}

      {/* ── HÀNG HỎNG ── */}
      {tab === 'hanghong' && (
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="card-title">Tổng hợp hàng hỏng / Cảnh báo</div>
              <div className="card-subtitle">Danh sách cảnh báo và sự cố đang theo dõi</div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <label className="form-label" style={{ margin: 0 }}>Từ:</label>
              <input className="form-input" type="date" style={{ width: 140 }} value={from} onChange={(e) => setFrom(e.target.value)} />
              <label className="form-label" style={{ margin: 0 }}>Đến:</label>
              <input className="form-input" type="date" style={{ width: 140 }} value={to} onChange={(e) => setTo(e.target.value)} />
              <button className="btn btn-secondary btn-sm" onClick={() => { setDamagePage(0); fetchAlerts(0); fetchDamageHistory(); fetchTongQuan(from, to); }} disabled={alertLoading || damageLoading}>Cập nhật</button>
              <button className="btn btn-primary btn-sm" onClick={handleExportReport} style={{ background: '#6c47ff', color: '#fff', border: 'none' }}>Xuất báo cáo</button>
            </div>
          </div>

          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', marginBottom: 16 }}>
            <div className="stat-card"><div><div className="stat-label">Tổng cảnh báo</div><div className="stat-value">{alertLoading ? '...' : alertTotal}</div></div></div>
            <div className="stat-card"><div><div className="stat-label">Đang mở (OPEN)</div><div className="stat-value">{alertLoading ? '...' : alerts.filter((a) => a.status === 0).length}</div></div></div>
            <div className="stat-card"><div><div className="stat-label">Đã xử lý</div><div className="stat-value">{alertLoading ? '...' : alerts.filter((a) => a.status === 1).length}</div></div></div>
            <div className="stat-card"><div><div className="stat-label">Nghiêm trọng</div><div className="stat-value">{alertLoading ? '...' : alerts.filter((a) => a.levelName === 'CRITICAL').length}</div></div></div>
          </div>

          {/* ── Damaged Container Financial Summary ── */}
          {(() => {
            const loading = financialLoading || damageLoading;
            const totalCompensation = filteredDamageHistory.reduce((sum, r) => sum + (r.compensationCost ?? 0), 0);
            const totalRepair = filteredDamageHistory.reduce((sum, r) => sum + (r.repairCost ?? 0), 0);
            const totalDamageReports = filteredDamageHistory.length;
            const totalRefunded = filteredDamageHistory.filter(r => r.compensationRefunded).length;

            // paginated damage history
            const totalDmgPages = Math.ceil(filteredDamageHistory.length / DAMAGE_PAGE_SIZE);
            const pageSlice = filteredDamageHistory.slice(damagePage * DAMAGE_PAGE_SIZE, (damagePage + 1) * DAMAGE_PAGE_SIZE);

            return (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10, color: 'var(--text1)' }}>
                  Thống kê thiệt hại tài chính — Từ {from} đến {to}
                </div>
                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', marginBottom: 12 }}>
                  <div className="stat-card">
                    <div>
                      <div className="stat-label">Doanh thu kỳ (VND)</div>
                      <div className="stat-value" style={{ color: '#10b981', fontSize: 18 }}>
                        {tqLoading ? '...' : revenue ? Number(revenue.totalAmount ?? 0).toLocaleString('vi-VN') : '0'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                        Từ {from} đến {to}
                      </div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div>
                      <div className="stat-label">Tổng lần báo hỏng</div>
                      <div className="stat-value" style={{ color: '#ef4444' }}>
                        {loading ? '...' : totalDamageReports}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                        Đang trong kho hỏng: {damageLoading ? '...' : damagedCount}
                      </div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div>
                      <div className="stat-label">Tổng tiền hoàn (VND)</div>
                      <div className="stat-value" style={{ color: '#3b82f6', fontSize: 18 }}>
                        {loading ? '...' : totalCompensation > 0 ? totalCompensation.toLocaleString('vi-VN') : '0'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                        Đã hoàn tiền: {loading ? '...' : totalRefunded} lần
                      </div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div>
                      <div className="stat-label">Tổng tiền sửa (VND)</div>
                      <div className="stat-value" style={{ color: '#f59e0b', fontSize: 18 }}>
                        {loading ? '...' : totalRepair > 0 ? totalRepair.toLocaleString('vi-VN') : '0'}
                      </div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div>
                      <div className="stat-label">Tổng chi phí thiệt hại (VND)</div>
                      <div className="stat-value" style={{ color: '#7c3aed', fontSize: 18 }}>
                        {loading ? '...' : (totalCompensation + totalRepair) > 0
                          ? (totalCompensation + totalRepair).toLocaleString('vi-VN')
                          : '0'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Damage history table with pagination */}
                {damageLoading ? (
                  <div style={{ padding: '16px', color: 'var(--text2)', fontSize: 13 }}>Đang tải lịch sử hàng hỏng...</div>
                ) : filteredDamageHistory.length > 0 ? (
                  <>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Container</th>
                            <th>Loại hàng</th>
                            <th>Kích thước</th>
                            <th>Trạng thái</th>
                            <th>TT sửa chữa</th>
                            <th style={{ color: '#f59e0b' }}>Tiền sửa (VND)</th>
                            <th style={{ color: '#3b82f6' }}>Tiền hoàn (VND)</th>
                            <th>Ngày báo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageSlice.map((r) => (
                            <tr key={r.reportId}>
                              <td><code>{r.containerId}</code></td>
                              <td>{r.cargoTypeName || '—'}</td>
                              <td>{r.sizeType || '—'}</td>
                              <td>
                                <span className={`badge ${
                                  r.reportStatus === 'STORED'   ? 'badge-danger' :
                                  r.reportStatus === 'RETURNED' ? 'badge-success' :
                                  r.reportStatus === 'PENDING'  ? 'badge-warning' : 'badge-gray'
                                }`}>
                                  {r.reportStatus === 'STORED' ? 'Trong kho hỏng' :
                                   r.reportStatus === 'RETURNED' ? 'Đã về kho' :
                                   r.reportStatus === 'PENDING' ? 'Chờ xử lý' : r.reportStatus || '—'}
                                </span>
                              </td>
                              <td>
                                {r.repairStatus ? (
                                  <span className={`badge ${
                                    r.repairStatus === 'REPAIRED'    ? 'badge-success' :
                                    r.repairStatus === 'IN_PROGRESS' ? 'badge-warning' : 'badge-gray'
                                  }`}>{r.repairStatus}</span>
                                ) : '—'}
                              </td>
                              <td style={{ fontWeight: (r.repairCost ?? 0) > 0 ? 600 : undefined, color: (r.repairCost ?? 0) > 0 ? '#f59e0b' : undefined }}>
                                {(r.repairCost ?? 0) > 0 ? Number(r.repairCost).toLocaleString('vi-VN') : '—'}
                              </td>
                              <td style={{ fontWeight: (r.compensationCost ?? 0) > 0 ? 600 : undefined, color: (r.compensationCost ?? 0) > 0 ? '#3b82f6' : undefined }}>
                                {(r.compensationCost ?? 0) > 0 ? Number(r.compensationCost).toLocaleString('vi-VN') : '—'}
                                {r.compensationRefunded && <span style={{ fontSize: 10, marginLeft: 4, color: '#10b981' }}>✓ đã hoàn</span>}
                              </td>
                              <td>{r.reportedAt || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ fontWeight: 700, background: 'var(--bg2)' }}>
                            <td colSpan={5} style={{ textAlign: 'right', paddingRight: 12 }}>Tổng cộng:</td>
                            <td style={{ color: '#f59e0b' }}>
                              {filteredDamageHistory.reduce((s, r) => s + (r.repairCost ?? 0), 0).toLocaleString('vi-VN')}
                            </td>
                            <td style={{ color: '#3b82f6' }}>
                              {filteredDamageHistory.reduce((s, r) => s + (r.compensationCost ?? 0), 0).toLocaleString('vi-VN')}
                            </td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    {totalDmgPages > 1 && (
                      <div style={{ display: 'flex', gap: 8, padding: '10px 0', justifyContent: 'center', alignItems: 'center' }}>
                        <button className="btn btn-secondary btn-sm" disabled={damagePage === 0} onClick={() => setDamagePage(p => p - 1)}>←</button>
                        <span style={{ fontSize: 13 }}>Trang {damagePage + 1} / {totalDmgPages} ({filteredDamageHistory.length} bản ghi)</span>
                        <button className="btn btn-secondary btn-sm" disabled={damagePage >= totalDmgPages - 1} onClick={() => setDamagePage(p => p + 1)}>→</button>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: '16px', color: 'var(--text2)', fontSize: 13 }}>Chưa có lịch sử hàng hỏng.</div>
                )}
              </div>
            );
          })()}

          {alertError && <div style={{ color: 'var(--danger)', marginBottom: 8 }}>{alertError}</div>}

          {alertLoading ? (
            <div style={{ padding: '24px', color: 'var(--text2)' }}>Đang tải...</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th><th>Khu vực</th><th>Mô tả</th><th>Mức độ</th><th>Trạng thái</th><th>Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.length === 0 ? (
                    <tr><td colSpan={6} style={{ color: 'var(--text2)' }}>Không có cảnh báo nào.</td></tr>
                  ) : (
                    alerts.map((a) => (
                      <tr key={a.alertId}>
                        <td><code>{a.alertId}</code></td>
                        <td>{a.zoneName || (a.zoneId ? `Zone #${a.zoneId}` : '—')}</td>
                        <td>{a.description || '—'}</td>
                        <td>
                          <span className={`badge ${a.levelName === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>
                            {a.levelName || '—'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${a.status === 0 ? 'badge-danger' : 'badge-success'}`}>
                            {a.status === 0 ? 'OPEN' : 'ACKNOWLEDGED'}
                          </span>
                        </td>
                        <td>{a.createdAt ? new Date(a.createdAt).toLocaleString('vi-VN') : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {alertTotalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, padding: '12px 0', justifyContent: 'center', alignItems: 'center' }}>
              <button className="btn btn-secondary btn-sm" disabled={alertPage === 0} onClick={() => fetchAlerts(alertPage - 1)}>←</button>
              <span style={{ lineHeight: '28px', fontSize: 13 }}>{alertPage + 1} / {alertTotalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={alertPage >= alertTotalPages - 1} onClick={() => fetchAlerts(alertPage + 1)}>→</button>
            </div>
          )}
        </div>
      )}

      {/* ── KHO SUB-TABS ── */}
      {tab.startsWith('kho-') && (
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="card-title">{khoTabLabel}</div>
              <div className="card-subtitle">Danh sách container và thống kê</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={fetchContainers} disabled={khoLoading}>Làm mới</button>
          </div>

          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginBottom: 16 }}>
            <div className="stat-card">
              <div>
                <div className="stat-label">Tổng container (kho này)</div>
                <div className="stat-value">{invLoading ? '...' : khoCount}</div>
              </div>
            </div>
            <div className="stat-card">
              <div>
                <div className="stat-label">Hiển thị trong bảng</div>
                <div className="stat-value">{khoLoading ? '...' : khoContainers.length}</div>
              </div>
            </div>
            <div className="stat-card">
              <div>
                <div className="stat-label">Tổng tất cả container</div>
                <div className="stat-value">{invLoading ? '...' : (inventory?.totalContainers ?? '—')}</div>
              </div>
            </div>
          </div>

          {khoError && <div style={{ color: 'var(--danger)', marginBottom: 8 }}>{khoError}</div>}

          {khoLoading ? (
            <div style={{ padding: '24px', color: 'var(--text2)' }}>Đang tải...</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Container ID</th><th>Loại container</th><th>Loại hàng</th>
                    <th>Trạng thái</th><th>Trọng lượng (kg)</th><th>Ngày nhập</th>
                  </tr>
                </thead>
                <tbody>
                  {khoContainers.length === 0 ? (
                    <tr><td colSpan={6} style={{ color: 'var(--text2)' }}>Không có container nào trong kho này.</td></tr>
                  ) : (
                    khoContainers.map((c) => (
                      <tr key={c.containerId}>
                        <td><code>{c.containerId}</code></td>
                        <td>{c.containerTypeName || '—'}</td>
                        <td>{c.cargoTypeName || '—'}</td>
                        <td>
                          <span className={`badge ${
                            c.statusName?.includes('YARD') ? 'badge-success' :
                            c.statusName?.includes('GATE') ? 'badge-info' : 'badge-gray'
                          }`}>
                            {c.statusName || '—'}
                          </span>
                        </td>
                        <td>{c.grossWeight != null ? Number(c.grossWeight).toLocaleString() : '—'}</td>
                        <td>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
