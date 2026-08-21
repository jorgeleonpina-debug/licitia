# LicitIA

Aplicación React/Vite para análisis y gestión de licitaciones públicas chilenas.

## Módulo Mercado Público — aceite de oliva

El módulo productivo vive en `/licitaciones` y procesa una licitación por cada ítem coincidente. El flujo es:

1. Vercel Cron llama cada hora a `GET /api/mercado-publico/sync` con `Authorization: Bearer $CRON_SECRET`.
2. El backend obtiene el listado `estado=activas`, guarda sus códigos en un checkpoint y procesa hasta 25 detalles por ejecución (máximo configurable por solicitud: 50).
3. Las solicitudes de detalle usan timeout, tres intentos, backoff exponencial y concurrencia limitada.
4. El matcher revisa licitación, producto, descripción, categoría y UNSPSC.
5. Supabase hace `upsert` mediante `external_item_key`, sin sobrescribir `workflow_status`, `notes` ni `first_seen_at`.
6. El dashboard autenticado permite filtrar, priorizar y actualizar únicamente campos CRM.

Mercado Público no publica en su API una URL directa de ficha. El portal actual usa enlaces con un parámetro cifrado `qs`, que no puede derivarse del código externo. Por eso la acción “Ver en Mercado Público” abre el [buscador oficial](https://www.mercadopublico.cl/BuscarLicitacion) y copia el código al portapapeles.

## Configuración

Copia `.env.example` a `.env.local` para desarrollo y agrega las mismas variables en Vercel. Nunca uses `SUPABASE_SERVICE_ROLE_KEY`, `MERCADO_PUBLICO_TICKET` ni `CRON_SECRET` con prefijo `VITE_`.

Aplica la migración con Supabase CLI:

```bash
supabase db push
```

También puedes ejecutar `supabase/migrations/202608200001_licitaciones_oportunidades.sql` desde el SQL Editor.

Para disparar un lote local o desplegado:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/mercado-publico/sync?batchSize=25"
```

Cada respuesta informa totales, cursor, inserciones, actualizaciones, errores y duración. Si `hasMore` es `true`, la siguiente ejecución continúa desde `nextCursor`.

## Desarrollo

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

## Seguridad y RLS

- `anon` no tiene permisos sobre oportunidades ni jobs.
- usuarios `authenticated` pueden leer oportunidades;
- solo pueden actualizar `workflow_status` y `notes`;
- los jobs, `raw_data` y campos de ingesta se escriben exclusivamente con la service role server-side.

## Proyecto base React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
