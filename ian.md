# 🕹️ Machete Supremo de Ian — MIM Edition

> **Che Ian del futuro:** Si estás leyendo esto es porque te dio paja acordarte de los 50 comandos de memoria o porque alguna IA te tiró un PR y no querés que te prenda fuego el repo. Relajá, tomate un mate y tirá los comandos de acá abajo.

---

## ⚡ 1. Los Botones Mágicos (Fast Track en 1 Paso)

Para cuando no querés pensar y querés que el script se encargue de todo el laburo sucio.

### 🛡️ El Domador de PRs (`pr:audit` / `gatekeeper`)
Cuando una IA te tira un PR y querés saber si es oro puro o si es Chernobyl:
```bash
npm run pr:audit <numero_o_rama>
# Alias idéntico: npm run gatekeeper <id>
```
**¿Qué hace solo?** Se baja el PR, chequea que no haya quedado viejo contra `main`, corre los ~36 tests, tipos de TypeScript (`tsc`), blindaje de APIs (`withApiGuard`) y reglas de arquitectura.
- 🟢 **`READY`:** Está flama. Lo subís a main directo con:
  ```bash
  npm run pr:promote
  ```
- 🟡 **`HOLD`:** Pasó los tests pero quedó atrasado. Tirás `git merge origin/main` y volvés a auditar.
- 🔴 **`REQUEST_CHANGES`:** Rompió algo. No toca `main` ni en pedo y te deja el chisme del error en `logs/pr-audits/`.

---

### 📦 El Botón Nuclear de Releases (`release:auto`)
Para tirar una release oficial a GitHub sin tocar nada a mano:
```bash
npm run release:auto
# O si te sentís elegante: npm run release:auto minor "Metí alto motor"
```
**La magia que hace:** Corre los tests, calcula el bump semántico (patch/minor/major), te crea una branch de backup por si las moscas, actualiza todos los `package.json` y docs, clava el tag `vX.Y.Z` y lo manda a GitHub para que compile el `.exe` solito. Cero preguntas, 100% automático.

---

## 🎛️ 2. Si me pintó el modo artesanal (Paso a Paso)

Para cuando querés mirar el código con lupa antes de mandarlo a producción:

```bash
# 1. Mirar el PR y testearlo sin mergear nada
npm run pr:review <numero_o_rama>

# 2. Si te gustó cómo quedó -> A main de una
npm run pr:promote

# 3. Si era una porquería -> Rajar de ahí sin tocar nada
npm run pr:return

# 4. Asistente interactivo de release (con menú y preguntas)
npm run release
```

---

## 📋 3. Chequeo Rápido de "No rompí nada, ¿no?"

Antes de commitear cualquier cosa:

```bash
# Tipos de TS (Desktop y Hub)
npx tsc --noEmit; npx tsc --project apps/hub/tsconfig.json --noEmit

# Blindaje de APIs y fronteras de arquitectura
npm run lint:api-guard && npm run lint:architecture && npm run test:architecture

# Todos los tests (~36 suites)
npm test
```

---

## 🚦 4. Pre-Push & Codacy (Anti-papelones en CI)

Para que GitHub Actions y Codacy no te hagan bullying público en el PR:

```bash
npm run codacy:diff:worktree  # ¿Codacy me va a putear por lo que acabo de escribir?
npm run pre:push:lint         # Chequeo express (tipos + eslint + Codacy diff) ~2 min
npm run pre:push:quick        # CI local sin builds pesados ~8 min
npm run pre:push              # El combo completo de GitHub Actions (si tenés paciencia)
```

> 💡 **Nota mental de Windows:** Semgrep no corre nativo en Windows, así que las reglas pesadas de seguridad corren en la nube de Codacy. Con `npm run codacy:diff` en local ya zafás del 95% de los retos.

---

## 💻 5. Armar el `.exe` en mi PC

```bash
# Para compilar el instalador posta de Windows:
npm run package:win
# -> El instalador te queda en: dist/MIM Setup <version>.exe
# -> El portable listo para doble clic: dist/win-unpacked/MIM.exe

# Para probar Electron rápido en desarrollo:
npm run build:standalone && npm run start:standalone
```

---

## 🖥️ 6. Server Manager con Fixture Local (Cero gastos de VPS)

Para probar la pestaña `/servers` sin pagar un mango de hosting ni tocar un servidor real:

```bash
# 1. En una terminal levantás la fixture (Node 22 obligatorio):
npm run dev:server-fixture
```
*Te abre un SFTP simulado en `127.0.0.1`, arranca Next en **http://127.0.0.1:3101** y te escupe el archivo `.server-fixture.json` con las credenciales temporales.*

**Cómo probarlo:**
1. Entrás a `http://127.0.0.1:3101/servers`.
2. Creás el proyecto **Fixture** (Minecraft `1.20.1`, loader `fabric`).
3. Copiás los datos de `.server-fixture.json` (Host `127.0.0.1`, user `fixture`, pass `local-fixture-only`, huella SSH del JSON).
4. Le das a **Conectar y auditar**:
   - **Auditoría:** Tiene que saltar 1 mod faltante (`missing`) y 1 desactualizado (`example`).
   - **Deploy:** Al tocar *Revisar y aplicar...*, instala y actualiza los jars en el SFTP trucho.
   - **SAGE:** Diagnostica el log simulado y caza la dependencia faltante.
   - **Multiplayer Sync:** Muestra a `sodium` preservado y `example` desalineado.

> 🛑 **Para salir:** Escribí `quit` en la terminal de la fixture y te limpia todo el basurero temporal solo.

---

## ⚡ Machete Resumen (La tabla para mirar de reojo)

| Quiero... | Comando |
| :--- | :--- |
| **Domar un PR con tests y auto-promote** | `npm run gatekeeper <id>` |
| **Tirar release automática y que GitHub arme el .exe** | `npm run release:auto` |
| **Revisar un PR a mano** | `npm run pr:review <id>` |
| **Chequear que Codacy no me putee** | `npm run codacy:diff:worktree` |
| **Testear todo antes de pushear** | `npm run pre:push:lint` |
| **Compilar el .exe en mi compu** | `npm run package:win` |
| **Probar Electron standalone** | `npm run start:standalone` |
| **Simular server SFTP local** | `npm run dev:server-fixture` |
| **Correr todos los tests** | `npm test` |

---

📁 **Para ver qué falta hacer:** [docs/PENDING.md](docs/PENDING.md) | **Roadmap:** [docs/planning/ROADMAP.md](docs/planning/ROADMAP.md)


