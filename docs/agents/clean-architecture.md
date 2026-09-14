# Clean Architecture

Normative rules for every file under `app/`, `src/`, `di/`, `tests/`.

## Adding a feature: inside-out

Work from the innermost layer outward. Each step compiles and is testable before the next exists. The feature is done when every step's check holds.

0. **Boundary.** One user-facing operation → one controller. Split it into atomic business operations → one use case each. List the external capabilities needed → ports; reuse existing ports first.
1. **Entities** in `src/entities/`. One Zod schema plus inferred type per model; insert/create variants derived with `pick`/`omit`/`merge`. One error class per outcome an outer layer reacts to differently, constructor `(message, options?: ErrorOptions)`. Check: the file carries no persistence, transport, or UI concern.
2. **Ports** in `src/application/repositories/` and `src/application/services/`. `interface I<Name>Repository` / `I<Name>Service`; signatures use only entities types and primitives. Check: contract written, nothing implemented yet.
3. **Use case** at `src/application/use-cases/<feature>/<verb>-<noun>.use-case.ts`. Check: curried, one operation, authorization inside (throws `UnauthorizedError`), receives an already-verified `userId`, parses no input shape, returns an entity, `tx?` last, exports `I<Verb><Noun>UseCase = ReturnType<typeof …>`.
4. **Adapters** in `src/infrastructure/`. Mock first (`.mock.ts`, in-memory, throws the same entities errors), then the real adapter. A class implementing exactly one port, dependencies via constructor, vendor errors translated to entities errors with `{ cause }`. Check: both files exist.
5. **Controller + presenter** at `src/interface-adapters/controllers/<feature>/<verb>-<noun>.controller.ts`. Body order: authenticate (`UnauthenticatedError`) → `inputSchema.safeParse` (`InputParseError` with `cause`) → compose use cases, inside a transaction when several writes → `presenter()` whitelisting fields. Check: return type is `ReturnType<typeof presenter>`, exports `I<Verb><Noun>Controller`.
6. **Register** in `di/types.ts` (`DI_SYMBOLS` and `DI_RETURN_TYPES`, same `I`-prefixed key, `Symbol.for(key)`) and `di/modules/<feature>.module.ts` (`toHigherOrderFunction`, dependency list in parameter order; adapter bindings branch on `NODE_ENV === 'test'` → mock). Check: `getInjection('I…Controller')` type-checks.
7. **Unit tests** at `tests/unit/<mirrored src path>/<same>.test.ts`, subjects resolved via `getInjection`. Controller file: happy path, one case per `InputParseError` scenario, unauthenticated. Use-case file: happy path plus every authorization and not-found branch. Check: `npm test` green with no database or network.
8. **Entry point** in `app/` (server action, route handler, server component): `getInjection('I…Controller')`, pass raw input and session id, branch with `instanceof` on each entities error → response, report the rest through `ICrashReporterService` and return a generic message. Cookies, redirects, revalidation live here only.
9. **Lint.** `npm run lint` passes with zero boundary violations. A violation means the code sits in the wrong layer: move it.

## Import map

Dependencies point inward. Anything not listed is forbidden and lint-enforced.

| From | May import |
|---|---|
| `src/entities` | `entities` |
| `src/application/repositories`, `src/application/services` (ports) | `entities` |
| `src/application/use-cases` | `entities`, ports |
| `src/interface-adapters/controllers` | `entities`, ports, use cases |
| `src/infrastructure` | `entities`, ports (never use cases or controllers) |
| `app/` | `entities`, `di/` |
| `di/` | everything except `app/` |

Core (`entities` + `application`) stays free of framework, ORM, SDK, HTTP-client, and UI imports. Ports are the only door to the outside: database, HTTP API, auth, email, monitoring, transactions, storage, queues.

## Naming

Kebab-case files with a role suffix; `tests/unit/` mirrors `src/` path for path.

| Artifact | File | Export |
|---|---|---|
| Model | `models/<noun>.ts` | `<noun>Schema`, `type <Noun>`, `type Create<Noun>` |
| Error | `errors/<group>.ts` | `class <Name>Error extends Error` |
| Port | `<nouns>.repository.interface.ts`, `<name>.service.interface.ts` | `interface I<Nouns>Repository`, `I<Name>Service` |
| Use case | `<verb>-<noun>.use-case.ts` | `const <verb><Noun>UseCase`, `type I<Verb><Noun>UseCase` |
| Controller | `<verb>-<noun>.controller.ts` | `const <verb><Noun>Controller`, `type I<Verb><Noun>Controller` |
| Adapter | `<nouns>.repository.ts`, `<name>.service.ts` | `class <Nouns>Repository implements I<Nouns>Repository` |
| Mock | `<same>.mock.ts` | `class Mock<Same>` |
| DI module | `di/modules/<feature>.module.ts` | `function create<Feature>Module()` |

