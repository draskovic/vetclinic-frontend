import { useState } from 'react';
import { Table, Button, Space, Card, Typography, Popconfirm, message, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import { breedsApi } from '@/api/breeds';
import { speciesApi } from '@/api/species';
import type { Breed } from '@/types';
import BreedModal from './BreedModal';

const { Title } = Typography;

export default function BreedPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBreed, setEditingBreed] = useState<Breed | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['breeds', page, pageSize],
    queryFn: () => breedsApi.getAll(page - 1, pageSize).then((r) => r.data),
  });

  const { data: speciesData } = useQuery({
    queryKey: ['species', 'all-for-seed'],
    queryFn: () => speciesApi.getAll(0, 100).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => breedsApi.delete(id),
    onSuccess: () => {
      message.success('Rasa je obrisana!');
      queryClient.invalidateQueries({ queryKey: ['breeds'] });
    },
    onError: () => message.error('Greška pri brisanju!'),
  });

  const seedDogsMutation = useMutation({
    mutationFn: (speciesId: string) => breedsApi.seedDefaultDogs(speciesId).then((r) => r.data),
    onSuccess: (result) => {
      Modal.info({
        title: 'Učitavanje predefinisanih rasa pasa',
        content: (
          <div>
            <p>
              Ukupno obrađeno: <strong>{result.totalProcessed}</strong>
            </p>
            <p>
              Novih dodato: <strong>{result.created}</strong>
            </p>
            <p>
              Preskočeno (već postoje): <strong>{result.skipped}</strong>
            </p>
            {result.errors.length > 0 && (
              <p style={{ color: '#ff4d4f' }}>
                Greške: <strong>{result.errors.length}</strong>
              </p>
            )}
          </div>
        ),
      });
      queryClient.invalidateQueries({ queryKey: ['breeds'] });
    },
    onError: () => message.error('Greška pri učitavanju rasa!'),
  });

  const handleSeedDogs = () => {
    const dogSpecies = speciesData?.content.find((s) => s.name.trim().toLowerCase() === 'pas');
    if (!dogSpecies) {
      message.error("Vrsta 'Pas' ne postoji u šifarniku vrsta. Prvo je dodajte.");
      return;
    }
    seedDogsMutation.mutate(dogSpecies.id);
  };

  const columns: ColumnsType<Breed> = [
    {
      title: 'Naziv rase',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Vrsta',
      dataIndex: 'speciesName',
      key: 'speciesName',
    },
    {
      title: 'Akcije',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type='text'
            icon={<EditOutlined />}
            onClick={() => {
              setEditingBreed(record);
              setModalOpen(true);
            }}
          />
          <Popconfirm
            title='Brisanje rase'
            description='Da li ste sigurni?'
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText='Da'
            cancelText='Ne'
            okButtonProps={{ danger: true }}
          >
            <Button type='text' danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
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
          Rase
        </Title>
        <Space>
          <Popconfirm
            title='Učitaj predefinisane rase pasa'
            description={
              <div style={{ maxWidth: 320 }}>
                Biće dodato do 95 najčešćih rasa pasa u šifarnik.
                <br />
                Postojeće rase neće biti dirane.
              </div>
            }
            onConfirm={handleSeedDogs}
            okText='Da, učitaj'
            cancelText='Odustani'
          >
            <Button icon={<DownloadOutlined />} loading={seedDogsMutation.isPending}>
              Učitaj rase pasa
            </Button>
          </Popconfirm>
          <Button
            type='primary'
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingBreed(null);
              setModalOpen(true);
            }}
          >
            Dodaj rasu
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          rowClassName={(_, index) => (index % 2 === 1 ? 'zebra-even' : '')}
          columns={columns}
          dataSource={data?.content}
          rowKey='id'
          loading={isLoading}
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
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `Ukupno: ${total} rasa`,
          }}
        />
      </Card>
      {modalOpen && (
        <BreedModal
          open={modalOpen}
          breed={editingBreed}
          onClose={() => {
            setModalOpen(false);
            setEditingBreed(null);
          }}
        />
      )}
    </div>
  );
}
