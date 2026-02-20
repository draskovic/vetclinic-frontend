import { useState } from 'react';
import { Badge, Button, Dropdown, List, Typography, Space, Empty } from 'antd';
import { BellOutlined, CheckOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../api/notifications';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => getUnreadCount().then((res) => res.data),
    refetchInterval: 30000, // svakih 30 sekundi
  });

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', 'my'],
    queryFn: () => getMyNotifications(0, 10).then((res) => res.data),
    enabled: open,
  });

  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = notificationsData?.content ?? [];

  const dropdownContent = (
    <div
      style={{
        width: 360,
        background: 'var(--ant-color-bg-elevated, #fff)',
        borderRadius: 8,
        boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--ant-color-border, #f0f0f0)',
        }}
      >
        <Text strong>Obaveštenja</Text>
        {(unreadData?.count ?? 0) > 0 && (
          <Button
            type='link'
            size='small'
            icon={<CheckOutlined />}
            onClick={() => markAllReadMutation.mutate()}
          >
            Označi sve
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description='Nema obaveštenja'
          style={{ padding: '24px 0' }}
        />
      ) : (
        <List
          style={{ maxHeight: 400, overflow: 'auto' }}
          dataSource={notifications}
          renderItem={(item: any) => (
            <List.Item
              style={{
                padding: '10px 16px',
                cursor: item.readAt ? 'default' : 'pointer',
                background: item.readAt ? 'transparent' : 'var(--ant-color-primary-bg, #e6f4ff)',
              }}
              onClick={() => {
                if (!item.readAt) {
                  markReadMutation.mutate(item.id);
                }
              }}
            >
              <List.Item.Meta
                title={<Text strong={!item.readAt}>{item.title}</Text>}
                description={
                  <Space direction='vertical' size={0}>
                    <Text type='secondary' style={{ fontSize: 13 }}>
                      {item.message}
                    </Text>
                    <Text type='secondary' style={{ fontSize: 11 }}>
                      {dayjs(item.createdAt).fromNow()}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <Dropdown
      dropdownRender={() => dropdownContent}
      trigger={['click']}
      open={open}
      onOpenChange={setOpen}
      placement='bottomRight'
    >
      <Badge count={unreadData?.count ?? 0} size='small' offset={[-2, 2]}>
        <Button type='text' icon={<BellOutlined style={{ fontSize: 18 }} />} />
      </Badge>
    </Dropdown>
  );
}
