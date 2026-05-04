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
} from 'antd';
import { UploadOutlined, ImportOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { servicesApi } from '@/api';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;

const parsePrice = (val: any): number => {
  if (!val) return 0;
  const str = String(val).replace(/\s/g, '');
  const match = str.match(/[\d]+([.,]\d+)?/);
  return match ? parseFloat(match[0].replace(',', '.')) : 0;
};

const CATEGORY_PREFIXES: Record<string, string> = {
  KLINIČKI: 'KLN',
  APLIKACIJA: 'APL',
  ANESTEZIJA: 'ANE',
  LABORATORIJSKA: 'LAB',
  ULTRAZVUČNA: 'ULT',
  PORODILJSTVO: 'POR',
  STERILIZACIJA: 'STE',
  HIRURGIJA: 'HIR',
  KOZMETIKA: 'KOZ',
  PREVENTIVA: 'PRE',
  TERAPIJA: 'TER',
  EUTANAZIJA: 'EUT',
};

const getCategoryPrefix = (category: string): string => {
  const upper = category.toUpperCase();
  for (const [key, prefix] of Object.entries(CATEGORY_PREFIXES)) {
    if (upper.includes(key)) return prefix;
  }
  return 'USL';
};

const CATEGORY_TO_ENUM: Record<string, string> = {
  KLINIČKI: 'EXAMINATION',
  APLIKACIJA: 'MEDICATION_APPLICATION',
  ANESTEZIJA: 'ANESTHESIA',
  LABORATORIJSKA: 'LAB',
  ULTRAZVUČNA: 'ULTRASOUND',
  PORODILJSTVO: 'REPRODUCTION',
  STERILIZACIJA: 'STERILIZATION',
  HIRURGIJA: 'SURGERY',
  KOZMETIKA: 'GROOMING',
  PREVENTIVA: 'PREVENTIVE',
  TERAPIJA: 'THERAPY',
  EUTANAZIJA: 'EUTHANASIA',
};

const getCategoryEnum = (category: string): string => {
  const upper = category.toUpperCase();
  for (const [key, val] of Object.entries(CATEGORY_TO_ENUM)) {
    if (upper.includes(key)) return val;
  }
  return 'OTHER';
};

interface ImportServiceRow {
  sku: string;
  name: string;
  price: number;
  unit?: string;
  category?: string;
}

const ImportServicesPage: React.FC = () => {
  const [data, setData] = useState<ImportServiceRow[]>([]);
  const [result, setResult] = useState<any | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: (requests: ImportServiceRow[]) => servicesApi.importServices(requests),
    onSuccess: (response) => {
      setResult(response);
      message.success(`Import završen: ${response.created} kreirano`);
    },
    onError: () => {
      message.error('Greška pri importu');
    },
  });

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;

      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(text);
          setData(Array.isArray(parsed) ? parsed : []);
          setParseError(null);
          setResult(null);
        } catch {
          setParseError('Neispravan JSON format');
        }
      } else if (file.name.endsWith('.csv')) {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const mapped: ImportServiceRow[] = results.data.map((row: any) => ({
              sku: row.sku || row.sifra || row.šifra || '',
              name: row.name || row.naziv || '',
              price: parseFloat(row.price || row.cena || '0') || 0,
              unit: row.unit || row.jedinica || undefined,
              category: row.category || row.kategorija || undefined,
            }));
            setData(mapped);
            setParseError(null);
            setResult(null);
          },
          error: () => setParseError('Greška pri parsiranju CSV fajla'),
        });
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const buffer = e.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        const parsed: ImportServiceRow[] = [];
        let currentCategory = 'OTHER';
        let categoryPrefix = 'USL';
        const categoryCounters: Record<string, number> = {};

        rows.forEach((row) => {
          const naziv = String(row[0] || '').trim();
          const cenaRaw = row[1];
          const jedinica = String(row[2] || 'kom').trim();

          if (!naziv) return;

          const hasPrice = cenaRaw !== '' && cenaRaw !== null && cenaRaw !== undefined;

          if (!hasPrice) {
            // Ovo je header kategorije
            currentCategory = naziv.replace(/^\d+\.\s*/, '').trim();
            categoryPrefix = getCategoryPrefix(currentCategory);
            return;
          }

          const counter = (categoryCounters[categoryPrefix] || 0) + 1;
          categoryCounters[categoryPrefix] = counter;
          const sku = `${categoryPrefix}-${String(counter).padStart(3, '0')}`;

          parsed.push({
            sku,
            name: naziv,
            price: parsePrice(cenaRaw),
            unit: jedinica || 'kom',
            category: getCategoryEnum(currentCategory),
          });
        });

        setData(parsed);
        setParseError(null);
        setResult(null);
      } else {
        setParseError('Podržani formati: .json i .csv');
      }
    };
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file, 'UTF-8');
    }
    return false;
  };

  const handleImport = () => {
    importMutation.mutate(data);
  };

  const handleClear = () => {
    setData([]);
    setResult(null);
    setParseError(null);
  };

  const columns = [
    { title: 'Šifra', dataIndex: 'sku', width: 80 },
    { title: 'Naziv', dataIndex: 'name' },
    {
      title: 'Cena',
      dataIndex: 'price',
      width: 100,
      align: 'right' as const,
      render: (v: number) => v || '—',
    },
    { title: 'Jed.', dataIndex: 'unit', width: 70, render: (v: string) => v || '—' },
    { title: 'Kategorija', dataIndex: 'category', width: 120, render: (v: string) => v || 'OTHER' },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Import usluga (cenovnik)</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space direction='vertical' style={{ width: '100%' }}>
          <Text>Učitajte JSON ili CSV fajl sa šifarnikom usluga.</Text>
          <Text type='secondary'>Podržani formati: .xlsx (cenovnik), .csv, .json (category)</Text>
          <Space>
            <Upload
              accept='.json,.csv, .xlsx,.xls'
              showUploadList={false}
              beforeUpload={handleFileUpload}
            >
              <Button icon={<UploadOutlined />}>Izaberi fajl</Button>
            </Upload>
            {data.length > 0 && (
              <>
                <Popconfirm title='Sigurno želite da pokrenete import?' onConfirm={handleImport}>
                  <Button
                    type='primary'
                    icon={<ImportOutlined />}
                    loading={importMutation.isPending}
                  >
                    Importuj ({data.length})
                  </Button>
                </Popconfirm>
                <Button icon={<DeleteOutlined />} onClick={handleClear}>
                  Očisti
                </Button>
              </>
            )}
          </Space>
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
            subTitle={`Obrađeno: ${result.totalProcessed} | Kreirano: ${result.created} | Preskočeno: ${result.skipped} | Greške: ${result.errors.length}`}
          />
          {result.errors.length > 0 && (
            <Table
              dataSource={result.errors}
              rowKey={(r: any) => r.clientCode || r.ownerName}
              size='small'
              pagination={false}
              columns={[
                { title: 'Šifra', dataIndex: 'clientCode', width: 80 },
                { title: 'Naziv', dataIndex: 'ownerName' },
                { title: 'Greška', dataIndex: 'message' },
              ]}
            />
          )}
        </Card>
      )}

      {data.length > 0 && !result && (
        <Card title={`Pregled podataka (${data.length} usluga)`}>
          <Table
            dataSource={data}
            columns={columns}
            rowKey={(r) => r.sku || r.name}
            size='small'
            pagination={{ pageSize: 20 }}
            scroll={{ y: 500 }}
          />
        </Card>
      )}
    </div>
  );
};

export default ImportServicesPage;
