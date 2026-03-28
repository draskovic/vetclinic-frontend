import { useState } from 'react';
import { Table, Card, Typography, Tag, Select, DatePicker, Space, Tooltip } from 'antd';
import { useQuery } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { auditLogsApi } from '@/api';
import type { AuditLog, AuditAction } from '@/types';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const ACTION_COLORS: Record<AuditAction, string> = {
  CREATE: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
  LOGIN: 'cyan',
  LOGOUT: 'orange',
};

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Kreiranje',
  UPDATE: 'Izmena',
  DELETE: 'Brisanje',
  LOGIN: 'Prijava',
  LOGOUT: 'Odjava',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  Owner: 'Vlasnik',
  Pet: 'Ljubimac',
  Appointment: 'Termin',
  MedicalRecord: 'Karton',
  Invoice: 'Faktura',
  LabReport: 'Laboratorija',
  Document: 'Dokument',
  User: 'Korisnik',
  Auth: 'Autentifikacija',
  Prescription: 'Recept',
  Notification: 'Notifikacija',
};

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const [actionFilter, setActionFilter] = useState<AuditAction | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, pageSize, actionFilter, dateRange?.map((d) => d.toISOString())],
    queryFn: () => {
      if (actionFilter) {
        return auditLogsApi.getByAction(actionFilter, page - 1, pageSize).then((r) => r.data);
      }
      if (dateRange) {
        return auditLogsApi
          .getByDateRange(
            dateRange[0].startOf('day').toISOString(),
            dateRange[1].endOf('day').toISOString(),
            page - 1,
            pageSize,
          )
          .then((r) => r.data);
      }
      return auditLogsApi.getAll(page - 1, pageSize).then((r) => r.data);
    },
  });

  const columns: ColumnsType<AuditLog> = [
    {
      title: 'Datum i vreme',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (val: string) => dayjs(val).format('DD.MM.YYYY HH:mm:ss'),
    },
    {
      title: 'Akcija',
      dataIndex: 'action',
      key: 'action',
      width: 110,
      render: (val: AuditAction) => (
        <Tag color={ACTION_COLORS[val]}>{ACTION_LABELS[val] || val}</Tag>
      ),
    },
    {
      title: 'Tip entiteta',
      dataIndex: 'entityType',
      key: 'entityType',
      width: 140,
      render: (val: string) => <Tag>{ENTITY_TYPE_LABELS[val] || val}</Tag>,
    },
    {
      title: 'Entitet ID',
      dataIndex: 'entityId',
      key: 'entityId',
      width: 140,
      ellipsis: true,
      render: (val: string) =>
        val ? (
          <Tooltip title={val}>
            <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{val.substring(0, 8)}...</span>
          </Tooltip>
        ) : (
          '-'
        ),
    },
    {
      title: 'Korisnik',
      dataIndex: 'userName',
      key: 'userName',
      width: 150,
      render: (val: string | null, record: AuditLog) =>
        val || (
          <Tooltip title={record.userId}>
            <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#999' }}>
              {record.userId?.substring(0, 8)}...
            </span>
          </Tooltip>
        ),
    },

    {
      title: 'IP adresa',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 130,
      render: (val: string | null) => val || '-',
    },
    {
      title: 'Detalji',
      key: 'details',
      width: 120,
      render: (_: unknown, record: AuditLog) => {
        const hasOld = record.oldValues && record.oldValues !== 'null';
        const hasNew = record.newValues && record.newValues !== 'null';
        if (!hasOld && !hasNew) return <span style={{ color: '#999' }}>—</span>;
        return (
          <Tooltip
            title={
              <div style={{ maxHeight: 300, overflow: 'auto', fontSize: 12 }}>
                {hasOld && (
                  <div>
                    <strong>Stare vrednosti:</strong>
                    <pre style={{ margin: '4px 0', whiteSpace: 'pre-wrap', fontSize: 11 }}>
                      {JSON.stringify(JSON.parse(record.oldValues!), null, 2).substring(0, 500)}
                    </pre>
                  </div>
                )}
                {hasNew && (
                  <div>
                    <strong>Nove vrednosti:</strong>
                    <pre style={{ margin: '4px 0', whiteSpace: 'pre-wrap', fontSize: 11 }}>
                      {JSON.stringify(JSON.parse(record.newValues!), null, 2).substring(0, 500)}
                    </pre>
                  </div>
                )}
              </div>
            }
            overlayStyle={{ maxWidth: 500 }}
          >
            <Tag color='purple' style={{ cursor: 'pointer' }}>
              {hasOld && hasNew ? 'Staro → Novo' : hasNew ? 'Nove vrednosti' : 'Stare vrednosti'}
            </Tag>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Audit logovi
        </Title>
      </div>

      <Card>
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            placeholder='Filtriraj po akciji'
            allowClear
            style={{ width: 180 }}
            value={actionFilter}
            onChange={(val) => {
              setActionFilter(val);
              setDateRange(null);
              setPage(1);
            }}
            options={[
              { value: 'CREATE', label: 'Kreiranje' },
              { value: 'UPDATE', label: 'Izmena' },
              { value: 'DELETE', label: 'Brisanje' },
              { value: 'LOGIN', label: 'Prijava' },
              { value: 'LOGOUT', label: 'Odjava' },
            ]}
          />
          <RangePicker
            format='DD.MM.YYYY'
            placeholder={['Od datuma', 'Do datuma']}
            value={dateRange}
            onChange={(dates) => {
              setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null);
              setActionFilter(undefined);
              setPage(1);
            }}
          />
        </Space>

        <Table
          rowClassName={(_, index) => (index % 2 === 1 ? 'zebra-even' : '')}
          columns={columns}
          dataSource={data?.content}
          rowKey='id'
          loading={isLoading}
          size='middle'
          scroll={{ x: 900 }}
          pagination={{
            current: page,
            total: data?.totalElements,
            pageSize: pageSize,
            onChange: (p, ps) => {
              if (ps !== pageSize) {
                setPage(1);
                setPageSize(ps);
              } else {
                setPage(p);
              }
            },
            showSizeChanger: true,
            pageSizeOptions: ['10', '15', '50', '100'],
            showTotal: (total) => `Ukupno: ${total} zapisa`,
          }}
        />
      </Card>
    </div>
  );
}
