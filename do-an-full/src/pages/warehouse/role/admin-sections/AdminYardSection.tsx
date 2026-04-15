import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeftRight, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import WarehouseLayout from '../../../../components/warehouse/WarehouseLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Badge } from '../../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { useWarehouseAuth, API_BASE } from '../../../../contexts/WarehouseAuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────
type YardType   = { yardTypeId: number; yardTypeName: string };
type BlockType  = { blockTypeId: number; blockTypeName: string };

type YardItem   = { yardId: number; yardName: string; address?: string; yardType?: YardType };
type ZoneItem   = { zoneId: number; yardId: number; yardName?: string; zoneName: string; capacitySlots: number };
type BlockItem  = { blockId: number; zoneId: number; zoneName?: string; blockName: string; blockType?: BlockType };
type SlotItem   = { slotId: number; blockId: number; blockName?: string; rowNo: number; bayNo: number; maxTier: number };

type Tab = 'yards' | 'zones' | 'blocks' | 'slots' | 'relocation';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const NO_SELECTION = '__none__';

export default function AdminYardSection() {
  const { accessToken } = useWarehouseAuth();
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken],
  );

  const [tab, setTab] = useState<Tab>('yards');
  const [error, setError] = useState('');

  // Reference catalogs
  const [yardTypes, setYardTypes]   = useState<YardType[]>([]);
  const [blockTypes, setBlockTypes] = useState<BlockType[]>([]);

  // Data lists
  const [yards,  setYards]  = useState<YardItem[]>([]);
  const [zones,  setZones]  = useState<ZoneItem[]>([]);
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [slots,  setSlots]  = useState<SlotItem[]>([]);

  // Parent selectors (cascade)
  const [selYardId,  setSelYardId]  = useState<string>('');
  const [selZoneId,  setSelZoneId]  = useState<string>('');
  const [selBlockId, setSelBlockId] = useState<string>('');

  // Loading states
  const [loadingYards,  setLoadingYards]  = useState(false);
  const [loadingZones,  setLoadingZones]  = useState(false);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [loadingSlots,  setLoadingSlots]  = useState(false);

  // Dialogs
  const [dialog, setDialog] = useState<null | 'createYard' | 'editYard' | 'deleteYard'
    | 'createZone' | 'editZone' | 'deleteZone'
    | 'createBlock' | 'editBlock' | 'deleteBlock'
    | 'createSlot' | 'editSlot' | 'deleteSlot' | 'batchSlot'
    | 'relocate' | 'swap'>(null);

  const [selected, setSelected] = useState<YardItem | ZoneItem | BlockItem | SlotItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [yardForm,  setYardForm]  = useState({ yardName: '', address: '', yardTypeId: '' });
  const [zoneForm,  setZoneForm]  = useState({ zoneName: '', capacitySlots: '' });
  const [blockForm, setBlockForm] = useState({ blockName: '', blockTypeId: '' });
  const [slotForm,  setSlotForm]  = useState({ rowNo: '', bayNo: '', maxTier: '5' });
  const [batchForm, setBatchForm] = useState({ rows: '', bays: '', maxTier: '5' });
  const [relForm,   setRelForm]   = useState({ containerId: '', targetSlotId: '', targetTier: '' });
  const [swapForm,  setSwapForm]  = useState({ containerIdA: '', containerIdB: '' });
  const [relResult, setRelResult] = useState<string>('');

  // ── Fetch catalogs once ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [ytRes, btRes] = await Promise.all([
          fetch(`${API_BASE}/admin/yard-types`, { headers }),
          fetch(`${API_BASE}/admin/block-types`, { headers }),
        ]);
        const [ytData, btData] = await Promise.all([ytRes.json(), btRes.json()]);
        if (ytRes.ok) setYardTypes(ytData.data || []);
        if (btRes.ok) setBlockTypes(btData.data || []);
      } catch { /* ignore */ }
    };
    load();
    fetchYards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch functions ──────────────────────────────────────────────────────
  const fetchYards = async () => {
    setLoadingYards(true);
    setError('');
    try {
      const res  = await fetch(`${API_BASE}/admin/yards`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tải danh sách bãi');
      setYards(data.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoadingYards(false); }
  };

  const fetchZones = async (yardId: string) => {
    if (!yardId) { setZones([]); return; }
    setLoadingZones(true);
    try {
      const res  = await fetch(`${API_BASE}/admin/yards/${yardId}/zones`, { headers });
      const data = await res.json();
      if (res.ok) setZones(data.data || []);
    } catch { /* ignore */ }
    finally { setLoadingZones(false); }
  };

  const fetchBlocks = async (zoneId: string) => {
    if (!zoneId) { setBlocks([]); return; }
    setLoadingBlocks(true);
    try {
      const res  = await fetch(`${API_BASE}/admin/zones/${zoneId}/blocks`, { headers });
      const data = await res.json();
      if (res.ok) setBlocks(data.data || []);
    } catch { /* ignore */ }
    finally { setLoadingBlocks(false); }
  };

  const fetchSlots = async (blockId: string) => {
    if (!blockId) { setSlots([]); return; }
    setLoadingSlots(true);
    try {
      const res  = await fetch(`${API_BASE}/admin/blocks/${blockId}/slots`, { headers });
      const data = await res.json();
      if (res.ok) setSlots(data.data || []);
    } catch { /* ignore */ }
    finally { setLoadingSlots(false); }
  };

  const onSelectYard = (v: string) => {
    setSelYardId(v); setSelZoneId(''); setSelBlockId('');
    setZones([]); setBlocks([]); setSlots([]);
    fetchZones(v);
  };

  const onSelectZone = (v: string) => {
    setSelZoneId(v); setSelBlockId('');
    setBlocks([]); setSlots([]);
    fetchBlocks(v);
  };

  const onSelectBlock = (v: string) => {
    setSelBlockId(v); setSlots([]);
    fetchSlots(v);
  };

  // ── Generic delete ───────────────────────────────────────────────────────
  const doDelete = async (url: string, onDone: () => void) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}${url}`, { method: 'DELETE', headers });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message || 'Lỗi xóa'); }
      setDialog(null);
      onDone();
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  // ── YARD CRUD ────────────────────────────────────────────────────────────
  const openCreateYard = () => {
    setYardForm({ yardName: '', address: '', yardTypeId: '' });
    setDialog('createYard');
  };
  const openEditYard = (y: YardItem) => {
    setSelected(y);
    setYardForm({ yardName: y.yardName, address: y.address || '', yardTypeId: y.yardType ? String(y.yardType.yardTypeId) : '' });
    setDialog('editYard');
  };
  const submitYard = async (isEdit: boolean) => {
    if (!yardForm.yardName.trim()) return alert('Tên bãi là bắt buộc');
    if (!yardForm.yardTypeId) return alert('Loại bãi là bắt buộc');
    setSubmitting(true);
    const body = { yardName: yardForm.yardName, address: yardForm.address, yardTypeId: Number(yardForm.yardTypeId) };
    const url  = isEdit ? `/admin/yards/${(selected as YardItem).yardId}` : '/admin/yards';
    try {
      const res  = await fetch(`${API_BASE}${url}`, { method: isEdit ? 'PUT' : 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lưu bãi');
      setDialog(null);
      fetchYards();
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  // ── ZONE CRUD ────────────────────────────────────────────────────────────
  const openCreateZone = () => {
    if (!selYardId) return alert('Chọn bãi trước');
    setZoneForm({ zoneName: '', capacitySlots: '' });
    setDialog('createZone');
  };
  const openEditZone = (z: ZoneItem) => {
    setSelected(z);
    setZoneForm({ zoneName: z.zoneName, capacitySlots: String(z.capacitySlots) });
    setDialog('editZone');
  };
  const submitZone = async (isEdit: boolean) => {
    if (!zoneForm.zoneName.trim()) return alert('Tên khu vực là bắt buộc');
    if (!zoneForm.capacitySlots || Number(zoneForm.capacitySlots) < 1) return alert('Sức chứa phải ≥ 1');
    setSubmitting(true);
    const body = { zoneName: zoneForm.zoneName, capacitySlots: Number(zoneForm.capacitySlots) };
    const url  = isEdit ? `/admin/zones/${(selected as ZoneItem).zoneId}` : `/admin/yards/${selYardId}/zones`;
    try {
      const res  = await fetch(`${API_BASE}${url}`, { method: isEdit ? 'PUT' : 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lưu khu vực');
      setDialog(null);
      fetchZones(selYardId);
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  // ── BLOCK CRUD ───────────────────────────────────────────────────────────
  const openCreateBlock = () => {
    if (!selZoneId) return alert('Chọn khu vực trước');
    setBlockForm({ blockName: '', blockTypeId: '' });
    setDialog('createBlock');
  };
  const openEditBlock = (b: BlockItem) => {
    setSelected(b);
    setBlockForm({ blockName: b.blockName, blockTypeId: b.blockType ? String(b.blockType.blockTypeId) : '' });
    setDialog('editBlock');
  };
  const submitBlock = async (isEdit: boolean) => {
    if (!blockForm.blockName.trim()) return alert('Tên khối là bắt buộc');
    setSubmitting(true);
    const body: Record<string, unknown> = { blockName: blockForm.blockName };
    if (blockForm.blockTypeId) body.blockTypeId = Number(blockForm.blockTypeId);
    const url = isEdit ? `/admin/blocks/${(selected as BlockItem).blockId}` : `/admin/zones/${selZoneId}/blocks`;
    try {
      const res  = await fetch(`${API_BASE}${url}`, { method: isEdit ? 'PUT' : 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lưu khối');
      setDialog(null);
      fetchBlocks(selZoneId);
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  // ── SLOT CRUD ────────────────────────────────────────────────────────────
  const openCreateSlot = () => {
    if (!selBlockId) return alert('Chọn khối trước');
    setSlotForm({ rowNo: '', bayNo: '', maxTier: '5' });
    setDialog('createSlot');
  };
  const openEditSlot = (s: SlotItem) => {
    setSelected(s);
    setSlotForm({ rowNo: String(s.rowNo), bayNo: String(s.bayNo), maxTier: String(s.maxTier) });
    setDialog('editSlot');
  };
  const submitSlot = async (isEdit: boolean) => {
    if (!slotForm.rowNo || !slotForm.bayNo) return alert('Row và Bay là bắt buộc');
    setSubmitting(true);
    const body = { rowNo: Number(slotForm.rowNo), bayNo: Number(slotForm.bayNo), maxTier: Number(slotForm.maxTier) || 5 };
    const url  = isEdit ? `/admin/slots/${(selected as SlotItem).slotId}` : `/admin/blocks/${selBlockId}/slots`;
    try {
      const res  = await fetch(`${API_BASE}${url}`, { method: isEdit ? 'PUT' : 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi lưu ô chứa');
      setDialog(null);
      fetchSlots(selBlockId);
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  };
  const submitBatchSlot = async () => {
    if (!selBlockId) return alert('Chọn khối trước');
    if (!batchForm.rows || !batchForm.bays) return alert('Số hàng và cột là bắt buộc');
    setSubmitting(true);
    const body = { rows: Number(batchForm.rows), bays: Number(batchForm.bays), maxTier: Number(batchForm.maxTier) || 5 };
    try {
      const res  = await fetch(`${API_BASE}/admin/blocks/${selBlockId}/slots/batch`, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi tạo hàng loạt');
      alert(`Đã tạo ${data.data?.created ?? ''} ô chứa`);
      setDialog(null);
      fetchSlots(selBlockId);
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  // ── RELOCATION ───────────────────────────────────────────────────────────
  const submitRelocate = async () => {
    if (!relForm.containerId || !relForm.targetSlotId || !relForm.targetTier) return alert('Điền đầy đủ thông tin');
    setSubmitting(true);
    setRelResult('');
    try {
      const body = { containerId: relForm.containerId, targetSlotId: Number(relForm.targetSlotId), targetTier: Number(relForm.targetTier) };
      const res  = await fetch(`${API_BASE}/admin/yard/relocate`, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi di chuyển');
      const r = data.data;
      setRelResult(`Di chuyển thành công: Container ${r.containerId} từ slot ${r.fromSlotId} → slot ${r.toSlotId}, tầng ${r.tier}`);
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  const submitSwap = async () => {
    if (!swapForm.containerIdA || !swapForm.containerIdB) return alert('Điền đầy đủ cả hai container ID');
    setSubmitting(true);
    setRelResult('');
    try {
      const res  = await fetch(`${API_BASE}/admin/yard/swap`, { method: 'POST', headers, body: JSON.stringify(swapForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Lỗi hoán đổi');
      const r = data.data;
      setRelResult(
        `Hoán đổi thành công:\n` +
        `${r.containerIdA} → slot ${r.containerANewSlotId}, tầng ${r.containerANewTier}\n` +
        `${r.containerIdB} → slot ${r.containerBNewSlotId}, tầng ${r.containerBNewTier}`,
      );
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  // ── Tab styles ───────────────────────────────────────────────────────────
  const tabCls = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
      tab === t
        ? 'border-blue-600 text-blue-700 dark:text-blue-400'
        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
    }`;

  // ── Zone selector component (shared) ─────────────────────────────────────
  const YardSelector = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div>
      <label className="text-sm font-medium">Bãi chứa</label>
      <Select value={value || NO_SELECTION} onValueChange={(v) => onChange(v === NO_SELECTION ? '' : v)}>
        <SelectTrigger><SelectValue placeholder="Chọn bãi..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_SELECTION}>— Chọn bãi —</SelectItem>
          {yards.map((y) => <SelectItem key={y.yardId} value={String(y.yardId)}>{y.yardName}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  const ZoneSelector = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div>
      <label className="text-sm font-medium">Khu vực</label>
      <Select value={value || NO_SELECTION} onValueChange={(v) => onChange(v === NO_SELECTION ? '' : v)} disabled={!selYardId}>
        <SelectTrigger><SelectValue placeholder="Chọn khu vực..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_SELECTION}>— Chọn khu vực —</SelectItem>
          {zones.map((z) => <SelectItem key={z.zoneId} value={String(z.zoneId)}>{z.zoneName}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  const BlockSelector = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <div>
      <label className="text-sm font-medium">Khối</label>
      <Select value={value || NO_SELECTION} onValueChange={(v) => onChange(v === NO_SELECTION ? '' : v)} disabled={!selZoneId}>
        <SelectTrigger><SelectValue placeholder="Chọn khối..." /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_SELECTION}>— Chọn khối —</SelectItem>
          {blocks.map((b) => <SelectItem key={b.blockId} value={String(b.blockId)}>{b.blockName}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <WarehouseLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý Bãi & Ô chứa</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Cấu hình cấu trúc bãi: Bãi → Khu vực → Khối → Ô chứa. Di chuyển container.</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
          <button className={tabCls('yards')}   onClick={() => setTab('yards')}>Bãi chứa</button>
          <button className={tabCls('zones')}   onClick={() => setTab('zones')}>Khu vực</button>
          <button className={tabCls('blocks')}  onClick={() => setTab('blocks')}>Khối</button>
          <button className={tabCls('slots')}   onClick={() => setTab('slots')}>Ô chứa</button>
          <button className={tabCls('relocation')} onClick={() => { setTab('relocation'); setRelResult(''); }}>Di chuyển</button>
        </div>

        {/* ── TAB: YARDS ─────────────────────────────────────────────────── */}
        {tab === 'yards' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Danh sách bãi chứa
              </CardTitle>
              <div className="mt-3 flex gap-3 justify-between">
                <Button variant="outline" onClick={fetchYards} disabled={loadingYards}>Làm mới</Button>
                <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={openCreateYard}>
                  <Plus className="w-4 h-4 mr-2" />Thêm bãi
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Tên bãi</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Địa chỉ</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingYards ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">Đang tải...</TableCell></TableRow>
                  ) : yards.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">Chưa có dữ liệu</TableCell></TableRow>
                  ) : yards.map((y) => (
                    <TableRow key={y.yardId}>
                      <TableCell className="text-gray-500 text-sm">{y.yardId}</TableCell>
                      <TableCell className="font-semibold">{y.yardName}</TableCell>
                      <TableCell>{y.yardType?.yardTypeName || '—'}</TableCell>
                      <TableCell className="text-gray-500">{y.address || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEditYard(y)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-red-700 hover:bg-red-50" onClick={() => { setSelected(y); setDialog('deleteYard'); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── TAB: ZONES ─────────────────────────────────────────────────── */}
        {tab === 'zones' && (
          <Card>
            <CardHeader>
              <CardTitle>Khu vực</CardTitle>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <YardSelector value={selYardId} onChange={onSelectYard} />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => fetchZones(selYardId)} disabled={!selYardId || loadingZones}>Làm mới</Button>
                  <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={openCreateZone} disabled={!selYardId}>
                    <Plus className="w-4 h-4 mr-2" />Thêm khu vực
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Tên khu vực</TableHead>
                    <TableHead>Bãi</TableHead>
                    <TableHead>Sức chứa</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!selYardId ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-400">Chọn bãi để xem khu vực</TableCell></TableRow>
                  ) : loadingZones ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">Đang tải...</TableCell></TableRow>
                  ) : zones.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">Chưa có khu vực</TableCell></TableRow>
                  ) : zones.map((z) => (
                    <TableRow key={z.zoneId}>
                      <TableCell className="text-gray-500 text-sm">{z.zoneId}</TableCell>
                      <TableCell className="font-semibold">{z.zoneName}</TableCell>
                      <TableCell>{z.yardName || '—'}</TableCell>
                      <TableCell><Badge className="bg-blue-100 text-blue-700">{z.capacitySlots} slot</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEditZone(z)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-red-700 hover:bg-red-50" onClick={() => { setSelected(z); setDialog('deleteZone'); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── TAB: BLOCKS ────────────────────────────────────────────────── */}
        {tab === 'blocks' && (
          <Card>
            <CardHeader>
              <CardTitle>Khối</CardTitle>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <YardSelector value={selYardId} onChange={onSelectYard} />
                <ZoneSelector value={selZoneId} onChange={onSelectZone} />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => fetchBlocks(selZoneId)} disabled={!selZoneId || loadingBlocks}>Làm mới</Button>
                  <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={openCreateBlock} disabled={!selZoneId}>
                    <Plus className="w-4 h-4 mr-2" />Thêm khối
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Tên khối</TableHead>
                    <TableHead>Khu vực</TableHead>
                    <TableHead>Loại khối</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!selZoneId ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-400">Chọn khu vực để xem khối</TableCell></TableRow>
                  ) : loadingBlocks ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">Đang tải...</TableCell></TableRow>
                  ) : blocks.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">Chưa có khối</TableCell></TableRow>
                  ) : blocks.map((b) => (
                    <TableRow key={b.blockId}>
                      <TableCell className="text-gray-500 text-sm">{b.blockId}</TableCell>
                      <TableCell className="font-semibold">{b.blockName}</TableCell>
                      <TableCell>{b.zoneName || '—'}</TableCell>
                      <TableCell>{b.blockType?.blockTypeName || '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEditBlock(b)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-red-700 hover:bg-red-50" onClick={() => { setSelected(b); setDialog('deleteBlock'); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── TAB: SLOTS ─────────────────────────────────────────────────── */}
        {tab === 'slots' && (
          <Card>
            <CardHeader>
              <CardTitle>Ô chứa (Slots)</CardTitle>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <YardSelector value={selYardId} onChange={onSelectYard} />
                <ZoneSelector value={selZoneId} onChange={onSelectZone} />
                <BlockSelector value={selBlockId} onChange={onSelectBlock} />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => fetchSlots(selBlockId)} disabled={!selBlockId || loadingSlots}>Làm mới</Button>
                </div>
              </div>
              {selBlockId && (
                <div className="mt-2 flex gap-2">
                  <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={openCreateSlot}>
                    <Plus className="w-4 h-4 mr-2" />Thêm ô
                  </Button>
                  <Button variant="outline" onClick={() => { setBatchForm({ rows: '', bays: '', maxTier: '5' }); setDialog('batchSlot'); }}>
                    Tạo hàng loạt
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Khối</TableHead>
                    <TableHead>Row</TableHead>
                    <TableHead>Bay</TableHead>
                    <TableHead>Max Tier</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!selBlockId ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">Chọn khối để xem ô chứa</TableCell></TableRow>
                  ) : loadingSlots ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Đang tải...</TableCell></TableRow>
                  ) : slots.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">Chưa có ô chứa</TableCell></TableRow>
                  ) : slots.map((s) => (
                    <TableRow key={s.slotId}>
                      <TableCell className="text-gray-500 text-sm">{s.slotId}</TableCell>
                      <TableCell>{s.blockName || '—'}</TableCell>
                      <TableCell>{s.rowNo}</TableCell>
                      <TableCell>{s.bayNo}</TableCell>
                      <TableCell>{s.maxTier}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEditSlot(s)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-red-700 hover:bg-red-50" onClick={() => { setSelected(s); setDialog('deleteSlot'); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* ── TAB: RELOCATION ────────────────────────────────────────────── */}
        {tab === 'relocation' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Relocate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  Di chuyển container
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Container ID *</label>
                  <Input value={relForm.containerId} onChange={(e) => setRelForm((f) => ({ ...f, containerId: e.target.value }))} placeholder="VD: ABCU1234567" />
                </div>
                <div>
                  <label className="text-sm font-medium">Target Slot ID *</label>
                  <Input type="number" value={relForm.targetSlotId} onChange={(e) => setRelForm((f) => ({ ...f, targetSlotId: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Target Tier *</label>
                  <Input type="number" min={1} value={relForm.targetTier} onChange={(e) => setRelForm((f) => ({ ...f, targetTier: e.target.value }))} />
                </div>
                <Button className="w-full bg-indigo-700 hover:bg-indigo-600 text-white" onClick={submitRelocate} disabled={submitting}>
                  {submitting ? 'Đang xử lý...' : 'Di chuyển'}
                </Button>
              </CardContent>
            </Card>

            {/* Swap */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-orange-600" />
                  Hoán đổi vị trí
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Container A *</label>
                  <Input value={swapForm.containerIdA} onChange={(e) => setSwapForm((f) => ({ ...f, containerIdA: e.target.value }))} placeholder="Container ID thứ nhất" />
                </div>
                <div>
                  <label className="text-sm font-medium">Container B *</label>
                  <Input value={swapForm.containerIdB} onChange={(e) => setSwapForm((f) => ({ ...f, containerIdB: e.target.value }))} placeholder="Container ID thứ hai" />
                </div>
                <Button className="w-full bg-orange-700 hover:bg-orange-600 text-white" onClick={submitSwap} disabled={submitting}>
                  {submitting ? 'Đang xử lý...' : 'Hoán đổi'}
                </Button>
              </CardContent>
            </Card>

            {relResult && (
              <div className="lg:col-span-2 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg p-4">
                <pre className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">{relResult}</pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Yard Dialogs ─────────────────────────────────────────────────── */}
      <Dialog open={dialog === 'createYard' || dialog === 'editYard'} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog === 'editYard' ? 'Chỉnh sửa bãi' : 'Thêm bãi mới'}</DialogTitle>
            {dialog === 'editYard' && <DialogDescription>{(selected as YardItem)?.yardName}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Tên bãi *</label>
              <Input value={yardForm.yardName} onChange={(e) => setYardForm((f) => ({ ...f, yardName: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Loại bãi *</label>
              <Select value={yardForm.yardTypeId} onValueChange={(v) => setYardForm((f) => ({ ...f, yardTypeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Chọn loại..." /></SelectTrigger>
                <SelectContent>
                  {yardTypes.map((yt) => <SelectItem key={yt.yardTypeId} value={String(yt.yardTypeId)}>{yt.yardTypeName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Địa chỉ</label>
              <Input value={yardForm.address} onChange={(e) => setYardForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Hủy</Button>
            <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={() => submitYard(dialog === 'editYard')} disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'deleteYard'} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa bãi</DialogTitle>
            <DialogDescription>Xóa bãi <strong>{(selected as YardItem)?.yardName}</strong>? Hành động không thể hoàn tác.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Hủy</Button>
            <Button variant="destructive" onClick={() => doDelete(`/admin/yards/${(selected as YardItem)?.yardId}`, fetchYards)} disabled={submitting}>
              {submitting ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Zone Dialogs ─────────────────────────────────────────────────── */}
      <Dialog open={dialog === 'createZone' || dialog === 'editZone'} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog === 'editZone' ? 'Chỉnh sửa khu vực' : 'Thêm khu vực mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Tên khu vực *</label>
              <Input value={zoneForm.zoneName} onChange={(e) => setZoneForm((f) => ({ ...f, zoneName: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Sức chứa (slots) *</label>
              <Input type="number" min={1} value={zoneForm.capacitySlots} onChange={(e) => setZoneForm((f) => ({ ...f, capacitySlots: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Hủy</Button>
            <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={() => submitZone(dialog === 'editZone')} disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'deleteZone'} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa khu vực</DialogTitle>
            <DialogDescription>Xóa khu vực <strong>{(selected as ZoneItem)?.zoneName}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Hủy</Button>
            <Button variant="destructive" onClick={() => doDelete(`/admin/zones/${(selected as ZoneItem)?.zoneId}`, () => fetchZones(selYardId))} disabled={submitting}>
              {submitting ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Block Dialogs ────────────────────────────────────────────────── */}
      <Dialog open={dialog === 'createBlock' || dialog === 'editBlock'} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog === 'editBlock' ? 'Chỉnh sửa khối' : 'Thêm khối mới'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Tên khối *</label>
              <Input value={blockForm.blockName} onChange={(e) => setBlockForm((f) => ({ ...f, blockName: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Loại khối</label>
              <Select value={blockForm.blockTypeId || NO_SELECTION} onValueChange={(v) => setBlockForm((f) => ({ ...f, blockTypeId: v === NO_SELECTION ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Chọn loại..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SELECTION}>— Không chọn —</SelectItem>
                  {blockTypes.map((bt) => <SelectItem key={bt.blockTypeId} value={String(bt.blockTypeId)}>{bt.blockTypeName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Hủy</Button>
            <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={() => submitBlock(dialog === 'editBlock')} disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'deleteBlock'} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa khối</DialogTitle>
            <DialogDescription>Xóa khối <strong>{(selected as BlockItem)?.blockName}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Hủy</Button>
            <Button variant="destructive" onClick={() => doDelete(`/admin/blocks/${(selected as BlockItem)?.blockId}`, () => fetchBlocks(selZoneId))} disabled={submitting}>
              {submitting ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Slot Dialogs ─────────────────────────────────────────────────── */}
      <Dialog open={dialog === 'createSlot' || dialog === 'editSlot'} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{dialog === 'editSlot' ? 'Chỉnh sửa ô chứa' : 'Thêm ô chứa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Row *</label>
                <Input type="number" min={1} value={slotForm.rowNo} onChange={(e) => setSlotForm((f) => ({ ...f, rowNo: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Bay *</label>
                <Input type="number" min={1} value={slotForm.bayNo} onChange={(e) => setSlotForm((f) => ({ ...f, bayNo: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Max Tier</label>
              <Input type="number" min={1} value={slotForm.maxTier} onChange={(e) => setSlotForm((f) => ({ ...f, maxTier: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Hủy</Button>
            <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={() => submitSlot(dialog === 'editSlot')} disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'batchSlot'} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tạo ô chứa hàng loạt</DialogTitle>
            <DialogDescription>Tạo rows × bays ô chứa cho khối đã chọn.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Số hàng (rows) *</label>
                <Input type="number" min={1} value={batchForm.rows} onChange={(e) => setBatchForm((f) => ({ ...f, rows: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Số cột (bays) *</label>
                <Input type="number" min={1} value={batchForm.bays} onChange={(e) => setBatchForm((f) => ({ ...f, bays: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Max Tier</label>
              <Input type="number" min={1} value={batchForm.maxTier} onChange={(e) => setBatchForm((f) => ({ ...f, maxTier: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Hủy</Button>
            <Button className="bg-blue-900 hover:bg-blue-800 text-white" onClick={submitBatchSlot} disabled={submitting}>
              {submitting ? 'Đang tạo...' : 'Tạo hàng loạt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'deleteSlot'} onOpenChange={() => setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa ô chứa</DialogTitle>
            <DialogDescription>Xóa slot ID <strong>{(selected as SlotItem)?.slotId}</strong> (R{(selected as SlotItem)?.rowNo}/B{(selected as SlotItem)?.bayNo})?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Hủy</Button>
            <Button variant="destructive" onClick={() => doDelete(`/admin/slots/${(selected as SlotItem)?.slotId}`, () => fetchSlots(selBlockId))} disabled={submitting}>
              {submitting ? 'Đang xóa...' : 'Xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WarehouseLayout>
  );
}
