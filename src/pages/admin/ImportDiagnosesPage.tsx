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
import { diagnosesApi } from '@/api/diagnoses';
import Papa from 'papaparse';
import type { ImportDiagnosisRequest } from '@/types';

const { Title, Text } = Typography;

const ImportDiagnosesPage: React.FC = () => {
  const [data, setData] = useState<ImportDiagnosisRequest[]>([]);
  const [result, setResult] = useState<any | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: (requests: ImportDiagnosisRequest[]) => diagnosesApi.importDiagnoses(requests),
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
            const mapped: ImportDiagnosisRequest[] = results.data.map((row: any) => ({
              name: row.name || row.naziv || '',
              code: row.code || row.sifra || row.šifra || undefined,
              category: row.category || row.kategorija || undefined,
              description: row.description || row.opis || undefined,
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
    { title: 'Šifra', dataIndex: 'code', width: 80, render: (v: string) => v || 'auto' },
    { title: 'Naziv', dataIndex: 'name' },
    { title: 'Kategorija', dataIndex: 'category', width: 200, render: (v: string) => v || '—' },
    { title: 'Opis', dataIndex: 'description', ellipsis: true, render: (v: string) => v || '—' },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Import dijagnoza</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space direction='vertical' style={{ width: '100%' }}>
          <Text>Učitajte JSON ili CSV fajl sa šifarnikom dijagnoza.</Text>
          <Text type='secondary'>
            CSV kolone: naziv (name), šifra (code), kategorija (category), opis (description). Ako
            šifra nije navedena, dodeliće se automatski (D001, D002...).
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
        <Card title={`Pregled podataka (${data.length} dijagnoza)`}>
          <Table
            dataSource={data}
            columns={columns}
            rowKey={(r) => r.code || r.name}
            size='small'
            pagination={{ pageSize: 20 }}
            scroll={{ y: 500 }}
          />
        </Card>
      )}
    </div>
  );
};

export default ImportDiagnosesPage;
