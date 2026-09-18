# Verificación de Usuario y Empleado por código de 6 caracteres, no por token en un link

`Usuario` (sign-up y cambio de email) y `Empleado` (alta) verificaban su email con un token de 256
bits emitido dentro de un link clickeable. Pasan a un código alfanumérico de 6 caracteres que la
persona tipea a mano. `Booking` (Turno) no cambia: sigue con link y token de 256 bits, porque un
Cliente anónimo no tiene ninguna pantalla propia donde tipear un código.

Esto contradice el ADR 0002 del front (`2026-agendic-front/docs/adr/0002-verification-link-lands-on-the-front.md`),
que ese repo ya marcó `superseded`, y la premisa de este mismo repo en ADR 0005 de que un Turno
necesita "el mismo tipo de campos de verificación (hash, expiración) que un Usuario o un Empleado":
sigue siendo cierto para los campos, pero ya no para lo que contienen (un token de 256 bits en
`Booking`, un código de 6 caracteres en `User`/`Employee`).

Un código corto no aguanta el diseño de un token largo:

- **Alfabeto**: 32 caracteres (A-Z y 2-9, sin `0/O` ni `1/I`, fáciles de confundir al leer un email),
  ~1.07e9 combinaciones. Elegido sobre 6 dígitos (1e6) para no necesitar un contador de intentos
  fallidos: atado al email y con una vida corta, adivinarlo es inviable sin uno.
- **Búsqueda atada al email**: el hash ya no es `@unique` ni se busca solo. `verifyEmail` ahora
  recibe `(email, code, now)`; dos personas eventualmente van a compartir código, y sin el email
  como filtro alguien que adivina un código válido verificaría la cuenta de cualquiera que lo tenga,
  no la que eligió atacar. Para `Usuario`, la búsqueda es `email` o `pendingEmail`, porque el código
  se manda a cualquiera de los dos según el caso (sign-up vs. cambio de email).
- **Vida útil corta y distinta por caso**: `Usuario` usa 15 minutos (la persona está esperando el
  mail en el momento y puede reenviar sola). `Empleado` mantiene 24 horas (la invitación le llega a
  alguien que no la espera, y solo el Dueño puede reenviarla).
- **Errores distinguibles**: un código vencido y uno inexistente ya no comparten `BusinessRuleError`
  (422). El front necesita mostrar mensajes distintos ("pedí uno nuevo" vs. "revisalo y probá de
  nuevo"), así que se agregan `ExpiredError` (410) e `InvalidCodeError` (400) a
  `DomainExceptionFilter`.

## Consequences

- `Mailer` gana `sendVerificationCode(email, code)` al lado de `sendVerificationLink`, que sigue
  existiendo para `Booking`.
- `POST /users/verification` y `POST /employees/verification` piden `{ email, code }` en vez de
  `{ token }`.
- El código mejora, de paso, el caso de uso multi-dispositivo que motivaba el ADR 0002 del front:
  antes el link quedaba atrapado en el dispositivo donde se abría el mail; el código se lee ahí y se
  tipea donde la persona ya está con la sesión que le interesa.
- No hay contador de intentos fallidos ni rate limiting: con este alfabeto y el filtro por email no
  hace falta. Si el volumen de un `Employee.email` (sin índice) o `User.pendingEmail` crece lo
  suficiente para importar, se agrega un índice entonces.
