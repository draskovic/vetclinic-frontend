import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { publicDocumentsApi } from '../../api/documents';

const QuickUploadPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [petName, setPetName] = useState<string>('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'expired' | 'error'>('loading');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    publicDocumentsApi
      .getTokenInfo(token)
      .then((res) => {
        setPetName(res.data.petName);
        setStatus('ready');
      })
      .catch(() => {
        setStatus('expired');
      });
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setLastMessage(null);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !token) return;
    setUploading(true);
    setLastMessage(null);
    try {
      await publicDocumentsApi.upload(token, selectedFile, description || undefined);
      setUploadCount((c) => c + 1);
      setLastMessage('✓ Dokument uspešno uploadovan!');
      setSelectedFile(null);
      setPreview(null);
      setDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      setLastMessage('✗ Greška pri uploadu. Pokušajte ponovo.');
    } finally {
      setUploading(false);
    }
  };

  // ---- STYLES (inline za jednostavnost, bez eksternog CSS-a) ----
  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#f0f2f5',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 16,
    padding: '24px 20px',
    maxWidth: 420,
    width: '100%',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  };

  const btnPrimary: React.CSSProperties = {
    width: '100%',
    height: 56,
    fontSize: 18,
    fontWeight: 600,
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    color: '#fff',
    background: '#1677ff',
  };

  const btnCamera: React.CSSProperties = {
    ...btnPrimary,
    background: '#52c41a',
    marginBottom: 12,
  };

  // ---- RENDER ----

  if (status === 'loading') {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <p style={{ textAlign: 'center', fontSize: 16, color: '#666' }}>Učitavanje...</p>
        </div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ textAlign: 'center', color: '#ff4d4f' }}>⏰ Token istekao</h2>
          <p style={{ textAlign: 'center', color: '#666' }}>
            Ovaj link više nije validan. Zatražite novi QR kod na računaru.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ textAlign: 'center', color: '#ff4d4f' }}>❌ Greška</h2>
          <p style={{ textAlign: 'center', color: '#666' }}>
            Nevažeći link. Skenirajte QR kod ponovo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: '#1677ff' }}>📷 Upload dokumenta</h2>
          <p style={{ margin: '8px 0 0', fontSize: 16, color: '#333' }}>
            Pacijent: <strong>{petName}</strong>
          </p>
          {uploadCount > 0 && (
            <p style={{ margin: '4px 0 0', fontSize: 14, color: '#52c41a' }}>
              Uploadovano dokumenata: {uploadCount}
            </p>
          )}
        </div>

        {/* Poruka */}
        {lastMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 16,
              background: lastMessage.startsWith('✓') ? '#f6ffed' : '#fff2f0',
              color: lastMessage.startsWith('✓') ? '#52c41a' : '#ff4d4f',
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            {lastMessage}
          </div>
        )}

        {/* Fotografisanje */}
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*,.pdf'
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button
          style={btnCamera}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          📸 Fotografiši dokument
        </button>

        {/* Preview */}
        {preview && (
          <div style={{ marginBottom: 16 }}>
            <img
              src={preview}
              alt='Preview'
              style={{
                width: '100%',
                borderRadius: 8,
                border: '1px solid #d9d9d9',
              }}
            />
          </div>
        )}

        {/* Opis (opciono) */}
        {selectedFile && (
          <>
            <input
              type='text'
              placeholder='Opis dokumenta (opciono)'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                height: 44,
                fontSize: 16,
                padding: '0 12px',
                borderRadius: 8,
                border: '1px solid #d9d9d9',
                marginBottom: 12,
                boxSizing: 'border-box',
              }}
            />
            <button
              style={{
                ...btnPrimary,
                opacity: uploading ? 0.6 : 1,
              }}
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? 'Uploadujem...' : '⬆️ Upload'}
            </button>
          </>
        )}
      </div>

      {/* Footer */}
      <p style={{ marginTop: 24, fontSize: 12, color: '#999', textAlign: 'center' }}>
        VetClinic • Link važi 30 minuta
      </p>
    </div>
  );
};

export default QuickUploadPage;
