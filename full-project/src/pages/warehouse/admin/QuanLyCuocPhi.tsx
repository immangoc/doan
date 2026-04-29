import { useEffect, useMemo, useState } from 'react';
import { useWarehouseAuth, API_BASE } from '../../../contexts/WarehouseAuthContext';
import PageHeader from '../../../components/warehouse/PageHeader';

type TariffDefinition = {
  code: string;
  name: string;
  feeType: string;
  unit: string;
  unitLabel: string;
  defaultValue: number;
  containerSize?: number | null;
  cargoTypeName?: string | null;
  note?: string;
  step?: number;
};

type TariffResponse = {
  tariffCode: string;
  unitPrice: number;
};

type FeeConfigResponse = {
  containerRate20ft?: number | null;
  containerRate40ft?: number | null;
  storageMultiplier?: number | null;
  weightMultiplier?: number | null;
  earlyPickupFee?: number | null;
};

const tariffDefinitions: TariffDefinition[] = [
  {
    code: 'STORAGE_20_DRY',
    name: 'Giá lưu kho container 20ft - Hàng khô',
    feeType: 'STORAGE',
    unit: 'PER_DAY',
    unitLabel: 'VND/ngày',
    defaultValue: 150000,
    containerSize: 20,
    cargoTypeName: 'Hàng Khô',
    note: 'Hàng khô',
    step: 1000,
  },
  {
    code: 'STORAGE_20_COLD',
    name: 'Giá lưu kho container 20ft - Hàng lạnh',
    feeType: 'STORAGE',
    unit: 'PER_DAY',
    unitLabel: 'VND/ngày',
    defaultValue: 400000,
    containerSize: 20,
    cargoTypeName: 'Hàng Lạnh',
    note: 'Hàng lạnh',
    step: 1000,
  },
  {
    code: 'STORAGE_20_FRAGILE',
    name: 'Giá lưu kho container 20ft - Hàng dễ vỡ',
    feeType: 'STORAGE',
    unit: 'PER_DAY',
    unitLabel: 'VND/ngày',
    defaultValue: 200000,
    containerSize: 20,
    cargoTypeName: 'Hàng Dễ Vỡ',
    note: 'Hàng dễ vỡ',
    step: 1000,
  },
  {
    code: 'STORAGE_20_OTHER',
    name: 'Giá lưu kho container 20ft - Hàng khác',
    feeType: 'STORAGE',
    unit: 'PER_DAY',
    unitLabel: 'VND/ngày',
    defaultValue: 250000,
    containerSize: 20,
    cargoTypeName: 'Hàng Khác',
    note: 'Hàng khác',
    step: 1000,
  },
  {
    code: 'STORAGE_40_DRY',
    name: 'Giá lưu kho container 40ft - Hàng khô',
    feeType: 'STORAGE',
    unit: 'PER_DAY',
    unitLabel: 'VND/ngày',
    defaultValue: 300000,
    containerSize: 40,
    cargoTypeName: 'Hàng Khô',
    note: 'Hàng khô',
    step: 1000,
  },
  {
    code: 'STORAGE_40_COLD',
    name: 'Giá lưu kho container 40ft - Hàng lạnh',
    feeType: 'STORAGE',
    unit: 'PER_DAY',
    unitLabel: 'VND/ngày',
    defaultValue: 700000,
    containerSize: 40,
    cargoTypeName: 'Hàng Lạnh',
    note: 'Hàng lạnh',
    step: 1000,
  },
  {
    code: 'STORAGE_40_FRAGILE',
    name: 'Giá lưu kho container 40ft - Hàng dễ vỡ',
    feeType: 'STORAGE',
    unit: 'PER_DAY',
    unitLabel: 'VND/ngày',
    defaultValue: 400000,
    containerSize: 40,
    cargoTypeName: 'Hàng Dễ Vỡ',
    note: 'Hàng dễ vỡ',
    step: 1000,
  },
  {
    code: 'STORAGE_40_OTHER',
    name: 'Giá lưu kho container 40ft - Hàng khác',
    feeType: 'STORAGE',
    unit: 'PER_DAY',
    unitLabel: 'VND/ngày',
    defaultValue: 500000,
    containerSize: 40,
    cargoTypeName: 'Hàng Khác',
    note: 'Hàng khác',
    step: 1000,
  },
  {
    code: 'TIME_MULTIPLIER_LE_5',
    name: 'Hệ số thời gian lưu kho <= 5 ngày',
    feeType: 'TIME_MULTIPLIER',
    unit: 'MULTIPLIER',
    unitLabel: 'Hệ số',
    defaultValue: 1.0,
    note: '<= 5 ngày',
    step: 0.1,
  },
  {
    code: 'TIME_MULTIPLIER_6_10',
    name: 'Hệ số thời gian lưu kho 6 - 10 ngày',
    feeType: 'TIME_MULTIPLIER',
    unit: 'MULTIPLIER',
    unitLabel: 'Hệ số',
    defaultValue: 1.5,
    note: '6 - 10 ngày',
    step: 0.1,
  },
  {
    code: 'TIME_MULTIPLIER_GT_10',
    name: 'Hệ số thời gian lưu kho > 10 ngày',
    feeType: 'TIME_MULTIPLIER',
    unit: 'MULTIPLIER',
    unitLabel: 'Hệ số',
    defaultValue: 2.0,
    note: '> 10 ngày',
    step: 0.1,
  },
  {
    code: 'WEIGHT_MULTIPLIER_LT_10',
    name: 'Hệ số trọng lượng < 10 tấn',
    feeType: 'WEIGHT_MULTIPLIER',
    unit: 'MULTIPLIER',
    unitLabel: 'Hệ số',
    defaultValue: 1.0,
    note: '< 10 tấn',
    step: 0.1,
  },
  {
    code: 'WEIGHT_MULTIPLIER_10_20',
    name: 'Hệ số trọng lượng 10 - 20 tấn',
    feeType: 'WEIGHT_MULTIPLIER',
    unit: 'MULTIPLIER',
    unitLabel: 'Hệ số',
    defaultValue: 1.2,
    note: '10 - 20 tấn',
    step: 0.1,
  },
  {
    code: 'WEIGHT_MULTIPLIER_GT_20',
    name: 'Hệ số trọng lượng > 20 tấn',
    feeType: 'WEIGHT_MULTIPLIER',
    unit: 'MULTIPLIER',
    unitLabel: 'Hệ số',
    defaultValue: 1.5,
    note: '> 20 tấn',
    step: 0.1,
  },
  {
    code: 'LATE_FEE_1_2',
    name: 'Phí trễ xuất 1 - 2 ngày',
    feeType: 'LATE_FEE',
    unit: 'PER_DAY',
    unitLabel: 'VND/ngày',
    defaultValue: 500000,
    note: '1 - 2 ngày',
    step: 1000,
  },
  {
    code: 'LATE_FEE_3_5',
    name: 'Phí trễ xuất 3 - 5 ngày',
    feeType: 'LATE_FEE',
    unit: 'PER_DAY',
    unitLabel: 'VND/ngày',
    defaultValue: 1000000,
    note: '3 - 5 ngày',
    step: 1000,
  },
  {
    code: 'LATE_FEE_GT_5',
    name: 'Phí trễ xuất > 5 ngày',
    feeType: 'LATE_FEE',
    unit: 'PER_DAY',
    unitLabel: 'VND/ngày',
    defaultValue: 2000000,
    note: '> 5 ngày',
    step: 1000,
  },
  {
    code: 'EARLY_FEE_1',
    name: 'Phí xuất sớm (Ưu tiên thấp, sớm 1 ngày)',
    feeType: 'EARLY_FEE',
    unit: 'PER_CONTAINER',
    unitLabel: 'VND/container',
    defaultValue: 300000,
    note: 'Ưu tiên thấp (sớm 1 ngày)',
    step: 1000,
  },
  {
    code: 'EARLY_FEE_2_3',
    name: 'Phí xuất sớm (Ưu tiên trung bình, sớm 2 - 3 ngày)',
    feeType: 'EARLY_FEE',
    unit: 'PER_CONTAINER',
    unitLabel: 'VND/container',
    defaultValue: 700000,
    note: 'Ưu tiên trung bình (sớm 2 - 3 ngày)',
    step: 1000,
  },
  {
    code: 'EARLY_FEE_GT_3',
    name: 'Phí xuất sớm (Ưu tiên cao, sớm > 3 ngày)',
    feeType: 'EARLY_FEE',
    unit: 'PER_CONTAINER',
    unitLabel: 'VND/container',
    defaultValue: 1500000,
    note: 'Ưu tiên cao (sớm > 3 ngày)',
    step: 1000,
  },
];

