import React, { useState } from 'react';
import {
  Card,
  Button,
  Upload,
  Table,
  Alert,
  Result,
  Space,
  Typography,
  Popconfirm,
  message,
  Progress,
  Tag,
} from 'antd';
import { UploadOutlined, ImportOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { inventoryItemsApi } from '@/api/inventory';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { InventoryItem } from '@/types';

const { Title, Text } = Typography;

interface MedicationRow {
  name: string;
  isDuplicate: boolean;
}

interface ImportResult {
  total: number;
  created: number;
  skipped: number;
  errors: { name: string; message: string }[];
}

const ImportMedicationsPage: React.FC = () => {
  const [data, setData] = useState<MedicationRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const { data: existingData, refetch: refetchExisting } = useQuery({
    queryKey: ['inventory-medications-all'],
    queryFn: () => inventoryItemsApi.getAll(0, 500, '', 'MEDICATION'),
  });

  const existing: InventoryItem[] = existingData?.data?.content ?? [];
  const existingNames = new Set(existing.map((i) => i.name.toLowerCase()));

  const markDuplicates = (names: string[]): MedicationRow[] =>
    names.map((name) => ({
      name,
      isDuplicate: existingNames.has(name.toLowerCase()),
    }));

  const dedupeWithinFile = (names: string[]): string[] => {
    const seen = new Set<string>();
    return names.filter((n) => {
      const k = n.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const isHeaderRow = (idx: number, value: string): boolean =>
    idx === 0 && /lek|naziv|medication/i.test(value);

  const handleFileUpload = (file: File) => {
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const lower = file.name.toLowerCase();

      if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const wb = XLSX.read(buffer, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

          const names: string[] = [];
          rows.forEach((row, idx) => {
            const value = String(row[0] || '').trim();
            if (!value) return;
            if (isHeaderRow(idx, value)) return;
            names.push(value);
          });

          setData(markDuplicates(dedupeWithinFile(names)));
          setParseError(null);
        } catch {
          setParseError('Greška pri čitanju Excel fajla');
        }
      } else if (lower.endsWith('.csv')) {
        const text = e.target?.result as string;
        Papa.parse(text, {
          header: false,
          skipEmptyLines: true,
          complete: (results) => {
            const names: string[] = [];
            (results.data as any[]).forEach((row, idx) => {
              const value = String(row[0] || '').trim();
              if (!value) return;
              if (isHeaderRow(idx, value)) return;
              names.push(value);
            });
            setData(markDuplicates(dedupeWithinFile(names)));
            setParseError(null);
          },
          error: () => setParseError('Greška pri parsiranju CSV fajla'),
        });
      } else {
        setParseError('Podržani formati: .xlsx, .xls, .csv');
      }
    };

    if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file, 'UTF-8');
    }
    return false;
  };

  const handleImport = async () => {
    setImporting(true);
    setProgress(0);

    const toImport = data.filter((d) => !d.isDuplicate);
    const total = data.length;
    let created = 0;
    const skipped = data.filter((d) => d.isDuplicate).length;
    const errors: { name: string; message: string }[] = [];

    let counter = existing.length + 1;

    for (let i = 0; i < toImport.length; i++) {
      const item = toImport[i];
      const sku = `MED-${String(counter).padStart(3, '0')}`;
      try {
        await inventoryItemsApi.create({
          name: item.name,
          sku,
          category: 'MEDICATION',
          quantityOnHand: 0,
          initialQuantity: 0,
          trackBatches: false,
          active: true,
        });
        created++;
        counter++;
      } catch (err: any) {
        errors.push({
          name: item.name,
          message: err?.response?.data?.message || err?.message || 'Nepoznata greška',
        });
      }
      setProgress(Math.round(((i + 1) / toImport.length) * 100));
    }

    setResult({ total, created, skipped, errors });
    setImporting(false);
    if (created > 0) {
      message.success(`Import završen: ${created} kreirano, ${skipped} preskočeno`);
    }
    refetchExisting();
  };

  const handleClear = () => {
    setData([]);
    setResult(null);
    setParseError(null);
    setProgress(0);
  };

  const columns = [
    { title: 'Naziv leka', dataIndex: 'name' },
    {
      title: 'Status',
      dataIndex: 'isDuplicate',
      width: 220,
      render: (dup: boolean) =>
        dup ? (
          <Tag color='warning'>Već postoji — preskočiće se</Tag>
        ) : (
          <Tag color='success'>Novi</Tag>
        ),
    },
  ];

  const newCount = data.filter((d) => !d.isDuplicate).length;
  const duplicateCount = data.length - newCount;

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Import lekova</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space direction='vertical' style={{ width: '100%' }}>
          <Text>
            Učitajte Excel ili CSV fajl sa listom lekova. Lekovi će biti dodati u inventar sa
            kategorijom MEDICATION i stanjem 0 — služe kao šifarnik za prepisivanje recepata.
          </Text>
          <Text type='secondary'>
            Format: prva kolona = naziv leka. Header red sa "LEKOVI"/"NAZIV" se automatski preskače.
            Postojeći lekovi (po nazivu, case-insensitive) se preskaču.
          </Text>
          <Space>
            <Upload accept='.xlsx,.xls,.csv' showUploadList={false} beforeUpload={handleFileUpload}>
              <Button icon={<UploadOutlined />}>Izaberi fajl</Button>
            </Upload>
            {data.length > 0 && !result && (
              <>
                <Popconfirm
                  title={`Importovati ${newCount} novih lekova? (${duplicateCount} će se preskočiti)`}
                  onConfirm={handleImport}
                  disabled={importing || newCount === 0}
                >
                  <Button
                    type='primary'
                    icon={<ImportOutlined />}
                    loading={importing}
                    disabled={newCount === 0}
                  >
                    Importuj ({newCount})
                  </Button>
                </Popconfirm>
                <Button icon={<DeleteOutlined />} onClick={handleClear} disabled={importing}>
                  Očisti
                </Button>
              </>
            )}
          </Space>
          {importing && <Progress percent={progress} />}
        </Space>
      </Card>

      {parseError && (
        <Alert type='error' message={parseError} closable style={{ marginBottom: 16 }} />
      )}

      {result && (
        <Card style={{ marginBottom: 16 }}>
          <Result
            status={result.errors.length === 0 ? 'success' : 'warning'}
            title='Import završen'
            subTitle={`Obrađeno: ${result.total} | Kreirano: ${result.created} | Preskočeno: ${result.skipped} | Greške: ${result.errors.length}`}
            extra={<Button onClick={handleClear}>Zatvori i učitaj nov fajl</Button>}
          />
          {result.errors.length > 0 && (
            <Table
              dataSource={result.errors}
              rowKey='name'
              size='small'
              pagination={false}
              columns={[
                { title: 'Lek', dataIndex: 'name' },
                { title: 'Greška', dataIndex: 'message' },
              ]}
            />
          )}
        </Card>
      )}

      {data.length > 0 && !result && (
        <Card
          title={`Pregled (${data.length} stavki — ${newCount} novih, ${duplicateCount} duplikata)`}
        >
          <Table
            dataSource={data}
            columns={columns}
            rowKey='name'
            size='small'
            pagination={{ pageSize: 20 }}
            scroll={{ y: 500 }}
          />
        </Card>
      )}
    </div>
  );
};

export default ImportMedicationsPage;
