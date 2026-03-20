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
  Tag,
  Popconfirm,
  message,
} from 'antd';
import { UploadOutlined, ImportOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { ownersApi } from '../../api';
import type { ImportOwnerRequest, ImportResultResponse } from '../../types';
import Papa from 'papaparse';

const { Title, Text } = Typography;

const ImportOwnersPage: React.FC = () => {
  const [data, setData] = useState<ImportOwnerRequest[]>([]);
  const [result, setResult] = useState<ImportResultResponse | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: (requests: ImportOwnerRequest[]) => ownersApi.importOwners(requests),
    onSuccess: (response) => {
      setResult(response.data);
      message.success(`Import završen: ${response.data.created} kreirano`);
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
            const mapped: ImportOwnerRequest[] = results.data.map((row: any) => ({
              clientCode: row.clientCode || row.broj || undefined,
              firstName: row.firstName || row.ime || '',
              lastName: row.lastName || row.prezime || '',
              phone: row.phone || row.telefon || undefined,
              address: row.address || row.adresa || undefined,
              city: row.city || row.grad || undefined,
              pets:
                row.petName || row.imeLjubimca
                  ? [
                      {
                        name: row.petName || row.imeLjubimca || '',
                        species: row.species || row.vrsta || undefined,
                        breed: row.breed || row.rasa || undefined,
                      },
                    ]
                  : [],
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
    return false; // sprečava auto-upload
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
    { title: 'Br.', dataIndex: 'clientCode', width: 80, render: (v: string) => v || '—' },
    {
      title: 'Vlasnik',
      render: (_: any, r: ImportOwnerRequest) => `${r.firstName} ${r.lastName}`,
    },
    { title: 'Telefon', dataIndex: 'phone', render: (v: string) => v || '—' },
    { title: 'Adresa', dataIndex: 'address', render: (v: string) => v || '—' },
    { title: 'Grad', dataIndex: 'city', render: (v: string) => v || '—' },
    {
      title: 'Ljubimci',
      dataIndex: 'pets',
      render: (pets: ImportOwnerRequest['pets']) =>
        pets?.map((p, i) => (
          <Tag key={i} color='blue'>
            {p.name} {p.species ? `(${p.species})` : ''}
          </Tag>
        )) || '—',
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Import vlasnika i ljubimaca</Title>

      {/* Upload sekcija */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction='vertical' style={{ width: '100%' }}>
          <Text>Učitajte JSON ili CSV fajl sa podacima o vlasnicima i njihovim ljubimcima.</Text>
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

      {/* Greška pri parsiranju */}
      {parseError && (
        <Alert type='error' message={parseError} closable style={{ marginBottom: 16 }} />
      )}

      {/* Rezultat importa */}
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
              rowKey={(r) => r.clientCode || r.ownerName}
              size='small'
              pagination={false}
              columns={[
                { title: 'Br.', dataIndex: 'clientCode', width: 80 },
                { title: 'Vlasnik', dataIndex: 'ownerName' },
                { title: 'Greška', dataIndex: 'message' },
              ]}
            />
          )}
        </Card>
      )}

      {/* Preview tabela */}
      {data.length > 0 && !result && (
        <Card title={`Pregled podataka (${data.length} zapisa)`}>
          <Table
            dataSource={data}
            columns={columns}
            rowKey={(r) => r.clientCode || `${r.firstName}-${r.lastName}`}
            size='small'
            pagination={{ pageSize: 20 }}
            scroll={{ y: 500 }}
          />
        </Card>
      )}
    </div>
  );
};

export default ImportOwnersPage;
