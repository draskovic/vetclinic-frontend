import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Descriptions,
  Tag,
  Row,
  Col,
  Spin,
  Switch,
  Upload,
  Image,
  Popconfirm,
  Space,
  Checkbox,
  InputNumber,
  Select,
  Divider,
  Table,
  Modal,
  TimePicker,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clinicsApi } from '@/api';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import type { UpdateClinicRequest } from '@/types';
import { UploadOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { bookingSettingsApi } from '@/api/booking-settings';
import type { UpdateBookingSettingsRequest } from '@/api/booking-settings';
import { QRCodeCanvas } from 'qrcode.react';
import { clinicLocationsApi } from '@/api/clinic-locations';
import type {
  CreateClinicLocationRequest,
  UpdateClinicLocationRequest,
} from '@/api/clinic-locations';
import type { ClinicLocation } from '@/types';
import dayjs from 'dayjs';

const ClinicSettingsPage = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const clinicId = useAuthStore((s) => s.clinicId);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const { data: clinic, isLoading } = useQuery({
    queryKey: ['clinic', clinicId],
    queryFn: async () => {
      const res = await clinicsApi.getById(clinicId!);
      return res.data;
    },
    enabled: !!clinicId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateClinicRequest) => clinicsApi.update(clinicId!, data),
    onSuccess: () => {
      message.success('Podešavanja klinike su sačuvana');
      queryClient.invalidateQueries({ queryKey: ['clinic', clinicId] });
    },
    onError: () => {
      message.error('Greška pri čuvanju podešavanja');
    },
  });

  useEffect(() => {
    if (!clinicId || !clinic?.logoUrl) {
      setLogoPreviewUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    apiClient
      .get(`/clinics/${clinicId}/logo`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setLogoPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setLogoPreviewUrl(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [clinicId, clinic?.logoUrl]);

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => clinicsApi.uploadLogo(clinicId!, file),
    onSuccess: () => {
      message.success('Logo je sačuvan');
      queryClient.invalidateQueries({ queryKey: ['clinic', clinicId] });
    },
    onError: () => {
      message.error('Greška pri upload-u logoa');
    },
  });

  const deleteLogoMutation = useMutation({
    mutationFn: () => clinicsApi.deleteLogo(clinicId!),
    onSuccess: () => {
      message.success('Logo je uklonjen');
      setLogoPreviewUrl(null);
      queryClient.invalidateQueries({ queryKey: ['clinic', clinicId] });
    },
    onError: () => {
      message.error('Greška pri uklanjanju logoa');
    },
  });

  const [bookingForm] = Form.useForm();

  const { data: bookingSettings, isLoading: bookingLoading } = useQuery({
    queryKey: ['booking-settings'],
    queryFn: async () => {
      const res = await bookingSettingsApi.get();
      return res.data;
    },
  });

  useEffect(() => {
    if (bookingSettings) {
      bookingForm.setFieldsValue(bookingSettings);
    }
  }, [bookingSettings, bookingForm]);

  const updateBookingMutation = useMutation({
    mutationFn: (data: UpdateBookingSettingsRequest) => bookingSettingsApi.update(data),
    onSuccess: () => {
      message.success('Podešavanja online zakazivanja su sačuvana');
      queryClient.invalidateQueries({ queryKey: ['booking-settings'] });
    },
    onError: () => {
      message.error('Greška pri čuvanju podešavanja online zakazivanja');
    },
  });

  const handleBookingSubmit = (values: UpdateBookingSettingsRequest) => {
    updateBookingMutation.mutate(values);
  };

  const bookingUrl = `${window.location.origin}/book/${clinicId}`;

  // --- Lokacije ---
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ClinicLocation | null>(null);
  const [locationForm] = Form.useForm();

  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryKey: ['clinic-locations'],
    queryFn: async () => {
      const res = await clinicLocationsApi.getAll();
      return res.data.content;
    },
  });

  const createLocationMutation = useMutation({
    mutationFn: (data: CreateClinicLocationRequest) => clinicLocationsApi.create(data),
    onSuccess: () => {
      message.success('Lokacija je kreirana');
      queryClient.invalidateQueries({ queryKey: ['clinic-locations'] });
      setLocationModalOpen(false);
      locationForm.resetFields();
    },
    onError: () => message.error('Greška pri kreiranju lokacije'),
  });

  const updateLocationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClinicLocationRequest }) =>
      clinicLocationsApi.update(id, data),
    onSuccess: () => {
      message.success('Lokacija je ažurirana');
      queryClient.invalidateQueries({ queryKey: ['clinic-locations'] });
      setLocationModalOpen(false);
      setEditingLocation(null);
      locationForm.resetFields();
    },
    onError: () => message.error('Greška pri ažuriranju lokacije'),
  });

  const DAYS = [
    { key: 'monday', label: 'Ponedeljak' },
    { key: 'tuesday', label: 'Utorak' },
    { key: 'wednesday', label: 'Sreda' },
    { key: 'thursday', label: 'Četvrtak' },
    { key: 'friday', label: 'Petak' },
    { key: 'saturday', label: 'Subota' },
    { key: 'sunday', label: 'Nedelja' },
  ];

  const parseWorkingHours = (
    json: string | null,
  ): Record<string, Array<{ open: string; close: string }>> => {
    const defaults: Record<string, Array<{ open: string; close: string }>> = {};
    DAYS.forEach((d) => {
      defaults[d.key] =
        d.key === 'saturday' || d.key === 'sunday' ? [] : [{ open: '08:00', close: '16:00' }];
    });
    if (!json) return defaults;
    try {
      const parsed = JSON.parse(json);
      DAYS.forEach((d) => {
        const val = parsed[d.key];
        if (Array.isArray(val)) {
          defaults[d.key] = val.filter((p: any) => p.open && p.close);
        } else if (val && val.open && val.close) {
          defaults[d.key] = [{ open: val.open, close: val.close }];
        } else {
          defaults[d.key] = [];
        }
      });
    } catch {
      /* ignore */
    }
    return defaults;
  };

  const buildWorkingHoursJson = (formValues: any): string => {
    const result: Record<string, Array<{ open: string; close: string }> | null> = {};
    DAYS.forEach((d) => {
      const periods: Array<{ open: any; close: any }> = formValues[`day_${d.key}`] || [];
      const valid = periods
        .filter((p) => p.open && p.close)
        .map((p) => ({
          open: typeof p.open === 'string' ? p.open : p.open.format('HH:mm'),
          close: typeof p.close === 'string' ? p.close : p.close.format('HH:mm'),
        }));
      result[d.key] = valid.length > 0 ? valid : null;
    });
    return JSON.stringify(result);
  };

  const openLocationModal = (location?: ClinicLocation) => {
    if (location) {
      setEditingLocation(location);
      const hours = parseWorkingHours(location.workingHours);
      const formValues: any = {
        name: location.name,
        address: location.address,
        city: location.city,
        phone: location.phone,
        email: location.email,
        active: location.active,
      };
      DAYS.forEach((d) => {
        formValues[`day_${d.key}`] = hours[d.key].map((p) => ({
          open: dayjs(p.open, 'HH:mm'),
          close: dayjs(p.close, 'HH:mm'),
        }));
      });
      locationForm.setFieldsValue(formValues);
    } else {
      setEditingLocation(null);
      const formValues: any = { active: true };
      const defaults = parseWorkingHours(null);
      DAYS.forEach((d) => {
        formValues[`day_${d.key}`] = defaults[d.key].map((p) => ({
          open: dayjs(p.open, 'HH:mm'),
          close: dayjs(p.close, 'HH:mm'),
        }));
      });
      locationForm.setFieldsValue(formValues);
    }
    setLocationModalOpen(true);
  };

  const handleLocationSubmit = () => {
    locationForm.validateFields().then((values) => {
      // Ručno dohvati dane jer nemaju Form.Item name
      const allValues = locationForm.getFieldsValue(true);
      const workingHours = buildWorkingHoursJson(allValues);
      const payload = {
        name: values.name,
        address: values.address || undefined,
        city: values.city || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        active: values.active ?? true,
        workingHours,
      };
      if (editingLocation) {
        updateLocationMutation.mutate({ id: editingLocation.id, data: payload });
      } else {
        createLocationMutation.mutate(payload);
      }
    });
  };

  const handleLogoUpload = (file: File) => {
    // Validacija na frontendu (backend takođe validira)
    if (!file.type.startsWith('image/')) {
      message.error('Logo mora biti slika');
      return false;
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error('Logo ne sme biti veći od 2MB');
      return false;
    }
    uploadLogoMutation.mutate(file);
    return false; // sprečava default upload ponašanje Ant Design-a
  };

  const handleSubmit = (values: any) => {
    const payload: UpdateClinicRequest = {
      name: values.name,
      email: values.email || undefined,
      phone: values.phone || undefined,
      address: values.address || undefined,
      city: values.city || undefined,
      country: values.country || undefined,
      taxId: values.taxId || undefined,
      registrationNumber: values.registrationNumber || undefined,
      activityCode: values.activityCode || undefined,
      bankAccount: values.bankAccount || undefined,
      vatPayer: values.vatPayer ?? false,
      veterinaryLicenseNumber: values.veterinaryLicenseNumber || undefined,
    };
    updateMutation.mutate(payload);
  };

  if (isLoading) return <Spin size='large' style={{ display: 'block', margin: '100px auto' }} />;

  const planColors: Record<string, string> = {
    BASIC: 'default',
    STANDARD: 'blue',
    PREMIUM: 'gold',
  };

  return (
    <div>
      <h2>Podešavanja klinike</h2>

      <Card style={{ marginBottom: 24 }}>
        <Descriptions title='Informacije o pretplati' bordered column={1}>
          <Descriptions.Item label='Plan pretplate'>
            <Tag color={planColors[clinic?.subscriptionPlan || 'BASIC']}>
              {clinic?.subscriptionPlan || 'BASIC'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label='Datum isteka'>
            {clinic?.subscriptionExpiresAt
              ? new Date(clinic.subscriptionExpiresAt).toLocaleDateString('sr-Latn-RS')
              : 'Neograničeno'}
          </Descriptions.Item>
          <Descriptions.Item label='Status'>
            <Tag color={clinic?.active ? 'green' : 'red'}>
              {clinic?.active ? 'Aktivna' : 'Neaktivna'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title='Logo klinike' style={{ marginBottom: 24 }}>
        <Space direction='vertical' size='middle' style={{ width: '100%' }}>
          {logoPreviewUrl ? (
            <div
              style={{
                padding: 16,
                background: '#f5f5f5',
                borderRadius: 8,
                textAlign: 'center',
                maxWidth: 400,
              }}
            >
              <Image
                src={logoPreviewUrl}
                alt='Logo klinike'
                style={{ maxHeight: 100, maxWidth: 350 }}
                preview={false}
              />
            </div>
          ) : (
            <div
              style={{
                padding: 24,
                background: '#fafafa',
                border: '1px dashed #d9d9d9',
                borderRadius: 8,
                textAlign: 'center',
                color: '#999',
                maxWidth: 400,
              }}
            >
              Logo nije postavljen
            </div>
          )}

          <Space>
            <Upload
              accept='image/png,image/jpeg,image/gif,image/webp'
              beforeUpload={handleLogoUpload}
              showUploadList={false}
            >
              <Button icon={<UploadOutlined />} loading={uploadLogoMutation.isPending}>
                {logoPreviewUrl ? 'Promeni logo' : 'Postavi logo'}
              </Button>
            </Upload>

            {logoPreviewUrl && (
              <Popconfirm
                title='Ukloniti logo?'
                description='Logo će biti uklonjen sa svih dokumenata'
                onConfirm={() => deleteLogoMutation.mutate()}
                okText='Ukloni'
                cancelText='Otkaži'
              >
                <Button danger icon={<DeleteOutlined />} loading={deleteLogoMutation.isPending}>
                  Ukloni logo
                </Button>
              </Popconfirm>
            )}
          </Space>

          <div style={{ fontSize: 12, color: '#999' }}>
            Preporučeno: horizontalni logo u PNG formatu, max 2MB. Logo će se pojaviti u zaglavlju
            svih PDF dokumenata (recepti, fakture, kartoni, vakcinacioni list).
          </div>
        </Space>
      </Card>

      <Card title='Podaci o klinici'>
        <Form
          form={form}
          layout='vertical'
          onFinish={handleSubmit}
          initialValues={{
            name: clinic?.name || '',
            email: clinic?.email || '',
            phone: clinic?.phone || '',
            address: clinic?.address || '',
            city: clinic?.city || '',
            country: clinic?.country || '',
            taxId: clinic?.taxId || '',
            registrationNumber: clinic?.registrationNumber || '',
            activityCode: clinic?.activityCode || '',
            bankAccount: clinic?.bankAccount || '',
            vatPayer: clinic?.vatPayer ?? false,
            veterinaryLicenseNumber: clinic?.veterinaryLicenseNumber || '',
          }}
        >
          <Form.Item
            name='name'
            label='Naziv klinike'
            rules={[{ required: true, message: 'Naziv je obavezan' }]}
          >
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='email' label='Email'>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='phone' label='Telefon'>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name='address' label='Adresa'>
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='city' label='Grad'>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='country' label='Država'>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name='phoneCountryCode'
                label='Pozivni broj države'
                rules={[{ required: true, message: 'Unesite pozivni broj!' }]}
              >
                <Input placeholder='+381' />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='taxId' label='PIB'>
                <Input placeholder='npr. 123456789' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='registrationNumber' label='Matični broj'>
                <Input placeholder='npr. 12345678' />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='activityCode' label='Šifra delatnosti'>
                <Input placeholder='npr. 7500' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='veterinaryLicenseNumber' label='Broj veterinarske licence'>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name='bankAccount' label='Tekući račun'>
            <Input placeholder='npr. 160-0000000000000-00' />
          </Form.Item>

          <Form.Item name='vatPayer' label='Obveznik PDV-a' valuePropName='checked'>
            <Switch />
          </Form.Item>

          <Form.Item>
            <Button type='primary' htmlType='submit' loading={updateMutation.isPending}>
              Sačuvaj izmene
            </Button>
          </Form.Item>
        </Form>
      </Card>
      <Card
        title='Lokacije i radno vreme'
        style={{ marginTop: 24 }}
        loading={locationsLoading}
        extra={
          <Button type='primary' icon={<PlusOutlined />} onClick={() => openLocationModal()}>
            Nova lokacija
          </Button>
        }
      >
        <Table
          dataSource={locationsData || []}
          rowKey='id'
          pagination={false}
          columns={[
            {
              title: 'Naziv',
              dataIndex: 'name',
              width: 180,
            },
            {
              title: 'Adresa',
              dataIndex: 'address',
              render: (addr: string, record: ClinicLocation) =>
                [addr, record.city].filter(Boolean).join(', ') || '—',
            },
            {
              title: 'Radno vreme',
              dataIndex: 'workingHours',
              render: (wh: string | null) => {
                if (!wh) return <Tag color='red'>Nije podešeno</Tag>;
                try {
                  const parsed = JSON.parse(wh);
                  const activeDays = DAYS.filter((d) => parsed[d.key]?.open);
                  if (activeDays.length === 0) return <Tag color='red'>Zatvoreno</Tag>;
                  const first = parsed[activeDays[0].key];
                  const allSame = activeDays.every(
                    (d) =>
                      parsed[d.key]?.open === first.open && parsed[d.key]?.close === first.close,
                  );
                  if (allSame) {
                    return (
                      <span>
                        {activeDays.length === 7 ? 'Svaki dan' : `${activeDays.length} dana`}{' '}
                        {first.open}–{first.close}
                      </span>
                    );
                  }
                  return <span>{activeDays.length} dana (različito vreme)</span>;
                } catch {
                  return <Tag color='red'>Greška</Tag>;
                }
              },
            },
            {
              title: 'Status',
              dataIndex: 'active',
              width: 100,
              render: (active: boolean) => (
                <Tag color={active ? 'green' : 'default'}>{active ? 'Aktivna' : 'Neaktivna'}</Tag>
              ),
            },
            {
              title: '',
              width: 60,
              render: (_: unknown, record: ClinicLocation) => (
                <Button
                  type='text'
                  icon={<EditOutlined />}
                  onClick={() => openLocationModal(record)}
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editingLocation ? 'Izmeni lokaciju' : 'Nova lokacija'}
        open={locationModalOpen}
        onCancel={() => {
          setLocationModalOpen(false);
          setEditingLocation(null);
          locationForm.resetFields();
        }}
        onOk={handleLocationSubmit}
        okText='Sačuvaj'
        cancelText='Otkaži'
        confirmLoading={createLocationMutation.isPending || updateLocationMutation.isPending}
        width={600}
      >
        <Form form={locationForm} layout='vertical'>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name='name'
                label='Naziv'
                rules={[{ required: true, message: 'Unesite naziv' }]}
              >
                <Input placeholder='Npr. Centrala - Vračar' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='phone' label='Telefon'>
                <Input placeholder='+381...' />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='address' label='Adresa'>
                <Input placeholder='Ulica i broj' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='city' label='Grad'>
                <Input placeholder='Beograd' />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='email' label='Email'>
                <Input placeholder='lokacija@klinika.rs' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='active' label='Aktivna' valuePropName='checked'>
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Radno vreme</Divider>

          {DAYS.map((day) => (
            <Form.Item key={day.key} noStyle shouldUpdate>
              {() => {
                const periods: Array<{ open: any; close: any }> =
                  locationForm.getFieldValue(`day_${day.key}`) || [];
                return (
                  <div style={{ marginBottom: 12 }}>
                    <Row align='middle' style={{ marginBottom: 4 }}>
                      <Col span={6}>
                        <span style={{ fontWeight: periods.length > 0 ? 600 : 400 }}>
                          {day.label}
                        </span>
                      </Col>
                      <Col span={18}>
                        {periods.length === 0 && <Tag color='default'>Zatvoreno</Tag>}
                        <Button
                          type='dashed'
                          size='small'
                          icon={<PlusOutlined />}
                          onClick={() => {
                            const updated = [
                              ...periods,
                              { open: dayjs('08:00', 'HH:mm'), close: dayjs('16:00', 'HH:mm') },
                            ];
                            locationForm.setFieldValue(`day_${day.key}`, updated);
                          }}
                        >
                          Dodaj period
                        </Button>
                      </Col>
                    </Row>
                    {periods.map((period, idx) => (
                      <Row
                        key={idx}
                        gutter={8}
                        align='middle'
                        style={{ marginBottom: 4, marginLeft: 8 }}
                      >
                        <Col span={5} />
                        <Col span={7}>
                          <TimePicker
                            value={period.open}
                            format='HH:mm'
                            minuteStep={15}
                            placeholder='Od'
                            style={{ width: '100%' }}
                            onChange={(val) => {
                              const updated = [...periods];
                              updated[idx] = { ...updated[idx], open: val };
                              locationForm.setFieldValue(`day_${day.key}`, updated);
                            }}
                          />
                        </Col>
                        <Col span={1} style={{ textAlign: 'center' }}>
                          –
                        </Col>
                        <Col span={7}>
                          <TimePicker
                            value={period.close}
                            format='HH:mm'
                            minuteStep={15}
                            placeholder='Do'
                            style={{ width: '100%' }}
                            onChange={(val) => {
                              const updated = [...periods];
                              updated[idx] = { ...updated[idx], close: val };
                              locationForm.setFieldValue(`day_${day.key}`, updated);
                            }}
                          />
                        </Col>
                        <Col span={3}>
                          <Button
                            type='text'
                            danger
                            size='small'
                            onClick={() => {
                              const updated = periods.filter((_, i) => i !== idx);
                              locationForm.setFieldValue(`day_${day.key}`, updated);
                            }}
                          >
                            ✕
                          </Button>
                        </Col>
                      </Row>
                    ))}
                  </div>
                );
              }}
            </Form.Item>
          ))}
        </Form>
      </Modal>
      <Card title='Online zakazivanje termina' style={{ marginTop: 24 }} loading={bookingLoading}>
        <Form
          form={bookingForm}
          layout='vertical'
          onFinish={handleBookingSubmit}
          initialValues={{
            enabled: false,
            slotDurationMinutes: 30,
            bufferMinutes: 0,
            maxAdvanceDays: 30,
            allowedTypes: ['CHECKUP', 'VACCINATION'],
            autoConfirm: false,
            allowVetSelection: false,
            cancellationHours: 24,
            timezone: 'Europe/Belgrade',
          }}
        >
          <Form.Item
            name='enabled'
            label='Omogući online zakazivanje'
            valuePropName='checked'
            extra='Kada je uključeno, vlasnici mogu zakazivati termine preko javne stranice'
          >
            <Switch />
          </Form.Item>

          {bookingSettings?.enabled && (
            <div
              style={{
                padding: '16px',
                background: '#e6f7ff',
                border: '1px solid #91d5ff',
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <Row gutter={24} align='middle'>
                <Col flex='auto'>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Javni link za zakazivanje:</div>
                  <code
                    style={{
                      fontSize: 13,
                      wordBreak: 'break-all',
                      display: 'block',
                      marginBottom: 8,
                    }}
                  >
                    {bookingUrl}
                  </code>
                  <Space>
                    <Button
                      size='small'
                      onClick={() => {
                        navigator.clipboard.writeText(bookingUrl);
                        message.success('Link kopiran');
                      }}
                    >
                      Kopiraj link
                    </Button>
                    <Button
                      size='small'
                      onClick={() => {
                        const canvas = document.getElementById('booking-qr') as HTMLCanvasElement;
                        if (canvas) {
                          const url = canvas.toDataURL('image/png');
                          const link = document.createElement('a');
                          link.download = 'vetclinic-booking-qr.png';
                          link.href = url;
                          link.click();
                        }
                      }}
                    >
                      Preuzmi QR kod
                    </Button>
                  </Space>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
                    Odštampajte QR kod i okačite u čekaonici — vlasnici mogu skenirati telefonom i
                    zakazati termin.
                  </div>
                </Col>
                <Col flex='none'>
                  <div
                    style={{
                      background: '#fff',
                      padding: 12,
                      borderRadius: 8,
                      textAlign: 'center',
                    }}
                  >
                    <QRCodeCanvas
                      id='booking-qr'
                      value={bookingUrl}
                      size={140}
                      level='M'
                      includeMargin={false}
                    />
                  </div>
                </Col>
              </Row>
            </div>
          )}

          <Divider />

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name='slotDurationMinutes'
                label='Dužina slota (minuti)'
                rules={[{ required: true, type: 'number', min: 10, max: 240 }]}
                extra='Koliko traje jedan termin'
              >
                <InputNumber min={10} max={240} step={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name='bufferMinutes'
                label='Pauza između termina (minuti)'
                rules={[{ required: true, type: 'number', min: 0, max: 60 }]}
              >
                <InputNumber min={0} max={60} step={5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name='maxAdvanceDays'
                label='Maksimalno dana unapred'
                rules={[{ required: true, type: 'number', min: 1, max: 365 }]}
                extra='Koliko dana unapred vlasnik može zakazati'
              >
                <InputNumber min={1} max={365} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name='cancellationHours'
                label='Minimalno sati pre otkazivanja'
                rules={[{ required: true, type: 'number', min: 0, max: 168 }]}
              >
                <InputNumber min={0} max={168} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name='timezone'
            label='Vremenska zona'
            rules={[{ required: true }]}
            extra='Zona u kojoj klinika radi'
          >
            <Select
              options={[
                { value: 'Europe/Belgrade', label: 'Europe/Belgrade (Beograd)' },
                { value: 'Europe/Zagreb', label: 'Europe/Zagreb (Zagreb)' },
                { value: 'Europe/Sarajevo', label: 'Europe/Sarajevo (Sarajevo)' },
                { value: 'Europe/Ljubljana', label: 'Europe/Ljubljana (Ljubljana)' },
                { value: 'Europe/Skopje', label: 'Europe/Skopje (Skopje)' },
                { value: 'Europe/Podgorica', label: 'Europe/Podgorica (Podgorica)' },
                { value: 'Europe/Vienna', label: 'Europe/Vienna (Beč)' },
                { value: 'Europe/Berlin', label: 'Europe/Berlin (Berlin)' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name='allowedTypes'
            label='Dozvoljeni tipovi termina'
            rules={[{ required: true, message: 'Izaberite barem jedan tip' }]}
            extra='Koji tipovi termina mogu se zakazivati online'
          >
            <Checkbox.Group>
              <Row>
                <Col span={12}>
                  <Checkbox value='CHECKUP'>Pregled</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value='VACCINATION'>Vakcinacija</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value='FOLLOW_UP'>Kontrola</Checkbox>
                </Col>
                <Col span={12}>
                  <Checkbox value='GROOMING'>Šišanje</Checkbox>
                </Col>
              </Row>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item
            name='allowVetSelection'
            label='Dozvoli izbor veterinara'
            valuePropName='checked'
            extra='Vlasnik može izabrati preferiranog veterinara'
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name='autoConfirm'
            label='Automatsko potvrđivanje'
            valuePropName='checked'
            extra='Termini se automatski potvrđuju bez pregleda klinike (ne preporučuje se)'
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Button type='primary' htmlType='submit' loading={updateBookingMutation.isPending}>
              Sačuvaj podešavanja
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ClinicSettingsPage;
