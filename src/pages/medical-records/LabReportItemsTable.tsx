import { useState, useEffect } from 'react';
import { Table, Button, Popconfirm, message, Typography, Tag, Space } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, FilePdfOutlined } from '@ant-design/icons';
import { labReportsApi } from '@/api/lab-reports';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { LabReport, LabReportStatus } from '@/types';
import LabReportModal from '../lab-reports/LabReportModal';
import dayjs from 'dayjs';

const statusConfig: Record<LabReportStatus, { label: string; color: string }> = {
  PENDING: { label: 'Na čekanju', color: 'blue' },
  COMPLETED: { label: 'Završen', color: 'green' },
  CANCELLED: { label: 'Otkazan', color: 'red' },
};

interface LabReportItemsTableProps {
  medicalRecordId: string | null;
  petId: string;
}

export default function LabReportItemsTable({ medicalRecordId, petId }: LabReportItemsTableProps) {
  const [labReports, setLabReports] = useState<LabReport[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<LabReport | null>(null);

  const { data: labReportsData, refetch } = useQuery({
    queryKey: ['lab-reports-by-medical-record', medicalRecordId],
    queryFn: () => labReportsApi.getByMedicalRecord(medicalRecordId!),
    enabled: !!medicalRecordId,
  });

  useEffect(() => {
    if (labReportsData) {
      setLabReports(labReportsData.data);
    }
  }, [labReportsData]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => labReportsApi.delete(id),
    onSuccess: () => {
      message.success('Lab izveštaj obrisan!');
      refetch();
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  if (!medicalRecordId) {
    return (
      <Typography.Text type='secondary'>
        Sačuvajte intervenciju pre dodavanja lab izveštaja.
      </Typography.Text>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      <Table
        dataSource={labReports}
        rowKey='id'
        pagination={false}
        size='small'
        scroll={{ x: 'max-content' }}
        tableLayout='auto'
        columns={[
          {
            title: 'Broj izveštaja',
            dataIndex: 'reportNumber',
            key: 'reportNumber',
          },
          {
            title: 'Vrsta analize',
            dataIndex: 'analysisType',
            key: 'analysisType',
          },
          {
            title: 'Kategorija',
            dataIndex: 'testCategory',
            key: 'testCategory',
            render: (val: string) => (
              <Tag color={val === 'RAPID_TEST' ? 'orange' : 'cyan'}>
                {val === 'RAPID_TEST' ? 'Brzi test' : 'Laboratorijski'}
              </Tag>
            ),
          },

          {
            title: 'Datum',
            dataIndex: 'requestedAt',
            key: 'requestedAt',
            render: (val) => dayjs(val).format('DD.MM.YYYY'),
          },
          {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: LabReportStatus) => (
              <Tag color={statusConfig[status].color}>{statusConfig[status].label}</Tag>
            ),
          },
          {
            title: 'Nalaz',
            dataIndex: 'isAbnormal',
            key: 'isAbnormal',
            render: (val: boolean) =>
              val ? (
                <span style={{ color: '#ff4d4f', fontWeight: 600 }}>Nenormalan</span>
              ) : (
                <span style={{ color: '#52c41a' }}>U redu</span>
              ),
          },
          {
            title: 'Akcije',
            key: 'actions',
            width: 80,
            render: (_, record) => (
              <Space>
                {record.fileName && (
                  <Button
                    type='text'
                    icon={<FilePdfOutlined style={{ color: '#ff4d4f' }} />}
                    size='small'
                    onClick={async () => {
                      try {
                        const res = await labReportsApi.downloadFile(record.id);
                        const blob = new Blob([res.data], {
                          type: record.mimeType ?? 'application/pdf',
                        });
                        const url = window.URL.createObjectURL(blob);
                        window.open(url, '_blank');
                        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
                      } catch {
                        message.error('Greška pri preuzimanju fajla!');
                      }
                    }}
                  />
                )}
                <Button
                  type='text'
                  icon={<EditOutlined />}
                  size='small'
                  onClick={() => {
                    setEditingReport(record);
                    setModalOpen(true);
                  }}
                />
                <Popconfirm
                  title='Obrisati lab izveštaj?'
                  onConfirm={() => deleteMutation.mutate(record.id)}
                  okText='Da'
                  cancelText='Ne'
                  okButtonProps={{ danger: true }}
                >
                  <Button type='text' danger icon={<DeleteOutlined />} size='small' />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
        title={() => (
          <Button
            type='dashed'
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingReport(null);
              setModalOpen(true);
            }}
          >
            Dodaj lab izveštaj
          </Button>
        )}
      />
      <LabReportModal
        open={modalOpen}
        labReport={editingReport}
        medicalRecordId={medicalRecordId}
        petId={petId}
        onClose={() => {
          setModalOpen(false);
          setEditingReport(null);
          refetch();
        }}
      />
    </div>
  );
}
