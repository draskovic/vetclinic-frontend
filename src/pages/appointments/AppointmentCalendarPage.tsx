import { useState, useRef } from 'react';
import { Card, Select, Tag, Tooltip, Modal } from 'antd';
import { UnorderedListOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DatesSetArg, DateSelectArg } from '@fullcalendar/core';
import dayjs from 'dayjs';
import { appointmentsApi } from '../../api';
import { usersApi } from '../../api';
import AppointmentModal from './AppointmentModal';
import type { Appointment, AppointmentStatus, AppointmentType } from '../../types';

// Boje po statusu termina
const statusColors: Record<AppointmentStatus, string> = {
  SCHEDULED: '#1890ff', // plava
  CONFIRMED: '#13c2c2', // tirkizna
  IN_PROGRESS: '#fa8c16', // narandžasta
  COMPLETED: '#52c41a', // zelena
  CANCELLED: '#ff4d4f', // crvena
  NO_SHOW: '#8c8c8c', // siva
};

const statusLabels: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Zakazan',
  CONFIRMED: 'Potvrđen',
  IN_PROGRESS: 'U toku',
  COMPLETED: 'Završen',
  CANCELLED: 'Otkazan',
  NO_SHOW: 'Nije došao',
};

const typeLabels: Record<AppointmentType, string> = {
  CHECKUP: 'Pregled',
  VACCINATION: 'Vakcinacija',
  SURGERY: 'Operacija',
  EMERGENCY: 'Hitno',
  FOLLOW_UP: 'Kontrola',
  GROOMING: 'Šišanje',
};

const AppointmentCalendarPage = () => {
  const navigate = useNavigate();

  const calendarRef = useRef<FullCalendar>(null);

  // State za datum opseg koji kalendar prikazuje
  const [dateRange, setDateRange] = useState({
    from: dayjs().startOf('month').toISOString(),
    to: dayjs().endOf('month').toISOString(),
  });

  // State za filter po veterinaru
  const [selectedVetId, setSelectedVetId] = useState<string | undefined>(undefined);

  // State za modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [selectedDates, setSelectedDates] = useState<{ start: string; end: string } | null>(null);

  // Učitaj termine za prikazani opseg
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', 'calendar', dateRange.from, dateRange.to, selectedVetId],
    queryFn: async () => {
      if (selectedVetId) {
        return appointmentsApi
          .getByVet(selectedVetId, dateRange.from, dateRange.to)
          .then((res) => res.data);
      }
      return appointmentsApi.getByDateRange(dateRange.from, dateRange.to).then((res) => res.data);
    },
  });

  // Učitaj veterinare za filter
  // Učitaj veterinare za filter
  const { data: usersData } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => usersApi.getAll(0, 100).then((r) => r.data),
  });

  // Mapiranje termina na FullCalendar događaje
  const events = appointments.map((apt: Appointment) => ({
    id: apt.id,
    title: `${apt.petName} - ${typeLabels[apt.type]}`,
    start: apt.startTime,
    end: apt.endTime,
    backgroundColor: statusColors[apt.status],
    borderColor: statusColors[apt.status],
    extendedProps: {
      appointment: apt,
    },
  }));

  // Kada se promeni prikaz kalendara (mesec, nedelja, dan)
  const handleDatesSet = (arg: DatesSetArg) => {
    setDateRange({
      from: arg.start.toISOString(),
      to: arg.end.toISOString(),
    });
  };

  // Klik na postojeći termin → otvori modal za izmenu
  const handleEventClick = (arg: EventClickArg) => {
    const appointment = arg.event.extendedProps.appointment as Appointment;
    setEditingAppointment(appointment);
    setModalOpen(true);
  };

  // Klik na prazan slot → otvori modal za novi termin
  const handleDateSelect = (arg: DateSelectArg) => {
    const isPast = dayjs(arg.start).isBefore(dayjs());

    const openModal = () => {
      setEditingAppointment(null);
      setSelectedDates({
        start: arg.start.toISOString(),
        end: arg.end.toISOString(),
      });
      setModalOpen(true);
    };

    if (isPast) {
      Modal.confirm({
        title: 'Datum u prošlosti',
        content:
          'Izabrali ste datum koji je već prošao. Da li želite da zakazete termin retroaktivno?',
        okText: 'Da, nastavi',
        cancelText: 'Otkaži',
        onOk: openModal,
      });
    } else {
      openModal();
    }
  };

  // Zatvaranje modala
  const handleModalClose = () => {
    setModalOpen(false);
    setEditingAppointment(null);
    setSelectedDates(null);
  };

  // Renderovanje sadržaja događaja u kalendaru
  const renderEventContent = (eventInfo: any) => {
    const apt = eventInfo.event.extendedProps.appointment as Appointment;
    return (
      <Tooltip
        title={
          <div>
            <div>
              <strong>{apt.petName}</strong> ({apt.ownerName})
            </div>
            <div>Vet: {apt.vetName}</div>
            <div>Tip: {typeLabels[apt.type]}</div>
            <div>Status: {statusLabels[apt.status]}</div>
            {apt.reason && <div>Razlog: {apt.reason}</div>}
          </div>
        }
      >
        <div
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '12px',
            padding: '1px 3px',
            cursor: 'pointer',
          }}
        >
          <strong>{eventInfo.timeText}</strong> {apt.petName} - {typeLabels[apt.type]}
        </div>
      </Tooltip>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title='Kalendar termina'
        extra={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Select
              placeholder='Svi veterinari'
              allowClear
              style={{ width: 200 }}
              value={selectedVetId}
              onChange={setSelectedVetId}
              options={
                usersData?.content.map((v) => ({
                  value: v.id,
                  label: `${v.firstName} ${v.lastName}`,
                })) ?? []
              }
            />
            <Tooltip title='Tabelarni prikaz'>
              <UnorderedListOutlined
                style={{ fontSize: '20px', cursor: 'pointer' }}
                onClick={() => navigate('/appointments')}
              />
            </Tooltip>
          </div>
        }
      >
        {/* Legenda statusa */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {Object.entries(statusLabels).map(([status, label]) => (
            <Tag
              key={status}
              style={{
                backgroundColor: statusColors[status as AppointmentStatus],
                color: '#fff',
                border: 'none',
              }}
            >
              {label}
            </Tag>
          ))}
        </div>

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView='dayGridMonth'
          headerToolbar={{
            left: 'prev,today,next',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          locale='sr-latn'
          firstDay={1}
          events={events}
          datesSet={handleDatesSet}
          eventClick={handleEventClick}
          selectable={true}
          select={handleDateSelect}
          eventContent={renderEventContent}
          height='auto'
          allDaySlot={false}
          slotMinTime='07:00:00'
          slotMaxTime='21:00:00'
          slotDuration='00:30:00'
          buttonText={{
            today: 'Danas',
            month: 'Mesec',
            week: 'Nedelja',
            day: 'Dan',
          }}
          noEventsText='Nema termina'
          eventDisplay='block'
        />
      </Card>

      {/* Reuse postojećeg AppointmentModal */}
      <AppointmentModal
        open={modalOpen}
        appointment={editingAppointment}
        onClose={handleModalClose}
        initialDates={selectedDates}
      />
    </div>
  );
};

export default AppointmentCalendarPage;