## Shapes

Use cases and controllers are curried arrow functions, `const`, no classes, no decorators. Dependency order: instrumentation → domain services → repositories → use cases. Consumers only ever see the inner function.

```ts
export type IArchiveTodoUseCase = ReturnType<typeof archiveTodoUseCase>;
export const archiveTodoUseCase =
  (instrumentationService: IInstrumentationService, todosRepository: ITodosRepository) =>
  (input: { todoId: number }, userId: string, tx?: ITransaction): Promise<Todo> =>
    instrumentationService.startSpan({ name: 'archiveTodo Use Case', op: 'function' }, async () => {
      const todo = await todosRepository.getTodo(input.todoId);
      if (!todo) throw new NotFoundError('Todo does not exist');
      if (todo.userId !== userId) throw new UnauthorizedError('Cannot archive todo. Reason: unauthorized');
      return await todosRepository.archiveTodo(todo.id, tx);
    });
```

```ts
function presenter(todo: Todo, instrumentationService: IInstrumentationService) {
  return instrumentationService.startSpan({ name: 'archiveTodo Presenter', op: 'serialize' }, () => ({
    id: todo.id, todo: todo.todo, completed: todo.completed, archivedAt: todo.archivedAt,
  }));
}
const inputSchema = z.object({ todoId: z.number() });
export type IArchiveTodoController = ReturnType<typeof archiveTodoController>;
export const archiveTodoController =
  (instrumentationService: IInstrumentationService, authenticationService: IAuthenticationService, archiveTodoUseCase: IArchiveTodoUseCase) =>
  async (input: Partial<z.infer<typeof inputSchema>>, sessionId: string | undefined) =>
    instrumentationService.startSpan({ name: 'archiveTodo Controller' }, async () => {
      if (!sessionId) throw new UnauthenticatedError('Must be logged in to archive a todo');
      const { session } = await authenticationService.validateSession(sessionId);
      const { data, error } = inputSchema.safeParse(input);
      if (error) throw new InputParseError('Invalid data', { cause: error });
      return presenter(await archiveTodoUseCase({ todoId: data.todoId }, session.userId), instrumentationService);
    });
```

Infrastructure adapters are the contrast: classes with constructor injection, `implements` one port, writes take `tx?` and use `tx ?? db`.

## Errors

Errors are the core's outward API. Inner layers throw entities error classes with `{ cause }` when wrapping; the framework layer alone turns them into responses, by `instanceof`.

| Layer | Throws | Catches |
|---|---|---|
| Infrastructure | `DatabaseOperationError`, `NotFoundError` (translated from vendor errors) | vendor errors → report → rethrow as entities error |
| Use case | `UnauthorizedError`, `NotFoundError`, business-rule errors | nothing |
| Controller | `UnauthenticatedError`, `InputParseError` | only to roll back a transaction |
| `app/` | nothing domain-specific | every entities error it can handle; reports the rest with a generic message |

## Cross-cutting

Instrumentation, crash reporting, and transactions are ports too (`IInstrumentationService`, `ICrashReporterService`, `ITransactionManagerService`). `startSpan` wraps every use case, controller, presenter, and repository method, named `'<name> Use Case'`, `'<name> Controller'`, `'<name> Presenter'`, `'<Repo> > <method>'`. Transaction handles cross into the core typed as the abstract `ITransaction` from entities.

## Where does this go

| I need to… | Layer |
|---|---|
| Define the shape of a thing | `entities/models` |
| Define a failure the app can signal | `entities/errors` |
| Describe what I need from a DB / API / SDK | port in `application/` |
| Implement one business operation | `application/use-cases` |
| Check "may this user do this?" | inside the use case |
| Check "is this user logged in?" | controller |
| Parse raw input | controller, schema at top of file |
| Run several writes atomically | controller + `ITransactionManagerService` |
| Shape data for the client | presenter, inside the controller file |
| Talk to a database, backend API, auth or monitoring SDK | `infrastructure` adapter |
| Fake that talk for tests | `infrastructure` `.mock.ts` |
| Choose real vs. mock, wire dependencies | `di/modules/*.module.ts` |
| Read cookies, redirect, revalidate, set status codes | `app/` |
| Turn an error into a user message | `app/` |

## Tooling in this repo

The rules are mandatory; the tools are the reference stack and are installed on first use: `zod` (schemas), `jest` via `next/jest` (unit tests; jest sets `NODE_ENV=test` itself), `@evyweb/ioctopus` (decorator-free container), `eslint-plugin-boundaries` with a deny-by-default config. The `@/` alias already resolves to the repo root, so `@/src/…` and `@/di/…` work as written.
