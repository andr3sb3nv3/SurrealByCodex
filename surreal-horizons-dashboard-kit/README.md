# Surreal Horizons Integration Kit

Carpeta preparada para integrar la aplicacion de metricas de Surreal Horizons en otra aplicacion, preservando los estilos actuales.

Incluye:

- control diario de metricas, objetivos, diario y audio
- modulos clinicos por patologia
- dashboard historico
- dashboard clinico
- perfil del cliente
- centro de snapshots con creacion, seleccion y detalle

## Usuario de referencia

El usuario informado para produccion es:

```txt
aigurubenvenuto@gmail.com
```

La app de prueba local permite entrar con Google y muestra una advertencia si el email autenticado no coincide con ese usuario.

## Como probarlo localmente

Desde esta carpeta:

```bash
npm run dev
```

Puerto local:

```txt
http://localhost:1011/
```

La app principal original sigue en `http://localhost:1010/`.

## Archivos importantes

- `src/SurrealHorizonsApp.tsx`: app integrada completa para abrir desde un boton en otro proyecto.
- `src/SurrealMetricsDashboard.tsx`: componente exportable para usar dentro de otra app.
- `src/views/PersonalCanvas.tsx`: control/carga diaria de metricas.
- `src/views/SnapshotsCenter.tsx`: seccion completa de snapshots.
- `src/views/PersonalDevDashboard.tsx`: dashboard historico.
- `src/views/UserProfile.tsx`: perfil, idioma, tema, seguridad y conexiones.
- `src/views/ClinicalDashboard.tsx`: dashboard visual original.
- `src/components/clinicalSections/*`: modulos clinicos por patologia.
- `src/components/ui/*`: piezas visuales reutilizadas.
- `src/services/firebase.ts`: configuracion Firebase actual.
- `src/utils/clinicalMetricsConfig.ts`: resolucion de modulos clinicos activos por usuario.
- `src/DemoApp.tsx`: wrapper local para probar login y visualizacion.

## Dependencias necesarias

La app receptora tiene que tener estas dependencias:

```json
{
  "firebase": "^12.6.0",
  "lucide-react": "^0.555.0",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "recharts": "^3.5.0"
}
```

Tambien necesita Tailwind disponible. Este kit usa clases Tailwind iguales a la app original. En la demo local se carga Tailwind por CDN desde `index.html`.

## Integracion completa en otra app

Para abrir toda la experiencia desde un boton:

```tsx
import { SurrealHorizonsApp } from './surreal-horizons-dashboard-kit/src';

export function HostApp({ firebaseUser }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>
        Abrir Surreal Horizons
      </button>

      {open && (
        <SurrealHorizonsApp
          initialUser={firebaseUser}
          allowedEmail="aigurubenvenuto@gmail.com"
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
```

## Integracion solo dashboard clinico

Copiar la carpeta `src` de este kit o importar el componente principal:

```tsx
import { SurrealMetricsDashboard } from './surreal-horizons-dashboard-kit/src';

export function MetricsScreen({ firebaseUser }) {
  return (
    <SurrealMetricsDashboard
      authUser={firebaseUser}
      profiles={[
        {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'Cliente',
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        },
      ]}
      snapshots={[
        { id: 'current', label: 'Actual' },
      ]}
      language="es"
      isPro
      onBack={() => {
        // cerrar modal, drawer o volver a la pantalla anterior
      }}
    />
  );
}
```

Uso esperado desde la otra app:

```tsx
const [showMetrics, setShowMetrics] = useState(false);

return (
  <>
    <button onClick={() => setShowMetrics(true)}>
      Abrir metricas Surreal Horizons
    </button>

    {showMetrics && (
      <SurrealMetricsDashboard
        authUser={firebaseUser}
        onBack={() => setShowMetrics(false)}
      />
    )}
  </>
);
```

## Perfiles y snapshots del dashboard clinico aislado

El componente ya acepta multiples perfiles y snapshots:

