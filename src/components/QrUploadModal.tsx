import { useState } from 'react';
import { Modal, Button, Spin, Typography, Space, message, Alert } from 'antd';
import { QRCodeSVG } from 'qrcode.react';
import { ReloadOutlined, QrcodeOutlined } from '@ant-design/icons';
import { documentsApi } from '../api/documents';

const { Text, Title } = Typography;

interface QrUploadModalProps {
  open: boolean;
  onClose: () => void;
  petId: string;
  petName: string;
}

const QrUploadModal: React.FC<QrUploadModalProps> = ({ open, onClose, petId, petName }) => {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await documentsApi.generateUploadToken(petId);
      setToken(response.data.token);
    } catch (err) {
      setError('Greška pri generisanju QR koda. Pokušajte ponovo.');
      message.error('Greška pri generisanju QR koda');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    if (!token) {
      generateToken();
    }
  };

  const handleClose = () => {
    setToken(null);
    setError(null);
    onClose();
  };

  const uploadUrl = token ? `${window.location.origin}/quick-upload?token=${token}` : '';

  return (
    <Modal
      title={
        <Space>
          <QrcodeOutlined />
          <span>Upload sa telefona — {petName}</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      afterOpenChange={(visible) => {
        if (visible) handleOpen();
      }}
      footer={[
        <Button
          key='regenerate'
          icon={<ReloadOutlined />}
          onClick={generateToken}
          loading={loading}
        >
          Generiši novi kod
        </Button>,
        <Button key='close' type='primary' onClick={handleClose}>
          Zatvori
        </Button>,
      ]}
      width={420}
      centered
    >
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        {loading && <Spin size='large' tip='Generišem QR kod...' />}

        {error && <Alert message={error} type='error' showIcon style={{ marginBottom: 16 }} />}

        {token && !loading && (
          <>
            <div
              style={{
                background: '#fff',
                padding: 24,
                borderRadius: 12,
                display: 'inline-block',
                marginBottom: 16,
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <QRCodeSVG value={uploadUrl} size={240} level='M' includeMargin />
            </div>

            <Title level={5} style={{ marginBottom: 4 }}>
              Skenirajte QR kod telefonom
            </Title>
            <Text type='secondary'>
              Otvorite kameru telefona i uperite je u QR kod.
              <br />
              Token važi 30 minuta.
            </Text>
          </>
        )}
      </div>
    </Modal>
  );
};

export default QrUploadModal;
