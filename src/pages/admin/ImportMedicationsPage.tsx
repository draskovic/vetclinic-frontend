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
import { inventoryItemsApi, taxRatesApi } from '@/api';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { InventoryItem, TaxRate } from '@/types';

const { Title, Text } = Typography;

interface MedicationRow {
  name: string;
  taxLabel: string;
  taxRateId: string | null;
  isDuplicate: boolean;
  errorMessage: string | null;
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

  const { data: taxRates = [] } = useQuery({
    queryKey: ['tax-rates', 'RS'],
    queryFn: () => taxRatesApi.getAll('RS'),
  });

  const existing: InventoryItem[] = existingData?.data?.content ?? [];
  const existingNames = new Set(existing.map((i) => i.name.toLowerCase()));

  // Lookup PDV stope po label-u (case-insensitive)
  const findTaxRate = (label: string): TaxRate | undefined =>
    taxRates.find((tr) => tr.label.toLowerCase() === label.toLowerCase());

  const processRow = (name: string, taxLabel: string): MedicationRow => {
    const trimmedName = name.trim();
    const trimmedLabel = taxLabel.trim();

    if (!trimmedLabel) {
      return {
        name: trimmedName,
        taxLabel: '',
        taxRateId: null,
        isDuplicate: existingNames.has(trimmedName.toLowerCase()),
        errorMessage:
          'PDV oznaka nedostaje (kolona B). Dozvoljene: ' +
          taxRates.map((tr) => tr.label).join(', '),
      };
    }

    const matchedTax = findTaxRate(trimmedLabel);
    if (!matchedTax) {
      return {
        name: trimmedName,
        taxLabel: trimmedLabel,
        taxRateId: null,
        isDuplicate: existingNames.has(trimmedName.toLowerCase()),
        errorMessage:
          `Nepoznata PDV oznaka "${trimmedLabel}". Dozvoljene: ` +
          taxRates.map((tr) => tr.label).join(', '),
      };
    }

    return {
      name: trimmedName,
      taxLabel: matchedTax.label,
      taxRateId: matchedTax.id,
      isDuplicate: existingNames.has(trimmedName.toLowerCase()),
      errorMessage: null,
    };
  };

