import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Space, Tag, theme } from 'antd';
import { ExclamationCircleFilled, WarningFilled, InfoCircleFilled } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { petHealthAlertsApi } from '@/api/petHealthAlerts';
import type { PetHealthAlert, HealthAlertType } from '@/types';
import { useThemeStore } from '@/store/themeStore';

interface Props {
  petId: string | null | undefined;
  /** pet.note — behavioral/staff napomena, prosleđena iz parent-a (nije strukturiran alert) */
  petNote?: string | null;
  /** Kompaktniji prikaz (manji font/padding) — npr. AppointmentModal */
  compact?: boolean;
}

// Statična meta po tipu (label + ikona). Boje se uzimaju iz theme tokena u runtime-u.
const TYPE_META: Record<HealthAlertType, { label: string; icon: ReactNode }> = {
  ALLERGY: { label: 'Alergije', icon: <ExclamationCircleFilled /> },
  CHRONIC_CONDITION: { label: 'Hronične', icon: <WarningFilled /> },
  SPECIAL_HANDLING: { label: 'Posebno', icon: <InfoCircleFilled /> },
  OTHER: { label: 'Ostalo', icon: <InfoCircleFilled /> },
};

/**
 * Persistent health-alert traka za ljubimca.
 *
 * Aktivni alert-i GRUPISANI po tipu kao kompaktni kolor-kodirani Tag-ovi u
 * horizontalnom redu (wrap). Boje dolaze iz Ant Design theme tokena
 * (`theme.useToken`) — automatski se prilagođavaju light/dark temi.
 *
 * Koristi se na 3 mesta: MedicalRecordEditor, PetProfilePage, AppointmentModal.
 * Industrijski pattern (ezyVet / Cornerstone IDEXX).
 */
export default function PetHealthAlertsBanner({ petId, petNote, compact = false }: Props) {
  const { token } = theme.useToken();
  const darkMode = useThemeStore((s) => s.darkMode);

  const { data: alerts = [] } = useQuery({
    queryKey: ['pet-health-alerts', petId],
    queryFn: () => petHealthAlertsApi.getByPet(petId!, true).then((r) => r.data),
    enabled: !!petId,
  });

  const grouped = useMemo(() => {
    const map: Record<HealthAlertType, string[]> = {
      ALLERGY: [],
      CHRONIC_CONDITION: [],
      SPECIAL_HANDLING: [],
      OTHER: [],
    };
    for (const a of alerts as PetHealthAlert[]) {
      map[a.alertType].push(a.label);
    }
    return map;
  }, [alerts]);

  // Boje po tipu iz theme tokena (light/dark safe)
  const typeColors: Record<HealthAlertType, { bg: string; border: string; text: string }> = {
    ALLERGY: {
      bg: token.colorErrorBg,
      border: token.colorErrorBorder,
      text: token.colorErrorText,
    },
    CHRONIC_CONDITION: darkMode
      ? {
          bg: token.colorWarningBg,
          border: token.colorWarningBorder,
          text: token.colorWarningText,
        }
      : {
          // Light tema: ručno pojačano (Ant warning token je previše bled na beloj)
          bg: '#fff1b8',
          border: '#ffd666',
          text: '#956503',
        },
    SPECIAL_HANDLING: darkMode
      ? {
          bg: token.colorSuccessBg,
          border: token.colorSuccessBorder,
          text: token.colorSuccessText,
        }
      : {
          bg: '#d9f7be', // green-2
          border: '#b7eb8f', // green-4
          text: '#237804', // green-8
        },
    OTHER: {
      bg: token.colorFillTertiary,
      border: token.colorBorderSecondary,
      text: token.colorTextSecondary,
    },
  };

  const noteColors = {
    bg: token.colorInfoBg,
    border: token.colorInfoBorder,
    text: token.colorInfoText,
  };

  const hasAnyAlert =
    grouped.ALLERGY.length > 0 ||
    grouped.CHRONIC_CONDITION.length > 0 ||
    grouped.SPECIAL_HANDLING.length > 0 ||
    grouped.OTHER.length > 0;

  const hasNote = !!petNote && petNote.trim().length > 0;

  if (!hasAnyAlert && !hasNote) {
    return null;
  }

  const baseStyle: React.CSSProperties = {
    margin: 0,
    fontSize: compact ? 12 : 13,
    padding: compact ? '1px 8px' : '3px 10px',
    lineHeight: 1.6,
    whiteSpace: 'normal',
  };

  const renderTag = (
    key: string,
    colors: { bg: string; border: string; text: string },
    icon: ReactNode,
    prefix: string,
    values: string,
  ) => (
    <Tag
      key={key}
      icon={icon}
      style={{
        ...baseStyle,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
      }}
    >
      <strong>{prefix}:</strong> {values}
    </Tag>
  );

  return (
    <Space size={[6, 6]} wrap style={{ width: '100%', marginBottom: 8 }}>
      {(Object.keys(TYPE_META) as HealthAlertType[]).map((type) =>
        grouped[type].length > 0
          ? renderTag(
              type,
              typeColors[type],
              TYPE_META[type].icon,
              TYPE_META[type].label,
              grouped[type].join(', '),
            )
          : null,
      )}
      {hasNote && renderTag('note', noteColors, <InfoCircleFilled />, 'Beleška', petNote!.trim())}
    </Space>
  );
}
