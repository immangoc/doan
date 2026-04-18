import { X } from 'lucide-react';
import './SidePanel.css';

interface SidePanelProps {
  onClose: () => void;
  title: string;
}

export function SidePanel({ onClose, title }: SidePanelProps) {
  return (
    <div className="side-panel">
      <div className="side-panel-header">
        <h3>{title}</h3>
        <button onClick={onClose} className="close-btn">
          <X size={20} />
        </button>
      </div>
      
      <div className="side-panel-content">
        <div className="section-title">Thông tin container</div>
        <div className="info-grid">
          <div className="info-item">
            <label>Mã số container</label>
            <span className="font-semibold text-primary">CTN62763</span>
          </div>
          <div className="info-item">
            <label>Loại container</label>
            <span>20ft - Hàng khô</span>
          </div>
          <div className="info-item">
            <label>Trạng thái</label>
            <span className="badge-status">Lưu kho</span>
          </div>
          <div className="info-item full-width">
            <label>Vị trí</label>
            <span>Zone A - kho Khô - tầng 3 - CT01</span>
          </div>
        </div>

        <div className="divider"></div>

        <div className="section-title">Thông tin xuất bãi</div>
        
        <div className="form-group">
          <label>Khu xuất</label>
          <select defaultValue="Cổng A" className="form-select">
            <option value="Cổng A">Cổng A</option>
            <option value="Cổng B">Cổng B</option>
            <option value="Cổng C">Cổng C</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Trọng lượng (kg)</label>
          <input type="number" defaultValue="25" />
        </div>

        <div className="form-group">
          <label>Ngày xuất (dự kiến)</label>
          <input type="date" defaultValue="2026-08-15" />
        </div>

        <div className="form-group">
          <label>Mức độ ưu tiên</label>
          <div className="priority-options">
            <button className="btn-priority bg-green text-green active">Cao</button>
            <button className="btn-priority">Trung bình</button>
            <button className="btn-priority">Thấp</button>
          </div>
        </div>
      </div>

      <div className="side-panel-footer">
        <button className="btn-cancel" onClick={onClose}>Hủy</button>
        <button className="btn-confirm">Xác nhận xuất</button>
      </div>
    </div>
  );
}
