# Seguridad — Firebase Auth + reglas

Sin esto, cualquiera con la URL de invitación (que expone tu `projectId` y `apiKey`) puede leer y escribir toda tu base de datos, e incluso robar el rol de admin reasignando `_admin.uid`.

## Qué hace este cambio

- La app ahora se autentica con **Firebase Anonymous Auth** al conectar. Firebase emite una UID real (`auth.uid`) que ningún atacante puede forjar.
- La app usa esa `auth.uid` como identidad de usuario y admin.
- Una migración one-shot mueve el rol de admin y los entries de `_members` desde la UID legacy de `localStorage` a la nueva `auth.uid` la primera vez que abres la app tras el despliegue.

## Cómo dejarlo blindado — despliegue en 4 pasos

**1) Habilitar Anonymous Auth**

Consola de Firebase → **Authentication → Sign-in method → Anonymous → Enable**.

Sin este paso la app dará error "Falta habilitar Anonymous Auth".

**2) Desplegar esta versión de la app**

Con las reglas TODAVÍA abiertas (`.read: true`, `.write: true`), para que la migración automática pueda reescribir `_admin.uid` y `_members/{uid}`.

**3) Que cada usuario abra la app una vez**

Al conectar, cada dispositivo:
- Se autentica anónimamente.
- Si era el admin de una sala (su UID legacy coincide con `_admin.uid`), transfiere el rol a la nueva `auth.uid` y muestra el toast "Cuenta migrada a auth de Firebase".
- Si era miembro aprobado, migra su entry en `_members`.

Se hace una vez por dispositivo y por sala. Después ya funciona todo con la nueva identidad.

**4) Aplicar `rules.json`**

Consola → **Realtime Database → Reglas** → pega el contenido de [`rules.json`](./rules.json) → Publicar.

A partir de ese momento:
- Solo dispositivos autenticados con Firebase Auth pueden leer/escribir. La API key sola ya no vale.
- `_admin.secret` solo lo puede leer el propio admin.
- El admin se transfiere solo si el que escribe manda el mismo `secret` que hay guardado (la app ya lo hace desde la sidebar → "Ver mi clave de admin").
- Cada usuario solo puede tocar su propia entrada en `_members`; solo el admin puede aprobar / expulsar.
- Items, historial y todo lo demás solo lo tocan miembros aprobados.

## Rollback

Si algo va mal con las reglas, en la consola pega esto para volver al estado abierto:

```json
{ "rules": { ".read": true, ".write": true } }
```

Y arréglalo con calma.

## Nota

El paso 4 se puede posponer un par de días para dar tiempo a que TODOS los dispositivos hayan abierto la app tras el despliegue. Cualquier usuario que no haya migrado antes de aplicar las reglas quedará bloqueado y tendrá que ser reaprobado por el admin.
