import { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  message,
  Tooltip,
  AutoComplete,
  Divider,
} from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryItemsApi, taxRatesApi, productsApi } from '../../api';
import { clinicLocationsApi } from '../../api/clinic-locations';
import type { InventoryItem, Product } from '../../types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { invalidateAndBroadcast } from '@/lib/queryBroadcast';

interface Props {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
}

export default function InventoryItemModal({ open, item, onClose }: Props) {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const isEditing = !!item;

  // --- Product picker (samo u create modu) ---
  const [productInput, setProductInput] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const debouncedProductSearch = useDebouncedValue(productSearch, 300);
  const [pickedProduct, setPickedProduct] = useState<Product | null>(null);

  const { data: locations } = useQuery({
    queryKey: ['clinic-locations'],
    queryFn: () => clinicLocationsApi.getActive().then((r) => r.data),
  });

  const { data: taxRates } = useQuery({
    queryKey: ['tax-rates', 'RS'],
    queryFn: () => taxRatesApi.getAll('RS'),
  });

  const { data: productSearchData } = useQuery({
    queryKey: ['products-search', debouncedProductSearch],
    queryFn: () =>
      productsApi.getAll(0, 20, debouncedProductSearch || undefined).then((r) => r.data),
    enabled: !isEditing && open,
  });

  const productOptions = (productSearchData?.content ?? []).map((p) => ({
    key: p.id,
    value: p.name,
    label: `${p.sku ? p.sku + ' — ' : ''}${p.name}${p.unit ? ' (' + p.unit + ')' : ''}`,
    product: p,
  }));

  // Korisnik kuca → tretira se kao NOV proizvod (skida izabrani)
  const handleProductSearch = (text: string) => {
    setProductSearch(text);
    if (pickedProduct) {
      setPickedProduct(null);
      form.setFieldsValue({
        sku: undefined,
        category: 'MEDICATION',
        unit: undefined,
        trackBatches: false,
      });
    }
  };

  // Korisnik izabrao postojeći proizvod → popuni i zaključaj gornju sekciju
  const handleProductSelect = (_value: string, option: { product?: Product }) => {
    const p = option.product;
    if (!p) return;
    setPickedProduct(p);
    setProductInput(p.name);
    form.setFieldsValue({
      sku: p.sku,
      category: p.category,
      unit: p.unit,
      trackBatches: p.trackBatches,
    });
  };

  const createMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async (values: any) => {
      let productId = pickedProduct?.id ?? null;
      if (!productId) {
        // Scenario B: nov proizvod → prvo Product, pa InventoryItem
        const created = await productsApi.create({
          name: (productInput ?? '').trim(),
          sku: values.sku || undefined,
          category: values.category,
          unit: values.unit || undefined,
          trackBatches: values.trackBatches ?? false,
          active: true,
        });
        productId = created.data.id;
      }
      const tracks = pickedProduct ? pickedProduct.trackBatches : !!values.trackBatches;
      return inventoryItemsApi.create({
        productId,
        locationId: values.locationId ?? null,
        reorderLevel: values.reorderLevel,
        sellPrice: values.sellPrice,
        active: values.active ?? true,
        initialQuantity: tracks ? undefined : values.initialQuantity,
        taxRateId: values.taxRateId,
      });
    },
    onSuccess: () => {
      message.success('Artikal kreiran');
      invalidateAndBroadcast(queryClient, [
        ['inventory-items'],
        ['billable-items'],
        ['dashboard-low-stock'],
        ['products-search'],
      ]);
      onClose();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) =>
      message.error(err?.response?.data?.message ?? 'Greška pri kreiranju artikla'),
  });

  const updateMutation = useMutation({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mutationFn: async (values: any) => {
      // Gornja sekcija → Product; donja → InventoryItem (per-lokacija)
      await productsApi.update(item!.productId, {
        name: values.name,
        sku: values.sku || undefined,
        category: values.category,
        unit: values.unit || undefined,
        trackBatches: values.trackBatches,
      });
      return inventoryItemsApi.update(item!.id, {
        locationId: values.locationId ?? null,
        reorderLevel: values.reorderLevel,
        sellPrice: values.sellPrice,
        active: values.active,
        taxRateId: values.taxRateId,
      });
    },
    onSuccess: () => {
      message.success('Artikal ažuriran');
      invalidateAndBroadcast(queryClient, [
        ['inventory-items'],
        ['inventory-item'],
        ['billable-items'],
        ['dashboard-low-stock'],
        ['products-search'],
      ]);
      onClose();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) =>
      message.error(err?.response?.data?.message ?? 'Greška pri izmeni artikla'),
  });

  useEffect(() => {
    if (!open) return;
    setPickedProduct(null);
    if (item) {
      setProductInput(item.name);
      form.setFieldsValue({
        name: item.name,
        sku: item.sku,
        category: item.category,
        unit: item.unit,
        trackBatches: item.trackBatches,
        reorderLevel: item.reorderLevel,
        sellPrice: item.sellPrice,
        taxRateId: item.taxRateId,
        locationId: item.locationId,
        active: item.active,
      });
    } else {
      setProductInput('');
      setProductSearch('');
      form.resetFields();
    }
  }, [open, item, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (isEditing) {
        updateMutation.mutate(values);
      } else {
        if (!pickedProduct && !(productInput ?? '').trim()) {
          message.error('Unesite ili izaberite proizvod');
          return;
        }
        createMutation.mutate(values);
      }
    });
  };

  // gornja (product) polja zaključana samo u create modu kad je izabran postojeći proizvod
  const lockProductFields = !isEditing && !!pickedProduct;

  return (
    <Modal
      title={isEditing ? 'Izmena artikla' : 'Novi artikal'}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      width={600}
      destroyOnHidden
    >
      <Form
        form={form}
        layout='vertical'
        initialValues={{
          active: true,
          category: 'MEDICATION',
          initialQuantity: 0,
          reorderLevel: 0,
          trackBatches: false,
        }}
      >
        <Divider titlePlacement='left' style={{ marginTop: 0 }}>
          Proizvod (šifarnik)
        </Divider>

        {isEditing ? (
          <Form.Item
            name='name'
            label='Naziv'
            rules={[{ required: true, message: 'Unesite naziv' }]}
          >
            <Input />
          </Form.Item>
        ) : (
          <Form.Item
            label='Naziv proizvoda'
            required
            tooltip='Ukucajte za pretragu postojećih ili unesite nov proizvod.'
          >
            <AutoComplete
              value={productInput}
              options={productOptions}
              onSearch={handleProductSearch}
              onSelect={handleProductSelect}
              onChange={(val) => setProductInput(val)}
              filterOption={false}
              placeholder='Naziv proizvoda (pretraga ili nov)'
              notFoundContent={
                productSearch.trim() ? 'Nema rezultata — biće kreiran nov proizvod' : null
              }
              allowClear
            />
          </Form.Item>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name='sku' label='SKU'>
            <Input disabled={lockProductFields} />
          </Form.Item>

          <Form.Item
            name='category'
            label='Kategorija'
            rules={[{ required: true, message: 'Izaberite kategoriju' }]}
          >
            <Select disabled={lockProductFields}>
              <Select.Option value='MEDICATION'>Lek</Select.Option>
              <Select.Option value='SUPPLY'>Potrošni materijal</Select.Option>
              <Select.Option value='EQUIPMENT'>Oprema</Select.Option>
            </Select>
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name='unit' label='Jedinica mere'>
            <Input placeholder='kom, ml, g...' disabled={lockProductFields} />
          </Form.Item>

          <Form.Item
            name='trackBatches'
            label='Prati po lotovima (FIFO)'
            valuePropName='checked'
            tooltip={
              isEditing || lockProductFields
                ? undefined
                : 'Lotovi se troše po roku trajanja — prvo se troše oni koji najpre ističu.'
            }
          >
            {isEditing || lockProductFields ? (
              <Tooltip
                title={
                  isEditing
                    ? 'Način praćenja se ne može menjati posle kreiranja proizvoda'
                    : 'Način praćenja je definisan na proizvodu'
                }
              >
                <span style={{ display: 'inline-block', cursor: 'not-allowed' }}>
                  <Switch disabled />
                </span>
              </Tooltip>
            ) : (
              <Switch />
            )}
          </Form.Item>
        </div>

        <Divider titlePlacement='left'>Konfiguracija za lokaciju</Divider>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name='sellPrice' label='Prodajna cena'>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>

          <Form.Item
            name='taxRateId'
            label='PDV stopa'
            rules={[{ required: true, message: 'Izaberite PDV stopu' }]}
            tooltip='Stopa se koristi pri prodaji artikla (Quick Sale ili faktura). Za PDV obveznika default je Ђ (20%), za neobveznika А (0%).'
          >
            <Select
              placeholder='Izaberi stopu'
              options={(taxRates ?? []).map((tr) => ({
                value: tr.id,
                label: `${tr.label} — ${tr.percent}%`,
              }))}
            />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Form.Item name='reorderLevel' label='Min. nivo za narudžbu'>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>

          <Form.Item name='locationId' label='Lokacija'>
            <Select allowClear placeholder='Izaberite lokaciju'>
              {locations?.map((loc) => (
                <Select.Option key={loc.id} value={loc.id}>
                  {loc.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        <Form.Item name='active' label='Aktivan' valuePropName='checked'>
          <Switch />
        </Form.Item>

        {/* Početno stanje samo na kreiranju i za ne-batch artikle */}
        <Form.Item shouldUpdate={(prev, curr) => prev.trackBatches !== curr.trackBatches} noStyle>
          {({ getFieldValue }) => {
            if (isEditing) return null;
            const tracks = pickedProduct
              ? pickedProduct.trackBatches
              : getFieldValue('trackBatches');
            if (tracks) {
              return (
                <div
                  style={{
                    background: '#fffbe6',
                    border: '1px solid #ffe58f',
                    padding: 8,
                    borderRadius: 4,
                    fontSize: 12,
                    color: '#874d00',
                  }}
                >
                  Količina na stanju se računa kao zbir svih lotova. Početno stanje se unosi kroz
                  tab „Lotovi" na detaljnoj stranici artikla.
                </div>
              );
            }
            return (
              <Form.Item
                name='initialQuantity'
                label='Početno stanje'
                tooltip='Kreira IN transakciju sa razlogom „Otvaranje kartice".'
              >
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            );
          }}
        </Form.Item>
      </Form>
    </Modal>
  );
}