const storage20Rows = [
  { code: 'STORAGE_20_DRY', label: 'Hàng khô' },
  { code: 'STORAGE_20_COLD', label: 'Hàng lạnh' },
  { code: 'STORAGE_20_FRAGILE', label: 'Hàng dễ vỡ' },
  { code: 'STORAGE_20_OTHER', label: 'Hàng khác' },
];

const storage40Rows = [
  { code: 'STORAGE_40_DRY', label: 'Hàng khô' },
  { code: 'STORAGE_40_COLD', label: 'Hàng lạnh' },
  { code: 'STORAGE_40_FRAGILE', label: 'Hàng dễ vỡ' },
  { code: 'STORAGE_40_OTHER', label: 'Hàng khác' },
];

const timeMultiplierRows = [
  { code: 'TIME_MULTIPLIER_LE_5', label: '<= 5 ngày' },
  { code: 'TIME_MULTIPLIER_6_10', label: '6 - 10 ngày' },
  { code: 'TIME_MULTIPLIER_GT_10', label: '> 10 ngày' },
];

const weightMultiplierRows = [
  { code: 'WEIGHT_MULTIPLIER_LT_10', label: '< 10 tấn' },
  { code: 'WEIGHT_MULTIPLIER_10_20', label: '10 - 20 tấn' },
  { code: 'WEIGHT_MULTIPLIER_GT_20', label: '> 20 tấn' },
];

