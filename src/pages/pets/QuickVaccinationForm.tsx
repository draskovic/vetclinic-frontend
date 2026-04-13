import { useState } from 'react';
import { Form, Button, Input, DatePicker, Row, Col, message, Space } from 'antd';
import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { vaccinationsApi } from '@/api/vaccinations';
import type { CreateVaccinationRequest } from '@/types';
import dayjs from 'dayjs';

interface QuickVaccinationFormProps {
  petId: string;
  vetId: string;
  onDone?: () => void;
}

export default function QuickVaccinationForm({ petId, vetId, onDone }: QuickVaccinationFormProps) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [savedCount, setSavedCount] = useState(0);

  const createMutation = useMutation({
    mutationFn: (data: CreateVaccinationRequest) => vaccinationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccinations', 'by-pet', petId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-vaccinations'] });
    },
    onError: () => message.error('Greška pri dodavanju vakcinacije!'),
  });

  const handleSave = async (andAnother: boolean) => {
    try {
      const values = await form.validateFields();
      const payload = {
        petId,
        vetId,
        vaccineName: values.vaccineName,
        manufacturer: values.manufacturer || undefined,
        batchNumber: values.batchNumber || undefined,
        administeredAt: values.administeredAt
          ? values.administeredAt.toISOString()
          : dayjs().toISOString(),
        nextDueDate: values.nextDueDate ? values.nextDueDate.format('YYYY-MM-DD') : undefined,
      };
      await createMutation.mutateAsync(payload as CreateVaccinationRequest);
      setSavedCount((prev) => prev + 1);

      if (andAnother) {
        // Resetuj samo naziv i seriju, zadrži datum i proizvođača
        form.setFieldsValue({
          vaccineName: '',
          batchNumber: '',
        });
        message.success('Vakcinacija sačuvana! Unesite sledeću.');
      } else {
        form.resetFields();
        message.success('Vakcinacija sačuvana!');
        onDone?.();
      }
    } catch {
      // Validacija nije prošla
    }
  };

  return (
    <div style={{ padding: '12px 0' }}>
      <Form form={form} layout='vertical' className='compact-medical-form'>
        <Row gutter={12}>
          <Col span={6}>
            <Form.Item
              name='vaccineName'
              label='Naziv vakcine'
              rules={[{ required: true, message: 'Obavezno!' }]}
            >
              <Input placeholder='Naziv vakcine' autoFocus />
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item name='manufacturer' label='Proizvođač'>
              <Input placeholder='Proizvođač' />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name='batchNumber' label='Br. serije'>
              <Input placeholder='Serija' />
            </Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item name='administeredAt' label='Datum' initialValue={dayjs()}>
              <DatePicker
                showTime={{ format: 'HH:mm' }}
                format='DD.MM.YYYY HH:mm'
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name='nextDueDate' label='Sledeća doza'>
              <DatePicker style={{ width: '100%' }} format='DD.MM.YYYY' />
            </Form.Item>
          </Col>
        </Row>
        <Space>
          <Button
            type='primary'
            icon={<SaveOutlined />}
            loading={createMutation.isPending}
            onClick={() => handleSave(false)}
          >
            Sačuvaj
          </Button>
          <Button
            icon={<PlusOutlined />}
            loading={createMutation.isPending}
            onClick={() => handleSave(true)}
          >
            Sačuvaj i još jedna
          </Button>
          {savedCount > 0 && (
            <span style={{ color: '#52c41a', fontWeight: 500 }}>✓ Sačuvano: {savedCount}</span>
          )}
        </Space>
      </Form>
    </div>
  );
}
