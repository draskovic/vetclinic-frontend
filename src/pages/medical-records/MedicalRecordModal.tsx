import { Modal } from 'antd';
import type { MedicalRecord } from '@/types';
import MedicalRecordEditor from './MedicalRecordEditor';

interface MedicalRecordModalProps {
  open: boolean;
  record: MedicalRecord | null;
  onClose: () => void;
  defaultValues?: { petId?: string; vetId?: string; appointmentId?: string; symptoms?: string };
}

export default function MedicalRecordModal({
  open,
  record,
  onClose,
  defaultValues,
}: MedicalRecordModalProps) {
  return (
    <Modal
      title={
        record
          ? `Izmeni intervenciju${record.recordCode ? ' — ' + record.recordCode : ''}`
          : 'Nova intervencija'
      }
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={1000}
      style={{ top: 20 }}
    >
      <MedicalRecordEditor
        record={record}
        onSaved={onClose}
        onClose={onClose}
        defaultValues={defaultValues}
      />
    </Modal>
  );
}