const lateFeeRows = [
  { code: 'LATE_FEE_1_2', label: '1 - 2 ngày' },
  { code: 'LATE_FEE_3_5', label: '3 - 5 ngày' },
  { code: 'LATE_FEE_GT_5', label: '> 5 ngày' },
];

const earlyFeeRows = [
  { code: 'EARLY_FEE_1', label: 'Ưu tiên thấp (sớm 1 ngày)' },
  { code: 'EARLY_FEE_2_3', label: 'Ưu tiên trung bình (sớm 2 - 3 ngày)' },
  { code: 'EARLY_FEE_GT_3', label: 'Ưu tiên cao (sớm > 3 ngày)' },
];

export default function QuanLyCuocPhi() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }), [accessToken]);

  const defaultValues = useMemo(() => {
    return tariffDefinitions.reduce<Record<string, string>>((acc, item) => {
      acc[item.code] = String(item.defaultValue);
      return acc;
    }, {});
  }, []);

  const tariffMap = useMemo(() => {
    return tariffDefinitions.reduce<Record<string, TariffDefinition>>((acc, item) => {
      acc[item.code] = item;
      return acc;
    }, {});
  }, []);

  const [tariffValues, setTariffValues] = useState<Record<string, string>>(defaultValues);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const toNumberOr = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const mapFeeConfigToTariffValues = (config?: FeeConfigResponse | null) => {
    if (!config) return {} as Record<string, string>;
    const mapped: Record<string, string> = {};

    if (typeof config.containerRate20ft === 'number') {
      mapped.STORAGE_20_DRY = String(config.containerRate20ft);
    }
    if (typeof config.containerRate40ft === 'number') {
      mapped.STORAGE_40_DRY = String(config.containerRate40ft);
    }
    if (typeof config.storageMultiplier === 'number') {
      mapped.TIME_MULTIPLIER_LE_5 = String(config.storageMultiplier);
    }
    if (typeof config.weightMultiplier === 'number') {
      mapped.WEIGHT_MULTIPLIER_LT_10 = String(config.weightMultiplier);
    }
    if (typeof config.earlyPickupFee === 'number') {
      mapped.EARLY_FEE_1 = String(config.earlyPickupFee);
    }

    return mapped;
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [tariffRes, feeRes] = await Promise.all([
        fetch(`${API_BASE}/admin/tariffs`, { headers }),
        fetch(`${API_BASE}/admin/fees`, { headers }),
      ]);

      const tariffData = await tariffRes.json();
      const feeData = await feeRes.json();

      if (!tariffRes.ok) {
        throw new Error(tariffData.message || 'Lỗi tải cấu hình biểu phí');
      }
      if (!feeRes.ok) {
        throw new Error(feeData.message || 'Lỗi tải cấu hình phí hệ thống');
      }

      const items: TariffResponse[] = tariffData.data || [];
      const feeConfig: FeeConfigResponse | null = feeData.data || null;
      const merged = { ...defaultValues };

      items.forEach((item) => {
        if (item.tariffCode && tariffMap[item.tariffCode]) {
          merged[item.tariffCode] = String(item.unitPrice ?? merged[item.tariffCode]);
        }
      });

      Object.assign(merged, mapFeeConfigToTariffValues(feeConfig));
      setTariffValues(merged);
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const updateTariffValue = (code: string, value: string) => {
    setTariffValues((prev) => ({ ...prev, [code]: value }));
  };

  const saveTariffs = async () => {
    setSaving(true);
    setSaveMsg('');
    setError('');
    try {
      const payload = tariffDefinitions.map((item) => {
        const raw = tariffValues[item.code];
        const parsed = raw === '' ? item.defaultValue : Number(raw);
        return {
          tariffCode: item.code,
          tariffName: item.name,
          feeType: item.feeType,
          containerSize: item.containerSize ?? null,
          cargoTypeName: item.cargoTypeName ?? null,
          unitPrice: Number.isFinite(parsed) ? parsed : item.defaultValue,
          unit: item.unit,
          note: item.note,
        };
      });

      const res = await fetch(`${API_BASE}/admin/tariffs`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || 'Lỗi cập nhật biểu phí');

      const feePayload = {
        containerRate20ft: toNumberOr(tariffValues.STORAGE_20_DRY, tariffDefinitions.find((x) => x.code === 'STORAGE_20_DRY')?.defaultValue ?? 150000),
        containerRate40ft: toNumberOr(tariffValues.STORAGE_40_DRY, tariffDefinitions.find((x) => x.code === 'STORAGE_40_DRY')?.defaultValue ?? 300000),
        storageMultiplier: toNumberOr(tariffValues.TIME_MULTIPLIER_LE_5, tariffDefinitions.find((x) => x.code === 'TIME_MULTIPLIER_LE_5')?.defaultValue ?? 1),
        weightMultiplier: toNumberOr(tariffValues.WEIGHT_MULTIPLIER_LT_10, tariffDefinitions.find((x) => x.code === 'WEIGHT_MULTIPLIER_LT_10')?.defaultValue ?? 1),
        earlyPickupFee: toNumberOr(tariffValues.EARLY_FEE_1, tariffDefinitions.find((x) => x.code === 'EARLY_FEE_1')?.defaultValue ?? 300000),
        ratePerKgDefault: toNumberOr(tariffValues.STORAGE_20_DRY, tariffDefinitions.find((x) => x.code === 'STORAGE_20_DRY')?.defaultValue ?? 150000),
      };

      const feeRes = await fetch(`${API_BASE}/admin/fees`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(feePayload),
      });
      const feeData = await feeRes.json();
      if (!feeRes.ok) throw new Error(feeData.message || 'Lỗi cập nhật bảng fee_config');

      // Reload latest data from database to ensure UI reflects persisted values
      await fetchData();

      setSaveMsg('Đã cập nhật biểu phí thành công. (Dữ liệu đã lưu vào DB)');
    } catch (e: any) {
      setError(e.message || 'Lỗi không xác định');
    } finally {
      setSaving(false);
    }
  };

  const renderTable = (title: string, rows: { code: string; label: string }[]) => (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <div className="card-title">{title}</div>
      </div>
      <div className="table-wrap">
        <table style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '28%' }}>Nội dung</th>
              <th style={{ width: '52%' }}>Giá trị</th>
              <th style={{ width: '20%' }}>Đơn vị</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const meta = tariffMap[row.code];
              const isMoney = meta.unitLabel.includes('VND');
              return (
                <tr key={row.code}>
                  <td style={{ whiteSpace: 'nowrap' }}>{row.label}</td>
                  <td>
                    <input
                      className="form-input"
                      type="number"
                      min={0}
                      step={meta.step ?? 1}
                      value={tariffValues[row.code] ?? ''}
                      onChange={(e) => updateTariffValue(row.code, e.target.value)}
                      style={{
                        width: '100%',
                        whiteSpace: 'nowrap',
                        textAlign: 'left',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    />
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{meta.unitLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Quản lý cước phí"
        subtitle="Cấu hình biểu phí lưu kho theo quy tắc hiện hành"
      />

      {error && (
        <div className="card" style={{ borderColor: 'var(--danger)', marginBottom: 12 }}>
          <div style={{ color: 'var(--danger)' }}>{error}</div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={fetchData}>Thử lại</button>
        </div>
      )}

      {saveMsg && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ color: 'var(--success)', fontSize: 13 }}>{saveMsg}</div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-title">Biểu phí lưu kho container</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={fetchData} disabled={loading || saving}>
              Làm mới
            </button>
            <button type="button" className="btn btn-primary" onClick={saveTariffs} disabled={loading || saving}>
              {saving ? 'Đang lưu...' : 'Lưu biểu phí'}
            </button>
          </div>
        </div>
        <div style={{ padding: '0 16px 16px', color: 'var(--text2)', fontSize: 13 }}>
          Tổng phí = (Giá cơ bản/ngày × Số ngày lưu kho × Hệ số thời gian × Hệ số trọng lượng) + Phí trễ hoặc phí xuất sớm (nếu có).
        </div>
      </div>

      {loading ? (
        <div className="card"><div style={{ padding: '24px', color: 'var(--text2)' }}>Đang tải...</div></div>
      ) : (
        <>
          {renderTable('1. Giá lưu Container 20ft', storage20Rows)}
          {renderTable('2. Giá lưu Container 40ft', storage40Rows)}
          {renderTable('3. Hệ số thời gian lưu kho', timeMultiplierRows)}
          {renderTable('4. Hệ số trọng lượng lưu kho', weightMultiplierRows)}
          {renderTable('5. Bảng phí trễ xuất Container', lateFeeRows)}
          {renderTable('6. Bảng phí xuất sớm Container', earlyFeeRows)}
        </>
      )}
    </>
  );
}
