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

const { Title, Text } = Typography;

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
      } else {
        setParseError('Podržani formati: .json i .csv');
      }
    };
    reader.readAsText(file, 'UTF-8');
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
          <Text type='secondary'>
            CSV kolone: šifra (sku), naziv (name), cena (price), jedinica (unit), kategorija
            (category)
          </Text>
          <Space>
            <Upload accept='.json,.csv' showUploadList={false} beforeUpload={handleFileUpload}>
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
