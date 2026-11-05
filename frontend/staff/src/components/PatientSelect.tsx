/** Поиск и выбор пациента: удалённый поиск по СНИЛС / ФИО / телефону. */

import { useEffect, useState } from "react";
import { Select } from "antd";

import { api } from "@pandora/shared";
import type { components } from "@pandora/shared";

type PatientOut = components["schemas"]["PatientOut"];

interface Props {
  value: number | null;
  onChange: (patientId: number | null, patient: PatientOut | null) => void;
}

/** Строка опции: ФИО + подсказка (СНИЛС или страховка). */
function optionLabel(p: PatientOut): string {
  const name = p.full_name ?? `Пациент №${p.id} (личность не установлена)`;
  const hint = p.snils
    ? `СНИЛС ${p.snils}`
    : p.insurance_policy
      ? `страховка ${p.insurance_policy}`
      : p.citizenship;
  return `${name} · ${hint}`;
}

export default function PatientSelect({ value, onChange }: Props) {
  const [patients, setPatients] = useState<PatientOut[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await api.GET("/api/registrar/patients", {
        params: { query: { query: "" } },
      });
      if (cancelled) return;
      setPatients(data ?? []);
      setFetching(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Select
      style={{ minWidth: 320 }}
      showSearch
      allowClear
      placeholder="Пациент: поиск по ФИО / СНИЛС / телефону"
      filterOption={false}
      loading={fetching}
      value={value}
      onSearch={(query) => {
        setFetching(true);
        void (async () => {
          const { data } = await api.GET("/api/registrar/patients", {
            params: { query: { query } },
          });
          setPatients(data ?? []);
          setFetching(false);
        })();
      }}
      onChange={(id) => {
        onChange(id, patients.find((p) => p.id === id) ?? null);
      }}
      options={patients.map((p) => ({
        value: p.id,
        label: optionLabel(p),
      }))}
    />
  );
}