  const dedupeWithinFile = (rows: { name: string; taxLabel: string }[]) => {
    const seen = new Set<string>();
    return rows.filter((r) => {
      const k = r.name.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  // Header detekcija — prvi red, ako sadrži lek/naziv/medication/sku/pdv/tax/stopa
  const isHeaderRow = (idx: number, name: string, taxLabel: string): boolean =>
    idx === 0 && /lek|naziv|medication|sku|pdv|tax|stopa/i.test(name + ' ' + taxLabel);

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

          const parsed: { name: string; taxLabel: string }[] = [];
          rows.forEach((row, idx) => {
            const name = String(row[0] || '').trim();
            const taxLabel = String(row[1] || '').trim();
            if (!name) return;
            if (isHeaderRow(idx, name, taxLabel)) return;
            parsed.push({ name, taxLabel });
          });

          const deduped = dedupeWithinFile(parsed);
          setData(deduped.map((r) => processRow(r.name, r.taxLabel)));
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
            const parsed: { name: string; taxLabel: string }[] = [];
            (results.data as any[]).forEach((row, idx) => {
              const name = String(row[0] || '').trim();
              const taxLabel = String(row[1] || '').trim();
              if (!name) return;
              if (isHeaderRow(idx, name, taxLabel)) return;
              parsed.push({ name, taxLabel });
            });
            const deduped = dedupeWithinFile(parsed);
            setData(deduped.map((r) => processRow(r.name, r.taxLabel)));
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

    const toImport = data.filter((d) => !d.isDuplicate && !d.errorMessage);
    const total = data.length;
    let created = 0;
    const skipped = data.filter((d) => d.isDuplicate).length;
    const errors: { name: string; message: string }[] = [];

    // Dodaj postojeće greške u listu na kraju
    data
      .filter((d) => d.errorMessage)
      .forEach((d) => errors.push({ name: d.name, message: d.errorMessage! }));

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
          taxRateId: item.taxRateId!,
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
    { title: 'Naziv leka', dataIndex: 'name', width: 280 },
    {
      title: 'PDV',
      dataIndex: 'taxLabel',
      width: 120,
      render: (_: string, rec: MedicationRow) => {
        if (rec.errorMessage && !rec.taxRateId) {
          return <Tag color='error'>—</Tag>;
        }
        const tax = findTaxRate(rec.taxLabel);
        return tax ? (
          <Tag color='blue'>
            {tax.label} — {tax.percent}%
          </Tag>
        ) : (
          <Tag color='default'>{rec.taxLabel}</Tag>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 280,
      render: (_: string, rec: MedicationRow) => {
        if (rec.errorMessage) {
          return (
            <Tag color='error' style={{ whiteSpace: 'normal', maxWidth: 260 }}>
              {rec.errorMessage}
            </Tag>
          );
        }
        if (rec.isDuplicate) {
          return <Tag color='warning'>Već postoji — preskočiće se</Tag>;
        }
        return <Tag color='success'>Novi</Tag>;
      },
    },
  ];

  const newCount = data.filter((d) => !d.isDuplicate && !d.errorMessage).length;
  const duplicateCount = data.filter((d) => d.isDuplicate).length;
  const errorCount = data.filter((d) => d.errorMessage).length;
  const hasErrors = errorCount > 0;

  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Import lekova</Title>

      <Card style={{ marginBottom: 16 }}>
        <Space direction='vertical' style={{ width: '100%' }} size={12}>
          <Text>
            Učitajte Excel ili CSV fajl sa listom lekova. Lekovi će biti dodati u inventar sa
            kategorijom MEDICATION i stanjem 0 — služe kao šifarnik za prepisivanje recepata.
          </Text>
          <Alert
            type='info'
            showIcon
            message='Format fajla (dve kolone, obavezno):'
            description={
              <Space direction='vertical' size={2}>
                <Text>
                  <Text strong>Kolona A:</Text> Naziv leka
                </Text>
                <Text>
                  <Text strong>Kolona B:</Text> PDV oznaka — dozvoljene vrednosti:{' '}
                  {taxRates.length > 0 ? (
                    <Space size={[4, 4]} wrap>
                      {taxRates.map((tr) => (
                        <Tag key={tr.id} color='blue'>
                          {tr.label} — {tr.percent}%
                        </Tag>
                      ))}
                    </Space>
                  ) : (
                    <Text type='secondary'>učitavanje...</Text>
                  )}
                </Text>
                <Text type='secondary'>
                  Header red (sa "Naziv"/"PDV"/"SKU"/"Lek") se automatski preskače. Postojeći lekovi
                  (po nazivu, case-insensitive) se preskaču.
                </Text>
              </Space>
            }
          />
          <Space>
            <Upload accept='.xlsx,.xls,.csv' showUploadList={false} beforeUpload={handleFileUpload}>
              <Button icon={<UploadOutlined />}>Izaberi fajl</Button>
            </Upload>
            {data.length > 0 && !result && (
              <>
                <Popconfirm
                  title={`Importovati ${newCount} novih lekova? (${duplicateCount} preskočeno, ${errorCount} grešaka)`}
                  onConfirm={handleImport}
                  disabled={importing || newCount === 0 || hasErrors}
                >
                  <Button
                    type='primary'
                    icon={<ImportOutlined />}
                    loading={importing}
                    disabled={newCount === 0 || hasErrors}
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
          {hasErrors && (
            <Alert
              type='error'
              showIcon
              message={`${errorCount} red(a) sa greškom — Import dugme onemogućeno dok se ne ispravi fajl ili izbace problematični redovi.`}
            />
          )}
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
          title={`Pregled (${data.length} stavki — ${newCount} novih, ${duplicateCount} duplikata, ${errorCount} grešaka)`}
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
