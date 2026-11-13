/**
 * Направления и перезвоны (E4): заявки с внешнего сайта (взять в работу /
 * закрыть) и направления врачей — переход к записи по направлению.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select } from 'antd';
import dayjs from 'dayjs';

import { api, formatApiError } from '@pandora/shared';
import type { components } from '@pandora/shared';

type CallbackOut = components['schemas']['CallbackOut'];
type CallbackStatus = components['schemas']['CallbackStatus'];
type ReferralOut = components['schemas']['ReferralOut'];
type ReferralStatus = components['schemas']['ReferralStatus'];
type PatientOut = components['schemas']['PatientOut'];
type SpecializationOut = components['schemas']['SpecializationOut'];

const CALLBACK_BADGE: Record<CallbackStatus, { label: string; className: string }> = {
  new: { label: 'Новая', className: 'badge badge-new' },
  in_progress: { label: 'В работе', className: 'badge badge-warning' },
  done: { label: 'Обработана', className: 'badge badge-done' },
};

const REFERRAL_BADGE: Record<ReferralStatus, { label: string; className: string }> = {
  active: { label: 'К записи', className: 'badge badge-warning' },
  used: { label: 'Записан', className: 'badge badge-done' },
  cancelled: { label: 'Отменено', className: 'badge badge-done' },
};

const hhmm = (iso: string) => dayjs(iso).format('HH:mm');

export default function RegReferrals() {
  const navigate = useNavigate();

  const [callbacks, setCallbacks] = useState<CallbackOut[]>([]);
  const [referrals, setReferrals] = useState<ReferralOut[]>([]);
  const [referralStatus, setReferralStatus] = useState<ReferralStatus>('active');
  const [patients, setPatients] = useState<PatientOut[]>([]);
  const [specializations, setSpecializations] = useState<SpecializationOut[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ data: cbData, error: cbError, response: cbResponse }, { data: patientsData }, { data: specs }] =
        await Promise.all([
          api.GET('/api/registrar/callbacks'),
          api.GET('/api/registrar/patients', { params: { query: { query: '' } } }),
          api.GET('/api/public/specializations'),
        ]);
      if (cancelled) return;
      if (cbData) setCallbacks(cbData);
      else setError(formatApiError(cbError, cbResponse.status));
      setPatients(patientsData ?? []);
      setSpecializations(specs ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // направления перезагружаются при смене фильтра статуса
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error: errBody, response } = await api.GET('/api/registrar/referrals', {
        params: { query: { status: referralStatus } },
      });
      if (cancelled) return;
      if (data) {
        setReferrals(data);
      } else {
        setError(formatApiError(errBody, response.status));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [referralStatus]);

  const patchCallback = async (id: number, status: CallbackStatus) => {
    const { data, error: errBody, response } = await api.PATCH('/api/registrar/callbacks/{callback_id}', {
      params: { path: { callback_id: id } },
      body: { status },
    });
    if (data) {
      setCallbacks((prev) => prev.map((c) => (c.id === id ? data : c)));
    } else {
      setError(formatApiError(errBody, response.status));
    }
  };

  const patientName = (id: number) =>
    patients.find((p) => p.id === id)?.full_name ?? `Пациент №${id}`;

  const specName = (id: number) =>
    specializations.find((s) => s.id === id)?.name ?? `Специальность №${id}`;

  const openCallbacks = callbacks.filter((c) => c.status !== 'done').length;

  return (
    <div className="view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Направления и звонки</h1>
          <p className="page-subtitle">Обработка направлений от врачей и заявок на обратный звонок с сайта.</p>
        </div>
      </div>

      {error && <p className="text-danger text-sm" style={{ marginBottom: 12 }}>{error}</p>}

      <div className="dashboard-split">
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1rem', color: 'var(--dark)', marginBottom: 0 }}>Направления от врачей</h3>
              <Select
                style={{ width: 180 }}
                value={referralStatus}
                onChange={setReferralStatus}
                options={(Object.keys(REFERRAL_BADGE) as ReferralStatus[]).map((s) => ({
                  value: s,
                  label: REFERRAL_BADGE[s].label,
                }))}
              />
            </div>
            {referrals.map((r) => (
              <div key={r.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <div className="flex justify-between items-center mb-2">
                  <div className="font-medium text-dark text-sm">Пациент: {patientName(r.patient_id)}</div>
                  <span className={REFERRAL_BADGE[r.status].className}>{REFERRAL_BADGE[r.status].label}</span>
                </div>
                <div className="text-xs text-muted mb-1">№{r.id} · от {dayjs(r.created_at).format('DD.MM HH:mm')}</div>
                <div className="text-xs text-primary font-medium">К: {specName(r.to_specialization_id)}</div>
                <div className="flex justify-between items-center mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <span className="text-xs text-muted">{r.reason ?? 'Причина не указана'}</span>
                  {r.status === 'active' && (
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/staff/reg/booking?referral=${r.id}`)}>
                      Записать
                    </button>
                  )}
                </div>
              </div>
            ))}
            {referrals.length === 0 && <p className="text-sm text-muted">Направлений нет</p>}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1rem', color: 'var(--dark)', marginBottom: 16 }}>
            Очередь на обратный звонок ({openCallbacks})
          </h3>
          {callbacks.map((cb) => (
            <div key={cb.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div className="flex justify-between items-start">
                <div className="font-bold text-dark text-base">{cb.phone}</div>
                <span className={CALLBACK_BADGE[cb.status].className}>{CALLBACK_BADGE[cb.status].label}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted mt-2">
                <span>{cb.full_name ?? 'Анонимный запрос'}</span>
                <span>{hhmm(cb.created_at)}</span>
              </div>
              {cb.comment && <div className="text-sm text-main mt-1">{cb.comment}</div>}
              {cb.status !== 'done' && (
                <div className="flex gap-2 mt-3">
                  {cb.status === 'new' && (
                    <button className="btn btn-primary w-100 btn-sm" onClick={() => void patchCallback(cb.id, 'in_progress')}>
                      В работу
                    </button>
                  )}
                  {cb.status === 'in_progress' && (
                    <button className="btn btn-primary w-100 btn-sm" onClick={() => void patchCallback(cb.id, 'done')}>
                      Обработано
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {callbacks.length === 0 && <p className="text-sm text-muted">Заявок на перезвон нет</p>}
        </div>
      </div>
    </div>
  );
}
