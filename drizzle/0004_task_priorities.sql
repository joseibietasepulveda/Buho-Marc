ALTER TABLE "case_tasks" ADD COLUMN "priority" varchar(10) DEFAULT 'Media' NOT NULL;
--> statement-breakpoint
ALTER TABLE "registration_tasks" ADD COLUMN "priority" varchar(10) DEFAULT 'Media' NOT NULL;
--> statement-breakpoint
ALTER TABLE "case_tasks" ADD CONSTRAINT "case_tasks_priority_check" CHECK (priority IN ('Alta', 'Media', 'Baja'));
--> statement-breakpoint
ALTER TABLE "registration_tasks" ADD CONSTRAINT "registration_tasks_priority_check" CHECK (priority IN ('Alta', 'Media', 'Baja'));
--> statement-breakpoint
UPDATE client_contacts AS client
SET data = jsonb_set(client.data, '{name}', to_jsonb(mapping.new_name)), version = client.version + 1, updated_at = now()
FROM (VALUES
  ('CL-01', 'Araya & Montes Abogados', 'CASA NUBE'),
  ('CL-02', 'Estudio Rivas del Valle', 'PULSO'),
  ('CL-03', 'Fuentes y Lagos Propiedad Intelectual', 'LINARIA'),
  ('CL-04', 'Estudio Córdova Legal', 'ALTURA'),
  ('CL-05', 'Valdés & Pizarro Asociados', 'TERRA SUR'),
  ('CL-06', 'Estudio Andrade Sur', 'NOVA FOODS')
) AS mapping(code, old_name, new_name)
WHERE client.organization_id = '10000000-0000-4000-8000-000000000001'::uuid
  AND client.is_mock = true AND client.public_code = mapping.code AND client.data->>'name' = mapping.old_name;