```tsx
<SurrealMetricsDashboard
  authUser={firebaseUser}
  profiles={[
    { uid: 'uid-cliente-1', displayName: 'Cliente 1', email: 'cliente1@mail.com' },
    { uid: 'uid-cliente-2', displayName: 'Cliente 2', email: 'cliente2@mail.com' },
  ]}
  snapshots={[
    { id: 'current', label: 'Actual' },
    { id: 'june-review', label: 'Revision junio' },
  ]}
  onProfileChange={(profile) => console.log(profile)}
  onSnapshotChange={(snapshot) => console.log(snapshot)}
/>
```

Nota: esto aplica al componente aislado `SurrealMetricsDashboard`. Para snapshots persistidos usar la app completa `SurrealHorizonsApp`, que incluye `SnapshotsCenter`.

## Estructura Firestore que usa el dashboard

El dashboard lee:

```txt
users/{uid}
users/{uid}/settings/clinicalMetrics
users/{uid}/deepClinicalLogsAnxiety/{dateKey}
users/{uid}/deepClinicalLogsDepression/{dateKey}
users/{uid}/deepClinicalLogsBipolar/{dateKey}
users/{uid}/deepClinicalLogsSchizophrenia/{dateKey}
users/{uid}/deepClinicalLogsOCD/{dateKey}
users/{uid}/deepClinicalLogsTrauma/{dateKey}
users/{uid}/deepClinicalLogsSleep/{dateKey}
users/{uid}/deepClinicalLogsPersonality/{dateKey}
users/{uid}/deepClinicalLogsADHD/{dateKey}
users/{uid}/deepClinicalLogsSubstance/{dateKey}
users/{uid}/snapshots/{snapshotId}
```

Los modulos activos se resuelven en este orden:

1. `users/{uid}/settings/clinicalMetrics.clinicalMetrics`
2. `users/{uid}.clinicalMetrics`
3. codigo numerico de 10 digitos dentro de `displayName`, `email` o `uid`
4. todos los modulos por defecto

Valores validos para `clinicalMetrics`:

```txt
anxiety
depression
bipolar
schizophrenia
ocd
trauma
sleep
personality
adhd
substance
```

## Datos demo

Este kit no crea usuarios demo separados. En la barra superior de `SurrealHorizonsApp` hay dos acciones temporales para validar la app con el usuario logueado:

- `Demo 3 meses`: crea datos demo para los ultimos 3 meses.
- `Borrar demo`: elimina esos datos demo del mismo rango.

El demo escribe:

```txt
users/{uid}/daily_logs/{dateKey}
users/{uid}/deepClinicalLogsAnxiety/{dateKey}
users/{uid}/deepClinicalLogsBipolar/{dateKey}
users/{uid}/deepClinicalLogsSubstance/{dateKey}
users/{uid}/deepClinicalLogsADHD/{dateKey}
users/{uid}/snapshots/demo-current
users/{uid}/snapshots/demo-midpoint
users/{uid}/snapshots/demo-start
```

Tambien deja `clinicalMetrics` limitado a:

```txt
anxiety
bipolar
substance
adhd
```

La implementacion esta en `src/utils/seedDemoData.ts`.

## Snapshots

La seccion `SnapshotsCenter` crea documentos en:

```txt
users/{uid}/snapshots/{snapshotId}
```

Cada snapshot guarda:

- `title`
- `dateKey`
- `note`
- `dailyLog`
- `clinicalMetrics`
- `totals.totalDailyLogs`
- `totals.totalClinicalModules`
- `createdAt`
- `createdAtServer`

Desde esa pantalla se puede crear un snapshot, seleccionar snapshots existentes, revisar metricas capturadas y saltar al historico o a metricas clinicas.

## Firebase

La configuracion actual esta en `src/services/firebase.ts`. Si la otra app ya inicializa Firebase, se puede reemplazar ese archivo por exports compatibles:

```ts
export const auth = existingAuth;
export const db = existingFirestore;
export const functions = existingFunctions;
```

El dashboard necesita principalmente `db`; la demo local usa tambien `auth`.
