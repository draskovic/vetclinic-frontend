import { useState } from 'react';
import { Card, Form, Input, Button, message, Tabs, Descriptions, Tag } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api';

const ProfilePage = () => {
  const queryClient = useQueryClient();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const res = await usersApi.getMe();
      return res.data;
    },
  });

  // Popuni formu kad se podaci učitaju
  useState(() => {
    if (currentUser) {
      profileForm.setFieldsValue({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        phone: currentUser.phone || '',
        licenseNumber: currentUser.licenseNumber || '',
        specialization: currentUser.specialization || '',
      });
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: usersApi.updateProfile,
    onSuccess: () => {
      message.success('Profil uspešno ažuriran');
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onError: () => {
      message.error('Greška pri ažuriranju profila');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: usersApi.changePassword,
    onSuccess: () => {
      message.success('Lozinka uspešno promenjena');
      passwordForm.resetFields();
    },
    onError: () => {
      message.error('Greška pri promeni lozinke. Proverite trenutnu lozinku.');
    },
  });

  const handleProfileSubmit = (values: any) => {
    updateProfileMutation.mutate(values);
  };

  const handlePasswordSubmit = (values: any) => {
    changePasswordMutation.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
  };

  if (isLoading) return null;

  const profileTab = (
    <Card>
      <Descriptions title='Informacije o nalogu' bordered column={1} style={{ marginBottom: 24 }}>
        <Descriptions.Item label='Email'>{currentUser?.email}</Descriptions.Item>
        <Descriptions.Item label='Uloga'>
          <Tag color='blue'>{currentUser?.roleName}</Tag>
        </Descriptions.Item>
      </Descriptions>

      <Form
        form={profileForm}
        layout='vertical'
        onFinish={handleProfileSubmit}
        initialValues={{
          firstName: currentUser?.firstName || '',
          lastName: currentUser?.lastName || '',
          phone: currentUser?.phone || '',
          licenseNumber: currentUser?.licenseNumber || '',
          specialization: currentUser?.specialization || '',
        }}
      >
        <Form.Item
          name='firstName'
          label='Ime'
          rules={[{ required: true, message: 'Ime je obavezno' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name='lastName'
          label='Prezime'
          rules={[{ required: true, message: 'Prezime je obavezno' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item name='phone' label='Telefon'>
          <Input />
        </Form.Item>
        <Form.Item name='licenseNumber' label='Broj licence'>
          <Input />
        </Form.Item>
        <Form.Item name='specialization' label='Specijalizacija'>
          <Input />
        </Form.Item>
        <Form.Item>
          <Button type='primary' htmlType='submit' loading={updateProfileMutation.isPending}>
            Sačuvaj izmene
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );

  const passwordTab = (
    <Card>
      <Form form={passwordForm} layout='vertical' onFinish={handlePasswordSubmit}>
        <Form.Item
          name='currentPassword'
          label='Trenutna lozinka'
          rules={[{ required: true, message: 'Unesite trenutnu lozinku' }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name='newPassword'
          label='Nova lozinka'
          rules={[
            { required: true, message: 'Unesite novu lozinku' },
            { min: 6, message: 'Lozinka mora imati najmanje 6 karaktera' },
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name='confirmPassword'
          label='Potvrda nove lozinke'
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Potvrdite novu lozinku' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Lozinke se ne poklapaju'));
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item>
          <Button type='primary' htmlType='submit' loading={changePasswordMutation.isPending}>
            Promeni lozinku
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );

  return (
    <div>
      <h2>Moj profil</h2>
      <Tabs
        defaultActiveKey='profile'
        items={[
          { key: 'profile', label: 'Lični podaci', icon: <UserOutlined />, children: profileTab },
          {
            key: 'password',
            label: 'Promena lozinke',
            icon: <LockOutlined />,
            children: passwordTab,
          },
        ]}
      />
    </div>
  );
};

export default ProfilePage;
