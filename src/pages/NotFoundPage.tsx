import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Result
      status='404'
      title='404'
      subTitle='Stranica koju tražite ne postoji.'
      extra={
        <Button type='primary' onClick={() => navigate('/')}>
          Nazad na početnu
        </Button>
      }
    />
  );
};

export default NotFoundPage;
